const { ProductModel, OrderModel } = require("../Models/Shop.model");
const PatientModel = require("../Models/Patient.model");
const { sendOrderConfirmationEmail } = require("../Utils/email_service");

// GET /api/shop/products
const getAllProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort } = req.query;
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category:    { $regex: search, $options: "i" } },
      ];
    }
    if (category && category !== "All") {
      filter.category = { $regex: category, $options: "i" };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    let sortObj = { createdAt: -1 };
    if (sort === "price_asc")    sortObj = { price: 1 };
    if (sort === "price_desc")   sortObj = { price: -1 };
    if (sort === "rating")       sortObj = { averageRating: -1 };
    if (sort === "popular")      sortObj = { totalReviews: -1 };

    const products = await ProductModel.find(filter).sort(sortObj);
    res.json({ status: true, products });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// GET /api/shop/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ status: false, message: "Product not found" });
    res.json({ status: true, product });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// POST /api/shop/products (Doctor only)
const createProduct = async (req, res) => {
  try {
    const {
      title, description, price, stockQty,
      coverImage, galleryImages, category, features,
    } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({ status: false, message: "title, description, and price are required" });
    }

    const product = await ProductModel.create({
      title,
      description,
      price: parseFloat(price),
      stockQty: parseInt(stockQty) || 0,
      coverImage: coverImage || "",
      galleryImages: galleryImages || [],
      category: category || "General",
      features: features || [],
      doctorId: req.user?.userId || null,
    });

    res.status(201).json({ status: true, product });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// POST /api/shop/checkout
const checkout = async (req, res) => {
  try {
    const { cart, shippingAddress, patientId: bodyPatientId, paymentMethod = "Online" } = req.body;
    const patientId = req.user?.userId || bodyPatientId;

    if (!patientId) {
      return res.status(401).json({ status: false, message: "Not authenticated" });
    }
    if (!cart || cart.length === 0) {
      return res.status(400).json({ status: false, message: "Cart is empty" });
    }
    if (!shippingAddress?.street || !shippingAddress?.city || !shippingAddress?.state || !shippingAddress?.zip) {
      return res.status(400).json({ status: false, message: "Complete shipping address required" });
    }

    // Validate and resolve products
    let totalAmount = 0;
    const resolvedItems = [];
    for (const item of cart) {
      const product = await ProductModel.findById(item.productId || item._id);
      if (!product) continue;
      const qty = parseInt(item.qty || item.quantity || 1);
      totalAmount += product.price * qty;
      resolvedItems.push({
        productId: product._id,
        title:     product.title,
        price:     product.price,
        qty,
      });
      // Decrement stock
      product.stockQty = Math.max(0, product.stockQty - qty);
      await product.save();
    }

    const isCOD = paymentMethod === "COD";
    const transactionId = isCOD 
      ? "COD-" + Date.now() + "-" + Math.floor(Math.random() * 1000)
      : "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
    const paymentStatus = isCOD ? "Pending (COD)" : "Paid";

    const order = await OrderModel.create({
      patientId,
      items: resolvedItems,
      shippingAddress,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      paymentMethod,
      paymentStatus,
      orderStatus:   "Processing",
      transactionId,
    });

    // Send order receipt email asynchronously
    try {
      const patient = await PatientModel.findById(patientId);
      if (patient && patient.email) {
        const subtotalINR = totalAmount * 83;
        const shippingINR = subtotalINR >= 500 ? 0 : 49;
        const finalTotalINR = Math.round(subtotalINR + shippingINR);

        const itemsSummaryHtml = resolvedItems
          .map(item => `<strong>${item.title}</strong> × ${item.qty} = ₹${Math.round(item.price * 83 * item.qty)}`)
          .join('<br>') + (shippingINR > 0 ? `<br><span style="color:#64748b; font-size:13px;">Shipping Fee: ₹${shippingINR}</span>` : `<br><span style="color:#2d6a4f; font-size:13px; font-weight:700;">Shipping Fee: FREE</span>`);
        const fullAddress = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.zip}, ${shippingAddress.country || 'India'}`;
        
        sendOrderConfirmationEmail(patient.email, {
          patientName: patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Valued Patient',
          orderId: order._id,
          transactionId: order.transactionId,
          paymentMethod: isCOD ? "Cash on Delivery (COD)" : "Online Secure Payment",
          paymentStatus: order.paymentStatus,
          totalAmount: finalTotalINR,
          itemsSummary: itemsSummaryHtml,
          shippingAddress: fullAddress
        }).catch(err => console.error("Order email error:", err));
      }
    } catch (mailErr) {
      console.error("Failed to trigger order confirmation email:", mailErr);
    }

    res.status(201).json({
      status: true,
      message: "Order placed successfully",
      orderId: order._id,
      transactionId,
      totalAmount: order.totalAmount,
      paymentMethod,
      paymentStatus: order.paymentStatus
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// POST /api/shop/products/:id/review
const addReview = async (req, res) => {
  try {
    const { rating, comment, userName } = req.body;
    const product = await ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ status: false, message: "Product not found" });

    product.reviews.push({
      userId:   req.user?.userId,
      userName: userName || "Anonymous",
      rating:   parseInt(rating),
      comment,
    });
    await product.save();
    res.json({ status: true, product });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// DELETE /api/shop/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await ProductModel.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ status: false, message: "Product not found" });
    res.json({ status: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// GET /api/shop/orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await OrderModel.find()
      .populate("patientId", "name firstName lastName email phone mobileNumber contactNumber")
      .sort({ createdAt: -1 });
    res.json({ status: true, orders });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// GET /api/shop/orders/patient/:patientId
const getPatientOrders = async (req, res) => {
  try {
    const { patientId } = req.params;
    const orders = await OrderModel.find({ patientId }).sort({ createdAt: -1 });
    res.json({ status: true, orders });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

module.exports = { getAllProducts, getProductById, createProduct, checkout, addReview, deleteProduct, getAllOrders, getPatientOrders };
