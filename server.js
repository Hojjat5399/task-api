const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

const allowedPriorities = ["low", "medium", "high"];
const MAX_TITLE_LENGTH = 100;
const MAX_PAGE_LIMIT = 50;
const DUE_SOON_DAYS = 3;

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

const getTaskId = (value) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const normalizeTitle = (title) => {
  if (typeof title !== "string") {
    return "";
  }

  return title.trim();
};

const isValidTitle = (title) => {
  return (
    title.length > 0 &&
    title.length <= MAX_TITLE_LENGTH
  );
};

let tasks = [
  {
    id: 1,
    title: "Learn Node.js",
    completed: false,
    priority: "high",
    createdAt: "2026-09-11T10:00:00.000Z",
    updatedAt: "2026-09-11T10:00:00.000Z",
    dueDate: "2026-09-15"
  },
  {
    id: 2,
    title: "Build an API",
    completed: false,
    priority: "medium",
    createdAt: "2026-09-11T10:30:00.000Z",
    updatedAt: "2026-09-11T10:30:00.000Z",
    dueDate: "2026-09-20"
  }
];

app.get("/", (req, res) => {
  res.json({
    message: "Task API is running"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "task-api",
    timestamp: new Date().toISOString()
  });
});

app.get("/version", (req, res) => {
  res.json({
    name: "task-api",
    version: "1.0.0"
  });
});

app.get("/tasks/count", (req, res) => {
  res.json({
    count: tasks.length
  });
});

app.get("/tasks/high-priority", (req, res) => {
  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "high"
  );

  res.json({
    count: highPriorityTasks.length,
    tasks: highPriorityTasks
  });
});

app.get("/tasks/completed", (req, res) => {
  const completedTasks = tasks.filter(
    (task) => task.completed === true
  );

  res.json({
    count: completedTasks.length,
    tasks: completedTasks
  });
});

app.get("/tasks/pending", (req, res) => {
  const pendingTasks = tasks.filter(
    (task) => task.completed === false
  );

  res.json({
    count: pendingTasks.length,
    tasks: pendingTasks
  });
});

app.get("/tasks/search", (req, res) => {
  const query = normalizeTitle(req.query.q);

  if (!query) {
    return res.status(400).json({
      message: "Search query is required"
    });
  }

  const results = tasks.filter((task) =>
    task.title.toLowerCase().includes(query.toLowerCase())
  );

  res.json({
    query,
    count: results.length,
    tasks: results
  });
});

app.get("/tasks/overdue", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const overdueTasks = tasks.filter(
    (task) =>
      task.completed === false &&
      task.dueDate &&
      task.dueDate < today
  );

  res.json({
    date: today,
    count: overdueTasks.length,
    tasks: overdueTasks
  });
});

app.get("/tasks/due-soon", (req, res) => {
  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  const futureDate = new Date(today);
  futureDate.setUTCDate(
    futureDate.getUTCDate() + DUE_SOON_DAYS
  );

  const futureDateString = futureDate
    .toISOString()
    .split("T")[0];

  const dueSoonTasks = tasks.filter(
    (task) =>
      task.completed === false &&
      task.dueDate &&
      task.dueDate >= todayString &&
      task.dueDate <= futureDateString
  );

  res.json({
    from: todayString,
    to: futureDateString,
    count: dueSoonTasks.length,
    tasks: dueSoonTasks
  });
});

