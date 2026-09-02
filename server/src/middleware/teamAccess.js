const { prisma } = require("../config/prisma");

const getActiveMembership = async (teamId, userId) => {
  return prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });
};

const requireTeamMember = async (req, res, next) => {
  try {
    const membership = await getActiveMembership(
      req.params.teamId,
      req.user.id
    );

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this team",
      });
    }

    req.membership = membership;
    next();
  } catch (error) {
    next(error);
  }
};

const requireTeamRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.membership) {
      return next({
        statusCode: 500,
        message: "Team membership was not loaded",
      });
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission for this action",
      });
    }

    next();
  };
};

module.exports = {
  requireTeamMember,
  requireTeamRole,
};