const mongoose = require("mongoose");

// Review Sub-Schema
const ReviewSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId },
  userName: { type: String, default: "Anonymous" },
  rating:   { type: Number, min: 1, max: 5, required: true },
  comment:  { type: String },
  date:     { type: Date, default: Date.now },
});

// Product Schema
const ProductSchema = new mongoose.Schema(
  {
    title:         { type: String, required: true, trim: true },
    description:   { type: String, required: true },
    price:         { type: Number, required: true, min: 0 },
    stockQty:      { type: Number, required: true, default: 0 },
    coverImage:    { type: String, default: "" },
    galleryImages: [{ type: String }],
    category:      { type: String, default: "General", index: true },
    features:      [{ type: String }],
    doctorId:      { type: mongoose.Schema.Types.ObjectId, ref: "Doctors" },
    reviews:       [ReviewSchema],
    averageRating: { type: Number, default: 0 },
    totalReviews:  { type: Number, default: 0 },
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.pre("save", function (next) {
  if (this.reviews && this.reviews.length > 0) {
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.averageRating = parseFloat((total / this.reviews.length).toFixed(1));
    this.totalReviews = this.reviews.length;
  }
  next();
});

// Order Schema
const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  title:     { type: String },
  price:     { type: Number },
  qty:       { type: Number, required: true, min: 1 },
});

const ShippingAddressSchema = new mongoose.Schema({
  fullName: { type: String },
  phone:    { type: String },
  street:   { type: String, required: true },
  city:     { type: String, required: true },
  state:    { type: String, required: true },
  zip:      { type: String, required: true },
  country:  { type: String, default: "India" },
});

const OrderSchema = new mongoose.Schema(
  {
    patientId:       { type: mongoose.Schema.Types.ObjectId, ref: "Patients", required: true },
    items:           [OrderItemSchema],
    shippingAddress: { type: ShippingAddressSchema, required: true },
    totalAmount:     { type: Number, required: true },
    paymentMethod:   { type: String, default: "Online" },
    paymentStatus:   { type: String, enum: ["Pending", "Paid", "Failed", "Pending (COD)", "COD"], default: "Pending" },
    orderStatus:     { type: String, enum: ["Processing", "Shipped", "Delivered", "Cancelled"], default: "Processing" },
    transactionId:   { type: String },
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("Product", ProductSchema);
const OrderModel   = mongoose.model("Order",   OrderSchema);

module.exports = { ProductModel, OrderModel };
