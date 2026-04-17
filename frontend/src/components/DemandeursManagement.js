import React, { useState, useEffect } from 'react';
import { registrationService } from '../services/api';
import './DemandeursManagement.css';

/**
 * Composant pour gérer et afficher tous les demandeurs avec leur statut
 * Permet d'envoyer manuellement des SMS personnalisés
 */
function DemandeursManagement() {
  const [demandeurs, setDemandeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadDemandeurs();
    // Recharger toutes les 30 secondes pour voir les mises à jour du service de background
    const interval = setInterval(loadDemandeurs, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDemandeurs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await registrationService.getAll();
      setDemandeurs(response.data.demandeurs || []);
    } catch (err) {
      setError('Erreur lors du chargement des demandeurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async (demandeurId, demandeur) => {
    setSendingId(demandeurId);
    setSuccessMessage('');
    setError('');

    try {
      const response = await registrationService.sendManualSMS(demandeurId);

      if (response.data.success) {
        setSuccessMessage(`SMS envoyé à ${demandeur.prenom}. Statut : ${response.data.statut_actuel}`);

        // Recharger les demandeurs pour voir le statut miseà jour
        loadDemandeurs();

        // Cacher le message de succès après 5 secondes
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(`Erreur : ${response.data.error}`);
      }
    } catch (err) {
      setError(`Erreur lors de l'envoi du SMS : ${err.response?.data?.error || err.message}`);
      console.error(err);
    } finally {
      setSendingId(null);
    }
  };

  const normalizeStatus = (status) => status || 'néant';

  // Filtrer les demandeurs selon le statut
  const filteredDemandeurs = filterStatus === 'all'
    ? demandeurs
    : demandeurs.filter(d => normalizeStatus(d.statut_actuel) === filterStatus);

  // Extraire les statuts uniques
  const uniqueStatuts = [...new Set(demandeurs.map(d => normalizeStatus(d.statut_actuel)))];

  // Badge color selon le statut
  const getStatusColor = (status) => {
    switch (normalizeStatus(status)) {
      case 'néant':
        return '#6c757d';
      case 'Pending Final Approval':
        return '#ffc107';
      case 'Final Approval Passed':
        return '#28a745';
      case 'Final Approval Rejected':
        return '#dc3545';
      case 'Production Completed':
        return '#e83e8c';
      default:
        return '#17a2b8';
    }
  };

  return (
    <div className="demandeurs-management-container">
      <h2>Gestion complète des demandeurs</h2>

      <div className="management-header">
        <div className="info-box">
          <span className="info-label">Total:</span>
          <span className="info-value">{demandeurs.length}</span>
        </div>
        <div className="info-box">
          <span className="info-label">À traiter:</span>
          <span className="info-value" style={{ color: '#ffc107' }}>
            {demandeurs.filter(d => normalizeStatus(d.statut_actuel) === 'néant').length}
          </span>
        </div>
        <div className="info-box">
          <span className="info-label">Approuvés:</span>
          <span className="info-value" style={{ color: '#28a745' }}>
            {demandeurs.filter(d => d.statut_actuel === 'Final Approval Passed').length}
          </span>
        </div>
        <button onClick={loadDemandeurs} className="btn-reload">
          🔄 Rafraîchir
        </button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Filtrage par statut */}
      <div className="filter-section">
        <label>Filtrer par statut:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="all">Tous</option>
          {uniqueStatuts.map(status => (
            <option key={status} value={status}>
              {status} ({demandeurs.filter(d => d.statut_actuel === status).length})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">⏳ Chargement...</div>
      ) : filteredDemandeurs.length === 0 ? (
        <div className="no-data">Aucun demandeur trouvé</div>
      ) : (
        <div className="table-container">
          <table className="demandeurs-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Référence</th>
                <th>Nom Complet</th>
                <th>Téléphone</th>
                <th>Service</th>
                <th>Ticket</th>
                <th>Statut Actuel</th>
                <th>Dernière Vérif.</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDemandeurs.map((demandeur) => (
                <tr key={demandeur.id} className={demandeur.statut_actuel === 'néant' ? 'pending' : ''}>
                  <td className="id-cell">{demandeur.id}</td>
                  <td className="mono">{demandeur.reference_recu}</td>
                  <td className="name-cell">
                    <strong>{demandeur.prenom}</strong> {demandeur.nom}
                  </td>
                  <td className="phone-cell">{demandeur.telephone}</td>
                  <td>{demandeur.service_type || 'Express 72h'}</td>
                  <td className="mono" title={demandeur.ticket_number || 'Non fourni'}>
                    {demandeur.ticket_number ? (
                      <span className="ticket-badge">{demandeur.ticket_number.substring(0, 12)}...</span>
                    ) : (
                      <span className="no-ticket">-</span>
                    )}
                  </td>
                  <td className="status-cell">
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(demandeur.statut_actuel),
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}
                    >
                      {normalizeStatus(demandeur.statut_actuel)}
                    </span>
                  </td>
                  <td className="date-cell" title={demandeur.derniere_verification || 'Jamais'}>
                    {demandeur.derniere_verification
                      ? new Date(demandeur.derniere_verification).toLocaleString('fr-FR')
                      : '—'}
                  </td>
                  <td className="action-cell">
                      <button
                      className={`btn-send-sms ${sendingId === demandeur.id ? 'loading' : ''}`}
                      onClick={() => handleSendSMS(demandeur.id, demandeur)}
                      disabled={
                        sendingId === demandeur.id ||
                        (normalizeStatus(demandeur.statut_actuel) !== 'néant' && !demandeur.ticket_number)
                      }
                      title={
                        sendingId === demandeur.id
                          ? 'Envoi en cours'
                          : normalizeStatus(demandeur.statut_actuel) === 'néant'
                          ? 'Envoyer SMS de bienvenue'
                          : !demandeur.ticket_number
                          ? 'Ticket number manquant pour vérification Iris'
                          : 'Envoyer SMS manuellement'
                      }
                    >
                      {sendingId === demandeur.id ? 'Envoi...' : 'Envoyer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="info-legend">
        <h4>ℹ️ Informations</h4>
        <ul>
          <li><strong>Statut "néant":</strong> En attente du premier statut de l'API Iris (service toutes les 30 min)</li>
          <li><strong>Bouton "Envoyer":</strong> Permet d'envoyer manuellement un SMS basé sur le statut actuel</li>
          <li><strong>Auto-refresh:</strong> La liste se met à jour toutes les 30 secondes</li>
          <li><strong>Service de background:</strong> Vérifie automatiquement tous les 30 minutes et envoie des SMS de changement de statut</li>
        </ul>
      </div>
    </div>
  );
}

export default DemandeursManagement;
