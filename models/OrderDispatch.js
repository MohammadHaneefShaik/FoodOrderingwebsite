const mongoose = require("mongoose");

const orderDispatchSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId, // or ObjectId if referencing Users collection
    required: true,
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    // or ObjectId if referencing MenuItem collection
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
    required: true,
  }
});

module.exports = mongoose.model("OrderDispatch", orderDispatchSchema);
