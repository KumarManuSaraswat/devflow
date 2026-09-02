const { z } = require("zod");

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1000).optional(),
  }),
  params: z.object({
    teamId: z.string().cuid("Invalid team ID"),
  }),
  query: z.object({}),
});

const projectIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    projectId: z.string().cuid("Invalid project ID"),
  }),
  query: z.object({}),
});

const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
  }).refine(
    (data) => data.name !== undefined || data.description !== undefined,
    {
      message: "Provide at least one field to update",
    }
  ),
  params: z.object({
    projectId: z.string().cuid("Invalid project ID"),
  }),
  query: z.object({}),
});

module.exports = {
  createProjectSchema,
  projectIdParamSchema,
  updateProjectSchema,
};