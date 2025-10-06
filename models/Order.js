const mongoose = require("mongoose");
const Menuitem = require('./MenuItem');
const orderSchema = new mongoose.Schema({
  order_id: String,
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",  // This should match your item model name
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  datetime: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", orderSchema);
