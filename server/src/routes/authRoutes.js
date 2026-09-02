const express = require("express");
const {
  register,
  login,
  logout,
  getCurrentUser,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authenticate");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", logout);
router.get("/me", authenticate, asyncHandler(getCurrentUser));

module.exports = router;