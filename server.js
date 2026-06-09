const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// User database file
const USERS_DB = "users.json";

// Initialize users database
function initializeDB() {
  if (!fs.existsSync(USERS_DB)) {
    fs.writeFileSync(USERS_DB, JSON.stringify({}));
  }
}

// Load users from database
function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_DB, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save users to database
function saveUsers(users) {
  fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));
}

// Hash password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Verify password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: "7d" });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Middleware to check authentication
function authenticateToken(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = decoded.username;
  next();
}

// 🔥 storage per user
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = req.user;
    const dir = `uploads/${user}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ===== AUTHENTICATION ROUTES =====

// Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const users = loadUsers();

    if (users[username]) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await hashPassword(password);
    users[username] = { password: hashedPassword };
    saveUsers(users);

    const token = generateToken(username);
    res.json({ success: true, token, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const users = loadUsers();
    const user = users[username];

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken(username);
    res.json({ success: true, token, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token endpoint
app.get("/api/verify", authenticateToken, (req, res) => {
  res.json({ username: req.user });
});

// Logout endpoint
app.post("/api/logout", (req, res) => {
  res.json({ success: true });
});

// ===== FILE ROUTES (Protected) =====

// upload route (user-based)
app.post("/upload", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ success: true, filename: req.file.filename });
});

// list files per user
app.get("/files", authenticateToken, (req, res) => {
  const user = req.user;
  const dir = `uploads/${user}`;

  if (!fs.existsSync(dir)) return res.json([]);

  const files = fs.readdirSync(dir);
  res.json(files);
});

// delete file per user
app.delete("/delete/:filename", authenticateToken, (req, res) => {
  const user = req.user;
  const filename = req.params.filename;

  const safeName = decodeURIComponent(filename);
  const filePath = path.join(__dirname, "uploads", user, safeName);

  console.log("Deleting:", filePath);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.log("Delete error:", err.message);
      return res.status(500).json({ error: "Error deleting file" });
    }

    res.json({ success: true });
  });
});

// homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Initialize DB and start server
initializeDB();

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
