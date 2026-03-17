import { Router } from 'express';
import { getTasks, getTaskRunLogs } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const tasks = getTasks();
  res.json(tasks);
});

router.get('/:id/logs', (req, res) => {
  const logs = getTaskRunLogs(req.params.id);
  res.json(logs);
});

export default router;
