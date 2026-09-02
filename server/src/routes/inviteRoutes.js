const express = require("express");

const {
  createInviteLink,
  getInviteByToken,
  acceptInvite,
  getTeamInvites,
  revokeInvite,
} = require("../controllers/inviteController");

const { authenticate } = require("../middleware/authenticate");
const {
  requireTeamMember,
  requireTeamRole,
} = require("../middleware/teamAccess");

const { validate } = require("../middleware/validate");
const { asyncHandler } = require("../utils/asyncHandler");

const {
  createInviteLinkSchema,
  inviteTokenParamSchema,
  inviteIdParamSchema,
  teamIdParamSchema,
} = require("../utils/teamSchemas");

const router = express.Router();

/*
  Public only in the sense that no team membership is required.
  A user must still be logged in to inspect or accept an invite.
*/
router.get(
  "/:token",
  authenticate,
  validate(inviteTokenParamSchema),
  asyncHandler(getInviteByToken)
);

router.post(
  "/:token/accept",
  authenticate,
  validate(inviteTokenParamSchema),
  asyncHandler(acceptInvite)
);

module.exports = router;

module.exports.createTeamInviteRoutes = () => {
  const teamInviteRouter = express.Router({ mergeParams: true });

  teamInviteRouter.use(authenticate);

  teamInviteRouter.post(
    "/link",
    validate(createInviteLinkSchema),
    asyncHandler(requireTeamMember),
    requireTeamRole("OWNER", "ADMIN"),
    asyncHandler(createInviteLink)
  );

  teamInviteRouter.get(
    "/",
    validate(teamIdParamSchema),
    asyncHandler(requireTeamMember),
    requireTeamRole("OWNER", "ADMIN"),
    asyncHandler(getTeamInvites)
  );

  teamInviteRouter.patch(
    "/:inviteId/revoke",
    validate(inviteIdParamSchema),
    asyncHandler(requireTeamMember),
    requireTeamRole("OWNER", "ADMIN"),
    asyncHandler(revokeInvite)
  );

  return teamInviteRouter;
};