import { useState, useEffect, Fragment } from 'react';
import { apiFetch } from '../api-client';

interface Task {
  id: string;
  group_folder: string;
  chat_jid: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  context_mode: string;
  next_run: string | null;
  last_run: string | null;
  last_result: string | null;
  status: string;
  created_at: string;
}

interface TaskRunLog {
  id: number;
  task_id: string;
  run_at: string;
  duration_ms: number;
  status: string;
  result: string | null;
  error: string | null;
}

function statusBadge(status: string) {
  const cls =
    status === 'active' ? 'badge-green' :
    status === 'paused' ? 'badge-yellow' :
    status === 'success' ? 'badge-green' :
    status === 'error' ? 'badge-red' :
    'badge-grey';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logs, setLogs] = useState<TaskRunLog[]>([]);

  useEffect(() => {
    apiFetch<Task[]>('/tasks').then(setTasks).catch(console.error);
  }, []);

  const toggleExpand = async (taskId: string) => {
    if (expanded === taskId) {
      setExpanded(null);
      return;
    }
    setExpanded(taskId);
    const data = await apiFetch<TaskRunLog[]>(`/tasks/${taskId}/logs`);
    setLogs(data);
  };

  return (
    <div>
      <h2>Tasks</h2>

      {/* Desktop table */}
      <div className="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Prompt</th>
              <th>Schedule</th>
              <th>Next run</th>
              <th>Last run</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <Fragment key={t.id}>
                <tr className="clickable" onClick={() => toggleExpand(t.id)}>
                  <td className="mono">{t.group_folder}</td>
                  <td className="truncate">{t.prompt}</td>
                  <td className="mono">{t.schedule_type}: {t.schedule_value}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {t.next_run ? formatDate(t.next_run) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {t.last_run ? formatDate(t.last_run) : '—'}
                  </td>
                  <td>{statusBadge(t.status)}</td>
                </tr>
                {expanded === t.id && (
                  <tr>
                    <td colSpan={6} className="task-expand-cell">
                      <div className="task-logs">
                        <div className="task-logs-title">Run history</div>
                        {logs.length === 0 ? (
                          <p className="empty" style={{ padding: '1rem 0' }}>No runs yet</p>
                        ) : (
                          <div className="table-wrap">
                            <table className="inner-table">
                              <thead>
                                <tr>
                                  <th>Time</th>
                                  <th>Duration</th>
                                  <th>Status</th>
                                  <th>Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {logs.map((l) => (
                                  <tr key={l.id}>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                      {formatDate(l.run_at)}
                                    </td>
                                    <td className="mono">
                                      {(l.duration_ms / 1000).toFixed(1)}s
                                    </td>
                                    <td>{statusBadge(l.status)}</td>
                                    <td className="truncate">
                                      {l.error || l.result || '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">No scheduled tasks</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="task-cards">
        {tasks.map((t) => (
          <div key={t.id} className="task-card" onClick={() => toggleExpand(t.id)}>
            <div className="task-card-header">
              <span className="mono" style={{ fontSize: '0.6875rem' }}>{t.group_folder}</span>
              {statusBadge(t.status)}
            </div>
            <div className="task-card-prompt">{t.prompt}</div>
            <div className="task-card-meta">
              <span>{t.schedule_type}: {t.schedule_value}</span>
              {t.next_run && <span>Next: {formatDate(t.next_run)}</span>}
              {t.last_run && <span>Last: {formatDate(t.last_run)}</span>}
            </div>
            {expanded === t.id && logs.length > 0 && (
              <div className="task-logs" style={{ marginTop: '0.75rem' }}>
                <div className="task-logs-title">Run history</div>
                {logs.map((l) => (
                  <div key={l.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.375rem 0', borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatDate(l.run_at)}</span>
                    <span className="mono">{(l.duration_ms / 1000).toFixed(1)}s</span>
                    {statusBadge(l.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {tasks.length === 0 && <div className="empty">No scheduled tasks</div>}
      </div>
    </div>
  );
}
