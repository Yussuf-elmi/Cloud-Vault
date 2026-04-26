const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- MIDDLEWARE -------------------- */
app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

/* Allow frontend to access backend */
const cors = require("cors");
app.use(cors());

/* Serve uploaded files */
app.use("/uploads", express.static("uploads"));

/* -------------------- STORAGE CONFIG -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* -------------------- ROUTES -------------------- */

/* Upload file */
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("UPLOAD ROUTE HIT");
  console.log(req.file);

  res.send("File uploaded successfully");
});

/* List files */
app.get("/files", (req, res) => {
  const files = fs.readdirSync("uploads");
  res.json(files);
});

/* Delete file */
app.delete("/delete/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error deleting file");
    }

    res.send("Deleted");
  });
});

/* Optional homepage */
app.get("/", (req, res) => {
  res.send("Mini Drive is running 🚀");
});

/* -------------------- START SERVER -------------------- */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});