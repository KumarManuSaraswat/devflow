const { z } = require("zod");

const teamRoleEnum = z.enum([
  "OWNER",
  "ADMIN",
  "REVIEWER",
  "DEVELOPER",
  "TRAINEE",
]);

const createTeamSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500).optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

const teamIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    teamId: z.string().cuid("Invalid team ID"),
  }),
  query: z.object({}),
});

const memberIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    teamId: z.string().cuid("Invalid team ID"),
    memberId: z.string().cuid("Invalid member ID"),
  }),
  query: z.object({}),
});

const changeMemberRoleSchema = z.object({
  body: z.object({
    role: teamRoleEnum,
  }),
  params: z.object({
    teamId: z.string().cuid("Invalid team ID"),
    memberId: z.string().cuid("Invalid member ID"),
  }),
  query: z.object({}),
});

const createInviteLinkSchema = z.object({
  body: z.object({
    role: z.enum(["ADMIN", "REVIEWER", "DEVELOPER", "TRAINEE"])
      .default("DEVELOPER"),

    maxUses: z.coerce.number().int().min(1).max(100).default(1),

    expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
  }),
  params: z.object({
    teamId: z.string().cuid("Invalid team ID"),
  }),
  query: z.object({}),
});

const inviteTokenParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    token: z.string().min(32).max(256),
  }),
  query: z.object({}),
});

const inviteIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    teamId: z.string().cuid("Invalid team ID"),
    inviteId: z.string().cuid("Invalid invite ID"),
  }),
  query: z.object({}),
});

module.exports = {
  createTeamSchema,
  teamIdParamSchema,
  memberIdParamSchema,
  changeMemberRoleSchema,
  createInviteLinkSchema,
  inviteTokenParamSchema,
  inviteIdParamSchema,
};