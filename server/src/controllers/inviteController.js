const { prisma } = require("../config/prisma");
const {
  createInviteToken,
  hashInviteToken,
} = require("../utils/inviteToken");

const createInviteLink = async (req, res) => {
  const { teamId } = req.params;
  const { role, maxUses, expiresInDays } = req.body;

  if (req.membership.role === "ADMIN" && role === "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only the Owner can invite another Admin",
    });
  }

  const rawToken = createInviteToken();
  const tokenHash = hashInviteToken(rawToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      tokenHash,
      role,
      type: "LINK",
      maxUses,
      expiresAt,
    },
    select: {
      id: true,
      role: true,
      type: true,
      maxUses: true,
      uses: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const inviteUrl = `${process.env.CLIENT_URL}/invite/${rawToken}`;

  res.status(201).json({
    success: true,
    message: "Invite link created successfully",
    invite,
    inviteUrl,
  });
};

const getInviteByToken = async (req, res) => {
  const tokenHash = hashInviteToken(req.params.token);

  const invite = await prisma.teamInvite.findUnique({
    where: {
      tokenHash,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  if (!invite) {
    return res.status(404).json({
      success: false,
      message: "Invite not found",
    });
  }

  const isExpired = invite.expiresAt <= new Date();
  const hasNoUsesLeft = invite.uses >= invite.maxUses;

  if (isExpired || hasNoUsesLeft) {
    return res.status(410).json({
      success: false,
      message: isExpired
        ? "This invite link has expired"
        : "This invite link has reached its maximum number of uses",
    });
  }

  res.status(200).json({
    success: true,
    invite: {
      team: invite.team,
      role: invite.role,
      expiresAt: invite.expiresAt,
      usesRemaining: invite.maxUses - invite.uses,
    },
  });
};

const acceptInvite = async (req, res) => {
  const tokenHash = hashInviteToken(req.params.token);

  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.teamInvite.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!invite) {
      throw {
        statusCode: 404,
        message: "Invite not found",
      };
    }

    if (invite.expiresAt <= new Date()) {
      throw {
        statusCode: 410,
        message: "This invite link has expired",
      };
    }

    if (invite.uses >= invite.maxUses) {
      throw {
        statusCode: 410,
        message: "This invite link has reached its maximum number of uses",
      };
    }

    const existingMembership = await tx.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: invite.teamId,
          userId: req.user.id,
        },
      },
    });

    if (existingMembership?.isActive) {
      throw {
        statusCode: 409,
        message: "You are already an active member of this team",
      };
    }

    const membership = existingMembership
      ? await tx.teamMember.update({
          where: {
            id: existingMembership.id,
          },
          data: {
            role: invite.role,
            isActive: true,
            startsAt: new Date(),
            expiresAt: null,
            joinedAt: new Date(),
          },
          select: {
            id: true,
            role: true,
            startsAt: true,
            expiresAt: true,
            isActive: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        })
      : await tx.teamMember.create({
          data: {
            teamId: invite.teamId,
            userId: req.user.id,
            role: invite.role,
          },
          select: {
            id: true,
            role: true,
            startsAt: true,
            expiresAt: true,
            isActive: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        });

    await tx.teamInvite.update({
      where: {
        id: invite.id,
      },
      data: {
        uses: {
          increment: 1,
        },
      },
    });

    return membership;
  });

  res.status(200).json({
    success: true,
    message: "You joined the team successfully",
    membership: result,
  });
};

const getTeamInvites = async (req, res) => {
  const { teamId } = req.params;

  const invites = await prisma.teamInvite.findMany({
    where: {
      teamId,
    },
    select: {
      id: true,
      email: true,
      role: true,
      type: true,
      maxUses: true,
      uses: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(200).json({
    success: true,
    invites,
  });
};

const revokeInvite = async (req, res) => {
  const { teamId, inviteId } = req.params;

  const invite = await prisma.teamInvite.findFirst({
    where: {
      id: inviteId,
      teamId,
    },
  });

  if (!invite) {
    return res.status(404).json({
      success: false,
      message: "Invite not found",
    });
  }

  await prisma.teamInvite.delete({
    where: {
      id: invite.id,
    },
  });

  res.status(200).json({
    success: true,
    message: "Invite revoked successfully",
  });
};

module.exports = {
  createInviteLink,
  getInviteByToken,
  acceptInvite,
  getTeamInvites,
  revokeInvite,
};