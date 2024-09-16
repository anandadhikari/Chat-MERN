const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const router = express.Router();
const keys = require("../../config/keys");
const verify = require("../../utilities/verify-token");

const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");
const GlobalMessage = require("../../models/GlobalMessage");

let jwtUser = null;

// Token verification middleware
router.use(async (req, res, next) => {
  try {
    jwtUser = jwt.verify(verify(req), keys.secretOrKey);
    next();
  } catch (err) {
    console.log(err);
    res.status(401).json({ message: "Unauthorized" });
  }
});

// Get global messages
router.get("/global", async (req, res) => {
  try {
    const messages = await GlobalMessage.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "fromObj",
        },
      },
      {
        $project: {
          "fromObj.password": 0,
          "fromObj.__v": 0,
          "fromObj.date": 0,
        },
      },
    ]);

    res.json(messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failure" });
  }
});

// Post global message
router.post("/global", async (req, res) => {
  try {
    const message = new GlobalMessage({
      from: jwtUser.id,
      body: req.body.body,
    });

    req.io.sockets.emit("messages", req.body.body);

    await message.save();
    res.json({ message: "Success" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failure" });
  }
});

// Get conversations list
router.get("/conversations", async (req, res) => {
  try {
    const from = new mongoose.Types.ObjectId(jwtUser.id);
    const conversations = await Conversation.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "recipients",
          foreignField: "_id",
          as: "recipientObj",
        },
      },
      {
        $match: {
          recipients: { $all: [{ $elemMatch: { $eq: from } }] },
        },
      },
      {
        $project: {
          "recipientObj.password": 0,
          "recipientObj.__v": 0,
          "recipientObj.date": 0,
        },
      },
    ]);

    res.json(conversations);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failure" });
  }
});

// Get messages from conversation based on to & from
router.get("/conversations/query", async (req, res) => {
  try {
    const user1 = new mongoose.Types.ObjectId(jwtUser.id);
    const user2 = new mongoose.Types.ObjectId(req.query.userId);

    const messages = await Message.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "to",
          foreignField: "_id",
          as: "toObj",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "from",
          foreignField: "_id",
          as: "fromObj",
        },
      },
      {
        $match: {
          $or: [
            { $and: [{ to: user1 }, { from: user2 }] },
            { $and: [{ to: user2 }, { from: user1 }] },
          ],
        },
      },
      {
        $project: {
          "toObj.password": 0,
          "toObj.__v": 0,
          "toObj.date": 0,
          "fromObj.password": 0,
          "fromObj.__v": 0,
          "fromObj.date": 0,
        },
      },
    ]);

    res.json(messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failure" });
  }
});

// Post private message
router.post("/", async (req, res) => {
  try {
    const from = new mongoose.Types.ObjectId(jwtUser.id);
    const to = new mongoose.Types.ObjectId(req.body.to);

    const conversation = await Conversation.findOneAndUpdate(
      {
        recipients: {
          $all: [{ $elemMatch: { $eq: from } }, { $elemMatch: { $eq: to } }],
        },
      },
      {
        recipients: [jwtUser.id, req.body.to],
        lastMessage: req.body.body,
        date: Date.now(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const message = new Message({
      conversation: conversation._id,
      to: req.body.to,
      from: jwtUser.id,
      body: req.body.body,
    });

    req.io.sockets.emit("messages", req.body.body);

    await message.save();
    res.json({
      message: "Success",
      conversationId: conversation._id,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failure" });
  }
});

module.exports = router;
