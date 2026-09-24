-- Migration: add read-path indexes and move /data/all authorization filtering into MySQL.
-- The response shape remains four rowsets: users, exams, classes, submissions.

USE examhub;

DROP PROCEDURE IF EXISTS sp_add_performance_index;

DELIMITER $$

CREATE PROCEDURE sp_add_performance_index(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_index_columns VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = p_table_name
          AND index_name = p_index_name
    ) THEN
        SET @performance_index_sql = CONCAT(
            'ALTER TABLE `', REPLACE(p_table_name, '`', '``'),
            '` ADD INDEX `', REPLACE(p_index_name, '`', '``'),
            '` (', p_index_columns, ')'
        );
        PREPARE performance_index_statement FROM @performance_index_sql;
        EXECUTE performance_index_statement;
        DEALLOCATE PREPARE performance_index_statement;
    END IF;
END$$

DELIMITER ;

CALL sp_add_performance_index('users', 'idx_users_created_at_id', '`created_at`, `id`');
CALL sp_add_performance_index('users', 'idx_users_role_id', '`role`, `id`');
CALL sp_add_performance_index('classes', 'idx_classes_created_ts_id', '`created_ts`, `id`');
CALL sp_add_performance_index('classes', 'idx_classes_teacher_created_ts', '`teacher_id`, `created_ts`, `id`');
CALL sp_add_performance_index('class_students', 'idx_class_students_student_class', '`student_id`, `class_id`');
CALL sp_add_performance_index('class_students', 'idx_class_students_class_joined_student', '`class_id`, `joined_ts`, `student_id`');
CALL sp_add_performance_index('exams', 'idx_exams_created_ts_id', '`created_ts`, `id`');
CALL sp_add_performance_index('exams', 'idx_exams_teacher_created_ts', '`teacher_id`, `created_ts`, `id`');
CALL sp_add_performance_index('exams', 'idx_exams_class_created_ts', '`class_id`, `created_ts`, `id`');
CALL sp_add_performance_index('submissions', 'idx_submissions_started_attempt', '`started_at`, `attempt_no`, `id`');
CALL sp_add_performance_index('submissions', 'idx_submissions_student_started_attempt', '`student_id`, `started_at`, `attempt_no`, `id`');
CALL sp_add_performance_index('submissions', 'idx_submissions_exam_status_started', '`exam_id`, `status`, `started_at`, `attempt_no`');
CALL sp_add_performance_index('submission_question_metrics', 'idx_submission_question_metrics_created', '`created_ts`, `id`');
CALL sp_add_performance_index('submission_question_metrics', 'idx_submission_question_metrics_exam_created', '`exam_id`, `created_ts`, `id`');

DROP PROCEDURE IF EXISTS sp_add_performance_index;
DROP PROCEDURE IF EXISTS sp_data_for_user;

DELIMITER $$

