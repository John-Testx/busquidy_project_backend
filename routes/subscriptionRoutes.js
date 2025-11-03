// routes/subscriptionRoutes.js
const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/payment/subscriptionController");
const { verifyToken } = require("../middlewares/auth"); // ¡Protegido!

// @route   GET /api/subscriptions/active
router.get("/active", verifyToken, subscriptionController.getActiveSubscription);

// @route   POST /api/subscriptions/cancel
router.post("/cancel", verifyToken, subscriptionController.cancelActiveSubscription);

module.exports = router;