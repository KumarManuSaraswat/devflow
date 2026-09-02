const jwt = require("jsonwebtoken");
const { prisma } = require("../config/prisma");

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.devflow_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next({
      statusCode: 401,
      message: "Invalid or expired authentication token",
    });
  }
};

module.exports = { authenticate };