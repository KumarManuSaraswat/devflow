const { SKILLS } = require("./schemas");
const DEVELOPERS = ["OWNER", "ADMIN", "DEVELOPER", "TRAINEE"];
const REVIEWERS = ["OWNER", "ADMIN", "REVIEWER"];

function getIntent(input) {
  if (input.intent && input.intent !== "auto") return input.intent;
  if (/how many|team size|members? needed|staff/i.test(input.message)) return "team";
  if (/divide|split|break.?down|milestone|plan|make a team|form a team/i.test(input.message)) return "breakdown";
  if (/workload|overload|busy|capacity/i.test(input.message)) return "workload";
  return "assign";
}

function advise(context, input) {
  const intent = getIntent(input);
  const isReview = /reviewer|review this|review the|review task/i.test(input.message);
  const selected = context.selectedTask;
  const inferred = SKILLS.filter(skill => input.message.toLowerCase().includes(skill.toLowerCase()));
  const required = [...new Set([...(selected?.requiredSkills || []), ...(input.requiredSkills || []), ...inferred])];
  const tasks = context.tasks.filter(t => t.status !== "COMPLETED");
  const candidates = context.members.filter(m => (isReview ? REVIEWERS : DEVELOPERS).includes(m.role) &&
    m.weeklyHours !== 0 && (!isReview || !selected?.assignees.some(a => a.userId === m.userId)))
    .map(member => {
      // Exclude the selected task when comparing potential owners; don't penalize its current owner twice.
      const owned = tasks.filter(t => t.id !== selected?.id && t.assignees.some(a => a.userId === member.userId));
      const reviews = tasks.filter(t => t.id !== selected?.id && t.reviewers.some(a => a.userId === member.userId) &&
        ["IN_REVIEW", "CHANGES_REQUESTED"].includes(t.status));
      const estimatedOpenHours = owned.reduce((sum, task) => sum + (task.estimatedHours || 0) / Math.max(1, task.assignees.length), 0);
      const matches = required.filter(s => member.skills.includes(s));
      const reasons = [required.length ? `${matches.length}/${required.length} required skills recorded` : "No task skills specified; comparing workload only",
        `${owned.length} other open assignments · ${reviews.length} pending reviews`,
        member.weeklyHours == null ? "Weekly availability not recorded" : `${member.weeklyHours} hours/week reported`];
      if (owned.some(t => t.estimatedHours == null)) reasons.push("Some assignments have no effort estimate");
      if (member.role === "TRAINEE") reasons.push("Pair with a mentor and allow review time");
      return { userId: member.userId, name: member.user.name, role: member.role, skills: member.skills,
        weeklyHours: member.weeklyHours, matches, openTasks: owned.length, pendingReviews: reviews.length,
        estimatedOpenHours: Math.round(estimatedOpenHours * 10) / 10, reasons,
        burden: owned.length + reviews.length * 0.5 };
    }).sort((a, b) => b.matches.length - a.matches.length || a.burden - b.burden ||
      a.estimatedOpenHours - b.estimatedOpenHours || a.name.localeCompare(b.name));
  const top = candidates.slice(0, 5).map(({ burden, ...candidate }) => candidate);
  const scopedTasks = tasks.filter(t => !input.projectId || t.projectId === input.projectId);
  const warnings = ["Suggestions only: no tasks or assignments are changed.",
    "Workload covers this team only. Open effort is not a weekly schedule or remaining-time estimate."];
  if (!required.length) warnings.push("Add required skills to get a skill-based match.");
  if (context.members.some(m => !m.skills.length || m.weeklyHours == null)) warnings.push("Some member skills or weekly availability are missing; confirm before assigning.");
  const missingSkills = required.filter(s => !candidates.some(m => m.skills.includes(s)));
  if (missingSkills.length) warnings.push(`No available eligible member has these recorded skills: ${missingSkills.join(", ")}.`);

  let answer;
  let teamSize = null;
  if (intent === "team") {
    if (input.totalHours && input.weeks && input.hoursPerMember) {
      const baseline = Math.max(1, Math.ceil(input.totalHours / (input.weeks * input.hoursPerMember)));
      const buffered = Math.max(1, Math.ceil(input.totalHours / (input.weeks * input.hoursPerMember * 0.8)));
      teamSize = { baseline, buffered };
      answer = `Start with ${baseline}–${buffered} contributors for ${input.totalHours} estimated hours over ${input.weeks} weeks. The upper estimate reserves 20% of capacity for coordination and unexpected work.\n\nThis assumes ${input.hoursPerMember} hours per person per week dedicated to this project, after existing commitments. It is a capacity estimate, not a guarantee. Cover delivery, testing/review and coordination; one person can cover multiple roles. You currently have ${candidates.length} eligible contributors not marked unavailable.`;
    } else {
      answer = "To estimate team size, fill in total project effort, delivery weeks, and hours each person can dedicate per week in Planning inputs. Headcount alone is not enough: include implementation, testing, review and coordination effort.\n\nFormula: contributors = round up(total effort ÷ (weeks × dedicated weekly hours × 0.8)). The 0.8 factor reserves a 20% buffer. I won't invent an estimate without these inputs.";
    }
  } else if (intent === "breakdown") {
    answer = `Here is a starter delivery plan${input.projectId ? " for the selected project" : " for a software project"}, not a project-specific specification:\n\n1. Scope: define the users, must-have features, acceptance criteria and deadline. Choose a coordinator.\n2. Design: split each feature into interface, API and data work where relevant; agree on contracts before parallel work.\n3. Build: create small, testable tasks (roughly half a day to two days). Give each task one accountable owner and list dependencies and required skills.\n4. Review: assign a reviewer other than the author. Pair trainees with experienced members.\n5. Deliver: include integration tests, accessibility, documentation and deployment; reserve 20% capacity for fixes.\n\nThere are ${scopedTasks.length} open tasks in the selected scope. Use the skill/workload matches below as a starting point, then confirm availability. For a tailored breakdown, describe the non-confidential scope and enable cloud help if available.`;
  } else if (intent === "workload") {
    const blocked = scopedTasks.filter(t => t.status === "BLOCKED").length;
    answer = `There are ${scopedTasks.length} open tasks in this scope, including ${blocked} blocked tasks.\n\nUnblock dependencies first, finish work already in review, and avoid giving several urgent tasks to the same person. The cards compare eligible members using other open assignments and pending reviews across this team. Skill matches rank first, then lower workload; missing effort is never treated as proof someone is free. Check commitments in other teams before reassigning anything.`;
  } else {
    answer = top.length
      ? `${top[0].name} is the first candidate to discuss ${isReview ? "reviewing" : "owning"} ${selected ? `“${selected.title}”` : "this work"} with. ${top[0].reasons.join(". ")}.\n\n${required.length ? "Ranking prioritizes recorded skill matches, then fewer open assignments/reviews and lower estimated open effort." : "This is a workload-only suggestion, not evidence of skill fit."} Confirm availability, dependencies and interest before assigning. ${selected?.estimatedHours ? `This task is estimated at ${selected.estimatedHours} hours.` : "Add an effort estimate to the task for better planning."}`
      : "No eligible, available candidates were found. Add active members with the appropriate role, record their skills and availability, or check whether everyone is marked unavailable. A reviewer must not be an assignee of the selected task.";
  }
  return { answer, recommendations: top, warnings, requiredSkills: required, intent, teamSize,
    stats: { members: context.members.length, openTasks: tasks.length, scopedOpenTasks: scopedTasks.length } };
}

module.exports = { advise, getIntent };
