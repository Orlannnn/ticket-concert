const cron = require("node-cron");
const db = require("../config/db");


// AUTO EXPIRE ORDER


// Jalankan setiap 1 menit
cron.schedule("* * * * *", async () => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Cari order pending yang sudah lebih dari 15 menit
    const [orders] = await connection.query(
      `SELECT
        id,
        order_code
      FROM orders
      WHERE status = 'pending'
      AND created_at <= NOW() - INTERVAL 15 MINUTE
      FOR UPDATE`
    );

    if (orders.length === 0) {
      connection.release();
      return;
    }

    console.log(
      `Found ${orders.length} expired order(s)`
    );

    // Proses setiap order
    for (const order of orders) {

      // Ambil item order
      const [items] = await connection.query(
        `SELECT
          ticket_category_id,
          quantity
        FROM order_items
        WHERE order_id = ?`,
        [order.id]
      );

      // Kembalikan stok
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

      // Ubah status menjadi expired
      await connection.query(
        `UPDATE orders
         SET status = 'expired'
         WHERE id = ?`,
        [order.id]
      );

      console.log(
        `Order ${order.order_code} expired`
      );
    }

    await connection.commit();

  } catch (error) {

    await connection.rollback();

    console.error(
      "Auto Expire Order Error:",
      error
    );

  } finally {
    connection.release();
  }
});