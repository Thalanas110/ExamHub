-- Migration: provide a small role-scoped overview for fast dashboard hydration.

USE examhub;

DROP PROCEDURE IF EXISTS sp_data_summary_for_user;

DELIMITER $$

CREATE PROCEDURE sp_data_summary_for_user(
    IN p_role VARCHAR(32),
    IN p_user_id CHAR(36)
)
BEGIN
    IF p_role = 'admin' THEN
        SELECT
            'admin' AS role,
            users.totalUsers,
            users.studentUsers,
            users.teacherUsers,
            users.adminUsers,
            exams.totalExams,
            exams.draftExams,
            exams.publishedExams,
            exams.completedExams,
            classes.totalClasses,
            classes.populatedClasses,
            classes.emptyClasses,
            submissions.totalSubmissions,
            submissions.pendingSubmissions,
            submissions.gradedSubmissions,
            submissions.averageScore,
            submissions.passRate
        FROM (
            SELECT
                COUNT(*) AS totalUsers,
                COALESCE(SUM(role = 'student'), 0) AS studentUsers,
                COALESCE(SUM(role = 'teacher'), 0) AS teacherUsers,
                COALESCE(SUM(role = 'admin'), 0) AS adminUsers
            FROM users
        ) users
        CROSS JOIN (
            SELECT
                COUNT(*) AS totalExams,
                COALESCE(SUM(status = 'draft'), 0) AS draftExams,
                COALESCE(SUM(status = 'published'), 0) AS publishedExams,
                COALESCE(SUM(status = 'completed'), 0) AS completedExams
            FROM exams
        ) exams
        CROSS JOIN (
            SELECT
                COUNT(*) AS totalClasses,
                COALESCE(SUM(cs.class_id IS NOT NULL), 0) AS populatedClasses,
                COALESCE(SUM(cs.class_id IS NULL), 0) AS emptyClasses
            FROM classes c
            LEFT JOIN (SELECT DISTINCT class_id FROM class_students) cs ON cs.class_id = c.id
        ) classes
        CROSS JOIN (
            SELECT
                COUNT(*) AS totalSubmissions,
                COALESCE(SUM(s.status = 'submitted'), 0) AS pendingSubmissions,
                COALESCE(SUM(s.status = 'graded'), 0) AS gradedSubmissions,
                COALESCE(ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.percentage END), 2), 0) AS averageScore,
                COALESCE(ROUND(
                    100 * SUM(CASE WHEN s.status = 'graded' AND s.total_score >= e.passing_marks THEN 1 ELSE 0 END)
                    / NULLIF(SUM(s.status = 'graded'), 0),
                    2
                ), 0) AS passRate
            FROM submissions s
            LEFT JOIN exams e ON e.id = s.exam_id
        ) submissions;
    ELSEIF p_role = 'teacher' THEN
        SELECT
            'teacher' AS role,
            users.totalUsers,
            users.studentUsers,
            0 AS teacherUsers,
            0 AS adminUsers,
            exams.totalExams,
            exams.draftExams,
            exams.publishedExams,
            exams.completedExams,
            classes.totalClasses,
            classes.populatedClasses,
            classes.emptyClasses,
            submissions.totalSubmissions,
            submissions.pendingSubmissions,
            submissions.gradedSubmissions,
            submissions.averageScore,
            submissions.passRate
        FROM (
            SELECT
                COUNT(DISTINCT cs.student_id) AS totalUsers,
                COUNT(DISTINCT cs.student_id) AS studentUsers
            FROM class_students cs
            INNER JOIN classes c ON c.id = cs.class_id
            WHERE c.teacher_id = p_user_id
        ) users
        CROSS JOIN (
            SELECT
                COUNT(*) AS totalExams,
                COALESCE(SUM(status = 'draft'), 0) AS draftExams,
                COALESCE(SUM(status = 'published'), 0) AS publishedExams,
                COALESCE(SUM(status = 'completed'), 0) AS completedExams
            FROM exams
            WHERE teacher_id = p_user_id
        ) exams
        CROSS JOIN (
            SELECT
                COUNT(*) AS totalClasses,
                COALESCE(SUM(cs.class_id IS NOT NULL), 0) AS populatedClasses,
                COALESCE(SUM(cs.class_id IS NULL), 0) AS emptyClasses
            FROM classes c
            LEFT JOIN (SELECT DISTINCT class_id FROM class_students) cs ON cs.class_id = c.id
            WHERE c.teacher_id = p_user_id
        ) classes
        CROSS JOIN (
            SELECT
                COUNT(*) AS totalSubmissions,
                COALESCE(SUM(s.status = 'submitted'), 0) AS pendingSubmissions,
                COALESCE(SUM(s.status = 'graded'), 0) AS gradedSubmissions,
                COALESCE(ROUND(AVG(CASE WHEN s.status = 'graded' THEN s.percentage END), 2), 0) AS averageScore,
                COALESCE(ROUND(
                    100 * SUM(CASE WHEN s.status = 'graded' AND s.total_score >= e.passing_marks THEN 1 ELSE 0 END)
                    / NULLIF(SUM(s.status = 'graded'), 0),
                    2
                ), 0) AS passRate
            FROM submissions s
            INNER JOIN exams e ON e.id = s.exam_id
            WHERE e.teacher_id = p_user_id
        ) submissions;
    ELSE
        SELECT
            'student' AS role,
            1 AS totalUsers,
            1 AS studentUsers,
            0 AS teacherUsers,
            0 AS adminUsers,
            exams.totalExams,
            0 AS draftExams,
            exams.publishedExams,
            0 AS completedExams,
            classes.totalClasses,
            classes.totalClasses AS populatedClasses,
            0 AS emptyClasses,
            submissions.totalSubmissions,
            submissions.pendingSubmissions,
            submissions.gradedSubmissions,
            submissions.averageScore,
            0 AS passRate
        FROM (
            SELECT
                COUNT(*) AS totalExams,
                COALESCE(SUM(
                    e.status = 'published'
                    AND NOT EXISTS (
                        SELECT 1
                        FROM submissions submitted
                        WHERE submitted.exam_id = e.id
                          AND submitted.student_id = p_user_id
                    )
                ), 0) AS publishedExams
            FROM exams e
            INNER JOIN class_students cs ON cs.class_id = e.class_id
            WHERE cs.student_id = p_user_id
        ) exams
        CROSS JOIN (
            SELECT COUNT(*) AS totalClasses
            FROM class_students
            WHERE student_id = p_user_id
        ) classes
        CROSS JOIN (
            SELECT
                COUNT(*) AS totalSubmissions,
                COALESCE(SUM(status = 'submitted'), 0) AS pendingSubmissions,
                COALESCE(SUM(status = 'graded'), 0) AS gradedSubmissions,
                COALESCE(ROUND(AVG(CASE WHEN status = 'graded' THEN percentage END), 2), 0) AS averageScore
            FROM submissions
            WHERE student_id = p_user_id
        ) submissions;
    END IF;
END$$

DELIMITER ;