CREATE PROCEDURE sp_data_for_user(
    IN p_role VARCHAR(32),
    IN p_user_id CHAR(36)
)
BEGIN
    SET SESSION group_concat_max_len = 16777216;
    IF p_role = 'admin' THEN
        SELECT
            u.id, u.name, u.email, u.role,
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
            e.id, e.title, e.description,
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
            c.id, c.name, c.subject,
            c.teacher_id AS teacherId,
            c.code, c.description,
            DATE_FORMAT(c.created_at, '%Y-%m-%d') AS createdAt,
            CONCAT(
                '[',
                COALESCE(
                    (
                        SELECT GROUP_CONCAT(
                            JSON_QUOTE(cs.student_id)
                            ORDER BY cs.joined_ts, cs.student_id
                            SEPARATOR ','
                        )
                        FROM class_students cs
                        WHERE cs.class_id = c.id
                    ),
                    ''
                ),
                ']'
            ) AS studentIds
        FROM classes c
        ORDER BY c.created_ts DESC;

        SELECT
            s.id, s.exam_id AS examId, s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage, s.grade,
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
    ELSEIF p_role = 'teacher' THEN
        SELECT
            u.id, u.name, u.email, u.role,
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
        WHERE u.role = 'student' OR u.id = p_user_id
        ORDER BY u.created_at ASC;

        SELECT
            e.id, e.title, e.description,
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
        WHERE e.teacher_id = p_user_id
           OR EXISTS (
                SELECT 1 FROM classes c
                WHERE c.id = e.class_id AND c.teacher_id = p_user_id
           )
        ORDER BY e.created_ts DESC;

        SELECT
            c.id, c.name, c.subject,
            c.teacher_id AS teacherId,
            c.code, c.description,
            DATE_FORMAT(c.created_at, '%Y-%m-%d') AS createdAt,
            CONCAT(
                '[',
                COALESCE(
                    (
                        SELECT GROUP_CONCAT(
                            JSON_QUOTE(cs.student_id)
                            ORDER BY cs.joined_ts, cs.student_id
                            SEPARATOR ','
                        )
                        FROM class_students cs
                        WHERE cs.class_id = c.id
                    ),
                    ''
                ),
                ']'
            ) AS studentIds
        FROM classes c
        WHERE c.teacher_id = p_user_id
        ORDER BY c.created_ts DESC;

        SELECT
            s.id, s.exam_id AS examId, s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage, s.grade,
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
        WHERE EXISTS (
            SELECT 1
            FROM exams e
            WHERE e.id = s.exam_id
              AND (
                    e.teacher_id = p_user_id
                    OR EXISTS (
                        SELECT 1 FROM classes c
                        WHERE c.id = e.class_id AND c.teacher_id = p_user_id
                    )
              )
        )
        ORDER BY s.started_at DESC, s.attempt_no DESC;
    ELSE
        SELECT
            u.id, u.name, u.email, u.role,
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
        WHERE u.id = p_user_id
           OR u.role = 'admin'
           OR EXISTS (
                SELECT 1
                FROM classes c
                INNER JOIN class_students cs ON cs.class_id = c.id
                WHERE c.teacher_id = u.id AND cs.student_id = p_user_id
           )
        ORDER BY u.created_at ASC;

        SELECT
            e.id, e.title, e.description,
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
        WHERE EXISTS (
            SELECT 1 FROM class_students cs
            WHERE cs.class_id = e.class_id AND cs.student_id = p_user_id
        )
        ORDER BY e.created_ts DESC;

        SELECT
            c.id, c.name, c.subject,
            c.teacher_id AS teacherId,
            c.code, c.description,
            DATE_FORMAT(c.created_at, '%Y-%m-%d') AS createdAt,
            CONCAT(
                '[',
                COALESCE(
                    (
                        SELECT GROUP_CONCAT(
                            JSON_QUOTE(cs.student_id)
                            ORDER BY cs.joined_ts, cs.student_id
                            SEPARATOR ','
                        )
                        FROM class_students cs
                        WHERE cs.class_id = c.id
                    ),
                    ''
                ),
                ']'
            ) AS studentIds
        FROM classes c
        WHERE EXISTS (
            SELECT 1 FROM class_students cs
            WHERE cs.class_id = c.id AND cs.student_id = p_user_id
        )
        ORDER BY c.created_ts DESC;

        SELECT
            s.id, s.exam_id AS examId, s.student_id AS studentId,
            s.attempt_no AS attemptNo,
            s.answers_json AS answers,
            s.total_score AS totalScore,
            s.percentage, s.grade,
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
        WHERE s.student_id = p_user_id
           OR EXISTS (
                SELECT 1
                FROM exams e
                INNER JOIN class_students cs ON cs.class_id = e.class_id
                WHERE e.id = s.exam_id AND cs.student_id = p_user_id
           )
        ORDER BY s.started_at DESC, s.attempt_no DESC;
    END IF;
END$$

DELIMITER ;

DROP PROCEDURE IF EXISTS sp_submission_question_metrics_get_for_user;

DELIMITER $$

CREATE PROCEDURE sp_submission_question_metrics_get_for_user(
    IN p_role VARCHAR(32),
    IN p_user_id CHAR(36)
)
BEGIN
    IF p_role = 'admin' THEN
        SELECT
            m.submission_id AS submissionId,
            m.exam_id AS examId,
            m.student_id AS studentId,
            m.question_id AS questionId,
            m.topic,
            m.time_spent_seconds AS timeSpentSeconds,
            m.visit_count AS visitCount,
            m.answer_change_count AS answerChangeCount
        FROM submission_question_metrics m
        ORDER BY m.created_ts DESC, m.id DESC;
    ELSE
        SELECT
            m.submission_id AS submissionId,
            m.exam_id AS examId,
            m.student_id AS studentId,
            m.question_id AS questionId,
            m.topic,
            m.time_spent_seconds AS timeSpentSeconds,
            m.visit_count AS visitCount,
            m.answer_change_count AS answerChangeCount
        FROM submission_question_metrics m
        INNER JOIN exams e ON e.id = m.exam_id
        WHERE e.teacher_id = p_user_id
        ORDER BY m.created_ts DESC, m.id DESC;
    END IF;
END$$

DELIMITER ;
