import React, { useState } from 'react';
import apiClient from '../services/api';
import './StatusVerification.css';

const STATUS_CONFIG = {
  'néant':                   { label: 'Non traité',             color: '#6b7280', bg: '#f3f4f6', icon: '⏸' },
  'Pending Final Approval':  { label: 'En attente approbation', color: '#d97706', bg: '#fffbeb', icon: '⏳' },
  'Final Approval Passed':   { label: 'Approuvé',               color: '#059669', bg: '#ecfdf5', icon: '✅' },
  'Final Approval Rejected': { label: 'Rejeté',                 color: '#dc2626', bg: '#fef2f2', icon: '❌' },
  'Production Completed':    { label: 'Passeport prêt',         color: '#2563eb', bg: '#eff6ff', icon: '🎉' },
};

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function StatusVerification() {
  const [ticket, setTicket]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

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

  const statusCfg = result
    ? (STATUS_CONFIG[result.statut_iris] || { label: result.statut_iris, color: '#6b7280', bg: '#f3f4f6', icon: 'ℹ️' })
    : null;

  return (
    <div className="sv-verify-page">
      <div className="sv-verify-card">
        <div className="sv-verify-header">
          <h2 className="sv-verify-title">Vérification de statut</h2>
          <p className="sv-verify-subtitle">Saisissez le numéro de référence ticket pour consulter le statut de la demande via l'API IRIS</p>
        </div>

        <form onSubmit={handleSubmit} className="sv-verify-form">
          <div className="sv-verify-input-row">
            <input
              className="sv-verify-input"
              type="text"
              value={ticket}
              onChange={e => setTicket(e.target.value)}
              placeholder="Ex : F20250603000"
              autoFocus
              disabled={loading}
            />
            <button className="sv-verify-btn" type="submit" disabled={loading || !ticket.trim()}>
              {loading ? 'Vérification…' : 'Vérifier'}
            </button>
            {(result || error) && (
              <button type="button" className="sv-verify-reset" onClick={handleReset}>
                Nouvelle recherche
              </button>
            )}
          </div>
          <p className="sv-verify-hint">Format ticket : lettre + date + séquence (ex: F20250603000)</p>
        </form>

        {loading && (
          <div className="sv-verify-loading">
            <div className="sv-spinner" />
            <span>Interrogation de l'API IRIS…</span>
          </div>
        )}

        {error && (
          <div className="sv-verify-error">
            <span className="sv-verify-error-icon">⚠</span>
            {error}
          </div>
        )}

        {result && (
          <div className="sv-verify-result">

            {/* Statut principal */}
            <div className="sv-result-status-box" style={{ background: statusCfg.bg, borderColor: statusCfg.color + '40' }}>
              <div className="sv-result-icon">{statusCfg.icon}</div>
              <div>
                <div className="sv-result-status-label" style={{ color: statusCfg.color }}>
                  {statusCfg.label}
                </div>
                <div className="sv-result-ticket">Ticket : <strong>{result.ticket_number}</strong></div>
              </div>
            </div>

            {/* Détails IRIS bruts */}
            {result.details && Object.keys(result.details).length > 0 && (
              <div className="sv-result-section">
                <h4 className="sv-result-section-title">Détails IRIS</h4>
                <div className="sv-result-details-grid">
                  {Object.entries(result.details).map(([key, val]) =>
                    val !== null && val !== undefined && val !== '' ? (
                      <div className="sv-result-detail-row" key={key}>
                        <span className="sv-detail-key">{key}</span>
                        <span className="sv-detail-val">{String(val)}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Demandeur enregistré */}
            {result.demandeur ? (
              <div className="sv-result-section sv-result-demandeur">
                <h4 className="sv-result-section-title">Demandeur enregistré</h4>
                <div className="sv-result-details-grid">
                  <div className="sv-result-detail-row">
                    <span className="sv-detail-key">Référence reçu</span>
                    <span className="sv-detail-val sv-mono">{result.demandeur.reference_recu}</span>
                  </div>
                  <div className="sv-result-detail-row">
                    <span className="sv-detail-key">Nom complet</span>
                    <span className="sv-detail-val">{result.demandeur.prenom} {result.demandeur.nom}</span>
                  </div>
                  <div className="sv-result-detail-row">
                    <span className="sv-detail-key">Téléphone</span>
                    <span className="sv-detail-val sv-mono">{result.demandeur.telephone}</span>
                  </div>
                  <div className="sv-result-detail-row">
                    <span className="sv-detail-key">Service</span>
                    <span className="sv-detail-val">{result.demandeur.service_type}</span>
                  </div>
                  <div className="sv-result-detail-row">
                    <span className="sv-detail-key">Dernière vérification</span>
                    <span className="sv-detail-val">{formatDate(result.demandeur.derniere_verification)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sv-result-not-registered">
                ℹ Ce ticket n'est lié à aucun demandeur enregistré dans le système.
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
