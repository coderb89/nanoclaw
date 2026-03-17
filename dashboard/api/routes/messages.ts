import { Router } from 'express';
import { getMessages, searchMessages } from '../db.js';

const router = Router();

router.get('/search', (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) return res.json([]);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json(searchMessages(q, limit));
});

router.get('/:jid', (req, res) => {
  const jid = decodeURIComponent(req.params.jid);
  const before = req.query.before as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  const messages = getMessages(jid, before, limit);
  res.json(messages);
});

export default router;
