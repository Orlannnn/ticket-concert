const express = require("express");

const {
    getDashboard,
} = require("../controllers/adminController");

const authenticateToken = require("../middlewares/authMiddleware");
const authenticateRole = require("../middlewares/roleMiddleware");

const router = express.Router();

//ADMIN DASHBOARD

router.get(
    "/dashboard",
    authenticateToken,
    authenticateRole("admin"),
    getDashboard,
);

module.exports = router;