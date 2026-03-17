import { Router } from 'express';
import {
  getUsageSummary,
  getUsageByGroup,
  getUsageByModel,
  getUsageDailyTrend,
  getRecentUsage,
} from '../db.js';

const router = Router();

function startOfDay(d: Date): string {
  return d.toISOString().split('T')[0] + 'T00:00:00.000Z';
}

router.get('/', (_req, res) => {
  const now = new Date();

  const todayStart = startOfDay(now);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = startOfDay(weekAgo);

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const monthStart = startOfDay(monthAgo);

  res.json({
    today: getUsageSummary(todayStart),
    week: getUsageSummary(weekStart),
    month: getUsageSummary(monthStart),
    byGroup: getUsageByGroup(monthStart),
    byModel: getUsageByModel(monthStart),
    dailyTrend: getUsageDailyTrend(monthStart),
    recent: getRecentUsage(20),
  });
});

export default router;
