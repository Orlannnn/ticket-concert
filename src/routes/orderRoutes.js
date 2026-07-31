const express = require("express");

const {
  createOrder,
  getMyOrders,
  getOrderDetail,
  payOrder,
  cancelOrder,
  expireOrder,
} = require("../controllers/orderController");

const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

// CREATE ORDER
router.post(
  "/",
  authenticateToken,
  createOrder
);

// GET MY ORDERS
router.get(
  "/my-orders",
  authenticateToken,
  getMyOrders
);

// GET ORDER DETAIL
router.get(
  "/:id",
  authenticateToken,
  getOrderDetail
);
// Pay Order 

router.patch(
  "/:id/pay",
  authenticateToken,
  payOrder
)

router.patch(
  "/:id/cancel",
  authenticateToken,
  cancelOrder, 
)

router.patch(
  "/:id/expire",
  authenticateToken,
  expireOrder,
)

module.exports = router;