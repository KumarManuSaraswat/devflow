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
const { prisma } = require("../config/prisma");
const { profileSchema } = require("../assistant/schemas");
const { activeMembershipWhere, canEditProfile } = require("../assistant/context");

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

router.patch(
  "/:teamId/members/:memberId/profile",
  validate(profileSchema),
  asyncHandler(requireTeamMember),
  asyncHandler(async (req, res) => {
    const target = await prisma.teamMember.findFirst({ where: {
      ...activeMembershipWhere(req.params.teamId), id: req.params.memberId,
    } });
    if (!target) return res.status(404).json({ message: "Active member not found" });
    if (!canEditProfile(req.membership, target)) {
      return res.status(403).json({ message: "You may edit your own profile; only team managers can edit others." });
    }
    const member = await prisma.teamMember.update({ where: { id: target.id }, data: req.body,
      select: { id: true, skills: true, weeklyHours: true } });
    res.json({ member });
  })
);

module.exports = router;
