const { z } = require("zod");

const cuid = z.string().cuid("Invalid ID");

const taskStatusEnum = z.enum([
  "BACKLOG",
  "ASSIGNED",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "COMPLETED",
]);

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().max(5000).optional(),
    priority: z.coerce.number().int().min(1).max(4).default(2),
    dueDate: z.string().datetime().optional(),
    assigneeIds: z.array(cuid).min(1, "Assign at least one developer"),
    reviewerIds: z.array(cuid).default([]),
  }),
  params: z.object({
    projectId: cuid,
  }),
  query: z.object({}),
});

const projectTasksParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    projectId: cuid,
  }),
  query: z.object({}),
});

const taskIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({
    taskId: cuid,
  }),
  query: z.object({}),
});

const updateTaskSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(3).max(150).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
      priority: z.coerce.number().int().min(1).max(4).optional(),
      dueDate: z.string().datetime().nullable().optional(),
    })
    .refine(
      (data) =>
        data.title !== undefined ||
        data.description !== undefined ||
        data.priority !== undefined ||
        data.dueDate !== undefined,
      {
        message: "Provide at least one field to update",
      }
    ),
  params: z.object({
    taskId: cuid,
  }),
  query: z.object({}),
});

const updateTaskStatusSchema = z.object({
  body: z.object({
    status: taskStatusEnum,
  }),
  params: z.object({
    taskId: cuid,
  }),
  query: z.object({}),
});

const submitForReviewSchema = z.object({
  body: z.object({
    pullRequestUrl: z
      .string()
      .url("Pull request URL must be a valid URL")
      .max(500)
      .optional(),
  }),
  params: z.object({
    taskId: cuid,
  }),
  query: z.object({}),
});

const createTaskReviewSchema = z.object({
  body: z.object({
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
    comment: z
      .string()
      .trim()
      .min(3, "A review comment must contain at least 3 characters")
      .max(3000),
  }),
  params: z.object({
    taskId: cuid,
  }),
  query: z.object({}),
});

module.exports = {
  createTaskSchema,
  projectTasksParamSchema,
  taskIdParamSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  submitForReviewSchema,
  createTaskReviewSchema,
};