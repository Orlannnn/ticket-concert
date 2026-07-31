const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./jobs/orderCron ")

const authRoutes = require("./routes/authRoutes");
const concertRoutes = require("./routes/concertRoutes");
const ticketCategoryRoutes = require("./routes/ticketCategoryRoutes")
const orderRoutes = require("./routes/orderRoutes")

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/concerts", concertRoutes);
app.use("/api/tickets", ticketCategoryRoutes);
app.use("/api/orders", orderRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Concert Ticket API is running!",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});