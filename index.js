const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const PORT = process.env.PORT || 8080;
const MONGOURL = process.env.MONGOURL;

app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

mongoose
  .connect(MONGOURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema({
  text: String,
  status: String,
  priority: String,
  userId: mongoose.Schema.Types.ObjectId,
});

const Task = mongoose.model("Task", taskSchema);

//Register New user to the system

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt(password, 10);
  const user = new User({
    username,
    password: hashed,
  });
  await user.save();
  res.json({
    message: "User Register Successfully",
  });
});

app.post("login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid Credentionals" });
  }
  const token = jwt.sign({ userId: user._id }, "secret", { expiresIn: "1h" });
  res.json({ token });
});

const authMiddlware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decode = jwt.verify(token, "secret");
    req.userId = decode.userId;
    next();
  } catch (e) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

app.get("/tasks", authMiddlware, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId });
  res.json(tasks);
});

app.post("/tasks", authMiddlware, async (req, res) => {
  const task = new Task({ ...req.body, userId: req.userId });
  await task.save();
  res.json(task);
});

app.delete("/tasks/:id", authMiddlware, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id.userId });
  res.json({ message: "Task Deleted Successfully" });
});

//Update Status of the Task
app.patch("/tasks/:id/status", authMiddlware, async (req, res) => {
  const { status } = req.body;
  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.userId,
    },
    { status },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "The task not exist" });
  res.json(task);
});
//Update priority
app.patch("/tasks/:id/priority", authMiddlware, async (req, res) => {
  const { priority } = req.body;
  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.userId,
    },
    { priority },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "The task not exist" });
  res.json(task);
});

app.listen(PORT, () => console.log("Server running on port 8080"));
