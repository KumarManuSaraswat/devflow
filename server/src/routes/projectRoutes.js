const express = require("express");

const {
  createProject,
  getTeamProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");

const { authenticate } = require("../middleware/authenticate");
const {
  requireTeamMember,
  requireTeamRole,
} = require("../middleware/teamAccess");
const { requireProjectAccess } = require("../middleware/projectAccess");

const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const {
  createProjectSchema,
  projectIdParamSchema,
  updateProjectSchema,
} = require("../utils/projectSchemas");

const router = express.Router();

router.use(authenticate);

router.post(
  "/teams/:teamId/projects",
  validate(createProjectSchema),
  asyncHandler(requireTeamMember),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(createProject)
);

router.get(
  "/teams/:teamId/projects",
  validate(
    require("../utils/teamSchemas").teamIdParamSchema
  ),
  asyncHandler(requireTeamMember),
  asyncHandler(getTeamProjects)
);

router.get(
  "/projects/:projectId",
  validate(projectIdParamSchema),
  asyncHandler(requireProjectAccess),
  asyncHandler(getProjectById)
);

router.patch(
  "/projects/:projectId",
  validate(updateProjectSchema),
  asyncHandler(requireProjectAccess),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(updateProject)
);

router.delete(
  "/projects/:projectId",
  validate(projectIdParamSchema),
  asyncHandler(requireProjectAccess),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(deleteProject)
);

module.exports = router;