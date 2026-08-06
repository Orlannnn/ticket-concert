const db = require("../config/db");
const QRCode = require("qrcode");
const {v4: uuidv4} = require("uuid"); 


// CREATE PAYMENT

const createPayment = async (req, res) => {
  try {
    const user_id = req.user.id;

    const {
      order_id,
      payment_method,
    } = req.body;

    
    // VALIDASI INPUT
  
    if (!order_id || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "order_id and payment_method are required",
      });
    }

   
    // CEK ORDER
    // Pastikan order milik user yang login
    
    const [orders] = await db.query(
      `SELECT
        id,
        order_code,
        total_price,
        status
      FROM orders
      WHERE id = ?
      AND user_id = ?`,
      [
        order_id,
        user_id,
      ]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];


    // ORDER HARUS PENDING
 
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Order cannot be paid because its status is ${order.status}`,
      });
    }

    
    // BUAT PAYMENT
  
    const [result] = await db.query(
      `INSERT INTO payments
      (
        order_id,
        payment_method,
        payment_status
      )
      VALUES (?, ?, 'pending')`,
      [
        order_id,
        payment_method,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: {
        payment_id: result.insertId,
        order_id: order.id,
        order_code: order.order_code,
        total_price: order.total_price,
        payment_method,
        payment_status: "pending",
      },
    });

  } catch (error) {

    console.error(
      "Create Payment Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const paymentSuccess = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const user_id = req.user.id;
    const { id } = req.params;

    // ========================================
    // MULAI TRANSACTION
    // ========================================
    await connection.beginTransaction();

    // ========================================
    // CEK PAYMENT
    // ========================================
    const [payments] = await connection.query(
      `SELECT
        p.id,
        p.order_id,
        p.payment_status,
        o.order_code,
        o.status AS order_status
      FROM payments p
      JOIN orders o
        ON p.order_id = o.id
      WHERE p.id = ?
      AND o.user_id = ?
      FOR UPDATE`,
      [
        id,
        user_id,
      ]
    );

    if (payments.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const payment = payments[0];

    // ========================================
    // CEK STATUS PAYMENT
    // ========================================
    if (payment.payment_status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: `Payment already ${payment.payment_status}`,
      });
    }

    // ========================================
    // CEK STATUS ORDER
    // ========================================
    if (payment.order_status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          `Order cannot be paid because its status is ${payment.order_status}`,
      });
    }

    // ========================================
    // UPDATE PAYMENT
    // ========================================
    const paymentReference =
      `PAY-${Date.now()}`;

    await connection.query(
      `UPDATE payments
       SET
         payment_status = 'success',
         payment_reference = ?,
         paid_at = NOW()
       WHERE id = ?`,
      [
        paymentReference,
        id,
      ]
    );

    // ========================================
    // UPDATE ORDER
    // ========================================
    await connection.query(
      `UPDATE orders
       SET status = 'paid'
       WHERE id = ?`,
      [
        payment.order_id,
      ]
    );

    // ========================================
    // AMBIL ORDER ITEMS
    // ========================================
    const [items] = await connection.query(
      `SELECT
        ticket_category_id,
        quantity
      FROM order_items
      WHERE order_id = ?`,
      [
        payment.order_id,
      ]
    );

    // ========================================
    // GENERATE TICKET
    // ========================================
    const generatedTickets = [];

    for (const item of items) {

      for (
        let i = 0;
        i < item.quantity;
        i++
      ) {

        // Generate kode tiket unik
        const ticketCode =
          `TICKET-${Date.now()}-${Math.floor(
            Math.random() * 100000
          )}`;

        // Data yang disimpan dalam QR Code
        const qrData = JSON.stringify({
          ticket_code: ticketCode,
          order_id: payment.order_id,
        });

        // Generate QR Code
        const qrCode =
          await QRCode.toDataURL(qrData);

        // Simpan tiket ke database
        const [ticketResult] =
          await connection.query(
            `INSERT INTO tickets
            (
              order_id,
              ticket_category_id,
              ticket_code,
              qr_code,
              status
            )
            VALUES (?, ?, ?, ?, 'active')`,
            [
              payment.order_id,
              item.ticket_category_id,
              ticketCode,
              qrCode,
            ]
          );

        generatedTickets.push({
          ticket_id:
            ticketResult.insertId,

          ticket_code:
            ticketCode,

          ticket_category_id:
            item.ticket_category_id,

          status:
            "active",
        });
      }
    }

    // ========================================
    // COMMIT
    // ========================================
    await connection.commit();

    // ========================================
    // RESPONSE
    // ========================================
    res.status(200).json({
      success: true,
      message:
        "Payment successful and tickets generated",

      data: {
        payment_id:
          payment.id,

        payment_reference:
          paymentReference,

        order_id:
          payment.order_id,

        order_code:
          payment.order_code,

        payment_status:
          "success",

        order_status:
          "paid",

        tickets:
          generatedTickets,
      },
    });

  } catch (error) {

    // ========================================
    // ROLLBACK
    // ========================================
    await connection.rollback();

    console.error(
      "Payment Success Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Payment processing failed",
    });

  } finally {

    // Kembalikan connection
    connection.release();
  }
};


// Module exports
module.exports = {
  createPayment,
  paymentSuccess,
};