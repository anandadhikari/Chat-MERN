const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema for Users
const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    default: Date.now,
  },
});
const User = mongoose.model("users", UserSchema);
module.exports = User;