app.get("/tasks/stats", (req, res) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.filter((task) => !task.completed).length;

  const highPriority = tasks.filter(
    (task) => task.priority === "high"
  ).length;

  const mediumPriority = tasks.filter(
    (task) => task.priority === "medium"
  ).length;

  const lowPriority = tasks.filter(
    (task) => task.priority === "low"
  ).length;

  res.json({
    total,
    completed,
    pending,
    priorities: {
      high: highPriority,
      medium: mediumPriority,
      low: lowPriority
    }
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

app.patch("/tasks/incomplete/all", (req, res) => {
  const completedCount = tasks.filter((task) => task.completed).length;

  tasks = tasks.map((task) => ({
    ...task,
    completed: false
  }));

  res.json({
    message: "All tasks marked as incomplete",
    updated: completedCount
  });
});

app.get("/tasks", (req, res) => {
  const search = req.query.search;
  const status = req.query.status;
  const completed = req.query.completed;
  const sort = req.query.sort;
  const priority = req.query.priority;

  const page = Number(req.query.page) || 1;
  const requestedLimit = Number(req.query.limit) || 10;
  const limit = Math.min(requestedLimit, MAX_PAGE_LIMIT);

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({
      message: "Page must be a positive integer"
    });
  }

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

  const total = result.length;
  const totalPages = Math.ceil(total / limit);

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedTasks = result.slice(startIndex, endIndex);

  res.json({
    page,
    limit,
    total,
    totalPages,
    tasks: paginatedTasks
  });
});

app.get("/tasks/:id", (req, res) => {
  const id = getTaskId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Task ID must be a positive integer"
    });
  }

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  res.json(task);
});

app.post("/tasks", (req, res) => {
  const { priority, dueDate } = req.body;
  const title = normalizeTitle(req.body.title);

  if (!isValidTitle(title)) {
    return res.status(400).json({
      message: "Title is required and must be at most 100 characters"
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

  const now = new Date().toISOString();

  const newTask = {
    id: maxId + 1,
    title,
    completed: false,
    priority: priority || "medium",
    createdAt: now,
    updatedAt: now,
    dueDate: dueDate || null
  };

  tasks.push(newTask);

  res.status(201).json(newTask);
});

app.put("/tasks/:id", (req, res) => {
  const id = getTaskId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Task ID must be a positive integer"
    });
  }

  const { completed, priority, dueDate } = req.body;

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

  if (req.body.title !== undefined) {
    const title = normalizeTitle(req.body.title);

    if (!isValidTitle(title)) {
      return res.status(400).json({
        message: "Title is required and must be at most 100 characters"
      });
    }

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

  task.updatedAt = new Date().toISOString();

  res.json(task);
});

app.patch("/tasks/:id/title", (req, res) => {
  const id = getTaskId(req.params.id);
  const title = normalizeTitle(req.body.title);

  if (id === null) {
    return res.status(400).json({
      message: "Task ID must be a positive integer"
    });
  }

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (!isValidTitle(title)) {
    return res.status(400).json({
      message: "Title is required and must be at most 100 characters"
    });
  }

  task.title = title;
  task.updatedAt = new Date().toISOString();

  res.json({
    message: "Task title updated successfully",
    task
  });
});

app.patch("/tasks/:id/priority", (req, res) => {
  const id = getTaskId(req.params.id);
  const { priority } = req.body;

  if (id === null) {
    return res.status(400).json({
      message: "Task ID must be a positive integer"
    });
  }

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
  task.updatedAt = new Date().toISOString();

  res.json({
    message: "Task priority updated successfully",
    task
  });
});

app.patch("/tasks/:id/complete", (req, res) => {
  const id = getTaskId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Task ID must be a positive integer"
    });
  }

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  task.completed = true;
  task.updatedAt = new Date().toISOString();

  res.json({
    message: "Task completed successfully",
    task
  });
});

app.patch("/tasks/:id/incomplete", (req, res) => {
  const id = getTaskId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Task ID must be a positive integer"
    });
  }

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  task.completed = false;
  task.updatedAt = new Date().toISOString();

  res.json({
    message: "Task marked as incomplete",
    task
  });
});

app.delete("/tasks/:id", (req, res) => {
  const id = getTaskId(req.params.id);

  if (id === null) {
    return res.status(400).json({
      message: "Task ID must be a positive integer"
    });
  }

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  tasks = tasks.filter((task) => task.id !== id);

  res.json({
    message: "Task deleted successfully",
    task
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
