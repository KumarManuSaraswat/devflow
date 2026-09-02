const express = require("express");

const {
  createTask,
  getProjectTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  submitTaskForReview,
  reviewTask,
  completeTask,
} = require("../controllers/taskController");

const { authenticate } = require("../middleware/authenticate");
const { requireTeamRole } = require("../middleware/teamAccess");
const { requireProjectAccess } = require("../middleware/projectAccess");
const { requireTaskAccess } = require("../middleware/taskAccess");

const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const {
  createTaskSchema,
  projectTasksParamSchema,
  taskIdParamSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  submitForReviewSchema,
  createTaskReviewSchema,
} = require("../utils/taskSchemas");

const router = express.Router();

router.use(authenticate);

router.post(
  "/projects/:projectId/tasks",
  validate(createTaskSchema),
  asyncHandler(requireProjectAccess),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(createTask)
);

router.get(
  "/projects/:projectId/tasks",
  validate(projectTasksParamSchema),
  asyncHandler(requireProjectAccess),
  asyncHandler(getProjectTasks)
);

router.get(
  "/tasks/:taskId",
  validate(taskIdParamSchema),
  asyncHandler(requireTaskAccess),
  asyncHandler(getTaskById)
);

router.patch(
  "/tasks/:taskId",
  validate(updateTaskSchema),
  asyncHandler(requireTaskAccess),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(updateTask)
);

router.patch(
  "/tasks/:taskId/status",
  validate(updateTaskStatusSchema),
  asyncHandler(requireTaskAccess),
  asyncHandler(updateTaskStatus)
);

router.post(
  "/tasks/:taskId/submit-review",
  validate(submitForReviewSchema),
  asyncHandler(requireTaskAccess),
  asyncHandler(submitTaskForReview)
);

router.post(
  "/tasks/:taskId/reviews",
  validate(createTaskReviewSchema),
  asyncHandler(requireTaskAccess),
  asyncHandler(reviewTask)
);

router.post(
  "/tasks/:taskId/complete",
  validate(taskIdParamSchema),
  asyncHandler(requireTaskAccess),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(completeTask)
);

router.delete(
  "/tasks/:taskId",
  validate(taskIdParamSchema),
  asyncHandler(requireTaskAccess),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(deleteTask)
);

module.exports = router;