-- Migration: Upgrade submissions to real attempt records and add attempt-aware stored procedures.
-- Run this against the examhub database for existing environments.

USE examhub;

ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS attempt_no INT UNSIGNED NULL AFTER student_id,
    ADD COLUMN IF NOT EXISTS started_at DATETIME NULL AFTER feedback_enc,
    ADD COLUMN IF NOT EXISTS allowed_duration_minutes INT UNSIGNED NULL AFTER started_at,
    ADD COLUMN IF NOT EXISTS effective_window_start_at DATETIME NULL AFTER allowed_duration_minutes,
    ADD COLUMN IF NOT EXISTS effective_window_end_at DATETIME NULL AFTER effective_window_start_at;

UPDATE submissions s
INNER JOIN exams e ON e.id = s.exam_id
SET
    s.attempt_no = COALESCE(s.attempt_no, 1),
    s.started_at = COALESCE(s.started_at, s.submitted_at),
    s.allowed_duration_minutes = COALESCE(s.allowed_duration_minutes, e.duration_minutes),
    s.effective_window_start_at = COALESCE(s.effective_window_start_at, e.start_date),
    s.effective_window_end_at = COALESCE(s.effective_window_end_at, e.end_date)
WHERE s.attempt_no IS NULL
   OR s.started_at IS NULL
   OR s.allowed_duration_minutes IS NULL
   OR s.effective_window_start_at IS NULL
   OR s.effective_window_end_at IS NULL;

SET @add_new_submission_unique := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'submissions'
        AND index_name = 'uq_submissions_exam_student_attempt'
    ),
    'DO 0',
    'ALTER TABLE submissions ADD UNIQUE KEY uq_submissions_exam_student_attempt (exam_id, student_id, attempt_no)'
  )
);
PREPARE stmt FROM @add_new_submission_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_old_submission_unique := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'submissions'
        AND index_name = 'uq_submissions_exam_student'
    ),
    'ALTER TABLE submissions DROP INDEX uq_submissions_exam_student',
    'DO 0'
  )
);
PREPARE stmt FROM @drop_old_submission_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_submission_status_index := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'submissions'
        AND index_name = 'idx_submissions_exam_student_status'
    ),
    'DO 0',
    'ALTER TABLE submissions ADD KEY idx_submissions_exam_student_status (exam_id, student_id, status)'
  )
);
PREPARE stmt FROM @add_submission_status_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE submissions
    MODIFY COLUMN attempt_no INT UNSIGNED NOT NULL,
    MODIFY COLUMN started_at DATETIME NOT NULL,
    MODIFY COLUMN allowed_duration_minutes INT UNSIGNED NOT NULL,
    MODIFY COLUMN effective_window_start_at DATETIME NOT NULL,
    MODIFY COLUMN effective_window_end_at DATETIME NOT NULL,
    MODIFY COLUMN submitted_at DATETIME NULL,
    MODIFY COLUMN status ENUM('in_progress', 'submitted', 'graded', 'expired') NOT NULL DEFAULT 'submitted';

DROP PROCEDURE IF EXISTS sp_results_submit;
DROP PROCEDURE IF EXISTS sp_results_get_by_student_for_user;
DROP PROCEDURE IF EXISTS sp_results_get_by_id_for_user;
DROP PROCEDURE IF EXISTS sp_results_grade_update;
DROP PROCEDURE IF EXISTS sp_admin_get_results_overview;
DROP PROCEDURE IF EXISTS sp_data_all;
DROP PROCEDURE IF EXISTS sp_results_get_by_exam_and_student;
DROP PROCEDURE IF EXISTS sp_results_get_attempt_counts_for_student;
DROP PROCEDURE IF EXISTS sp_results_start_attempt;
DROP PROCEDURE IF EXISTS sp_results_submit_started_attempt;
DROP PROCEDURE IF EXISTS sp_results_update_status;

DELIMITER $$

