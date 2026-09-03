const jwt = require("jsonwebtoken");

const createToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const getCookieOptions = () => {
  const isProduction =
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

const setAuthCookie = (res, token) => {
  res.cookie(
    "devflow_token",
    token,
    getCookieOptions()
  );
};

const clearAuthCookie = (res) => {
  const { maxAge, ...cookieOptions } =
    getCookieOptions();

  res.clearCookie("devflow_token", cookieOptions);
};

module.exports = {
  createToken,
  setAuthCookie,
  clearAuthCookie,
};