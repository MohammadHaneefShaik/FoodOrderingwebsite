// Loading and Using Modules Required
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const ejs = require("ejs");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql");

// Initialize Express App
const app = express();

// Set View Engine and Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());

// Database Connection
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));


/*****************************  User-End Portal ***************************/

// Routes for User Sign-up, Sign-in, Home Page, Cart, Checkout, Order Confirmation, My Orders, and Settings
app.get("/", renderIndexPage);
app.get("/signup", renderSignUpPage);
app.post("/signup", signUpUser);
app.get("/signin", renderSignInPage);
app.post("/signin", signInUser);
app.get("/homepage", renderHomePage);
app.get("/cart", renderCart);
app.post("/cart", updateCart);
app.post("/checkout", checkout);
app.get("/confirmation", renderConfirmationPage);
app.get("/myorders", renderMyOrdersPage);
app.get("/settings", renderSettingsPage);
app.post("/address", updateAddress);
app.post("/contact", updateContact);
app.post("/password", updatePassword);

/***************************************** Admin End Portal ********************************************/
// Routes for Admin Sign-in, Admin Homepage, Adding Food, Viewing and Dispatching Orders, Changing Price, and Logout
app.get("/admin_signin", renderAdminSignInPage);
app.post("/admin_signin", adminSignIn);
app.get("/adminHomepage", renderAdminHomepage);
app.get("/admin_addFood", renderAddFoodPage);
app.post("/admin_addFood", addFood);
app.get("/admin_view_dispatch_orders", renderViewDispatchOrdersPage);
app.post("/admin_view_dispatch_orders", dispatchOrders);
app.get("/admin_change_price", renderChangePricePage);
app.post("/admin_change_price", changePrice);
app.get("/logout", logout);

/***************************** Route Handlers ***************************/
const Orders = require("./models/Order");

// Index Page
function renderIndexPage(req, res) {
  res.render("index");
}

// User Sign-up
function renderSignUpPage(req, res) {
  res.render("signup");
}
async function signUpUser(req, res) {
  try {
    const { name, address, email, mobile, password } = req.body;
    await User.create({ user_name: name, user_address: address, user_email: email, user_password: password, user_mobileno: mobile });
    res.render('signin');
  } catch (err) {
    console.error(err);
    res.render('signup', { error: 'Failed to register user' });
  }
}


// User Sign-in

function renderSignInPage(req, res) {
  res.render("signin");
}

async function signInUser(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ user_email: email });
  if (!user || user.user_password !== password) {
    return res.render('signin', { error: 'Invalid credentials' });
  }
  res.cookie('cookuid', user._id);
  res.cookie('cookuname', user.user_name);
  res.redirect('/homepage');
}

async function renderHomePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const user = await User.findById(userId);
  if (!user || user.user_name !== userName) return res.render('signin');
  const items = await Menu.find();
  res.render('homepage', { username: userName, userid: userId, items });
}