CREATE PROCEDURE sp_results_submit(
    IN p_id CHAR(36),
    IN p_exam_id CHAR(36),
    IN p_student_id CHAR(36),
    IN p_answers_json JSON,
    IN p_total_score DECIMAL(8,2),
    IN p_percentage DECIMAL(6,2),
    IN p_grade VARCHAR(8),
    IN p_feedback_ciphertext TEXT,
    IN p_feedback_iv VARCHAR(24),
    IN p_feedback_tag VARCHAR(24),
    IN p_feedback_enc TEXT,
    IN p_submitted_at DATETIME,
    IN p_graded_at DATETIME,
    IN p_status VARCHAR(32)
)
BEGIN
    DECLARE v_attempt_no INT UNSIGNED DEFAULT 1;
    DECLARE v_duration_minutes INT UNSIGNED DEFAULT 0;
    DECLARE v_start_at DATETIME DEFAULT NULL;
    DECLARE v_end_at DATETIME DEFAULT NULL;
    DECLARE v_started_at DATETIME DEFAULT COALESCE(p_submitted_at, UTC_TIMESTAMP());

    SELECT COALESCE(MAX(s.attempt_no), 0) + 1
      INTO v_attempt_no
      FROM submissions s
     WHERE s.exam_id = p_exam_id
       AND s.student_id = p_student_id;

    SELECT e.duration_minutes, e.start_date, e.end_date
      INTO v_duration_minutes, v_start_at, v_end_at
      FROM exams e
     WHERE e.id = p_exam_id
     LIMIT 1;

    INSERT INTO submissions (
        id,
        exam_id,
        student_id,
        attempt_no,
        answers_json,
        total_score,
        percentage,
        grade,
        feedback_ciphertext,
        feedback_iv,
        feedback_tag,
        feedback_enc,
        started_at,
        allowed_duration_minutes,
        effective_window_start_at,
        effective_window_end_at,
        submitted_at,
        graded_at,
        status
    ) VALUES (
        p_id,
        p_exam_id,
        p_student_id,
        v_attempt_no,
        p_answers_json,
        p_total_score,
        p_percentage,
        p_grade,
        p_feedback_ciphertext,
        p_feedback_iv,
        p_feedback_tag,
        p_feedback_enc,
        v_started_at,
        COALESCE(v_duration_minutes, 0),
        COALESCE(v_start_at, v_started_at),
        COALESCE(v_end_at, v_started_at),
        COALESCE(p_submitted_at, UTC_TIMESTAMP()),
        p_graded_at,
        COALESCE(NULLIF(TRIM(p_status), ''), 'submitted')
    );

    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status
    FROM submissions s
    WHERE s.id = p_id
    LIMIT 1;
END$$

CREATE PROCEDURE sp_results_get_by_exam_and_student(
    IN p_exam_id CHAR(36),
    IN p_student_id CHAR(36)
)
BEGIN
    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status
    FROM submissions s
    WHERE s.exam_id = p_exam_id
      AND s.student_id = p_student_id
    ORDER BY s.attempt_no DESC, s.created_ts DESC;
END$$

CREATE PROCEDURE sp_results_get_attempt_counts_for_student(IN p_student_id CHAR(36))
BEGIN
    SELECT
        s.exam_id AS examId,
        COUNT(*) AS attemptsUsed,
        MAX(s.attempt_no) AS latestAttemptNo
    FROM submissions s
    WHERE s.student_id = p_student_id
    GROUP BY s.exam_id;
END$$

