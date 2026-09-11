const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

const allowedPriorities = ["low", "medium", "high"];

const priorityOrder = {
  high: 1,
  medium: 2,
  low: 3
};

const isValidDate = (date) => {
  if (!date) {
    return false;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(date)) {
    return false;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().startsWith(date)
  );
};

let tasks = [
  {
    id: 1,
    title: "Learn Node.js",
    completed: false,
    priority: "high",
    createdAt: "2026-09-11T10:00:00.000Z",
    dueDate: "2026-09-15"
  },
  {
    id: 2,
    title: "Build an API",
    completed: false,
    priority: "medium",
    createdAt: "2026-09-11T10:30:00.000Z",
    dueDate: "2026-09-20"
  }
];

app.get("/", (req, res) => {
  res.json({
    message: "Task API is running"
  });
});

app.get("/tasks/stats", (req, res) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.filter((task) => !task.completed).length;

  res.json({
    total,
    completed,
    pending
  });
});

app.delete("/tasks/completed/all", (req, res) => {
  const completedCount = tasks.filter((task) => task.completed).length;

  tasks = tasks.filter((task) => !task.completed);

  res.json({
    message: "Completed tasks deleted successfully",
    deleted: completedCount
  });
});

app.patch("/tasks/complete/all", (req, res) => {
  const pendingCount = tasks.filter((task) => !task.completed).length;

  tasks = tasks.map((task) => ({
    ...task,
    completed: true
  }));

  res.json({
    message: "All tasks completed successfully",
    updated: pendingCount
  });
});

app.get("/tasks", (req, res) => {
  const search = req.query.search;
  const status = req.query.status;
  const completed = req.query.completed;
  const sort = req.query.sort;
  const priority = req.query.priority;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  let result = [...tasks];

  if (search) {
    result = result.filter((task) =>
      task.title.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (status === "completed") {
    result = result.filter((task) => task.completed === true);
  }

  if (status === "pending") {
    result = result.filter((task) => task.completed === false);
  }

  if (completed === "true") {
    result = result.filter((task) => task.completed === true);
  }

  if (completed === "false") {
    result = result.filter((task) => task.completed === false);
  }

  if (priority) {
    result = result.filter((task) => task.priority === priority);
  }

  if (sort === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sort === "id") {
    result.sort((a, b) => a.id - b.id);
  }

  if (sort === "priority") {
    result.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  if (sort === "newest") {
    result.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  if (sort === "oldest") {
    result.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedTasks = result.slice(startIndex, endIndex);

  res.json({
    page,
    limit,
    total: result.length,
    tasks: paginatedTasks
  });
});

app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  res.json(task);
});

app.post("/tasks", (req, res) => {
  const { title, priority, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({
      message: "Title is required"
    });
  }

  if (priority && !allowedPriorities.includes(priority)) {
    return res.status(400).json({
      message: "Priority must be low, medium, or high"
    });
  }

  if (dueDate && !isValidDate(dueDate)) {
    return res.status(400).json({
      message: "Due date must be a valid date in YYYY-MM-DD format"
    });
  }

  const maxId = tasks.reduce(
    (max, task) => Math.max(max, task.id),
    0
  );

  const newTask = {
    id: maxId + 1,
    title,
    completed: false,
    priority: priority || "medium",
    createdAt: new Date().toISOString(),
    dueDate: dueDate || null
  };

  tasks.push(newTask);

  res.status(201).json(newTask);
});

app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const { title, completed, priority, dueDate } = req.body;

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (priority && !allowedPriorities.includes(priority)) {
    return res.status(400).json({
      message: "Priority must be low, medium, or high"
    });
  }

  if (dueDate !== undefined && dueDate !== null && !isValidDate(dueDate)) {
    return res.status(400).json({
      message: "Due date must be a valid date in YYYY-MM-DD format"
    });
  }

  if (title !== undefined) {
    task.title = title;
  }

  if (completed !== undefined) {
    task.completed = completed;
  }

  if (priority !== undefined) {
    task.priority = priority;
  }

  if (dueDate !== undefined) {
    task.dueDate = dueDate;
  }

  res.json(task);
});

app.patch("/tasks/:id/title", (req, res) => {
  const id = Number(req.params.id);
  const { title } = req.body;

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (!title) {
    return res.status(400).json({
      message: "Title is required"
    });
  }

  task.title = title;

  res.json({
    message: "Task title updated successfully",
    task
  });
});

app.patch("/tasks/:id/priority", (req, res) => {
  const id = Number(req.params.id);
  const { priority } = req.body;

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (!priority || !allowedPriorities.includes(priority)) {
    return res.status(400).json({
      message: "Priority must be low, medium, or high"
    });
  }

  task.priority = priority;

  res.json({
    message: "Task priority updated successfully",
    task
  });
});

app.patch("/tasks/:id/complete", (req, res) => {
  const id = Number(req.params.id);

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  task.completed = true;

  res.json({
    message: "Task completed successfully",
    task
  });
});

app.patch("/tasks/:id/incomplete", (req, res) => {
  const id = Number(req.params.id);

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  task.completed = false;

  res.json({
    message: "Task marked as incomplete",
    task
  });
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);

  const taskExists = tasks.some((task) => task.id === id);

  if (!taskExists) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  tasks = tasks.filter((task) => task.id !== id);

  res.json({
    message: "Task deleted successfully"
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
