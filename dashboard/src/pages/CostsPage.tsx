import { useState, useEffect } from 'react';
import { apiFetch } from '../api-client';

interface UsageSummary {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  invocations: number;
}

interface UsageByGroup {
  group_folder: string;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  invocations: number;
}

interface UsageByModel {
  model: string;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  invocations: number;
}

interface UsageDailyTrend {
  date: string;
  total_cost: number;
  invocations: number;
}

interface UsageData {
  today: UsageSummary;
  week: UsageSummary;
  month: UsageSummary;
  byGroup: UsageByGroup[];
  byModel: UsageByModel[];
  dailyTrend: UsageDailyTrend[];
}

function fmt(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortModel(model: string): string {
  return model
    .replace('claude-', '')
    .replace(/-\d{8}$/, '');
}

export default function CostsPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<UsageData>('/usage')
      .then(setData)
      .catch(() => setError('Failed to fetch usage data'));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="loading">Loading...</div>;

  return (
    <div>
      <h2>Costs</h2>

      <div className="costs-summary">
        <div className="stat-card">
          <div className="stat-label">Today</div>
          <div className="stat-value mono">{fmt(data.today.total_cost)}</div>
          <div className="stat-sub">{data.today.invocations} calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">7 Days</div>
          <div className="stat-value mono">{fmt(data.week.total_cost)}</div>
          <div className="stat-sub">{data.week.invocations} calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">30 Days</div>
          <div className="stat-value mono">{fmt(data.month.total_cost)}</div>
          <div className="stat-sub">{data.month.invocations} calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tokens (30d)</div>
          <div className="stat-value mono">
            {fmtTokens(data.month.total_input_tokens + data.month.total_output_tokens)}
          </div>
          <div className="stat-sub">
            {fmtTokens(data.month.total_input_tokens)} in / {fmtTokens(data.month.total_output_tokens)} out
          </div>
        </div>
      </div>

      <h3>By Model</h3>
      {data.byModel.length === 0 ? (
        <p className="empty">No usage data yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Cost</th>
                <th>Tokens</th>
                <th>Calls</th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map((m) => (
                <tr key={m.model}>
                  <td className="mono">{shortModel(m.model)}</td>
                  <td className="mono">{fmt(m.total_cost)}</td>
                  <td className="mono">{fmtTokens(m.total_input_tokens + m.total_output_tokens)}</td>
                  <td className="mono">{m.invocations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>By Group</h3>
      {data.byGroup.length === 0 ? (
        <p className="empty">No usage data yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Group</th>
                <th>Cost</th>
                <th>Tokens</th>
                <th>Calls</th>
              </tr>
            </thead>
            <tbody>
              {data.byGroup.map((g) => (
                <tr key={g.group_folder}>
                  <td>{g.group_folder}</td>
                  <td className="mono">{fmt(g.total_cost)}</td>
                  <td className="mono">{fmtTokens(g.total_input_tokens + g.total_output_tokens)}</td>
                  <td className="mono">{g.invocations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Daily Trend</h3>
      {data.dailyTrend.length === 0 ? (
        <p className="empty">No usage data yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cost</th>
                <th>Calls</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyTrend.map((d) => (
                <tr key={d.date}>
                  <td className="mono">{d.date}</td>
                  <td className="mono">{fmt(d.total_cost)}</td>
                  <td className="mono">{d.invocations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
