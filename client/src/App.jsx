import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/todos";
const IST_OFFSET_MINUTES = 330;

function formatTodo(todo) {
  return { ...todo, completed: Boolean(todo.completed) };
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function getMillisecondsUntilNextIndiaMidnight() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );
  const nextMidnightUtc =
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day) + 1
    ) -
    IST_OFFSET_MINUTES * 60 * 1000;

  return Math.max(1000, nextMidnightUtc - now.getTime() + 250);
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [busyIds, setBusyIds] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [today, setToday] = useState(getTodayLabel);

  const fetchTodos = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const response = await axios.get(API);
      setTodos(response.data.map(formatTodo));
      setErrorMessage("");
    } catch (error) {
      console.error("Fetch error:", error);
      setErrorMessage(getErrorMessage(error, "Unable to load tasks. Please try again."));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos(true);
  }, [fetchTodos]);

  useEffect(() => {
    let timer;

    const refreshAtMidnight = () => {
      setToday(getTodayLabel());
      fetchTodos();
      timer = window.setTimeout(
        refreshAtMidnight,
        getMillisecondsUntilNextIndiaMidnight()
      );
    };

    timer = window.setTimeout(
      refreshAtMidnight,
      getMillisecondsUntilNextIndiaMidnight()
    );

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        setToday(getTodayLabel());
        fetchTodos();
      }
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [fetchTodos]);

  const addTodo = async (event) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || isAdding) return;

    setIsAdding(true);
    setErrorMessage("");

    try {
      const response = await axios.post(API, { title: trimmedTitle });
      setTodos((current) => [formatTodo(response.data), ...current]);
      setTitle("");
    } catch (error) {
      console.error("Add error:", error);
      setErrorMessage(getErrorMessage(error, "Unable to add this task."));
    } finally {
      setIsAdding(false);
    }
  };

  const setTaskBusy = (id, isBusy) => {
    const taskId = String(id);
    setBusyIds((current) =>
      isBusy
        ? [...new Set([...current, taskId])]
        : current.filter((busyId) => busyId !== taskId)
    );
  };

  const toggleTodo = async (todo) => {
    if (busyIds.includes(String(todo.id))) return;
    setTaskBusy(todo.id, true);
    setErrorMessage("");

    try {
      const response = await axios.put(`${API}/${todo.id}`, {
        completed: !todo.completed,
      });
      const updatedTodo = formatTodo(response.data);
      setTodos((current) =>
        current.map((item) =>
          String(item.id) === String(updatedTodo.id) ? updatedTodo : item
        )
      );
    } catch (error) {
      console.error("Update error:", error);
      setErrorMessage(getErrorMessage(error, "Unable to update this task."));
    } finally {
      setTaskBusy(todo.id, false);
    }
  };

  const deleteTodo = async (id) => {
    if (busyIds.includes(String(id))) return;
    setTaskBusy(id, true);
    setErrorMessage("");

    try {
      await axios.delete(`${API}/${id}`);
      setTodos((current) =>
        current.filter((todo) => String(todo.id) !== String(id))
      );
    } catch (error) {
      console.error("Delete error:", error);
      setErrorMessage(getErrorMessage(error, "Unable to delete this task."));
    } finally {
      setTaskBusy(id, false);
    }
  };

  const completedCount = todos.filter((todo) => todo.completed).length;
  const pendingCount = todos.length - completedCount;
  const progress =
    todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  const filteredTodos = useMemo(() => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }, [todos, filter]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Task<span className="text-violet-400">Flow</span>
          </h1>
          <span className="text-sm text-slate-400">{today}</span>
        </header>

        <section className="mb-8">
          <p className="mb-2 text-sm text-violet-400">DAILY TASK MANAGER</p>
          <h2 className="mb-2 text-3xl font-bold md:text-4xl">
            Make today count.
          </h2>
          <p className="text-slate-400">Plan your day. Complete your goals.</p>
        </section>

        {errorMessage && (
          <div
            className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => fetchTodos(true)}
              className="shrink-0 font-medium text-red-100 underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-4 text-lg font-semibold">Create a task</h3>
              <form onSubmit={addTodo} className="flex gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What do you need to do?"
                  maxLength={255}
                  className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500"
                  aria-label="Task title"
                />
                <button
                  type="submit"
                  disabled={!title.trim() || isAdding}
                  className="rounded-xl bg-violet-600 px-5 font-medium hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAdding ? "Adding..." : "Add Task"}
                </button>
              </form>
            </section>

            <section className="grid grid-cols-3 gap-3">
              <Stat title="Total Tasks" value={todos.length} />
              <Stat title="Pending Tasks" value={pendingCount} />
              <Stat title="Completed Tasks" value={completedCount} />
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-3 flex justify-between">
                <h3 className="font-semibold">Daily Completion</h3>
                <span className="font-semibold text-violet-400">{progress}%</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-label="Daily completion"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
              >
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">
                {completedCount} of {todos.length} tasks completed
              </p>
            </section>

            <section className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5">
              <h3 className="mb-2 font-semibold">Your daily routine</h3>
              <p className="text-sm text-slate-400">
                Completed tasks are cleared at midnight. Pending tasks
                automatically move to the next day.
              </p>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Today&apos;s Tasks</h3>
              <span className="text-sm text-slate-400">
                {todos.length} {todos.length === 1 ? "task" : "tasks"}
              </span>
            </div>

            <div className="mb-5 flex flex-wrap gap-2" aria-label="Task filters">
              {["all", "active", "completed"].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                  className={`rounded-lg px-4 py-2 text-sm capitalize ${
                    filter === item
                      ? "bg-violet-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {item === "active" ? "Active" : item}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {loading ? (
                <p className="py-10 text-center text-slate-400">
                  Loading tasks...
                </p>
              ) : filteredTodos.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-medium text-slate-300">
                    {todos.length === 0 ? "No tasks for today" : "No tasks found"}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {todos.length === 0
                      ? "Add a new task to get started."
                      : "Try another filter to see your tasks."}
                  </p>
                </div>
              ) : (
                filteredTodos.map((todo) => {
                  const isBusy = busyIds.includes(String(todo.id));

                  return (
                    <div
                      key={todo.id}
                      className={`flex items-center gap-3 rounded-xl border p-4 ${
                        todo.completed
                          ? "border-violet-500/20 bg-violet-500/5"
                          : "border-slate-700 bg-slate-800/70"
                      }`}
                    >
                      <button
                        onClick={() => toggleTodo(todo)}
                        disabled={isBusy}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 disabled:opacity-50 ${
                          todo.completed
                            ? "border-violet-500 bg-violet-500"
                            : "border-slate-500"
                        }`}
                        aria-label={
                          todo.completed ? "Undo completion" : "Mark as completed"
                        }
                      >
                        {todo.completed && (
                          <span className="text-xs text-white">✓</span>
                        )}
                      </button>
                      <span
                        className={`flex-1 break-words ${
                          todo.completed
                            ? "text-slate-500 line-through"
                            : "text-slate-200"
                        }`}
                      >
                        {todo.title}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        disabled={isBusy}
                        className="shrink-0 text-slate-500 hover:text-red-400 disabled:opacity-50"
                        aria-label="Delete task"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
