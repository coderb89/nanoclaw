import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import readline from 'readline';

const router = Router();

const LOG_PATH = process.env.LOG_PATH
  ?? path.resolve(import.meta.dirname, '../../../logs/nanoclaw.log');

// Strip ANSI escape codes from pino-pretty output
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

router.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send last N lines first
  const tailLines = parseInt(req.query.tail as string) || 100;

  try {
    const content = fs.readFileSync(LOG_PATH, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    const recent = lines.slice(-tailLines);
    for (const line of recent) {
      res.write(`data: ${stripAnsi(line)}\n\n`);
    }
  } catch {
    res.write(`data: [No log file found]\n\n`);
  }

  // Watch for new lines
  let lastSize = 0;
  try {
    lastSize = fs.statSync(LOG_PATH).size;
  } catch { /* file may not exist yet */ }

  const watcher = fs.watch(path.dirname(LOG_PATH), (_, filename) => {
    if (filename !== path.basename(LOG_PATH)) return;

    try {
      const stat = fs.statSync(LOG_PATH);
      if (stat.size <= lastSize) {
        // File was truncated/rotated — reset
        lastSize = 0;
      }

      if (stat.size > lastSize) {
        const stream = createReadStream(LOG_PATH, {
          start: lastSize,
          encoding: 'utf-8',
        });
        const rl = readline.createInterface({ input: stream });
        rl.on('line', (line) => {
          if (line.trim()) {
            res.write(`data: ${stripAnsi(line)}\n\n`);
          }
        });
        rl.on('close', () => {
          lastSize = stat.size;
        });
      }
    } catch { /* file may have been removed */ }
  });

  req.on('close', () => {
    watcher.close();
  });
});

export default router;