CREATE PROCEDURE sp_results_start_attempt(
    IN p_id CHAR(36),
    IN p_exam_id CHAR(36),
    IN p_student_id CHAR(36),
    IN p_attempt_no INT,
    IN p_started_at DATETIME,
    IN p_allowed_duration_minutes INT,
    IN p_effective_window_start_at DATETIME,
    IN p_effective_window_end_at DATETIME
)
BEGIN
    INSERT INTO submissions (
        id,
        exam_id,
        student_id,
        attempt_no,
        answers_json,
        total_score,
        percentage,
        grade,
        feedback_ciphertext,
        feedback_iv,
        feedback_tag,
        feedback_enc,
        started_at,
        allowed_duration_minutes,
        effective_window_start_at,
        effective_window_end_at,
        submitted_at,
        graded_at,
        status
    ) VALUES (
        p_id,
        p_exam_id,
        p_student_id,
        p_attempt_no,
        JSON_ARRAY(),
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        p_started_at,
        GREATEST(COALESCE(p_allowed_duration_minutes, 0), 0),
        p_effective_window_start_at,
        p_effective_window_end_at,
        NULL,
        NULL,
        'in_progress'
    );

    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status
    FROM submissions s
    WHERE s.id = p_id
    LIMIT 1;
END$$

CREATE PROCEDURE sp_results_submit_started_attempt(
    IN p_submission_id CHAR(36),
    IN p_answers_json JSON,
    IN p_total_score DECIMAL(8,2),
    IN p_percentage DECIMAL(6,2),
    IN p_grade VARCHAR(8),
    IN p_feedback_ciphertext TEXT,
    IN p_feedback_iv VARCHAR(24),
    IN p_feedback_tag VARCHAR(24),
    IN p_feedback_enc TEXT,
    IN p_submitted_at DATETIME,
    IN p_graded_at DATETIME,
    IN p_status VARCHAR(32)
)
BEGIN
    UPDATE submissions
    SET
        answers_json = p_answers_json,
        total_score = p_total_score,
        percentage = p_percentage,
        grade = p_grade,
        feedback_ciphertext = p_feedback_ciphertext,
        feedback_iv = p_feedback_iv,
        feedback_tag = p_feedback_tag,
        feedback_enc = p_feedback_enc,
        submitted_at = p_submitted_at,
        graded_at = p_graded_at,
        status = p_status
    WHERE id = p_submission_id;

    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status
    FROM submissions s
    WHERE s.id = p_submission_id
    LIMIT 1;
END$$

CREATE PROCEDURE sp_results_update_status(
    IN p_submission_id CHAR(36),
    IN p_status VARCHAR(32),
    IN p_submitted_at DATETIME
)
BEGIN
    UPDATE submissions
    SET
        status = COALESCE(NULLIF(TRIM(p_status), ''), status),
        submitted_at = COALESCE(p_submitted_at, submitted_at)
    WHERE id = p_submission_id;

    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status
    FROM submissions s
    WHERE s.id = p_submission_id
    LIMIT 1;
END$$

CREATE PROCEDURE sp_results_get_by_student_for_user(
    IN p_student_id CHAR(36),
    IN p_role VARCHAR(32),
    IN p_user_id CHAR(36)
)
BEGIN
    IF p_role = 'admin' THEN
        SELECT
            s.id,
            s.exam_id AS examId,
            s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage,
            s.grade,
            s.feedback_ciphertext AS feedbackCiphertext,
            s.feedback_iv AS feedbackIv,
            s.feedback_tag AS feedbackTag,
            s.feedback_enc AS feedbackEnc,
            DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
            s.allowed_duration_minutes AS allowedDurationMinutes,
            DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
            DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
            IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
            IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
            s.status
        FROM submissions s
        WHERE s.student_id = p_student_id
        ORDER BY s.started_at DESC, s.attempt_no DESC;
    ELSEIF p_role = 'teacher' THEN
        SELECT
            s.id,
            s.exam_id AS examId,
            s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage,
            s.grade,
            s.feedback_ciphertext AS feedbackCiphertext,
            s.feedback_iv AS feedbackIv,
            s.feedback_tag AS feedbackTag,
            s.feedback_enc AS feedbackEnc,
            DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
            s.allowed_duration_minutes AS allowedDurationMinutes,
            DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
            DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
            IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
            IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
            s.status
        FROM submissions s
        INNER JOIN exams e ON e.id = s.exam_id
        WHERE s.student_id = p_student_id
          AND e.teacher_id = p_user_id
        ORDER BY s.started_at DESC, s.attempt_no DESC;
    ELSE
        SELECT
            s.id,
            s.exam_id AS examId,
            s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage,
            s.grade,
            s.feedback_ciphertext AS feedbackCiphertext,
            s.feedback_iv AS feedbackIv,
            s.feedback_tag AS feedbackTag,
            s.feedback_enc AS feedbackEnc,
            DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
            s.allowed_duration_minutes AS allowedDurationMinutes,
            DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
            DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
            IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
            IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
            s.status
        FROM submissions s
        WHERE s.student_id = p_student_id
          AND s.student_id = p_user_id
        ORDER BY s.started_at DESC, s.attempt_no DESC;
    END IF;
