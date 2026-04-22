import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import apiClient from '../services/api';
import './SupervisorDashboard.css';

const STATUS_CONFIG = {
  'néant':                   { label: 'Non traité',             color: '#6b7280' },
  'Pending Final Approval':  { label: 'En attente approbation', color: '#f59e0b' },
  'Final Approval Passed':   { label: 'Approuvé',               color: '#10b981' },
  'Final Approval Rejected': { label: 'Rejeté',                 color: '#ef4444' },
  'Production Completed':    { label: 'Passeport prêt',         color: '#3b82f6' },
};

const STATUS_ORDER = Object.keys(STATUS_CONFIG);

function StatusBadge({ statut }) {
  const cfg = STATUS_CONFIG[statut] || { label: statut, color: '#6b7280' };
  return (
    <span className="sv-badge" style={{ color: cfg.color, background: cfg.color + '18', border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  );
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDateShort(str) {
  if (!str) return '';
  const [, m, d] = str.split('-');
  return `${d}/${m}`;
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="sv-tooltip">
        <strong>{payload[0].name}</strong>
        <span>{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

export default function SupervisorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiClient.get('/supervisor/dashboard');
      setData(res.data);
      setLastRefresh(new Date());
      setError('');
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) return <div className="sv-center sv-muted">Chargement…</div>;
  if (error)   return <div className="sv-center sv-danger">{error}</div>;
  if (!data)   return null;

  const { stats, statusBreakdown, smsByDay, recentChanges, irisHealth } = data;

  // Données pour le pie chart statuts
  const pieData = statusBreakdown
    .filter(r => r.count > 0)
    .map(r => ({
      name: STATUS_CONFIG[r.statut_actuel]?.label || r.statut_actuel,
      value: r.count,
      color: STATUS_CONFIG[r.statut_actuel]?.color || '#6b7280'
    }));

  // Données pour le bar chart SMS par jour
  const barData = smsByDay.map(d => ({
    jour: formatDateShort(d.day),
    SMS: d.count
  }));

  // Données pour le line chart cumulatif SMS
  let cumul = 0;
  const lineData = smsByDay.map(d => {
    cumul += d.count;
    return { jour: formatDateShort(d.day), Total: cumul };
  });

  // Bar chart statuts
  const statusBarData = STATUS_ORDER.map(s => ({
    name: STATUS_CONFIG[s].label,
    count: statusBreakdown.find(r => r.statut_actuel === s)?.count || 0,
    color: STATUS_CONFIG[s].color
  }));

  return (
    <div className="sv-page">

      {/* En-tête */}
      <div className="sv-header">
        <div>
          <h2 className="sv-title">Tableau de bord Superviseur</h2>
          <span className="sv-muted">
            Actualisation auto · {lastRefresh && lastRefresh.toLocaleTimeString('fr-FR')}
            {stats.lastCronRun && ` · Dernière vérif IRIS : ${formatDate(stats.lastCronRun)}`}
          </span>
        </div>
        <div className="sv-header-right">
          {irisHealth && (
            <div className={`sv-iris-signal ${irisHealth.online ? 'online' : 'offline'}`}>
              <span className="sv-iris-dot" />
              <div className="sv-iris-info">
                <span className="sv-iris-label">API IRIS</span>
                <span className="sv-iris-sub">
                  {irisHealth.online
                    ? `En ligne · ${irisHealth.latencyMs}ms`
                    : `Hors ligne · ${irisHealth.error || 'Injoignable'}`}
                </span>
              </div>
            </div>
          )}
          <button className="sv-btn-primary" onClick={fetchDashboard}>Actualiser</button>
        </div>
      </div>

      {/* Cartes métriques */}
      <div className="sv-metrics">
        <div className="sv-metric-card sv-blue">
          <div className="sv-metric-num">{stats.total}</div>
          <div className="sv-metric-lbl">Total demandes</div>
        </div>
        <div className="sv-metric-card sv-green">
          <div className="sv-metric-num">
            {statusBreakdown.find(r => r.statut_actuel === 'Production Completed')?.count || 0}
          </div>
          <div className="sv-metric-lbl">Passeports prêts</div>
        </div>
        <div className="sv-metric-card sv-red">
          <div className="sv-metric-num">
            {statusBreakdown.find(r => r.statut_actuel === 'Final Approval Rejected')?.count || 0}
          </div>
          <div className="sv-metric-lbl">Demandes rejetées</div>
        </div>
        <div className="sv-metric-card sv-orange">
          <div className="sv-metric-num">
            {statusBreakdown.find(r => r.statut_actuel === 'Pending Final Approval')?.count || 0}
          </div>
          <div className="sv-metric-lbl">En attente approbation</div>
        </div>
        <div className="sv-metric-card sv-gray">
          <div className="sv-metric-num">{stats.sansTicket}</div>
          <div className="sv-metric-lbl">Sans N° ticket</div>
        </div>
      </div>

      {/* Ligne 1 : Pie + Bar statuts */}
      <div className="sv-charts-row">

        <div className="sv-chart-card">
          <h3 className="sv-chart-title">Répartition des statuts</h3>
          {pieData.length === 0 ? (
            <p className="sv-empty">Aucune donnée</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => <span style={{ fontSize: '0.78rem', color: '#374151' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sv-chart-card">
          <h3 className="sv-chart-title">Demandes par statut</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusBarData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, 'Demandes']}
                contentStyle={{ fontSize: '0.82rem', borderRadius: '6px' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ligne 2 : SMS par jour + cumulatif */}
      <div className="sv-charts-row">

        <div className="sv-chart-card">
          <h3 className="sv-chart-title">SMS envoyés — 7 derniers jours</h3>
          {barData.length === 0 ? (
            <p className="sv-empty">Aucun SMS sur cette période</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="jour" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'SMS']}
                  contentStyle={{ fontSize: '0.82rem', borderRadius: '6px' }}
                />
                <Bar dataKey="SMS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sv-chart-card">
          <h3 className="sv-chart-title">SMS cumulés — 7 derniers jours</h3>
          {lineData.length === 0 ? (
            <p className="sv-empty">Aucun SMS sur cette période</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="jour" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'Total SMS']}
                  contentStyle={{ fontSize: '0.82rem', borderRadius: '6px' }}
                />
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Historique des notifications récentes */}
      <section className="sv-section">
        <h3 className="sv-chart-title">Notifications récentes</h3>
        {recentChanges.length === 0 ? (
          <p className="sv-empty">Aucune notification</p>
        ) : (
          <table className="sv-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Demandeur</th>
                <th>Référence</th>
                <th>Statut notifié</th>
                <th>SMS</th>
              </tr>
            </thead>
            <tbody>
              {recentChanges.map((r, i) => (
                <tr key={i}>
                  <td className="sv-muted sv-small">{formatDate(r.date_envoi)}</td>
                  <td>{r.prenom} {r.nom}</td>
                  <td className="sv-mono">{r.reference_recu}</td>
                  <td><StatusBadge statut={r.statut_iris} /></td>
                  <td>
                    <span className={r.statut_envoi === 'envoye' ? 'sv-ok' : 'sv-err'}>
                      {r.statut_envoi === 'envoye' ? 'Envoyé' : 'Échec'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

    </div>
  );
}
