
USE todo_app;

-- 1. Fetch all tasks
SELECT * FROM todos;

-- 2. Fetch today's tasks
SELECT *
FROM todos
WHERE task_date = CURDATE();

-- 3. Fetch pending tasks
SELECT *
FROM todos
WHERE completed = FALSE;

-- 4. Fetch completed tasks
SELECT *
FROM todos
WHERE completed = TRUE;

-- 5. Add a new task
INSERT INTO todos (title, completed, task_date)
VALUES ('Learn SQL Joins', FALSE, CURDATE());

-- 6. Update task completion
UPDATE todos
SET completed = TRUE
WHERE id = 1;

-- 7. Update task title
UPDATE todos
SET title = 'Practice Advanced SQL'
WHERE id = 1;

-- 8. Delete a task
DELETE FROM todos
WHERE id = 1;

-- 9. Count total tasks
SELECT COUNT(*) AS total_tasks
FROM todos;

-- 10. Count completed and pending tasks
SELECT
    completed,
    COUNT(*) AS total
FROM todos
GROUP BY completed;

-- 11. Tasks grouped by date
SELECT
    task_date,
    COUNT(*) AS total_tasks
FROM todos
GROUP BY task_date
ORDER BY task_date DESC;

-- 12. Search tasks by title
SELECT *
FROM todos
WHERE title LIKE '%SQL%';

-- 13. Calculate daily completion percentage
SELECT
    COUNT(*) AS total_tasks,
    SUM(completed = TRUE) AS completed_tasks,
    ROUND(
        SUM(completed = TRUE) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) AS completion_percentage
FROM todos
WHERE task_date = CURDATE();
