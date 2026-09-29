const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/asyncHandler');
const { loadDeliveryReport } = require('../reports/delivery');

const reportSchema = z.object({
  params: z.object({ teamId: z.string().cuid() }),
  body: z.object({}).strict(),
  query: z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict(),
});

function createReportRoutes({ db, authenticate }) {
  const router = express.Router({ mergeParams: true });
  router.use(authenticate);
  router.get('/delivery', validate(reportSchema), asyncHandler(async (req, res) => {
    const result = await loadDeliveryReport(db, req.params.teamId, req.user.id, req.query.page);
    res.set('Cache-Control', 'no-store').json(result);
  }));
  return router;
}

module.exports = { createReportRoutes, reportSchema };
