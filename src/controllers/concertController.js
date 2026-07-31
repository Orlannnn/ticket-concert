const db = require("../config/db");

// ========================================
// GET SEMUA KONSER
// ========================================
const getAllConcerts = async (req, res) => {
  try {
    const [concerts] = await db.query(`
      SELECT *
      FROM concerts
      ORDER BY concert_date ASC
    `);

    res.status(200).json({
      success: true,
      message: "Concerts retrieved successfully",
      data: concerts,
    });
  } catch (error) {
    console.error("Get Concerts Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================================
// GET DETAIL KONSER
// ========================================
const getConcertById = async (req, res) => {
  try {
    const { id } = req.params;

    const [concert] = await db.query(
      "SELECT * FROM concerts WHERE id = ?",
      [id]
    );

    if (concert.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Concert not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Concert retrieved successfully",
      data: concert[0],
    });
  } catch (error) {
    console.error("Get Concert Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================================
// CREATE KONSER
// ========================================
const createConcert = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      concert_date,
      concert_time,
      image,
      status,
    } = req.body;

    // Validasi input wajib
    if (
      !title ||
      !location ||
      !concert_date ||
      !concert_time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, location, concert date, and concert time are required",
      });
    }

    // Insert data konser
    const [result] = await db.query(
      `INSERT INTO concerts
      (
        title,
        description,
        location,
        concert_date,
        concert_time,
        image,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        location,
        concert_date,
        concert_time,
        image || null,
        status || "upcoming",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Concert created successfully",
      data: {
        id: result.insertId,
        title,
        description,
        location,
        concert_date,
        concert_time,
        image,
        status: status || "upcoming",
      },
    });
  } catch (error) {
    console.error("Create Concert Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ========================================
// UPDATE KONSER
// ========================================
const updateConcert = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      location,
      concert_date,
      concert_time,
      image,
      status,
    } = req.body;

    // Cek apakah konser ada
    const [existingConcert] = await db.query(
      "SELECT id FROM concerts WHERE id = ?",
      [id]
    );

    if (existingConcert.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Concert not found",
      });
    }

    // Update data konser
    await db.query(
      `UPDATE concerts
      SET
        title = ?,
        description = ?,
        location = ?,
        concert_date = ?,
        concert_time = ?,
        image = ?,
        status = ?
      WHERE id = ?`,
      [
        title,
        description || null,
        location,
        concert_date,
        concert_time,
        image || null,
        status || "upcoming",
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Concert updated successfully",
    });
  } catch (error) {
    console.error("Update Concert Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteConcert = async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah konser ada
    const [existingConcert] = await db.query(
      "SELECT id FROM concerts WHERE id = ?",
      [id]
    );

    if (existingConcert.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Concert not found",
      });
    }

    // Hapus konser
    await db.query(
      "DELETE FROM concerts WHERE id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Concert deleted successfully",
    });

  } catch (error) {
    console.error("Delete Concert Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}; 

// EXPORT SEMUA FUNCTION

module.exports = {
  getAllConcerts,
  getConcertById,
  createConcert,
  updateConcert,
  deleteConcert,
};