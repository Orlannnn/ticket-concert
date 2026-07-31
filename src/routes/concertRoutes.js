const express = require("express");

const {
  getAllConcerts,
  getConcertById,
  createConcert,
  updateConcert,
  deleteConcert, 
} = require("../controllers/concertController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRole = require("../middlewares/roleMiddleware");

const router = express.Router();

// ========================================
// PUBLIC ROUTES
// ========================================

// GET semua konser
router.get("/", getAllConcerts);

// GET detail konser
router.get("/:id", getConcertById);


// ========================================
// ADMIN ROUTES
// ========================================

// POST tambah konser
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  createConcert
);

// PUT edit konser
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  updateConcert
);

// DELETE hapus konser
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  deleteConcert
);

module.exports = router;