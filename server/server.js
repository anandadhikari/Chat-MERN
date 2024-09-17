const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const passport = require("passport");
const cors = require("cors");
const morgan = require("morgan");
const handlerWithCors = require("./utilities/allowCors"); // Replace with the path to your file
const users = require("./routes/api/users");
const messages = require("./routes/api/messages");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const db = require("./config/keys").mongoURI;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    credentials: true,
  })
);
app.use(express.static(path.join(__dirname, "client", "build")));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
  });
}

// Passport middleware
app.use(passport.initialize());
require("./config/passport")(passport);

// Create HTTP server
const http = require("http");
const socketIO = require("socket.io");

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});
// Efficiently inject Socket.IO instance into routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Apply CORS handling to all routes
app.use(handlerWithCors);

// Routes
app.use("/api/users", users);
app.use("/api/messages", messages);

// Connect to MongoDB
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(db);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

// Start server
server.listen(PORT, () => {
  connectToMongoDB();
  console.log(`Backend server is running on port ${PORT}`);
});
