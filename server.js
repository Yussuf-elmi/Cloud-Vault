const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// serve uploaded files
app.use("/uploads", express.static("uploads"));

// serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// upload route
app.post("/upload", upload.single("file"), (req, res) => {
  res.redirect("/");
});

// list files
app.get("/files", (req, res) => {
  const files = fs.readdirSync("uploads");
  res.json(files);
});

// delete file
app.delete("/delete/:filename", (req, res) => {
  const filePath = `uploads/${req.params.filename}`;

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).send("Error deleting file");
    res.send("Deleted");
  });
});

// start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});