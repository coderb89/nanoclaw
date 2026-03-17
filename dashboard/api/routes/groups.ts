import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getGroups, getTodos, setGroupModel, getWriteDb } from '../db.js';

const DATA_DIR = process.env.DATA_DIR
  ?? path.resolve(import.meta.dirname, '../../../data');

const VALID_MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

const router = Router();

router.get('/', (_req, res) => {
  const groups = getGroups();
  res.json(groups);
});

router.put('/:folder/model', (req, res) => {
  const { folder } = req.params;
  const { model } = req.body;

  if (model !== null && !VALID_MODELS.includes(model)) {
    res.status(400).json({ error: `Invalid model. Valid: ${VALID_MODELS.join(', ')}` });
    return;
  }

  setGroupModel(folder, model || null);
  res.json({ ok: true, model: model || null });
});

router.get('/:folder/todos', (req, res) => {
  const { folder } = req.params;
  const todos = getTodos(folder);
  res.json(todos);
});

router.post('/:folder/reset-session', async (req, res) => {
  const { folder } = req.params;

  // Validate folder exists in registered_groups
  const groups = getGroups();
  const group = groups.find((g) => g.folder === folder);
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // Delete entire projects directory (transcripts, session dirs, index)
  const projectsDir = path.join(DATA_DIR, 'sessions', folder, '.claude', 'projects');
  let cleared = false;
  if (fs.existsSync(projectsDir)) {
    fs.rmSync(projectsDir, { recursive: true, force: true });
    cleared = true;
  }

  // Also delete sessions-index.json at the .claude level if it exists
  const sessionsIndex = path.join(DATA_DIR, 'sessions', folder, '.claude', 'sessions-index.json');
  if (fs.existsSync(sessionsIndex)) {
    fs.unlinkSync(sessionsIndex);
  }

  // Clear session ID from DB
  getWriteDb().prepare('DELETE FROM sessions WHERE group_folder = ?').run(folder);

  // Restart core service to flush in-memory session cache
  const { execSync } = await import('child_process');
  try {
    if (process.platform === 'darwin') {
      const uid = process.getuid?.() ?? 501;
      execSync(`launchctl kickstart -k gui/${uid}/com.nanoclaw`, { timeout: 10000 });
    } else {
      execSync('systemctl --user restart nanoclaw', { timeout: 10000 });
    }
  } catch {
    // Non-fatal — session is cleared from DB, will be clean on next manual restart
  }

  res.json({ ok: true, cleared });
});

export default router;
