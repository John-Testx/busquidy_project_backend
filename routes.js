const express = require("express");
const router = express.Router();
const sendError = (res, status, message) => res.status(status).json({message});

const empresaRoutes = require("./routes/empresaRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const freelancerRoutes = require("./routes/freelancerRoutes");
const supportRoutes = require("./routes/supportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const chatRoutes = require("./routes/chatRoutes");

router.use("/support", supportRoutes);
router.use("/empresa", empresaRoutes);
router.use("/freelancer", freelancerRoutes);
router.use("/users", userRoutes );
router.use("/projects", projectRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin", adminRoutes);
router.use("/recommend", recommendRoutes )
router.use("/chat", chatRoutes );

module.exports = router;