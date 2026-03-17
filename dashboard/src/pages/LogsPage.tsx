import { useState, useEffect, useRef } from 'react';
import { getAuthHeaders } from '../api-client';

export default function LogsPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLPreElement>(null);
  const MAX_LINES = 1000;

  useEffect(() => {
    const headers = getAuthHeaders();
    const token = headers.Authorization?.replace('Bearer ', '');
    const controller = new AbortController();

    async function connect() {
      try {
        const res = await fetch(`/api/logs?tail=200`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setConnected(false);
          return;
        }

        setConnected(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          const newLines: string[] = [];
          for (const part of parts) {
            const line = part.replace(/^data: /, '');
            if (line) newLines.push(line);
          }

          if (newLines.length > 0) {
            setLines((prev) => {
              const combined = [...prev, ...newLines];
              return combined.slice(-MAX_LINES);
            });
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setConnected(false);
        }
      }
    }

    connect();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length]);

  return (
    <div>
      <div className="logs-header">
        <h2>Logs</h2>
        <span className={`badge ${connected ? 'badge-green' : 'badge-red'}`}>
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>
      <pre className="log-container" ref={containerRef}>
        {lines.map((line, i) => (
          <div key={i} className="log-line">{line}</div>
        ))}
        <div ref={bottomRef} />
      </pre>
    </div>
  );
}
