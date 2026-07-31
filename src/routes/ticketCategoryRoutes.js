const express = require("express");

const {
  getTicketsByConcert,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
} = require("../controllers/ticketCategoryController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRole = require("../middlewares/roleMiddleware");

const router = express.Router();

// ========================================
// PUBLIC
// ========================================

// GET tiket berdasarkan konser
router.get(
  "/concert/:concertId",
  getTicketsByConcert
);


// ========================================
// ADMIN
// ========================================

// POST tambah kategori tiket
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  createTicketCategory
);

// PUT edit kategori tiket
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  updateTicketCategory
);

//DELETE hapus kategori
router.delete(
    "/:id",
    authenticateToken,
    authorizeRole("admin"),
    deleteTicketCategory
);

module.exports = router;