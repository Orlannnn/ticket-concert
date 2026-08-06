const express = require("express");

const {
    createPayment,
    paymentSuccess,
} = require("../controllers/paymentController");

const authenticateToken = require("../middlewares/authMiddleware");

const router = express.Router();

//Membuat pembayaran

router.post(
    "/",
    authenticateToken,
    createPayment
);

router.patch(
    "/:id/success",
    authenticateToken,
    paymentSuccess,
)

module.exports = router;