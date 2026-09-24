-- Migration: Fix class student aggregation without relying on JSON_ARRAYAGG.
-- The bounded GROUP_CONCAT limit keeps this compatible with XAMPP MariaDB 10.4
-- while returning valid studentIds JSON for large classes.

USE examhub;

DROP PROCEDURE IF EXISTS sp_classes_get_all;
DROP PROCEDURE IF EXISTS sp_classes_get_by_id;
DROP PROCEDURE IF EXISTS sp_classes_get_by_code;
DROP PROCEDURE IF EXISTS sp_data_all;

DELIMITER $$

CREATE PROCEDURE sp_classes_get_all()
BEGIN
    SET SESSION group_concat_max_len = 16777216;
    SELECT
        c.id,
        c.name,
        c.subject,
        c.teacher_id AS teacherId,
        c.code,
        c.description,
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
END$$

CREATE PROCEDURE sp_classes_get_by_id(IN p_class_id CHAR(36))
BEGIN
    SET SESSION group_concat_max_len = 16777216;
    SELECT
        c.id,
        c.name,
        c.subject,
        c.teacher_id AS teacherId,
        c.code,
        c.description,
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
    WHERE c.id = p_class_id
    LIMIT 1;
END$$

CREATE PROCEDURE sp_classes_get_by_code(IN p_code VARCHAR(32))
BEGIN
    SET SESSION group_concat_max_len = 16777216;
    SELECT
        c.id,
        c.name,
        c.subject,
        c.teacher_id AS teacherId,
        c.code,
        c.description,
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
    WHERE UPPER(c.code) = UPPER(p_code)
    LIMIT 1;
END$$

CREATE PROCEDURE sp_data_all()
BEGIN
    SET SESSION group_concat_max_len = 16777216;
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