async function renderCart(req, res) {
  try {
    const userId = req.cookies.cookuid;
    const userName = req.cookies.cookuname;

    const user = await User.findOne({ _id: userId, user_name: userName });
    if (!user) return res.render("signin");

    res.render("cart", {
      username: userName,
      userid: userId,
      items: citemdetails, // assuming this is still updated in memory
      item_count: item_in_cart,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

let citemdetails = [];
let item_in_cart = 0;

async function updateCart(req, res) {
  try {
    const cartItems = req.body.cart;
    const uniqueItems = [...new Set(cartItems)];

    const items = await getItemDetails(uniqueItems);
    citemdetails = items;
    item_in_cart = items.length;

    // You can respond or redirect as needed
    res.status(200).send("Cart updated successfully");
  } catch (err) {
    console.error("Failed to update cart:", err);
    res.status(500).send("Something went wrong");
  }
}

async function getItemDetails(itemIds) {
  try {
    const items = await Menu.find({ _id: { $in: itemIds } });
    return items;
  } catch (err) {
    console.error("Error fetching item details:", err);
    return [];
  }
}

async function renderSettingsPage(req, res) {
  try {
    const userId = req.cookies.cookuid;
    const userName = req.cookies.cookuname;

    const user = await User.findOne({ _id: userId, user_name: userName });
    if (!user) return res.render("signin");

    res.render("settings", {
      username: userName,
      userid: userId,
      item_count: item_in_cart,
    });
  } catch (err) {
    console.error("Error rendering settings page:", err);
    res.status(500).send("Internal Server Error");
  }
}



async function checkout(req, res) {
  const uid = req.cookies.cookuid, uname = req.cookies.cookuname;
  console.log(uid)
  const user = await User.findById(uid);
  console.log(user);
  if (!user || user.user_name !== uname) return res.render('signin');

  let { itemid, quantity, subprice } = req.body;
  const itemIds = req.body.itemid;       // array of ObjectIds
  const quantities = req.body.quantity;  // array of quantities
  const subprices = req.body.subprice;   // array of subprices

  const currDate = new Date();

  // Convert string/array values to numbers
  if (!Array.isArray(itemid)) {
    itemid = [itemid];
    quantity = [quantity];
    subprice = [subprice];
  }

  const entries = itemid.map((itm, idx) => {
    const q = parseInt(quantity[idx]);
    const p = parseFloat(subprice[idx]);
    return {
      order_id: uuidv4(),
      user_id: uid,
      item_id: itm,
      quantity: q,
      price: q * p,
      datetime: currDate,
    };
  }).filter(o => o && o.quantity);  // filter out invalid ones

  try {
    await Orders.insertMany(entries);
    res.render('confirmation', { username: uname, userid: uid });
  } catch (err) {
    console.error('Insert Error:', err);
    res.status(500).send('Failed to place order.');
  }
}


async function renderConfirmationPage(req, res) {
  try {
    const userId = req.cookies.cookuid;
    const userName = req.cookies.cookuname;

    const user = await User.findOne({ _id: userId, user_name: userName });
    if (!user) return res.render("signin");

    res.render("confirmation", { username: userName, userid: userId });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}

async function renderMyOrdersPage(req, res) {
  const cartItems = req.body.cart;
  const uid = req.cookies.cookuid, uname = req.cookies.cookuname;
  const user = await User.findById(uid).select('user_name user_email user_address user_mobileno');
  if (!user || user.user_name !== uname) return res.render('signin');
  const orders = await Orders.find({ user_id: uid }).populate('item_id', 'item_name item_img');
  res.render('myorders', { userDetails: [user], items: orders, item_count: cartItems?.length || 0 });
}


const User = require('./models/User'); // Ensure your User model is imported

async function updateContact(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const mobileno = req.body.mobileno;

  try {
    const user = await User.findOne({ _id: userId, user_name: userName });

    if (!user) return res.render("signin");

    user.user_mobileno = mobileno;
    await user.save();

    res.render("settings", {
      username: userName,
      userid: userId,
      item_count: item_in_cart,
    });
  } catch (err) {
    console.error("Contact update failed:", err);
    res.status(500).send("Something went wrong");
  }
}

async function updateAddress(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const address = req.body.address;

  try {
    const user = await User.findOne({ _id: userId, user_name: userName });

    if (!user) return res.render("signin");

    user.user_address = address;
    await user.save();

    res.render("settings", {
      username: userName,
      userid: userId,
      item_count: item_in_cart,
    });
  } catch (err) {
    console.error("Address update failed:", err);
    res.status(500).send("Something went wrong");
  }
}

async function updatePassword(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;
  const oldPassword = req.body.old_password;
  const newPassword = req.body.new_password;

  try {
    const user = await User.findOne({ _id: userId, user_name: userName });

    if (!user || user.user_password !== oldPassword) {
      return res.render("signin");
    }

    user.user_password = newPassword;
    await user.save();

    res.render("settings", {
      username: userName,
      userid: userId,
      item_count: item_in_cart,
    });
  } catch (err) {
    console.error("Password update failed:", err);
    res.status(500).send("Something went wrong");
  }
}


// Admin Sign-in

function renderAdminSignInPage(req, res) {
  res.render("admin_signin");
}
const Admin = require("./models/Admin");

async function renderAdminSignInPage(req, res) {
  res.render("admin_signin");
}

async function adminSignIn(req, res) {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ admin_email: email, admin_password: password });
    if (!admin) {
      return res.render("admin_signin", { error: "Invalid credentials" });
    }
    res.cookie("cookuid", admin._id.toString());
    res.cookie("cookuname", admin.admin_name);
    res.render("adminHomepage", { username: admin.admin_name, userid: admin._id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
}

async function renderAdminHomepage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  try {
    const admin = await Admin.findOne({ _id: userId, admin_name: userName });
    if (!admin) return res.render("admin_signin");

    res.render("adminHomepage", {
      username: userName,
      userid: userId,
    });
  } catch (err) {
    console.error("Error rendering admin homepage:", err);
    res.status(500).send("Something went wrong");
  }
}

async function renderAddFoodPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  const admin = await Admin.findOne({ _id: userId, admin_name: userName });
  if (!admin) return res.render("admin_signin");

  res.render("admin_addFood", {
    username: userName,
    userid: userId,
    items: [admin],
  });
}
const Menu = require("./models/MenuItem");

async function addFood(req, res) {
  const {
    FoodName,
    FoodType,
    FoodCategory,
    FoodServing,
    FoodCalories,
    FoodPrice,
    FoodRating,
  } = req.body;

  if (!req.files || !req.files.FoodImg) {
    return res.status(400).send("Image was not uploaded");
  }

  const fimage = req.files.FoodImg;
  const fimage_name = fimage.name;

  if (!["image/jpeg", "image/png"].includes(fimage.mimetype)) {
    return res.status(400).send("Invalid image format");
  }

  try {
    await fimage.mv("public/images/dish/" + fimage_name);

    const newFood = new Menu({
      item_name: FoodName,
      item_type: FoodType,
      item_category: FoodCategory,
      item_serving: FoodServing,
      item_calories: FoodCalories,
      item_price: FoodPrice,
      item_rating: FoodRating,
      item_img: fimage_name,
    });

    await newFood.save();
    res.redirect("/admin_addFood");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving food");
  }
}

const OrderDispatch = require("./models/OrderDispatch");

async function renderViewDispatchOrdersPage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  const admin = await Admin.findOne({ _id: userId, admin_name: userName });
  if (!admin) return res.render("admin_signin");

  const orders = await Orders.find().sort({ datetime: 1 });
  res.render("admin_view_dispatch_orders", {
    username: userName,
    userid: userId,
    orders: orders,
  });
}

async function dispatchOrders(req, res) {
  const totalOrder = req.body.order_id_s;
  const uniqueOrderIds = [...new Set(totalOrder)];

  try {
    for (const orderId of uniqueOrderIds) {
      const order = await Orders.findOne({ order_id: orderId });
      if (order) {
        const dispatched = new OrderDispatch({
          order_id: order.order_id,
          user_id: order.user_id,
          item_id: order.item_id,
          quantity: order.quantity,
          price: order.price,
          datetime: new Date(),
        });
        await dispatched.save();
        await Orders.deleteOne({ order_id: orderId });
      }
    }

    const orders = await Orders.find().sort({ datetime: 1 });
    res.render("admin_view_dispatch_orders", {
      username: req.cookies.cookuname,
      orders: orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
}

async function renderChangePricePage(req, res) {
  const userId = req.cookies.cookuid;
  const userName = req.cookies.cookuname;

  const admin = await Admin.findOne({ _id: userId, admin_name: userName });
  if (!admin) return res.render("signin");

  const items = await Menu.find();
  res.render("admin_change_price", {
    username: userName,
    items: items,
  });
}



async function changePrice(req, res) {
  const { item_name, NewFoodPrice } = req.body;

  try {
    const item = await Menu.findOne({ item_name });

    if (!item) {
      return res.status(404).send("Item not found");
    }

    item.item_price = NewFoodPrice;
    await item.save();

    res.render("adminHomepage", {
      username: req.cookies.cookuname,
      userid: req.cookies.cookuid,
    });
  } catch (error) {
    console.error("Price update error:", error);
    res.status(500).send("Something went wrong");
  }
}

function logout(req, res) {
  res.clearCookie("cookuid");
  res.clearCookie("cookuname");
  res.redirect("/signin");
}


module.exports = app;
