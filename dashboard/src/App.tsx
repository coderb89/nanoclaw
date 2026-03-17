import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { isAuthenticated, setToken } from './api-client';
import StatusPage from './pages/StatusPage';
import GroupsPage from './pages/GroupsPage';
import MessagesPage from './pages/MessagesPage';
import TasksPage from './pages/TasksPage';
import LogsPage from './pages/LogsPage';
import SearchPage from './pages/SearchPage';
import CostsPage from './pages/CostsPage';

/* ─── Compact SVG Icons ─────────────────────────────────────────────── */
const icons = {
  status: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M6.5 10.5L9 13L13.5 7.5" />
    </svg>
  ),
  groups: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7.5" cy="7" r="2.5" />
      <circle cx="13" cy="7" r="2.5" />
      <path d="M3 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <path d="M12 12c2 0 4 1.2 4 3.5" />
    </svg>
  ),
  tasks: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <path d="M7 7h6M7 10h4M7 13h5" />
    </svg>
  ),
  search: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13 13l3.5 3.5" />
    </svg>
  ),
  costs: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 16l3-5 3 3 3-7 3 4" />
      <path d="M4 16h12" />
    </svg>
  ),
  logs: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 5l3 3-3 3" />
      <path d="M11 11h4" />
    </svg>
  ),
};

const navItems = [
  { to: '/', label: 'Status', icon: icons.status, end: true },
  { to: '/groups', label: 'Groups', icon: icons.groups },
  { to: '/tasks', label: 'Tasks', icon: icons.tasks },
  { to: '/search', label: 'Search', icon: icons.search },
  { to: '/costs', label: 'Costs', icon: icons.costs },
  { to: '/logs', label: 'Logs', icon: icons.logs },
];

function Login() {
  const [secret, setSecret] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret.trim()) {
      setToken(secret.trim());
      window.location.reload();
    }
  };

  return (
    <div className="login">
      <div className="login-box">
        <h1>Nano<span style={{ color: 'var(--accent)' }}>Claw</span></h1>
        <p>Enter your dashboard secret to continue.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Dashboard secret"
            autoFocus
          />
          <button type="submit">Continue</button>
        </form>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className="layout">
      <header className="topbar">
        <span className="topbar-logo">
          Nano<span>Claw</span>
        </span>
        <nav className="topbar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<StatusPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:jid" element={<MessagesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/costs" element={<CostsPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  if (!isAuthenticated()) return <Login />;
  return <Layout />;
}
