const db = require("../config/db");

// ========================================
// GET TICKET CATEGORIES BY CONCERT
// ========================================
const getTicketsByConcert = async (req, res) => {
  try {
    const { concertId } = req.params;

    // Cek apakah konser ada
    const [concert] = await db.query(
      "SELECT id, title FROM concerts WHERE id = ?",
      [concertId]
    );

    if (concert.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Concert not found",
      });
    }

    // Ambil semua kategori tiket
    const [tickets] = await db.query(
      `SELECT
        id,
        concert_id,
        name,
        price,
        stock,
        created_at
      FROM ticket_categories
      WHERE concert_id = ?
      ORDER BY price ASC`,
      [concertId]
    );

    res.status(200).json({
      success: true,
      message: "Ticket categories retrieved successfully",
      data: {
        concert: concert[0],
        tickets,
      },
    });

  } catch (error) {
    console.error("Get Tickets Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================================
// CREATE TICKET CATEGORY
// ========================================
const createTicketCategory = async (req, res) => {
  try {
    const {
      concert_id,
      name,
      price,
      stock,
    } = req.body;

    // Validasi input
    if (!concert_id || !name || price === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Concert ID, name, price, and stock are required",
      });
    }

    // Cek apakah konser ada
    const [concert] = await db.query(
      "SELECT id FROM concerts WHERE id = ?",
      [concert_id]
    );

    if (concert.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Concert not found",
      });
    }

    // Tambahkan kategori tiket
    const [result] = await db.query(
      `INSERT INTO ticket_categories
      (concert_id, name, price, stock)
      VALUES (?, ?, ?, ?)`,
      [
        concert_id,
        name,
        price,
        stock,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Ticket category created successfully",
      data: {
        id: result.insertId,
        concert_id,
        name,
        price,
        stock,
      },
    });

  } catch (error) {
    console.error("Create Ticket Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================================
// UPDATE TICKET CATEGORY
// ========================================
const updateTicketCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      price,
      stock,
    } = req.body;

    // Cek apakah kategori tiket ada
    const [existingTicket] = await db.query(
      "SELECT id FROM ticket_categories WHERE id = ?",
      [id]
    );

    if (existingTicket.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket category not found",
      });
    }

    // Validasi input
    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and stock are required",
      });
    }

    // Update kategori tiket
    await db.query(
      `UPDATE ticket_categories
       SET name = ?,
           price = ?,
           stock = ?
       WHERE id = ?`,
      [
        name,
        price,
        stock,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Ticket category updated successfully",
    });

  } catch (error) {
    console.error("Update Ticket Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================================
// DELETE TICKET CATEGORY
// ========================================
const deleteTicketCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah kategori tiket ada
    const [existingTicket] = await db.query(
      "SELECT id FROM ticket_categories WHERE id = ?",
      [id]
    );

    if (existingTicket.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket category not found",
      });
    }

    // Hapus kategori tiket
    await db.query(
      "DELETE FROM ticket_categories WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Ticket category deleted successfully",
    });

  } catch (error) {
    console.error("Delete Ticket Category Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getTicketsByConcert,
  createTicketCategory,
  updateTicketCategory,
  deleteTicketCategory, 
};