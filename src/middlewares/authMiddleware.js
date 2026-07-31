const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  try {
    // Mengambil header Authorization
    const authHeader = req.headers.authorization;

    // Mengecek apakah token dikirim
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Format yang diharapkan:
    // Authorization: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    // Mengecek apakah token ada
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    // Memverifikasi token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Menyimpan data user ke request
    req.user = decoded;

    // Melanjutkan ke controller berikutnya
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authenticateToken;