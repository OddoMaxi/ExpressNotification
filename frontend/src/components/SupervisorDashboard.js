import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart
} from 'recharts';
import apiClient from '../services/api';
import './SupervisorDashboard.css';
import { STATUS_CONFIG, STATUS_ORDER, formatDate, formatDateShort } from '../constants';

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
        <span>{payload[0].value}</span>
      </div>
    );
  }
  return null;
};

function CircleGauge({ value, label, color = '#2563eb' }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const filled = (value / 100) * circ;
  return (
    <div className="sv-gauge-wrap">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
        <text x="65" y="60" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">{value}%</text>
        <text x="65" y="78" textAnchor="middle" fontSize="10" fill="#94a3b8">{label}</text>
      </svg>
    </div>
  );
}

export default function SupervisorDashboard() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiClient.get('/supervisor/dashboard');
      setData(res.data);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      if (!err.response)                 setError('Serveur inaccessible — vérifiez la connexion réseau');
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

  if (loading) return (
    <div className="sv-splash">
      <div className="sv-spinner" />
      <span>Chargement du tableau de bord…</span>
    </div>
  );

  if (error) return (
    <div className="sv-splash">
      <div className="sv-error-box">
        <span className="sv-error-icon">!</span>
        <p>{error}</p>
        <button className="sv-btn-primary" onClick={fetchDashboard}>Réessayer</button>
      </div>
    </div>
  );

  if (!data) return null;

  const { stats, statusBreakdown, smsByDay, recentChanges, irisHealth } = data;

  const completed  = statusBreakdown.find(r => r.statut_actuel === 'Production Completed')?.count  || 0;
  const rejected   = statusBreakdown.find(r => r.statut_actuel === 'Final Approval Rejected')?.count || 0;
  const pending    = statusBreakdown.find(r => r.statut_actuel === 'Pending Final Approval')?.count  || 0;
  const successRate = stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0;

  const pieData = statusBreakdown
    .filter(r => r.count > 0)
    .map(r => ({
      name:  STATUS_CONFIG[r.statut_actuel]?.label || r.statut_actuel,
      value: r.count,
      color: STATUS_CONFIG[r.statut_actuel]?.color || '#6b7280'
    }));

  const barData   = smsByDay.map(d => ({ jour: formatDateShort(d.day), SMS: d.count }));
  let cumul = 0;
  const areaData  = smsByDay.map(d => { cumul += d.count; return { jour: formatDateShort(d.day), Total: cumul }; });

  const statusBarData = STATUS_ORDER.map(s => ({
    name:  STATUS_CONFIG[s].label,
    count: statusBreakdown.find(r => r.statut_actuel === s)?.count || 0,
    color: STATUS_CONFIG[s].color
  }));

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="sv-page">

      {/* ── HEADER ── */}
      <header className="sv-header">
        <div className="sv-header-left">
          <p className="sv-greeting">{greeting},</p>
          <h1 className="sv-title">Tableau de bord Superviseur</h1>
          <p className="sv-subtitle">
            Système de notification SMS — Passeport Guinée
            {lastRefresh && <span> · Actualisé à {lastRefresh.toLocaleTimeString('fr-FR')}</span>}
          </p>
        </div>
        <div className="sv-header-right">
          {irisHealth && (
            <div className={`sv-iris-pill ${irisHealth.online ? 'online' : 'offline'}`}>
              <span className="sv-dot" />
              <div>
                <span className="sv-iris-name">API IRIS</span>
                <span className="sv-iris-status">
                  {irisHealth.online ? `En ligne · ${irisHealth.latencyMs} ms` : `Hors ligne`}
                </span>
              </div>
            </div>
          )}
          <button className="sv-btn-primary" onClick={fetchDashboard}>
            Actualiser
          </button>
        </div>
      </header>

      {/* ── KPI CARDS ── */}
      <div className="sv-kpi-row">
        <div className="sv-kpi sv-kpi-indigo">
          <div className="sv-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div className="sv-kpi-body">
            <div className="sv-kpi-num">{stats.total}</div>
            <div className="sv-kpi-label">Total demandes</div>
          </div>
        </div>

        <div className="sv-kpi sv-kpi-emerald">
          <div className="sv-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div className="sv-kpi-body">
            <div className="sv-kpi-num">{completed}</div>
            <div className="sv-kpi-label">Passeports prêts</div>
          </div>
        </div>

        <div className="sv-kpi sv-kpi-amber">
          <div className="sv-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="sv-kpi-body">
            <div className="sv-kpi-num">{pending}</div>
            <div className="sv-kpi-label">En attente</div>
          </div>
        </div>

        <div className="sv-kpi sv-kpi-rose">
          <div className="sv-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="sv-kpi-body">
            <div className="sv-kpi-num">{rejected}</div>
            <div className="sv-kpi-label">Rejetées</div>
          </div>
        </div>

        <div className="sv-kpi sv-kpi-slate">
          <div className="sv-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>
          </div>
          <div className="sv-kpi-body">
            <div className="sv-kpi-num">{stats.sansTicket}</div>
            <div className="sv-kpi-label">Sans ticket</div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="sv-main-grid">

        {/* ── COLONNE GAUCHE ── */}
        <div className="sv-col-main">

          {/* Répartition + Statuts */}
          <div className="sv-row-2">
            <div className="sv-card">
              <div className="sv-card-header">
                <h3 className="sv-card-title">Répartition des statuts</h3>
              </div>
              {pieData.length === 0 ? (
                <p className="sv-empty">Aucune donnée</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="sv-pie-legend">
                    {pieData.map((e, i) => (
                      <div key={i} className="sv-pie-item">
                        <span className="sv-pie-dot" style={{ background: e.color }} />
                        <span className="sv-pie-name">{e.name}</span>
                        <span className="sv-pie-val">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="sv-card">
              <div className="sv-card-header">
                <h3 className="sv-card-title">Demandes par statut</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusBarData} margin={{ top: 5, right: 10, left: -20, bottom: 44 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#94a3b8' }} angle={-28} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [v, 'Demandes']} contentStyle={{ fontSize: '0.82rem', borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusBarData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SMS par jour */}
          <div className="sv-row-2">
            <div className="sv-card">
              <div className="sv-card-header">
                <h3 className="sv-card-title">SMS envoyés — 7 derniers jours</h3>
                <span className="sv-card-badge">{smsByDay.reduce((a, d) => a + d.count, 0)} total</span>
              </div>
              {barData.length === 0 ? (
                <p className="sv-empty">Aucun SMS sur cette période</p>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="jour" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [v, 'SMS']} contentStyle={{ fontSize: '0.82rem', borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Bar dataKey="SMS" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="sv-card">
              <div className="sv-card-header">
                <h3 className="sv-card-title">Progression cumulative SMS</h3>
              </div>
              {areaData.length === 0 ? (
                <p className="sv-empty">Aucun SMS sur cette période</p>
              ) : (
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="grad-sms" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="jour" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [v, 'Total SMS']} contentStyle={{ fontSize: '0.82rem', borderRadius: '10px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                    <Area type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={2.5} fill="url(#grad-sms)" dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── SIDEBAR DROITE ── */}
        <div className="sv-col-side">

          {/* Statut IRIS */}
          <div className="sv-card sv-iris-card">
            <div className="sv-card-header">
              <h3 className="sv-card-title">Connexion IRIS</h3>
            </div>
            {irisHealth ? (
              <div className={`sv-iris-status-block ${irisHealth.online ? 'online' : 'offline'}`}>
                <div className="sv-iris-indicator">
                  <span className="sv-dot-lg" />
                  <span className="sv-iris-state">{irisHealth.online ? 'En ligne' : 'Hors ligne'}</span>
                </div>
                {irisHealth.online && (
                  <div className="sv-iris-latency">
                    <span className="sv-iris-latency-val">{irisHealth.latencyMs} ms</span>
                    <span className="sv-iris-latency-lbl">Latence</span>
                  </div>
                )}
                {!irisHealth.online && irisHealth.error && (
                  <p className="sv-iris-err">{irisHealth.error}</p>
                )}
              </div>
            ) : (
              <p className="sv-empty">Indisponible</p>
            )}
            {stats.lastCronRun && (
              <div className="sv-iris-cron">
                <span className="sv-cron-label">Dernière vérif.</span>
                <span className="sv-cron-val">{formatDate(stats.lastCronRun)}</span>
              </div>
            )}
          </div>

          {/* Taux de réussite */}
          <div className="sv-card sv-gauge-card">
            <div className="sv-card-header">
              <h3 className="sv-card-title">Taux de réussite</h3>
            </div>
            <CircleGauge value={successRate} label="Approuvés" color="#10b981" />
            <div className="sv-gauge-stats">
              <div className="sv-gauge-stat">
                <span className="sv-gauge-num" style={{ color: '#10b981' }}>{completed}</span>
                <span className="sv-gauge-lbl">Prêts</span>
              </div>
              <div className="sv-gauge-divider" />
              <div className="sv-gauge-stat">
                <span className="sv-gauge-num" style={{ color: '#ef4444' }}>{rejected}</span>
                <span className="sv-gauge-lbl">Rejetés</span>
              </div>
              <div className="sv-gauge-divider" />
              <div className="sv-gauge-stat">
                <span className="sv-gauge-num" style={{ color: '#f59e0b' }}>{pending}</span>
                <span className="sv-gauge-lbl">En attente</span>
              </div>
            </div>
          </div>

          {/* Traitement en cours */}
          <div className="sv-card sv-processing-card">
            <div className="sv-card-header">
              <h3 className="sv-card-title">État du traitement</h3>
            </div>
            <div className="sv-processing-list">
              {STATUS_ORDER.map(s => {
                const cfg   = STATUS_CONFIG[s];
                const count = statusBreakdown.find(r => r.statut_actuel === s)?.count || 0;
                const pct   = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={s} className="sv-proc-item">
                    <div className="sv-proc-top">
                      <span className="sv-proc-name">{cfg.label}</span>
                      <span className="sv-proc-val">{count} <span className="sv-proc-pct">({pct}%)</span></span>
                    </div>
                    <div className="sv-proc-bar-bg">
                      <div className="sv-proc-bar-fill" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── NOTIFICATIONS RÉCENTES ── */}
      <div className="sv-card sv-table-card">
        <div className="sv-card-header">
          <h3 className="sv-card-title">Notifications récentes</h3>
          {recentChanges.length > 0 && (
            <span className="sv-card-badge">{recentChanges.length} enregistrements</span>
          )}
        </div>
        {recentChanges.length === 0 ? (
          <p className="sv-empty">Aucune notification enregistrée</p>
        ) : (
          <div className="sv-table-wrap">
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
                    <td className="sv-bold">{r.prenom} {r.nom}</td>
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
          </div>
        )}
      </div>

    </div>
  );
}
