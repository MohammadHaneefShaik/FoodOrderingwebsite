const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  user_name: String,
  user_address: String,
  user_email: String,
  user_password: String,
  user_mobileno: String,
});

module.exports = mongoose.model("User", userSchema);
