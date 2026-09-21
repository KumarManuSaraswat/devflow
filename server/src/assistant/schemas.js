const { z } = require("zod");

const SKILLS = ["JavaScript", "TypeScript", "React", "HTML/CSS", "Node.js", "Python",
  "PostgreSQL", "API design", "Testing", "UI/UX", "DevOps", "Documentation",
  "Project management", "Mobile"];
const skillsSchema = z.array(z.enum(SKILLS)).max(SKILLS.length).transform(value => [...new Set(value)]);
const estimatedHoursSchema = z.number().positive().max(10000).nullable();
const params = z.object({ teamId: z.string().cuid() });
const contextSchema = z.object({ body: z.object({}), params, query: z.object({}) });
const chatSchema = z.object({
  params, query: z.object({}),
  body: z.object({
    message: z.string().trim().min(3).max(2000),
    intent: z.enum(["auto", "assign", "team", "breakdown", "workload"]).default("auto"),
    projectId: z.string().cuid().optional(),
    taskId: z.string().cuid().optional(),
    requiredSkills: skillsSchema.default([]),
    totalHours: z.number().positive().max(100000).optional(),
    weeks: z.number().positive().max(104).optional(),
    hoursPerMember: z.number().positive().max(80).optional(),
    allowCloud: z.boolean().default(false),
  }).strict(),
});
const profileSchema = z.object({
  params: params.extend({ memberId: z.string().cuid() }), query: z.object({}),
  body: z.object({ skills: skillsSchema, weeklyHours: z.number().int().min(0).max(80).nullable() }).strict(),
});

module.exports = { SKILLS, skillsSchema, estimatedHoursSchema, chatSchema, contextSchema, profileSchema };