END$$

CREATE PROCEDURE sp_results_get_by_id_for_user(
    IN p_submission_id CHAR(36),
    IN p_role VARCHAR(32),
    IN p_user_id CHAR(36)
)
BEGIN
    IF p_role = 'admin' THEN
        SELECT
            s.id,
            s.exam_id AS examId,
            s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage,
            s.grade,
            s.feedback_ciphertext AS feedbackCiphertext,
            s.feedback_iv AS feedbackIv,
            s.feedback_tag AS feedbackTag,
            s.feedback_enc AS feedbackEnc,
            DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
            s.allowed_duration_minutes AS allowedDurationMinutes,
            DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
            DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
            IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
            IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
            s.status,
            e.total_marks AS totalMarks
        FROM submissions s
        INNER JOIN exams e ON e.id = s.exam_id
        WHERE s.id = p_submission_id
        LIMIT 1;
    ELSEIF p_role = 'teacher' THEN
        SELECT
            s.id,
            s.exam_id AS examId,
            s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage,
            s.grade,
            s.feedback_ciphertext AS feedbackCiphertext,
            s.feedback_iv AS feedbackIv,
            s.feedback_tag AS feedbackTag,
            s.feedback_enc AS feedbackEnc,
            DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
            s.allowed_duration_minutes AS allowedDurationMinutes,
            DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
            DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
            IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
            IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
            s.status,
            e.total_marks AS totalMarks
        FROM submissions s
        INNER JOIN exams e ON e.id = s.exam_id
        WHERE s.id = p_submission_id
          AND e.teacher_id = p_user_id
        LIMIT 1;
    ELSE
        SELECT
            s.id,
            s.exam_id AS examId,
            s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage,
            s.grade,
            s.feedback_ciphertext AS feedbackCiphertext,
            s.feedback_iv AS feedbackIv,
            s.feedback_tag AS feedbackTag,
            s.feedback_enc AS feedbackEnc,
            DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
            s.allowed_duration_minutes AS allowedDurationMinutes,
            DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
            DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
            IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
            IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
            s.status,
            e.total_marks AS totalMarks
        FROM submissions s
        INNER JOIN exams e ON e.id = s.exam_id
        WHERE s.id = p_submission_id
          AND s.student_id = p_user_id
        LIMIT 1;
    END IF;
END$$

CREATE PROCEDURE sp_results_grade_update(
    IN p_submission_id CHAR(36),
    IN p_answers_json JSON,
    IN p_total_score DECIMAL(8,2),
    IN p_percentage DECIMAL(6,2),
    IN p_grade VARCHAR(8),
    IN p_feedback_ciphertext TEXT,
    IN p_feedback_iv VARCHAR(24),
    IN p_feedback_tag VARCHAR(24),
    IN p_feedback_enc TEXT,
    IN p_graded_at DATETIME,
    IN p_status VARCHAR(32)
)
BEGIN
    UPDATE submissions
    SET
        answers_json = p_answers_json,
        total_score = p_total_score,
        percentage = p_percentage,
        grade = p_grade,
        feedback_ciphertext = p_feedback_ciphertext,
        feedback_iv = p_feedback_iv,
        feedback_tag = p_feedback_tag,
        feedback_enc = p_feedback_enc,
        graded_at = p_graded_at,
        status = p_status
    WHERE id = p_submission_id;

    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status
    FROM submissions s
    WHERE s.id = p_submission_id
    LIMIT 1;
