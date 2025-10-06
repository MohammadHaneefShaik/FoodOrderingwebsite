const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  admin_name: String,
  admin_email: String,
  admin_password: String,
});

module.exports = mongoose.model("Admin", adminSchema);
