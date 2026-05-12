import React, { useState } from 'react';
import apiClient from '../services/api';
import './StatusVerification.css';
import { STATUS_CONFIG, STATUS_ORDER, formatDate } from '../constants';

const IRIS_STATUSES = [
  { value: '', label: 'Tous les statuts' },
  ...STATUS_ORDER.filter(s => s !== 'néant').map(s => ({ value: s, label: STATUS_CONFIG[s].label }))
];

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    start: start.toISOString().split('T')[0],
    end:   end.toISOString().split('T')[0],
  };
}

export default function StatusVerification() {
  const [ticket, setTicket]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const defaults = getDefaultDates();
  const [filterStart, setFilterStart]     = useState(defaults.start);
  const [filterEnd, setFilterEnd]         = useState(defaults.end);
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterResult, setFilterResult]   = useState(null);
  const [filterError, setFilterError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!ticket.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await apiClient.get(`/status/verify/${ticket.trim()}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la vérification');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTicket('');
    setResult(null);
    setError('');
  }

  async function handleFilter(e) {
    e.preventDefault();
    const start = new Date(filterStart);
    const end   = new Date(filterEnd);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);

    if (end < start) {
      setFilterError('La date de fin doit être après la date de début.');
      return;
    }
    if (diffDays > 92) {
      setFilterError('La plage de dates ne peut pas dépasser 3 mois.');
      return;
    }

    setFilterLoading(true);
    setFilterError('');
    setFilterResult(null);
    try {
      const res = await apiClient.post('/status/search', {
        startDate: filterStart,
        endDate: filterEnd,
        applicationStatus: filterStatus,
      });
      setFilterResult(res.data);
    } catch (err) {
      setFilterError(err.response?.data?.error || 'Erreur lors de la recherche');
    } finally {
      setFilterLoading(false);
    }
  }

  const statusCfg = result
    ? (STATUS_CONFIG[result.statut_iris] || { label: result.statut_iris, color: '#6b7280', bg: '#f3f4f6', icon: 'ℹ️' })
    : null;

  return (
    <div className="sv-page">

      {/* ── Carte : Vérification par ticket ── */}
      <div className="sv-card">
        <div className="sv-card-header">
          <h2 className="sv-card-title">Vérification de statut</h2>
          <p className="sv-card-subtitle">Saisissez le numéro de ticket pour consulter le statut via l'API IRIS</p>
        </div>

        <form onSubmit={handleSubmit} className="sv-search-form">
          <div className="sv-search-row">
            <input
              className="sv-input"
              type="text"
              value={ticket}
              onChange={e => setTicket(e.target.value)}
              placeholder="Ex : F20250603000"
              autoFocus
              disabled={loading}
            />
            <button className="sv-btn-primary" type="submit" disabled={loading || !ticket.trim()}>
              {loading ? 'Vérification…' : 'Vérifier'}
            </button>
            {(result || error) && (
              <button type="button" className="sv-btn-ghost" onClick={handleReset}>
                Réinitialiser
              </button>
            )}
          </div>
          <p className="sv-hint">Format : lettre + date + séquence (ex: F20250603000)</p>
        </form>

        {loading && (
          <div className="sv-loading">
            <div className="sv-spinner" />
            <span>Interrogation de l'API IRIS…</span>
          </div>
        )}

        {error && (
          <div className="sv-alert sv-alert-error">
            <span>⚠</span> {error}
          </div>
        )}

        {result && (
          <div className="sv-result">
            <div
              className="sv-status-box"
              style={{ background: statusCfg.bg, borderColor: statusCfg.color + '50' }}
            >
              <span className="sv-status-icon">{statusCfg.icon}</span>
              <div>
                <div className="sv-status-label" style={{ color: statusCfg.color }}>{statusCfg.label}</div>
                <div className="sv-status-ticket">Ticket : <strong>{result.ticket_number}</strong></div>
              </div>
            </div>

            {result.details && Object.keys(result.details).length > 0 && (
              <div className="sv-info-block">
                <p className="sv-info-block-title">Détails IRIS</p>
                <div className="sv-info-grid">
                  {Object.entries(result.details).map(([key, val]) =>
                    val !== null && val !== undefined && val !== '' ? (
                      <div className="sv-info-row" key={key}>
                        <span className="sv-info-key">{key}</span>
                        <span className="sv-info-val">{String(val)}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {result.demandeur ? (
              <div className="sv-info-block sv-info-block-green">
                <p className="sv-info-block-title">Demandeur enregistré</p>
                <div className="sv-info-grid">
                  <div className="sv-info-row">
                    <span className="sv-info-key">Référence reçu</span>
                    <span className="sv-info-val sv-mono">{result.demandeur.reference_recu}</span>
                  </div>
                  <div className="sv-info-row">
                    <span className="sv-info-key">Nom complet</span>
                    <span className="sv-info-val">{result.demandeur.prenom} {result.demandeur.nom}</span>
                  </div>
                  <div className="sv-info-row">
                    <span className="sv-info-key">Téléphone</span>
                    <span className="sv-info-val sv-mono">{result.demandeur.telephone}</span>
                  </div>
                  <div className="sv-info-row">
                    <span className="sv-info-key">Service</span>
                    <span className="sv-info-val">{result.demandeur.service_type}</span>
                  </div>
                  <div className="sv-info-row">
                    <span className="sv-info-key">Dernière vérification</span>
                    <span className="sv-info-val">{formatDate(result.demandeur.derniere_verification)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sv-alert sv-alert-warning">
                ℹ Ce ticket n'est lié à aucun demandeur enregistré dans le système.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Carte : Filtrer les demandes ── */}
      <div className="sv-card sv-card-wide">
        <div className="sv-card-header">
          <h2 className="sv-card-title">Filtrer les demandes</h2>
          <p className="sv-card-subtitle">Rechercher toutes les demandes sur une période — maximum 3 mois</p>
        </div>

        <form onSubmit={handleFilter}>
          <div className="sv-filter-row">
            <div className="sv-filter-field">
              <label className="sv-filter-label">Date de début</label>
              <input
                type="date"
                className="sv-input"
                value={filterStart}
                onChange={e => setFilterStart(e.target.value)}
                disabled={filterLoading}
              />
            </div>
            <div className="sv-filter-field">
              <label className="sv-filter-label">Date de fin</label>
              <input
                type="date"
                className="sv-input"
                value={filterEnd}
                onChange={e => setFilterEnd(e.target.value)}
                disabled={filterLoading}
              />
            </div>
            <div className="sv-filter-field">
              <label className="sv-filter-label">Statut</label>
              <select
                className="sv-input sv-select"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                disabled={filterLoading}
              >
                {IRIS_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="sv-filter-field sv-filter-field-btn">
              <label className="sv-filter-label">&nbsp;</label>
              <button className="sv-btn-purple" type="submit" disabled={filterLoading}>
                {filterLoading ? 'Recherche…' : 'Rechercher'}
              </button>
            </div>
          </div>
          <p className="sv-hint">Plage limitée à 3 mois maximum par l'API IRIS.</p>
        </form>

        {filterLoading && (
          <div className="sv-loading">
            <div className="sv-spinner sv-spinner-purple" />
            <span>Interrogation de l'API IRIS…</span>
          </div>
        )}

        {filterError && (
          <div className="sv-alert sv-alert-error">
            <span>⚠</span> {filterError}
          </div>
        )}

        {filterResult && (
          <div className="sv-filter-results">
            <div className="sv-filter-results-bar">
              <span className="sv-results-count">
                {filterResult.total} résultat{filterResult.total !== 1 ? 's' : ''}
              </span>
            </div>

            {filterResult.total === 0 ? (
              <div className="sv-alert sv-alert-warning">
                Aucune demande trouvée pour ces critères.
              </div>
            ) : (
              <div className="sv-table-wrap">
                <table className="sv-table">
                  <thead>
                    <tr>
                      <th>ID Demande</th>
                      <th>Ticket</th>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Statut</th>
                      <th>Date de dépôt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterResult.data.map((item, i) => {
                      const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: '#6b7280', bg: '#f3f4f6', icon: '' };
                      return (
                        <tr key={i}>
                          <td><span className="sv-mono">{item.applicationId}</span></td>
                          <td><span className="sv-mono">{item.ticketNumber}</span></td>
                          <td>{item.lastName}</td>
                          <td>{item.firstName}</td>
                          <td>
                            <span className="sv-badge" style={{ color: cfg.color, background: cfg.bg }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td>{item.submissionDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
