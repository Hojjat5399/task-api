const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

let tasks = [
  {
    id: 1,
    title: "Learn Node.js",
    completed: false
  },
  {
    id: 2,
    title: "Build an API",
    completed: false
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

app.get("/tasks", (req, res) => {
  const search = req.query.search;
  const status = req.query.status;
  const sort = req.query.sort;
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

  if (sort === "title") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sort === "id") {
    result.sort((a, b) => a.id - b.id);
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
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({
      message: "Title is required"
    });
  }

  const newTask = {
    id: tasks.length + 1,
    title,
    completed: false
  };

  tasks.push(newTask);

  res.status(201).json(newTask);
});

app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const { title, completed } = req.body;

  const task = tasks.find((task) => task.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task not found"
    });
  }

  if (title !== undefined) {
    task.title = title;
  }

  if (completed !== undefined) {
    task.completed = completed;
  }

  res.json(task);
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
