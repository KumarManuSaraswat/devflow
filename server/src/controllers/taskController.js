const { prisma } = require("../config/prisma");

const getActiveTeamMembersByUserIds = async (tx, teamId, userIds) => {
  if (userIds.length === 0) {
    return [];
  }

  return tx.teamMember.findMany({
    where: {
      teamId,
      userId: {
        in: userIds,
      },
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: {
      userId: true,
      role: true,
    },
  });
};

const createTask = async (req, res) => {
  const {
    title,
    description,
    priority,
    dueDate,
    assigneeIds,
    reviewerIds,
  } = req.body;

  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      teamId: true,
    },
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  const task = await prisma.$transaction(async (tx) => {
    const uniqueAssigneeIds = [...new Set(assigneeIds)];
    const uniqueReviewerIds = [...new Set(reviewerIds)];

    const allMemberIds = [
      ...new Set([...uniqueAssigneeIds, ...uniqueReviewerIds]),
    ];

    const activeMembers = await getActiveTeamMembersByUserIds(
      tx,
      project.teamId,
      allMemberIds
    );

    const activeMemberIds = new Set(
      activeMembers.map((member) => member.userId)
    );

    const invalidMemberIds = allMemberIds.filter(
      (userId) => !activeMemberIds.has(userId)
    );

    if (invalidMemberIds.length > 0) {
      throw {
        statusCode: 400,
        message:
          "Every assignee and reviewer must be an active member of this team",
      };
    }

    const invalidAssigneeIds = activeMembers
      .filter(
        (member) =>
          uniqueAssigneeIds.includes(member.userId) &&
          !["OWNER", "ADMIN", "DEVELOPER", "TRAINEE"].includes(member.role)
      )
      .map((member) => member.userId);

    if (invalidAssigneeIds.length > 0) {
      throw {
        statusCode: 400,
        message:
          "Task assignees must have an Owner, Admin, Developer, or Trainee role",
      };
    }

    const invalidReviewerIds = activeMembers
      .filter(
        (member) =>
          uniqueReviewerIds.includes(member.userId) &&
          !["OWNER", "ADMIN", "REVIEWER"].includes(member.role)
      )
      .map((member) => member.userId);

    if (invalidReviewerIds.length > 0) {
      throw {
        statusCode: 400,
        message:
          "Task reviewers must have an Owner, Admin, or Reviewer role",
      };
    }

    const createdTask = await tx.task.create({
      data: {
        projectId,
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "ASSIGNED",
        assignees: {
          create: uniqueAssigneeIds.map((userId) => ({
            userId,
          })),
        },
        reviewers: {
          create: uniqueReviewerIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        assignees: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        reviewers: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    await tx.taskActivity.create({
      data: {
        taskId: createdTask.id,
        actorId: req.user.id,
        action: "TASK_CREATED",
        metadata: {
          title: createdTask.title,
          priority: createdTask.priority,
          assigneeIds: uniqueAssigneeIds,
          reviewerIds: uniqueReviewerIds,
        },
      },
    });

    return createdTask;
  });

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    task,
  });
};

const getProjectTasks = async (req, res) => {
  const { projectId } = req.params;

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
    },
    include: {
      assignees: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      reviewers: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          reviews: true,
          activity: true,
        },
      },
    },
    orderBy: [
      {
        priority: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  res.status(200).json({
    success: true,
    tasks,
  });
};

const getTaskById = async (req, res) => {
  const task = await prisma.task.findUnique({
    where: {
      id: req.task.id,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      assignees: {
        select: {
          assignedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      reviewers: {
        select: {
          assignedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          decision: true,
          comment: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      activity: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    task,
    membership: {
      role: req.membership.role,
    },
  });
};

const updateTask = async (req, res) => {
  const updateData = {
    ...req.body,
  };

  if (updateData.dueDate !== undefined) {
    updateData.dueDate = updateData.dueDate
      ? new Date(updateData.dueDate)
      : null;
  }

  const task = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: {
        id: req.task.id,
      },
      data: updateData,
    });

    await tx.taskActivity.create({
      data: {
        taskId: updatedTask.id,
        actorId: req.user.id,
        action: "TASK_UPDATED",
        metadata: {
          changedFields: Object.keys(req.body),
        },
      },
    });

    return updatedTask;
  });

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    task,
  });
};

const updateTaskStatus = async (req, res) => {
  const { status } = req.body;

  const currentTask = await prisma.task.findUnique({
    where: {
      id: req.task.id,
    },
    select: {
      id: true,
      status: true,
      assignees: {
        select: {
          userId: true,
        },
      },
    },
  });

  const isManager = ["OWNER", "ADMIN"].includes(req.membership.role);

  const isAssignedDeveloper = currentTask.assignees.some(
    (assignee) => assignee.userId === req.user.id
  );

  if (!isManager && !isAssignedDeveloper) {
    return res.status(403).json({
      success: false,
      message: "Only assigned developers can update this task status",
    });
  }

  const developerAllowedStatuses = [
    "IN_PROGRESS",
    "BLOCKED",
    "IN_REVIEW",
  ];

  if (!isManager && !developerAllowedStatuses.includes(status)) {
    return res.status(403).json({
      success: false,
      message:
        "Developers can only set status to IN_PROGRESS, BLOCKED, or IN_REVIEW",
    });
  }

  const task = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: {
        id: currentTask.id,
      },
      data: {
        status,
      },
    });

    await tx.taskActivity.create({
      data: {
        taskId: updatedTask.id,
        actorId: req.user.id,
        action: "TASK_STATUS_CHANGED",
        metadata: {
          from: currentTask.status,
          to: status,
        },
      },
    });

    return updatedTask;
  });

  res.status(200).json({
    success: true,
    message: "Task status updated successfully",
    task,
  });
};

