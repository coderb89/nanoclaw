import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api-client';

interface SearchResult {
  id: string;
  chat_jid: string;
  sender_name: string;
  content: string;
  timestamp: string;
  chat_name: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const doSearch = () => {
    const q = query.trim();
    if (!q) return;
    apiFetch<SearchResult[]>(`/messages/search?q=${encodeURIComponent(q)}`)
      .then((data) => { setResults(data); setSearched(true); })
      .catch(console.error);
  };

  return (
    <div>
      <h2>Search</h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <input
          className="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Search messages..."
          autoFocus
        />
        <button className="btn btn-primary" onClick={doSearch} style={{ flexShrink: 0 }}>
          Search
        </button>
      </div>

      {/* Desktop table */}
      <div className="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Sender</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={r.id}
                className="clickable"
                onClick={() => navigate(`/groups/${encodeURIComponent(r.chat_jid)}`)}
              >
                <td style={{ fontWeight: 500 }}>{r.chat_name}</td>
                <td>{r.sender_name}</td>
                <td className="truncate">{r.content}</td>
                <td className="mono" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {formatDate(r.timestamp)}
                </td>
              </tr>
            ))}
            {searched && results.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">No messages found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="search-result-cards">
        {results.map((r) => (
          <div
            key={r.id}
            className="search-result-card"
            onClick={() => navigate(`/groups/${encodeURIComponent(r.chat_jid)}`)}
          >
            <div className="search-result-header">
              <span className="search-result-group">{r.chat_name}</span>
              <span className="search-result-time">{formatDate(r.timestamp)}</span>
            </div>
            <div className="search-result-sender">{r.sender_name}</div>
            <div className="search-result-content">{r.content}</div>
          </div>
        ))}
        {searched && results.length === 0 && (
          <div className="empty">No messages found</div>
        )}
      </div>
    </div>
  );
}
