const { prisma } = require("../config/prisma");

const requireProjectAccess = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        teamId: true,
        name: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: project.teamId,
        userId: req.user.id,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    req.project = project;
    req.membership = membership;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireProjectAccess,
};