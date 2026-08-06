const db = require("../config/db");

//ADMIN DASHBOARD

const getDashboard = async (req, res) => {
    try {
        const [[users]] = await db.query(
            "SELECT COUNT(*) AS total_users FROM users"
        );
        const [[concerts]] = await db.query(
            "SELECT COUNT (*) AS total_concerts from concerts"
        );
        const [[orders]] = await db.query(
            "SELECT COUNT (*) AS total_orders from orders"
        );

         const [[payments]] = await db.query(
      `SELECT COUNT(*) AS total_payments
       FROM payments
       WHERE payment_status = 'success'`
    );
        const [[tickets]] = await db.query(
            "SELECT COUNT (*) AS total_tickets from tickets"
        );

          const [[revenue]] = await db.query(
      `SELECT
        IFNULL(SUM(total_price), 0) AS total_revenue
      FROM orders
      WHERE status = 'paid'`
    );

        res.status(200).json({
             success: true,
      message: "Dashboard retrieved successfully",
      data: {
        total_users: users.total_users,
        total_concerts: concerts.total_concerts,
        total_orders: orders.total_orders,
        total_payments: payments.total_payments,
        total_tickets: tickets.total_tickets,
        total_revenue: revenue.total_revenue,
      },
        });
    } catch (error) {
        console.error("Dashboard error:", error);

        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

// MODULE EXPORTS

module.exports = {
    getDashboard,
}