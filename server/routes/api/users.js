const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const keys = require("../../config/keys");
const verify = require("../../utilities/verify-token");
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");
const User = require("../../models/User");

// GET Route to fetch users
router.get("/", async (req, res) => {
  try {
    // Verify token and extract user
    let jwtUser = jwt.verify(verify(req), keys.secretOrKey);
    let id = new mongoose.Types.ObjectId(jwtUser.id);
    console.warn(jwtUser);
    // Aggregate query
    const users = await User.aggregate([
      { $match: { _id: { $not: { $eq: id } } } },
      { $project: { password: 0, __v: 0, date: 0 } },
    ]);

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Unauthorized" });
  }
});

// POST Route to register a new user
router.post("/register", async (req, res) => {
  // Form validation
  console.log(req.body);
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  try {
    // Check if user exists
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create new user
    const newUser = new User({
      name: req.body.name,
      username: req.body.username,
      password: req.body.password,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    newUser.password = await bcrypt.hash(newUser.password, salt);

    // Save user
    const user = await newUser.save();

    // Create JWT payload
    const payload = { id: user.id, name: user.name };

    // Sign token
    const token = jwt.sign(payload, keys.secretOrKey, { expiresIn: 31556926 }); // 1 year

    req.io.sockets.emit("users", user.username);
    res.json({ success: true, token: "Bearer " + token, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering user" });
  }
});

// POST Route to login
router.post("/login", async (req, res) => {
  // Form validation
  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const { username, password } = req.body;

  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ usernamenotfound: "Username not found" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ passwordincorrect: "Password incorrect" });
    }

    // Create JWT payload
    const payload = { id: user.id, name: user.name };

    // Sign token
    const token = jwt.sign(payload, keys.secretOrKey, { expiresIn: 86400 }); // 1 day

    res.json({
      success: true,
      token: "Bearer " + token,
      name: user.name,
      username: user.username,
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error logging in" });
  }
});

module.exports = router;
