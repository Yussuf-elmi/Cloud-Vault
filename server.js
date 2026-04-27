const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

// 👇 get username from query or body (simple version)
function getUser(req) {
  return req.query.user || "guest";
}

// 🔥 storage per user
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const user = req.query.user || "guest";
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

// upload route (user-based)
app.post("/upload", upload.single("file"), (req, res) => {
  res.redirect(`/?user=${req.query.user || "guest"}`);
});

// list files per user
app.get("/files", (req, res) => {
  const user = getUser(req);
  const dir = `uploads/${user}`;

  if (!fs.existsSync(dir)) return res.json([]);

  const files = fs.readdirSync(dir);
  res.json(files);
});

// delete file per user
app.delete("/delete/:filename", (req, res) => {
  const user = getUser(req);
  const filePath = `uploads/${user}/${req.params.filename}`;

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).send("Error deleting file");
    res.send("Deleted");
  });
});

// homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});