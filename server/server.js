const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const db = require("./config/db");

const app = express();
const IST_TIME_ZONE = "Asia/Kolkata";

app.use(cors());
app.use(express.json());

function getIndiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

async function performDailyTaskReset() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const today = getIndiaDate();

    await connection.execute(
      `DELETE FROM todos
       WHERE task_date < ?
       AND completed = 1`,
      [today]
    );

    await connection.execute(
      `UPDATE todos
       SET task_date = ?
       WHERE task_date < ?
       AND completed = 0`,
      [today, today]
    );

    await connection.commit();
    console.log(`Daily task reset completed: ${today}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

let dailyResetPromise;

function resetDailyTasks() {
  if (!dailyResetPromise) {
    dailyResetPromise = performDailyTaskReset().finally(() => {
      dailyResetPromise = undefined;
    });
  }

  return dailyResetPromise;
}

function parseTaskId(id) {
  if (!/^[1-9]\d*$/.test(id)) {
    return null;
  }

  const numericId = Number(id);
  return Number.isSafeInteger(numericId) ? numericId : null;
}

function getValidatedTitle(title) {
  if (typeof title !== "string") {
    return null;
  }

  const trimmedTitle = title.trim();
  return trimmedTitle.length > 0 && trimmedTitle.length <= 255
    ? trimmedTitle
    : null;
}

app.get("/", (req, res) => {
  res.send("TaskFlow API is running");
});

app.get("/api/todos", async (req, res) => {
  try {
    await resetDailyTasks();
    const today = getIndiaDate();

    const [todos] = await db.execute(
      `SELECT * FROM todos
       WHERE task_date = ?
       ORDER BY created_at DESC`,
      [today]
    );

    res.json(todos);
  } catch (error) {
    console.error("Fetch tasks error:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

app.post("/api/todos", async (req, res) => {
  const title = getValidatedTitle(req.body?.title);

  if (!title) {
    return res.status(400).json({
      message: "Task title must contain 1 to 255 characters",
    });
  }

  try {
    await resetDailyTasks();
    const today = getIndiaDate();

    const [result] = await db.execute(
      `INSERT INTO todos (title, completed, task_date)
       VALUES (?, 0, ?)`,
      [title, today]
    );

    const [newTodo] = await db.execute(
      "SELECT * FROM todos WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(newTodo[0]);
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

app.put("/api/todos/:id", async (req, res) => {
  const id = parseTaskId(req.params.id);
  const { title, completed } = req.body ?? {};

  if (id === null) {
    return res.status(400).json({ message: "Task ID must be a positive integer" });
  }

  if (title !== undefined && getValidatedTitle(title) === null) {
    return res.status(400).json({
      message: "Task title must contain 1 to 255 characters",
    });
  }

  if (completed !== undefined && typeof completed !== "boolean") {
    return res.status(400).json({ message: "Completed must be a boolean" });
  }

  if (title === undefined && completed === undefined) {
    return res.status(400).json({ message: "Provide a title or completion status" });
  }

  try {
    await resetDailyTasks();
    const today = getIndiaDate();

    const [existing] = await db.execute(
      "SELECT * FROM todos WHERE id = ? AND task_date = ?",
      [id, today]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const updatedTitle =
      title === undefined ? existing[0].title : getValidatedTitle(title);
    const updatedCompleted =
      completed === undefined ? Boolean(existing[0].completed) : completed;

    await db.execute(
      `UPDATE todos
       SET title = ?, completed = ?
       WHERE id = ? AND task_date = ?`,
      [updatedTitle, updatedCompleted ? 1 : 0, id, today]
    );

    const [updatedTodo] = await db.execute(
      "SELECT * FROM todos WHERE id = ?",
      [id]
    );

    res.json(updatedTodo[0]);
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  const id = parseTaskId(req.params.id);

  if (id === null) {
    return res.status(400).json({ message: "Task ID must be a positive integer" });
  }

  try {
    await resetDailyTasks();
    const today = getIndiaDate();

    const [result] = await db.execute(
      "DELETE FROM todos WHERE id = ? AND task_date = ?",
      [id, today]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Request body must be valid JSON" });
  }

  console.error("Unhandled API error:", error);
  res.status(500).json({ message: "Unexpected server error" });
});

cron.schedule(
  "0 0 * * *",
  async () => {
    try {
      await resetDailyTasks();
    } catch (error) {
      console.error("Scheduled reset failed:", error);
    }
  },
  { timezone: IST_TIME_ZONE }
);

async function startServer() {
  try {
    await db.query("SELECT 1");
    await resetDailyTasks();

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
