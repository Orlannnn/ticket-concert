const express = require("express");

const {
  getTicketsByConcert,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory,
} = require("../controllers/ticketCategoryController");

const {
  getMyTickets,
  validateTicket,
  useTicket,
} = require("../controllers/ticketController");

const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRole = require("../middlewares/roleMiddleware");

const router = express.Router();


// ========================================
// PUBLIC
// ========================================

// GET tiket berdasarkan konser
// GET /api/tickets/concert/:concertId
router.get(
  "/concert/:concertId",
  getTicketsByConcert
);


// ========================================
// ADMIN
// ========================================

// POST tambah kategori tiket
// POST /api/tickets
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  createTicketCategory
);

// PUT edit kategori tiket
// PUT /api/tickets/:id
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  updateTicketCategory
);

// DELETE hapus kategori tiket
// DELETE /api/tickets/:id
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  deleteTicketCategory
);

//Validasi tiket

router.post(
    "/validate",
    authenticateToken,
    authorizeRole("admin"),
    validateTicket,
);

//Use tiket

router.patch(
    "/use",
    authenticateToken,
    authorizeRole("admin"),
    useTicket
)



// USER


// GET tiket yang sudah dibeli user
// GET /api/tickets/my-tickets
router.get(
  "/my-tickets",
  authenticateToken,
  getMyTickets
);




module.exports = router;