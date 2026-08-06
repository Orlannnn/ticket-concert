const db = require("../config/db");

// GET MY TICKETS

const getMyTickets = async (req, res) => {
    try {
        //Ambil id user dari token jwt
        const user_id = req.user.id;

        const [tickets] = await db.query(
            `SELECT
        t.id AS ticket_id,
        t.ticket_code,
        t.qr_code,
        t.status AS ticket_status,

        o.id AS order_id,
        o.order_code,

        tc.name AS ticket_category,
        tc.price,

        c.id AS concert_id,
        c.title AS concert_title,
        c.description,
        c.location,
        c.concert_date,
        c.concert_time,
        c.image

      FROM tickets t

      JOIN orders o
        ON t.order_id = o.id

      JOIN ticket_categories tc
        ON t.ticket_category_id = tc.id

      JOIN concerts c
        ON tc.concert_id = c.id

      WHERE o.user_id = ?

      ORDER BY t.created_at DESC`,
      [
        user_id
      ]
        );

        res.status(200).json({
            success: true,
            message: "Ticket retrivied successfully",
            data: tickets,
        })
    } catch (error) {
        console.error(
            "Get My Tickets Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
};

const validateTicket = async (req, res) => {
  try {

    const {
      ticket_code,
    } = req.body;


    // ========================================
    // VALIDASI INPUT
    // ========================================

    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        message: "ticket_code is required",
      });
    }


    // ========================================
    // CARI TIKET
    // ========================================

    const [tickets] = await db.query(
      `SELECT
        t.id AS ticket_id,
        t.ticket_code,
        t.status AS ticket_status,

        o.order_code,

        tc.name AS ticket_category,

        c.title AS concert_title,
        c.location,
        c.concert_date,
        c.concert_time

      FROM tickets t

      JOIN orders o
        ON t.order_id = o.id

      JOIN ticket_categories tc
        ON t.ticket_category_id = tc.id

      JOIN concerts c
        ON tc.concert_id = c.id

      WHERE t.ticket_code = ?`,
      [
        ticket_code,
      ]
    );


    // ========================================
    // TIKET TIDAK DITEMUKAN
    // ========================================

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }


    const ticket = tickets[0];


    // ========================================
    // CEK STATUS TIKET
    // ========================================

    if (ticket.ticket_status === "used") {
      return res.status(400).json({
        success: false,
        message: "Ticket has already been used",
        data: ticket,
      });
    }


    if (ticket.ticket_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Ticket has been cancelled",
        data: ticket,
      });
    }


    // ========================================
    // TIKET VALID
    // ========================================

    res.status(200).json({
      success: true,
      message: "Ticket is valid",
      data: ticket,
    });

  } catch (error) {

    console.error(
      "Validate Ticket Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// USE TICKET
// ========================================

const useTicket = async (req, res) => {
  try {

    const { ticket_code } = req.body;

    // Validasi input
    if (!ticket_code) {
      return res.status(400).json({
        success: false,
        message: "ticket_code is required",
      });
    }

    // Cari tiket
    const [tickets] = await db.query(
      `SELECT
        id,
        ticket_code,
        status
      FROM tickets
      WHERE ticket_code = ?`,
      [ticket_code]
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const ticket = tickets[0];

    // Sudah dipakai
    if (ticket.status === "used") {
      return res.status(400).json({
        success: false,
        message: "Ticket has already been used",
      });
    }

    // Dibatalkan
    if (ticket.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Ticket has been cancelled",
      });
    }

    // Update status
    await db.query(
      `UPDATE tickets
       SET status = 'used'
       WHERE id = ?`,
      [ticket.id]
    );

    res.status(200).json({
      success: true,
      message: "Ticket used successfully",
      data: {
        ticket_code: ticket.ticket_code,
        status: "used",
      },
    });

  } catch (error) {

    console.error("Use Ticket Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  }
};
//module exports

module.exports = {
    getMyTickets,
    validateTicket,
    useTicket,
}