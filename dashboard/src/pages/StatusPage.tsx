import { useState, useEffect } from 'react';
import { apiFetch, apiPost } from '../api-client';

interface Integration {
  id: string;
  name: string;
  enabled: boolean;
  detail?: string;
}

interface Status {
  running: boolean;
  pid: number | null;
  uptime: number | null;
  connectedChannels: string[];
  authMode: string;
  authLabel: string;
  integrations: Integration[];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await apiFetch<Status>('/status');
      setStatus(data);
      setError('');
    } catch {
      setError('Failed to fetch status');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionPending(true);
    setActionMessage('');
    try {
      const result = await apiPost<{ ok: boolean; message: string }>(`/status/${action}`);
      setActionMessage(result.message);
      setTimeout(fetchStatus, 2000);
    } catch {
      setActionMessage(`Failed to ${action} service`);
    }
    setActionPending(false);
  };

  if (error) return <div className="error">{error}</div>;
  if (!status) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h2>Status</h2>

      {/* Hero card */}
      <div className="status-hero">
        <span className={`status-dot ${status.running ? 'status-dot-green' : 'status-dot-red'}`} />
        <div className="status-hero-text">
          <h3>{status.running ? 'Service Running' : 'Service Stopped'}</h3>
          <div className="status-hero-meta">
            {status.pid && <span className="mono">PID {status.pid}</span>}
            {status.pid && status.uptime !== null && <span> · </span>}
            {status.uptime !== null && <span>Up {formatUptime(status.uptime)}</span>}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="card-grid card-grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Auth</div>
          <div>
            <span className={`badge ${
              status.authMode === 'oauth' ? 'badge-green' :
              status.authMode === 'api-key' ? 'badge-yellow' : 'badge-red'
            }`}>
              {status.authLabel}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Channels</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {status.connectedChannels.length > 0
              ? status.connectedChannels.join(', ')
              : <span style={{ color: 'var(--text-tertiary)' }}>None active</span>
            }
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Integrations</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {status.integrations.filter(i => i.enabled).length} / {status.integrations.length} active
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="section-label">Integrations</div>
      <div className="integrations-row">
        {status.integrations.map((i) => (
          <span
            key={i.id}
            className={`integration-chip ${i.enabled ? 'active' : 'inactive'}`}
          >
            {i.name}
            {i.detail && <span className="integration-detail">{i.detail}</span>}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="section-label">Controls</div>
      <div className="btn-row">
        {status.running ? (
          <>
            <button
              className="btn btn-warning"
              onClick={() => handleAction('restart')}
              disabled={actionPending}
            >
              {actionPending ? 'Restarting...' : 'Restart'}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleAction('stop')}
              disabled={actionPending}
            >
              {actionPending ? 'Stopping...' : 'Stop'}
            </button>
          </>
        ) : (
          <button
            className="btn btn-success"
            onClick={() => handleAction('start')}
            disabled={actionPending}
          >
            {actionPending ? 'Starting...' : 'Start'}
          </button>
        )}
        {actionMessage && (
          <span className="action-message">{actionMessage}</span>
        )}
      </div>
    </div>
  );
}