const deleteTask = async (req, res) => {
  await prisma.$transaction(async (tx) => {
    await tx.taskActivity.create({
      data: {
        taskId: req.task.id,
        actorId: req.user.id,
        action: "TASK_DELETED",
        metadata: {
          title: req.task.title || "Deleted task",
        },
      },
    });

    await tx.task.delete({
      where: {
        id: req.task.id,
      },
    });
  });

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
};

const submitTaskForReview = async (req, res) => {
  const { pullRequestUrl } = req.body;

  const task = await prisma.task.findUnique({
    where: {
      id: req.task.id,
    },
    include: {
      assignees: {
        select: {
          userId: true,
        },
      },
      reviewers: {
        select: {
          userId: true,
        },
      },
    },
  });

  const isManager = ["OWNER", "ADMIN"].includes(req.membership.role);

  const isAssignedDeveloper = task.assignees.some(
    (assignee) => assignee.userId === req.user.id
  );

  if (!isManager && !isAssignedDeveloper) {
    return res.status(403).json({
      success: false,
      message: "Only an assigned developer can submit this task for review",
    });
  }

  if (!["IN_PROGRESS", "CHANGES_REQUESTED"].includes(task.status)) {
    return res.status(400).json({
      success: false,
      message:
        "Only tasks in IN_PROGRESS or CHANGES_REQUESTED can be submitted for review",
    });
  }

  if (task.reviewers.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Assign at least one reviewer before submitting for review",
    });
  }

  const updatedTask = await prisma.$transaction(async (tx) => {
    const data = {
      status: "IN_REVIEW",
    };

    if (pullRequestUrl !== undefined) {
      data.pullRequestUrl = pullRequestUrl || null;
    }

    const submittedTask = await tx.task.update({
      where: {
        id: task.id,
      },
      data,
    });

    await tx.taskActivity.create({
      data: {
        taskId: submittedTask.id,
        actorId: req.user.id,
        action: "TASK_SUBMITTED_FOR_REVIEW",
        metadata: {
          from: task.status,
          to: "IN_REVIEW",
          pullRequestUrl: submittedTask.pullRequestUrl,
        },
      },
    });

    return submittedTask;
  });

  res.status(200).json({
    success: true,
    message: "Task submitted for review successfully",
    task: updatedTask,
  });
};

const reviewTask = async (req, res) => {
  const { decision, comment } = req.body;

  const task = await prisma.task.findUnique({
    where: {
      id: req.task.id,
    },
    include: {
      reviewers: {
        select: {
          userId: true,
        },
      },
    },
  });

  const isAssignedReviewer = task.reviewers.some(
    (reviewer) => reviewer.userId === req.user.id
  );

  if (!isAssignedReviewer) {
    return res.status(403).json({
      success: false,
      message: "Only an assigned reviewer can review this task",
    });
  }

  if (task.status !== "IN_REVIEW") {
    return res.status(400).json({
      success: false,
      message: "Only tasks in IN_REVIEW status can be reviewed",
    });
  }

  const nextStatus =
    decision === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED";

  const updatedTask = await prisma.$transaction(async (tx) => {
    const review = await tx.taskReview.create({
      data: {
        taskId: task.id,
        reviewerId: req.user.id,
        decision,
        comment,
      },
    });

    const reviewedTask = await tx.task.update({
      where: {
        id: task.id,
      },
      data: {
        status: nextStatus,
      },
    });

    await tx.taskActivity.create({
      data: {
        taskId: task.id,
        actorId: req.user.id,
        action: "TASK_REVIEWED",
        metadata: {
          decision,
          from: task.status,
          to: nextStatus,
          reviewId: review.id,
        },
      },
    });

    return reviewedTask;
  });

  res.status(200).json({
    success: true,
    message:
      decision === "APPROVED"
        ? "Task approved successfully"
        : "Changes requested successfully",
    task: updatedTask,
  });
};

const completeTask = async (req, res) => {
  const task = await prisma.task.findUnique({
    where: {
      id: req.task.id,
    },
  });

  if (task.status !== "APPROVED") {
    return res.status(400).json({
      success: false,
      message: "Only an approved task can be marked as completed",
    });
  }

  const updatedTask = await prisma.$transaction(async (tx) => {
    const completedTask = await tx.task.update({
      where: {
        id: task.id,
      },
      data: {
        status: "COMPLETED",
      },
    });

    await tx.taskActivity.create({
      data: {
        taskId: task.id,
        actorId: req.user.id,
        action: "TASK_COMPLETED",
        metadata: {
          from: "APPROVED",
          to: "COMPLETED",
        },
      },
    });

    return completedTask;
  });

  res.status(200).json({
    success: true,
    message: "Task completed successfully",
    task: updatedTask,
  });
};

module.exports = {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  submitTaskForReview,
  reviewTask,
  completeTask,
};