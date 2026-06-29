const express = require("express");
const router  = express.Router();
const Auth    = require("../Middlewares/JWT.authentication");
const { getAllProducts, getProductById, createProduct, checkout, addReview, deleteProduct, getAllOrders, getPatientOrders } = require("../Controllers/Shop.controller");

// Public routes
router.get("/products",        getAllProducts);
router.get("/products/:id",    getProductById);

// Authenticated routes
router.get("/orders",                         Auth, getAllOrders);
router.get("/orders/patient/:patientId",      Auth, getPatientOrders);
router.post("/products",                      Auth, createProduct);
router.delete("/products/:id",                Auth, deleteProduct);
router.post("/checkout",                      Auth, checkout);
router.post("/products/:id/review",           Auth, addReview);

module.exports = router;