END$$

CREATE PROCEDURE sp_admin_get_results_overview()
BEGIN
    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status,
        u.name AS studentName,
        e.title AS examTitle
    FROM submissions s
    INNER JOIN users u ON u.id = s.student_id
    INNER JOIN exams e ON e.id = s.exam_id
    ORDER BY s.started_at DESC, s.attempt_no DESC;
END$$

CREATE PROCEDURE sp_data_all()
BEGIN
    SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.department_ciphertext AS departmentCiphertext,
        u.department_iv AS departmentIv,
        u.department_tag AS departmentTag,
        u.department_enc AS departmentEnc,
        u.phone_ciphertext AS phoneCiphertext,
        u.phone_iv AS phoneIv,
        u.phone_tag AS phoneTag,
        u.phone_enc AS phoneEnc,
        u.bio_ciphertext AS bioCiphertext,
        u.bio_iv AS bioIv,
        u.bio_tag AS bioTag,
        u.bio_enc AS bioEnc,
        DATE_FORMAT(u.joined_at, '%Y-%m-%d') AS joinedAt
    FROM users u
    ORDER BY u.created_at ASC;

    SELECT
        e.id,
        e.title,
        e.description,
        e.class_id AS classId,
        e.teacher_id AS teacherId,
        e.duration_minutes AS duration,
        e.total_marks AS totalMarks,
        e.passing_marks AS passingMarks,
        DATE_FORMAT(e.start_date, '%Y-%m-%dT%H:%i:%s') AS startDate,
        DATE_FORMAT(e.end_date, '%Y-%m-%dT%H:%i:%s') AS endDate,
        e.status,
        e.questions_json AS questions,
        DATE_FORMAT(e.created_at, '%Y-%m-%d') AS createdAt
    FROM exams e
    ORDER BY e.created_ts DESC;

    SELECT
        c.id,
        c.name,
        c.subject,
        c.teacher_id AS teacherId,
        c.code,
        c.description,
        DATE_FORMAT(c.created_at, '%Y-%m-%d') AS createdAt,
        COALESCE(
            (
                SELECT CONCAT(
                    '[',
                    GROUP_CONCAT(JSON_QUOTE(cs.student_id) ORDER BY cs.joined_ts SEPARATOR ','),
                    ']'
                )
                FROM class_students cs
                WHERE cs.class_id = c.id
            ),
            '[]'
        ) AS studentIds
    FROM classes c
    ORDER BY c.created_ts DESC;

    SELECT
        s.id,
        s.exam_id AS examId,
        s.student_id AS studentId,
        s.attempt_no AS attemptNo,
        s.answers_json AS answers,
        s.total_score AS totalScore,
        s.percentage,
        s.grade,
        s.feedback_ciphertext AS feedbackCiphertext,
        s.feedback_iv AS feedbackIv,
        s.feedback_tag AS feedbackTag,
        s.feedback_enc AS feedbackEnc,
        DATE_FORMAT(s.started_at, '%Y-%m-%dT%H:%i:%s') AS startedAt,
        s.allowed_duration_minutes AS allowedDurationMinutes,
        DATE_FORMAT(s.effective_window_start_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowStartAt,
        DATE_FORMAT(s.effective_window_end_at, '%Y-%m-%dT%H:%i:%s') AS effectiveWindowEndAt,
        IFNULL(DATE_FORMAT(s.submitted_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS submittedAt,
        IFNULL(DATE_FORMAT(s.graded_at, '%Y-%m-%dT%H:%i:%s'), NULL) AS gradedAt,
        s.status
    FROM submissions s
    ORDER BY s.started_at DESC, s.attempt_no DESC;
END$$

DELIMITER ;
