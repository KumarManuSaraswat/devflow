const { prisma } = require("../config/prisma");

const createTeam = async (req, res) => {
  const { name, description } = req.body;

  const team = await prisma.team.create({
    data: {
      name,
      description: description || null,
      createdById: req.user.id,
      members: {
        create: {
          userId: req.user.id,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
        where: {
          userId: req.user.id,
        },
        select: {
          id: true,
          role: true,
          isActive: true,
          joinedAt: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: "Team created successfully",
    team,
  });
};

const getMyTeams = async (req, res) => {
  const memberships = await prisma.teamMember.findMany({
    where: {
      userId: req.user.id,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      expiresAt: true,
      team: {
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  const teams = memberships.map((membership) => ({
    ...membership.team,
    membership: {
      id: membership.id,
      role: membership.role,
      joinedAt: membership.joinedAt,
      expiresAt: membership.expiresAt,
    },
  }));

  res.status(200).json({
    success: true,
    teams,
  });
};

const getTeamById = async (req, res) => {
  const { teamId } = req.params;

  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId: req.user.id,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      role: true,
      expiresAt: true,
      team: {
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
        },
      },
    },
  });

  if (!membership) {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this team",
    });
  }

  res.status(200).json({
    success: true,
    team: membership.team,
    membership: {
      role: membership.role,
      expiresAt: membership.expiresAt,
    },
  });
};

const getTeamMembers = async (req, res) => {
  const { teamId } = req.params;

  const members = await prisma.teamMember.findMany({
    where: {
      teamId,
      isActive: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      id: true,
      role: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    members,
  });
};

const changeMemberRole = async (req, res) => {
  const { teamId, memberId } = req.params;
  const { role } = req.body;

  const targetMember = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      teamId,
    },
  });

  if (!targetMember) {
    return res.status(404).json({
      success: false,
      message: "Team member not found",
    });
  }

  if (req.membership.role === "ADMIN") {
    if (targetMember.role === "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Admins cannot change the Owner's role",
      });
    }

    if (role === "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the Owner can assign the Owner role",
      });
    }
  }

  if (
    req.membership.role === "OWNER" &&
    targetMember.id === req.membership.id &&
    role !== "OWNER"
  ) {
    return res.status(400).json({
      success: false,
      message: "Transfer ownership before changing your own Owner role",
    });
  }

  const updatedMember = await prisma.teamMember.update({
    where: {
      id: targetMember.id,
    },
    data: {
      role,
    },
    select: {
      id: true,
      role: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Member role updated successfully",
    member: updatedMember,
  });
};

const deactivateTeamMember = async (req, res) => {
  const { teamId, memberId } = req.params;

  const targetMember = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      teamId,
    },
  });

  if (!targetMember) {
    return res.status(404).json({
      success: false,
      message: "Team member not found",
    });
  }

  if (targetMember.role === "OWNER") {
    return res.status(400).json({
      success: false,
      message: "The Owner cannot be deactivated",
    });
  }

  if (
    req.membership.role === "ADMIN" &&
    targetMember.role === "ADMIN"
  ) {
    return res.status(403).json({
      success: false,
      message: "Admins cannot deactivate other Admins",
    });
  }

  const updatedMember = await prisma.teamMember.update({
    where: {
      id: targetMember.id,
    },
    data: {
      isActive: false,
    },
    select: {
      id: true,
      role: true,
      isActive: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Member deactivated successfully",
    member: updatedMember,
  });
};

module.exports = {
  createTeam,
  getMyTeams,
  getTeamById,
  getTeamMembers,
  changeMemberRole,
  deactivateTeamMember,
};