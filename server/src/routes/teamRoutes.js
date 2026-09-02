const express = require("express");

const {
  createTeam,
  getMyTeams,
  getTeamById,
  getTeamMembers,
  changeMemberRole,
  deactivateTeamMember,
} = require("../controllers/teamController");

const { authenticate } = require("../middleware/authenticate");
const {
  requireTeamMember,
  requireTeamRole,
} = require("../middleware/teamAccess");

const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const {
  createTeamSchema,
  teamIdParamSchema,
  memberIdParamSchema,
  changeMemberRoleSchema,
} = require("../utils/teamSchemas");

const router = express.Router();

router.use(authenticate);

router
  .route("/")
  .post(validate(createTeamSchema), asyncHandler(createTeam))
  .get(asyncHandler(getMyTeams));

router.get(
  "/:teamId",
  validate(teamIdParamSchema),
  asyncHandler(getTeamById)
);

router.get(
  "/:teamId/members",
  validate(teamIdParamSchema),
  asyncHandler(requireTeamMember),
  asyncHandler(getTeamMembers)
);

router.patch(
  "/:teamId/members/:memberId/role",
  validate(changeMemberRoleSchema),
  asyncHandler(requireTeamMember),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(changeMemberRole)
);

router.patch(
  "/:teamId/members/:memberId/deactivate",
  validate(memberIdParamSchema),
  asyncHandler(requireTeamMember),
  requireTeamRole("OWNER", "ADMIN"),
  asyncHandler(deactivateTeamMember)
);

module.exports = router;