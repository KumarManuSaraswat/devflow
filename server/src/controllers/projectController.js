const { prisma } = require("../config/prisma");

const createProject = async (req, res) => {
  const { name, description } = req.body;
  const { teamId } = req.params;

  const project = await prisma.project.create({
    data: {
      teamId,
      name,
      description: description || null,
    },
  });

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    project,
  });
};

const getTeamProjects = async (req, res) => {
  const { teamId } = req.params;

  const projects = await prisma.project.findMany({
    where: {
      teamId,
    },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  res.status(200).json({
    success: true,
    projects,
  });
};

const getProjectById = async (req, res) => {
  const project = await prisma.project.findUnique({
    where: {
      id: req.project.id,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    project,
    membership: {
      role: req.membership.role,
    },
  });
};

const updateProject = async (req, res) => {
  const project = await prisma.project.update({
    where: {
      id: req.project.id,
    },
    data: req.body,
  });

  res.status(200).json({
    success: true,
    message: "Project updated successfully",
    project,
  });
};

const deleteProject = async (req, res) => {
  await prisma.project.delete({
    where: {
      id: req.project.id,
    },
  });

  res.status(200).json({
    success: true,
    message: "Project deleted successfully",
  });
};

module.exports = {
  createProject,
  getTeamProjects,
  getProjectById,
  updateProject,
  deleteProject,
};