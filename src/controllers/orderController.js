const db = require("../config/db");
const crypto = require("crypto");

// ========================================
// CREATE ORDER
// ========================================
const createOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const user_id = req.user.id;
    const { items } = req.body;

    // Validasi items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      });
    }

    // Mulai transaction
    await connection.beginTransaction();

    let total_price = 0;
    const orderItems = [];

    // ========================================
    // CEK SEMUA TIKET
    // ========================================
    for (const item of items) {
      const {
        ticket_category_id,
        quantity,
      } = item;

      // Validasi quantity
      if (!ticket_category_id || !quantity || quantity <= 0) {
        throw new Error(
          "Invalid ticket category or quantity"
        );
      }

      // Ambil data tiket dan lock row
      const [tickets] = await connection.query(
        `SELECT
          id,
          name,
          price,
          stock
        FROM ticket_categories
        WHERE id = ?
        FOR UPDATE`,
        [ticket_category_id]
      );

      // Cek tiket ada
      if (tickets.length === 0) {
        throw new Error(
          `Ticket category ${ticket_category_id} not found`
        );
      }

      const ticket = tickets[0];

      // Cek stok
      if (ticket.stock < quantity) {
        throw new Error(
          `Not enough stock for ${ticket.name}`
        );
      }

      // Hitung subtotal
      const subtotal =
        Number(ticket.price) * Number(quantity);

      total_price += subtotal;

      // Simpan data item
      orderItems.push({
        ticket_category_id,
        quantity,
        price: ticket.price,
      });
    }

    // ========================================
    // BUAT ORDER CODE
    // ========================================
    const randomCode = crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();

    const order_code = `ORD-${Date.now()}-${randomCode}`;

    // ========================================
    // INSERT ORDER
    // ========================================
    const [orderResult] = await connection.query(
      `INSERT INTO orders
      (
        user_id,
        order_code,
        total_price,
        status
      )
      VALUES (?, ?, ?, ?)`,
      [
        user_id,
        order_code,
        total_price,
        "pending",
      ]
    );

    const order_id = orderResult.insertId;

    
    // INSERT ORDER ITEMS
    
    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items
        (
          order_id,
          ticket_category_id,
          quantity,
          price
        )
        VALUES (?, ?, ?, ?)`,
        [
          order_id,
          item.ticket_category_id,
          item.quantity,
          item.price,
        ]
      );

      // Kurangi stok tiket
      await connection.query(
        `UPDATE ticket_categories
         SET stock = stock - ?
         WHERE id = ?`,
        [
          item.quantity,
          item.ticket_category_id,
        ]
      );
    }

    
    // COMMIT TRANSACTION
    
    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order_id,
        order_code,
        total_price,
        status: "pending",
      },
    });

  } catch (error) {
    // Batalkan semua perubahan jika error
    await connection.rollback();

    console.error("Create Order Error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });

  } finally {
    // Kembalikan connection ke pool
    connection.release();
  }
};


// GET MY ORDERS

const getMyOrders = async (req, res) => {
  try {
    const user_id = req.user.id;

    const [orders] = await db.query(
      `SELECT
        id,
        order_code,
        total_price,
        status,
        created_at,
        updated_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC`,
      [user_id]
    );

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: orders,
    });

  } catch (error) {
    console.error("Get My Orders Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// GET ORDER DETAIL

const getOrderDetail = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    // Ambil data order
    const [orders] = await db.query(
      `SELECT
        o.id,
        o.order_code,
        o.total_price,
        o.status,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.id = ?
      AND o.user_id = ?`,
      [id, user_id]
    );

    // Cek apakah order ada dan milik user
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    // Ambil item dalam order
    const [items] = await db.query(
      `SELECT
        oi.id,
        oi.ticket_category_id,
        tc.name AS ticket_name,
        tc.concert_id,
        c.title AS concert_title,
        c.location,
        c.concert_date,
        c.concert_time,
        oi.quantity,
        oi.price,
        (oi.quantity * oi.price) AS subtotal
      FROM order_items oi
      JOIN ticket_categories tc
        ON oi.ticket_category_id = tc.id
      JOIN concerts c
        ON tc.concert_id = c.id
      WHERE oi.order_id = ?`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Order detail retrieved successfully",
      data: {
        order,
        items,
      },
    });

  } catch (error) {
    console.error("Get Order Detail Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// ========================================
// PAY ORDER
// ========================================
const payOrder = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    // Cek apakah order ada dan milik user
    const [orders] = await db.query(
      `SELECT
        id,
        order_code,
        total_price,
        status
      FROM orders
      WHERE id = ?
      AND user_id = ?`,
      [id, user_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    // Cek status order
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Order cannot be paid because its status is ${order.status}`,
      });
    }

    // Ubah status menjadi paid
    await db.query(
      `UPDATE orders
       SET status = ?
       WHERE id = ?`,
      ["paid", id]
    );

    res.status(200).json({
      success: true,
      message: "Order paid successfully",
      data: {
        order_id: order.id,
        order_code: order.order_code,
        total_price: order.total_price,
        status: "paid",
      },
    });

  } catch (error) {
    console.error("Pay Order Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================================
// CANCEL ORDER
// ========================================
const cancelOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const user_id = req.user.id;
    const { id } = req.params;

    // Mulai transaction
    await connection.beginTransaction();

    // ========================================
    // CEK ORDER
    // ========================================
    const [orders] = await connection.query(
      `SELECT
        id,
        order_code,
        status
      FROM orders
      WHERE id = ?
      AND user_id = ?
      FOR UPDATE`,
      [id, user_id]
    );

    // Cek apakah order ada
    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    // ========================================
    // CEK STATUS ORDER
    // ========================================
    if (order.status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled because its status is ${order.status}`,
      });
    }

    // ========================================
    // AMBIL ORDER ITEMS
    // ========================================
    const [items] = await connection.query(
      `SELECT
        ticket_category_id,
        quantity
      FROM order_items
      WHERE order_id = ?`,
      [id]
    );

    // ========================================
    // KEMBALIKAN STOK
    // ========================================
    for (const item of items) {
      await connection.query(
        `UPDATE ticket_categories
         SET stock = stock + ?
         WHERE id = ?`,
        [
          item.quantity,
          item.ticket_category_id,
        ]
      );
    }

    // ========================================
    // UPDATE STATUS ORDER
    // ========================================
    await connection.query(
      `UPDATE orders
       SET status = ?
       WHERE id = ?`,
      [
        "cancelled",
        id,
      ]
    );

    // ========================================
    // COMMIT
    // ========================================
    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: {
        order_id: order.id,
        order_code: order.order_code,
        status: "cancelled",
      },
    });

  } catch (error) {

    // ========================================
    // ROLLBACK JIKA ERROR
    // ========================================
    await connection.rollback();

    console.error(
      "Cancel Order Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  } finally {

    // Kembalikan connection ke pool
    connection.release();
  }
};

// ========================================
// EXPIRE ORDER
// ========================================
const expireOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const user_id = req.user.id;
    const { id } = req.params;

    // Mulai transaction
    await connection.beginTransaction();

    // ========================================
    // CEK ORDER
    // ========================================
    const [orders] = await connection.query(
      `SELECT
        id,
        order_code,
        status
      FROM orders
      WHERE id = ?
      AND user_id = ?
      FOR UPDATE`,
      [id, user_id]
    );

    if (orders.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const order = orders[0];

    // ========================================
    // CEK STATUS
    // ========================================
    if (order.status !== "pending") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: `Order cannot be expired because its status is ${order.status}`,
      });
    }

    // ========================================
    // AMBIL ORDER ITEMS
    // ========================================
    const [items] = await connection.query(
      `SELECT
        ticket_category_id,
        quantity
      FROM order_items
      WHERE order_id = ?`,
      [id]
    );

    // ========================================
    // KEMBALIKAN STOK
    // ========================================
    for (const item of items) {
      await connection.query(
        `UPDATE ticket_categories
         SET stock = stock + ?
         WHERE id = ?`,
        [
          item.quantity,
          item.ticket_category_id,
        ]
      );
    }

    // ========================================
    // UPDATE STATUS
    // ========================================
    await connection.query(
      `UPDATE orders
       SET status = ?
       WHERE id = ?`,
      [
        "expired",
        id,
      ]
    );

    // ========================================
    // COMMIT
    // ========================================
    await connection.commit();

    res.status(200).json({
      success: true,
      message: "Order expired successfully",
      data: {
        order_id: order.id,
        order_code: order.order_code,
        status: "expired",
      },
    });

  } catch (error) {

    await connection.rollback();

    console.error(
      "Expire Order Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });

  } finally {
    connection.release();
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderDetail,
  payOrder,
  cancelOrder,
  expireOrder, 
};