import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiPost, apiPut } from '../api-client';

interface Group {
  jid: string;
  name: string;
  folder: string;
  trigger_pattern: string;
  added_at: string;
  requires_trigger: number | null;
  is_main: number | null;
  model: string | null;
}

const MODEL_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6' },
  { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [resetting, setResetting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<Group[]>('/groups').then(setGroups).catch(console.error);
  }, []);

  const handleModelChange = async (folder: string, model: string) => {
    try {
      await apiPut(`/groups/${encodeURIComponent(folder)}/model`, {
        model: model || null,
      });
      setGroups((prev) =>
        prev.map((g) =>
          g.folder === folder ? { ...g, model: model || null } : g,
        ),
      );
    } catch (err) {
      console.error('Failed to update model', err);
    }
  };

  const handleResetSession = async (folder: string) => {
    if (!confirm(`Reset session for "${folder}"? This clears conversation memory but keeps tasks and settings.`)) {
      return;
    }
    setResetting(folder);
    try {
      await apiPost(`/groups/${encodeURIComponent(folder)}/reset-session`);
    } catch (err) {
      console.error('Failed to reset session', err);
    }
    setResetting(null);
  };

  const modeBadge = (g: Group) =>
    g.is_main
      ? <span className="badge badge-accent">Main</span>
      : <span className="badge badge-grey">{g.requires_trigger ? 'Trigger' : 'All'}</span>;

  const modelLabel = (g: Group) =>
    MODEL_OPTIONS.find(o => o.value === (g.model || ''))?.label || 'Default';

  return (
    <div>
      <h2>Groups</h2>

      {/* Desktop table */}
      <div className="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>JID</th>
              <th>Folder</th>
              <th>Model</th>
              <th>Mode</th>
              <th>Session</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.jid}>
                <td
                  style={{ cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => navigate(`/groups/${encodeURIComponent(g.jid)}`)}
                >
                  {g.name}
                </td>
                <td className="mono">{g.jid}</td>
                <td className="mono">{g.folder}</td>
                <td>
                  <select
                    className="select"
                    value={g.model || ''}
                    onChange={(e) => handleModelChange(g.folder, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{modeBadge(g)}</td>
                <td>
                  <button
                    className="btn btn-warning"
                    onClick={(e) => { e.stopPropagation(); handleResetSession(g.folder); }}
                    disabled={resetting === g.folder}
                  >
                    {resetting === g.folder ? 'Resetting...' : 'Reset'}
                  </button>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">No groups registered</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="group-cards">
        {groups.map((g) => (
          <div
            key={g.jid}
            className="group-card"
            onClick={() => navigate(`/groups/${encodeURIComponent(g.jid)}`)}
          >
            <div className="group-card-header">
              <span className="group-card-name">{g.name}</span>
              {modeBadge(g)}
            </div>
            <div className="group-card-meta">
              <span className="mono">{g.folder}</span>
              <span>{modelLabel(g)}</span>
            </div>
            <div className="group-card-actions">
              <select
                className="select"
                value={g.model || ''}
                onChange={(e) => { e.stopPropagation(); handleModelChange(g.folder, e.target.value); }}
                onClick={(e) => e.stopPropagation()}
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-warning"
                onClick={(e) => { e.stopPropagation(); handleResetSession(g.folder); }}
                disabled={resetting === g.folder}
              >
                {resetting === g.folder ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        ))}
        {groups.length === 0 && <div className="empty">No groups registered</div>}
      </div>
    </div>
  );
}
