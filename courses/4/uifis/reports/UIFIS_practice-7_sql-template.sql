-- УФИС, МДК.06.03. Практика 7.
-- Шаблон базы данных учебного журнала для SQLite.
-- Запуск: sqlite3 uifis.db < UIFIS_practice-7_sql-template.sql
-- В Python: conn.executescript(path.read_text(encoding="utf-8"))

PRAGMA foreign_keys = ON;

BEGIN;

DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL CHECK (length(trim(full_name)) >= 5),
    email TEXT NOT NULL UNIQUE CHECK (email LIKE '%@%.%'),
    group_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    hours INTEGER NOT NULL CHECK (hours BETWEEN 16 AND 256)
);

CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, course_id)
);

CREATE TABLE grades (
    id INTEGER PRIMARY KEY,
    enrollment_id INTEGER NOT NULL UNIQUE REFERENCES enrollments(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    graded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_grades_score ON grades(score);

INSERT INTO students (id, full_name, email, group_code, status) VALUES
    (1, 'Анна Петрова', 'anna@example.ru', 'ИС-41', 'active'),
    (2, 'Борис Смирнов', 'boris@example.ru', 'ИС-41', 'active'),
    (3, 'Вера Кузнецова', 'vera@example.ru', 'ИС-42', 'active'),
    (4, 'Глеб Орлов', 'gleb@example.ru', 'ИС-42', 'blocked'),
    (5, 'Дина Соколова', 'dina@example.ru', 'ИС-41', 'active'),
    (6, 'Егор Волков', 'egor@example.ru', 'ИС-42', 'active');

INSERT INTO courses (id, code, title, hours) VALUES
    (1, 'ИС-101', 'Базы данных', 72),
    (2, 'ИС-102', 'Сети и телекоммуникации', 64),
    (3, 'ИС-103', 'Операционные системы', 48),
    (4, 'ИС-104', 'Проектирование информационных систем', 80);

INSERT INTO enrollments (id, student_id, course_id) VALUES
    (1, 1, 1),
    (2, 1, 2),
    (3, 2, 1),
    (4, 3, 1),
    (5, 3, 3),
    (6, 4, 2),
    (7, 5, 2),
    (8, 5, 4);

INSERT INTO grades (id, enrollment_id, score) VALUES
    (1, 1, 91),
    (2, 2, 84),
    (3, 3, 76),
    (4, 4, 88),
    (5, 5, 95),
    (6, 6, 67),
    (7, 7, 72);

COMMIT;

-- Запрос 1. Число курсов у каждого студента.
SELECT s.id, s.full_name, COUNT(e.id) AS course_count
FROM students AS s
LEFT JOIN enrollments AS e ON e.student_id = s.id
GROUP BY s.id, s.full_name
ORDER BY course_count DESC, s.full_name;

-- Запрос 2. Средний балл по каждому курсу.
SELECT c.code, c.title, ROUND(AVG(g.score), 1) AS average_score, COUNT(g.id) AS grades_count
FROM courses AS c
LEFT JOIN enrollments AS e ON e.course_id = c.id
LEFT JOIN grades AS g ON g.enrollment_id = e.id
GROUP BY c.id, c.code, c.title
ORDER BY c.code;

-- Запрос 3. Студенты без записей на курсы.
SELECT s.id, s.full_name, s.group_code
FROM students AS s
LEFT JOIN enrollments AS e ON e.student_id = s.id
WHERE e.id IS NULL
ORDER BY s.full_name;

-- Запрос 4. Три лучших студента по среднему баллу.
SELECT s.full_name, ROUND(AVG(g.score), 1) AS average_score, COUNT(g.id) AS grades_count
FROM students AS s
JOIN enrollments AS e ON e.student_id = s.id
JOIN grades AS g ON g.enrollment_id = e.id
GROUP BY s.id, s.full_name
HAVING COUNT(g.id) >= 1
ORDER BY average_score DESC
LIMIT 3;

-- Запрос 5. Курсы без выставленных оценок.
SELECT c.code, c.title
FROM courses AS c
JOIN enrollments AS e ON e.course_id = c.id
LEFT JOIN grades AS g ON g.enrollment_id = e.id
WHERE g.id IS NULL
GROUP BY c.id, c.code, c.title
ORDER BY c.code;

-- Проверка ограничения CHECK: выполните отдельно, ожидается ошибка.
-- INSERT INTO grades (enrollment_id, score) VALUES (8, 101);

-- Проверка внешнего ключа: выполните отдельно, ожидается ошибка.
-- DELETE FROM courses WHERE id = 1;

-- Проверка каскада: выполните в учебной копии базы.
-- DELETE FROM students WHERE id = 1;
