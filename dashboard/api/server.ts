import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './auth.js';
import statusRoutes from './routes/status.js';
import groupsRoutes from './routes/groups.js';
import messagesRoutes from './routes/messages.js';
import tasksRoutes from './routes/tasks.js';
import logsRoutes from './routes/logs.js';
import usageRoutes from './routes/usage.js';

const app = express();
const PORT = parseInt(process.env.DASHBOARD_PORT || '4000', 10);

app.use(cors());
app.use(express.json());

// API routes (all authenticated)
app.use('/api/status', authMiddleware, statusRoutes);
app.use('/api/groups', authMiddleware, groupsRoutes);
app.use('/api/messages', authMiddleware, messagesRoutes);
app.use('/api/tasks', authMiddleware, tasksRoutes);
app.use('/api/logs', authMiddleware, logsRoutes);
app.use('/api/usage', authMiddleware, usageRoutes);

// Serve frontend static files in production
const distPath = path.resolve(import.meta.dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Dashboard API running on http://127.0.0.1:${PORT}`);
});
