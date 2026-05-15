import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import apiClient from '../services/api';
import './SupervisorDashboard.css';
import { STATUS_CONFIG, STATUS_ORDER, BRANCHES, BRANCH_TYPE_CONFIG, formatDate } from '../constants';

function StatusBadge({ statut }) {
  const cfg = STATUS_CONFIG[statut] || { label: statut, color: '#6b7280' };
  return (
    <span className="sv-badge" style={{ color: cfg.color, background: cfg.color + '18', border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="sv-tooltip">
        <strong>{payload[0].name}</strong>
        <span>{payload[0].value?.toLocaleString('fr-FR')}</span>
      </div>
    );
  }
  return null;
};

function getQuarters() {
  const now = new Date();
  const y = now.getFullYear();
  const todayStr = now.toISOString().split('T')[0];
  const quarters = [
    { label: `T1 ${y}`, start: `${y}-01-01`, end: `${y}-03-31` },
    { label: `T2 ${y}`, start: `${y}-04-01`, end: `${y}-06-30` },
    { label: `T3 ${y}`, start: `${y}-07-01`, end: `${y}-09-30` },
    { label: `T4 ${y}`, start: `${y}-10-01`, end: `${y}-12-31` },
  ];
  return quarters.map(q => ({ ...q, end: q.end > todayStr ? todayStr : q.end }));
}

const CHART_EMPTY = (
  <div className="sv-chart-empty">
    <span className="sv-chart-empty-icon">📡</span>
    <p>Chargez une période ci-dessous<br />pour voir les graphiques</p>
  </div>
);

export default function SupervisorDashboard() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const quarters  = getQuarters();
  const currentQ  = Math.floor(new Date().getMonth() / 3);

  const [branchStart, setBranchStart]           = useState(quarters[currentQ].start);
  const [branchEnd, setBranchEnd]               = useState(quarters[currentQ].end);
  const [branchData, setBranchData]             = useState(null);
  const [branchLoading, setBranchLoading]       = useState(false);
  const [branchError, setBranchError]           = useState('');
  const [branchFilter, setBranchFilter]         = useState('');
  const [branchTypeFilter, setBranchTypeFilter] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiClient.get('/supervisor/dashboard');
      setData(res.data);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      if (!err.response)                   setError('Serveur inaccessible — vérifiez la connexion réseau');
      else if (err.response.status === 401) setError('Session expirée — reconnectez-vous');
      else if (err.response.status === 403) setError('Accès non autorisé');
      else setError(`Erreur ${err.response.status} : ${err.response.data?.error || 'Erreur serveur'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const autoLoaded = useRef(false);

  const loadBranches = useCallback(async (start = branchStart, end = branchEnd) => {
    setBranchLoading(true);
    setBranchError('');
    setBranchData(null);
    try {
      const res = await apiClient.post('/supervisor/branches', { startDate: start, endDate: end });
      setBranchData(res.data);
    } catch (err) {
      setBranchError(err.response?.data?.error || 'Erreur lors du chargement');
    } finally {
      setBranchLoading(false);
    }
  }, [branchStart, branchEnd]);

  // Chargement automatique du trimestre en cours — attend que fetchDashboard soit terminé
  useEffect(() => {
    if (data && !autoLoaded.current) {
      autoLoaded.current = true;
      loadBranches(quarters[currentQ].start, quarters[currentQ].end);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (loading) return <div className="sv-center sv-muted">Chargement…</div>;
  if (error) return (
    <div className="sv-center" style={{ flexDirection: 'column', gap: '1rem', display: 'flex' }}>
      <div className="sv-danger">{error}</div>
      <button className="sv-btn-primary" onClick={fetchDashboard}>Réessayer</button>
    </div>
  );
  if (!data) return null;

  const { stats, statusBreakdown, irisHealth } = data;

  // ── Données graphiques depuis IRIS (branchData) ──────────────
  let pieData = null;
  let barData = null;

  if (branchData) {
    const totals = { completed: 0, approved: 0, pending: 0, rejected: 0 };
    Object.values(branchData.branches).forEach(b => {
      totals.completed += b.completed;
      totals.approved  += b.approved;
      totals.pending   += b.pending;
      totals.rejected  += b.rejected;
    });

    pieData = [
      { name: 'Passeport prêt',         value: totals.completed, color: '#6D28D9' },
      { name: 'Approuvé',               value: totals.approved,  color: '#10B981' },
      { name: 'En attente approbation', value: totals.pending,   color: '#F59E0B' },
      { name: 'Rejeté',                 value: totals.rejected,  color: '#EF4444' },
    ].filter(d => d.value > 0);

    barData = Object.entries(branchData.branches)
      .map(([id, s]) => ({
        name: BRANCHES[id] ? BRANCHES[id].name.split(' — ')[0] : `Br. ${id}`,
        total: s.total,
        completed: s.completed,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }

  // ── Métriques (depuis IRIS si chargé, sinon DB locale) ────────
  const irisLoaded = !!branchData;
  const metricTotal     = irisLoaded ? branchData.total : stats.total;
  const metricCompleted = irisLoaded
    ? Object.values(branchData.branches).reduce((s, b) => s + b.completed, 0)
    : (statusBreakdown.find(r => r.statut_actuel === 'Production Completed')?.count || 0);
  const metricRejected  = irisLoaded
    ? Object.values(branchData.branches).reduce((s, b) => s + b.rejected, 0)
    : (statusBreakdown.find(r => r.statut_actuel === 'Final Approval Rejected')?.count || 0);
  const metricPending   = irisLoaded
    ? Object.values(branchData.branches).reduce((s, b) => s + b.pending, 0)
    : (statusBreakdown.find(r => r.statut_actuel === 'Pending Final Approval')?.count || 0);
  const metricApproved  = irisLoaded
    ? Object.values(branchData.branches).reduce((s, b) => s + b.approved, 0)
    : (statusBreakdown.find(r => r.statut_actuel === 'Final Approval Passed')?.count || 0);

  // Libellé de la période active
  const activeQ = quarters.find(q => q.start === branchStart && q.end === branchEnd);
  const periodLabel = activeQ ? activeQ.label : 'Période personnalisée';

  return (
    <div className="sv-page">

      {/* ── Bannière de bienvenue ── */}
      <div className="sv-welcome-banner">
        <div className="sv-welcome-left">
          <h1 className="sv-welcome-title">Tableau de bord Superviseur</h1>
          <p className="sv-welcome-sub">
            Surveillance en temps réel&nbsp;·&nbsp;{lastRefresh && lastRefresh.toLocaleTimeString('fr-FR')}
            {stats.lastCronRun && <>&nbsp;·&nbsp;Dernière vérif IRIS&nbsp;: {formatDate(stats.lastCronRun)}</>}
          </p>
        </div>
        <div className="sv-welcome-actions">
          {irisHealth && (
            <div className={`sv-iris-pill ${irisHealth.online ? 'online' : 'offline'}`}>
              <span className="sv-iris-dot" />
              {irisHealth.online
                ? `API IRIS · En ligne · ${irisHealth.latencyMs}ms`
                : `API IRIS · Hors ligne`}
            </div>
          )}
          <button className="sv-btn-refresh" onClick={fetchDashboard}>↺ Actualiser</button>
        </div>
      </div>

      {/* ── Bannière période active ── */}
      <div className="sv-period-banner">
        <div className="sv-period-info">
          <span className="sv-period-tag">{periodLabel}</span>
          <span className="sv-period-range">
            {new Date(branchStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            &nbsp;→&nbsp;
            {new Date(branchEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          {branchLoading && (
            <span className="sv-period-loading">
              <span className="sv-spinner-xs" /> Chargement IRIS…
            </span>
          )}
          {branchData && !branchLoading && (
            <span className="sv-period-count">
              {branchData.total.toLocaleString('fr-FR')} demandes · {Object.keys(branchData.branches).length} branches
            </span>
          )}
        </div>
        <button className="sv-btn-ghost-sm" onClick={() => loadBranches(branchStart, branchEnd)} disabled={branchLoading}>
          ↺ Recharger
        </button>
      </div>

      {/* ── Cartes métriques ── */}
      <div className="sv-metrics">
        <div className="sv-metric-card sv-purple">
          <span className="sv-mc-icon">📋</span>
          <div className="sv-mc-num">{metricTotal.toLocaleString('fr-FR')}</div>
          <div className="sv-mc-lbl">{irisLoaded ? 'Demandes IRIS' : 'Total demandes'}</div>
        </div>
        <div className="sv-metric-card sv-green">
          <span className="sv-mc-icon">🎉</span>
          <div className="sv-mc-num">{metricCompleted.toLocaleString('fr-FR')}</div>
          <div className="sv-mc-lbl">Passeports prêts</div>
        </div>
        <div className="sv-metric-card sv-red">
          <span className="sv-mc-icon">✗</span>
          <div className="sv-mc-num">{metricRejected.toLocaleString('fr-FR')}</div>
          <div className="sv-mc-lbl">Demandes rejetées</div>
        </div>
        <div className="sv-metric-card sv-amber">
          <span className="sv-mc-icon">⏳</span>
          <div className="sv-mc-num">{metricPending.toLocaleString('fr-FR')}</div>
          <div className="sv-mc-lbl">En attente approbation</div>
        </div>
        <div className="sv-metric-card sv-teal">
          <span className="sv-mc-icon">✓</span>
          <div className="sv-mc-num">{metricApproved.toLocaleString('fr-FR')}</div>
          <div className="sv-mc-lbl">Approuvés</div>
        </div>
      </div>

      {/* ── Graphiques IRIS ── */}
      <div className="sv-charts-row">
        <div className="sv-chart-card">
          <h3 className="sv-chart-title">
            Répartition des statuts
            {irisLoaded && <span className="sv-chart-period">{branchData.period.startDate} → {branchData.period.endDate}</span>}
          </h3>
          {!pieData ? CHART_EMPTY : (
            <ResponsiveContainer width="100%" height={290}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={108} paddingAngle={4} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={9}
                  formatter={v => <span style={{ fontSize: '0.78rem', color: '#374151' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sv-chart-card">
          <h3 className="sv-chart-title">
            Top branches par volume
            {irisLoaded && <span className="sv-chart-period">15 premières</span>}
          </h3>
          {!barData ? CHART_EMPTY : (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F3FF" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} angle={-38} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v, n) => [v?.toLocaleString('fr-FR'), n === 'total' ? 'Total' : 'Prêts']}
                  contentStyle={{ fontSize: '0.82rem', borderRadius: '10px', border: '1px solid #EDE9FE' }}
                />
                <Bar dataKey="total"     name="total"     radius={[5,5,0,0]} fill="#DDD6FE" />
                <Bar dataKey="completed" name="completed" radius={[5,5,0,0]} fill="#7C3AED" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Monitoring par branche ── */}
      <div className="sv-branch-card">
        <div className="sv-branch-header">
          <div>
            <h3 className="sv-branch-title">Suivi par branche — IRIS</h3>
            <p className="sv-muted">Traitement des demandes par branche · max 3 mois</p>
          </div>
        </div>

        <div className="sv-branch-controls">
          <div className="sv-quarter-btns">
            {quarters.map((q, i) => (
              <button key={i}
                className={`sv-quarter-btn ${branchStart === q.start && branchEnd === q.end ? 'active' : ''}`}
                disabled={branchLoading}
                onClick={() => { setBranchStart(q.start); setBranchEnd(q.end); loadBranches(q.start, q.end); }}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="sv-branch-dates">
            <input type="date" className="sv-date-input" value={branchStart}
              onChange={e => setBranchStart(e.target.value)} />
            <span className="sv-muted">→</span>
            <input type="date" className="sv-date-input" value={branchEnd}
              onChange={e => setBranchEnd(e.target.value)} />
            <button className="sv-btn-primary sv-btn-sm" onClick={() => loadBranches(branchStart, branchEnd)} disabled={branchLoading}>
              {branchLoading ? 'Chargement…' : 'Charger'}
            </button>
          </div>
        </div>

        {branchLoading && (
          <div className="sv-center sv-muted" style={{ padding: '32px' }}>
            <span className="sv-spinner-xs" style={{ marginRight: 8 }} />
            Interrogation de l'API IRIS…
          </div>
        )}
        {branchError && <div className="sv-alert-error">{branchError}</div>}

        {branchData && (() => {
          const allRows = Object.entries(branchData.branches)
            .map(([id, s]) => ({ id, ...(BRANCHES[id] || { name: `Branche ${id}`, type: 'unknown' }), ...s }))
            .sort((a, b) => b.total - a.total);

          const filtered = allRows.filter(r => {
            const matchType = !branchTypeFilter || r.type === branchTypeFilter;
            const matchName = !branchFilter || r.id === branchFilter;
            return matchType && matchName;
          });

          return (
            <>
              <div className="sv-branch-summary">
                <span className="sv-branch-total-badge">
                  {branchData.total.toLocaleString('fr-FR')} demandes
                  &nbsp;·&nbsp;{Object.keys(branchData.branches).length} branches
                  &nbsp;·&nbsp;{branchData.period.startDate} → {branchData.period.endDate}
                </span>
              </div>

              <div className="sv-branch-filters">
                <select className="sv-date-input" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                  <option value="">Toutes les branches ({allRows.length})</option>
                  {allRows.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.id} — {r.name} ({r.total.toLocaleString('fr-FR')})
                    </option>
                  ))}
                </select>
                <select className="sv-date-input" value={branchTypeFilter} onChange={e => setBranchTypeFilter(e.target.value)}>
                  <option value="">Tous les types</option>
                  {Object.entries(BRANCH_TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div className="sv-branch-table-wrap">
                <table className="sv-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Branche</th>
                      <th>Type</th>
                      <th className="sv-num-col">Total</th>
                      <th className="sv-num-col">Prêts</th>
                      <th className="sv-num-col">Approuvés</th>
                      <th className="sv-num-col">En attente</th>
                      <th className="sv-num-col">Rejetés</th>
                      <th>Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(row => {
                      const typeCfg = BRANCH_TYPE_CONFIG[row.type] || { label: row.type, color: '#6b7280', bg: '#f3f4f6' };
                      const pct = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
                      return (
                        <tr key={row.id}>
                          <td><span className="sv-mono">{row.id}</span></td>
                          <td className="sv-branch-name">{row.name}</td>
                          <td><span className="sv-type-badge" style={{ color: typeCfg.color, background: typeCfg.bg }}>{typeCfg.label}</span></td>
                          <td className="sv-num-col sv-bold">{row.total.toLocaleString('fr-FR')}</td>
                          <td className="sv-num-col" style={{ color: '#6D28D9', fontWeight: 600 }}>{row.completed.toLocaleString('fr-FR')}</td>
                          <td className="sv-num-col" style={{ color: '#10B981' }}>{row.approved.toLocaleString('fr-FR')}</td>
                          <td className="sv-num-col" style={{ color: '#F59E0B' }}>{row.pending.toLocaleString('fr-FR')}</td>
                          <td className="sv-num-col" style={{ color: '#EF4444' }}>{row.rejected.toLocaleString('fr-FR')}</td>
                          <td>
                            <div className="sv-progress-col">
                              <div className="sv-progress-bar-wrap">
                                <div className="sv-progress-bar" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="sv-progress-pct">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </div>

    </div>
  );
}
