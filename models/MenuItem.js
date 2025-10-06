const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  item_name: String,
  item_type: String,
  item_category: String,
  item_serving: Number,
  item_calories: Number,
  item_price: Number,
  item_rating: Number,
  item_img: String,
});

module.exports = mongoose.model("MenuItem", menuItemSchema);
