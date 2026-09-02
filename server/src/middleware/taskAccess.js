const { prisma } = require("../config/prisma");

const requireTaskAccess = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        title: true,
        projectId: true,
        status: true,
        project: {
          select: {
            id: true,
            teamId: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: task.project.teamId,
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
        message: "You do not have access to this task",
      });
    }

    req.task = task;
    req.membership = membership;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requireTaskAccess,
};