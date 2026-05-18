import React, { useState, useEffect } from 'react';
import { registrationService } from '../services/api';
import { PHONE_REGEX } from '../constants';
import './DemandeursManagement.css';

const EMPTY_FORM = { nom: '', prenom: '', telephone: '', email: '', ticket_number: '' };

function DemandeursManagement() {
  const [demandeurs, setDemandeurs]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sendingId, setSendingId]         = useState(null);
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterDate, setFilterDate]       = useState('');

  // Édition
  const [editDemandeur, setEditDemandeur] = useState(null);
  const [editForm, setEditForm]           = useState(EMPTY_FORM);
  const [editLoading, setEditLoading]     = useState(false);
  const [editError, setEditError]         = useState('');

  // Suppression
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await registrationService.getAll();
        if (mounted) setDemandeurs(response.data.demandeurs || []);
      } catch {
        if (mounted) setError('Erreur lors du chargement des demandeurs');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const loadDemandeurs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await registrationService.getAll();
      setDemandeurs(response.data.demandeurs || []);
    } catch {
      setError('Erreur lors du chargement des demandeurs');
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // ── SMS ──────────────────────────────────────────────────────────────────
  const handleSendSMS = async (demandeurId, demandeur) => {
    setSendingId(demandeurId);
    setError('');
    try {
      const response = await registrationService.sendManualSMS(demandeurId);
      if (response.data.success) {
        flash(`SMS envoyé à ${demandeur.prenom}. Statut : ${response.data.statut_actuel}`);
        loadDemandeurs();
      } else {
        setError(`Erreur : ${response.data.error}`);
      }
    } catch (err) {
      setError(`Erreur envoi SMS : ${err.response?.data?.error || err.message}`);
    } finally {
      setSendingId(null);
    }
  };

  // ── ÉDITION ───────────────────────────────────────────────────────────────
  const openEdit = (d) => {
    setEditDemandeur(d);
    setEditForm({
      nom:           d.nom || '',
      prenom:        d.prenom || '',
      telephone:     d.telephone || '',
      email:         d.email || '',
      ticket_number: d.ticket_number || '',
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!PHONE_REGEX.test(editForm.telephone)) {
      setEditError('Téléphone invalide — format : +224XXXXXXXXX ou 9 chiffres');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      await registrationService.update(editDemandeur.id, editForm);
      flash(`Demandeur ${editForm.prenom} ${editForm.nom} mis à jour`);
      setEditDemandeur(null);
      loadDemandeurs();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setEditError(apiErrors ? apiErrors.map(e => e.msg).join(' ; ') : err.response?.data?.error || 'Erreur lors de la mise à jour');
    } finally {
      setEditLoading(false);
    }
  };

  // ── SUPPRESSION ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await registrationService.delete(deleteTarget.id);
      flash(`Demandeur ${deleteTarget.prenom} ${deleteTarget.nom} supprimé`);
      setDeleteTarget(null);
      setDemandeurs(prev => prev.filter(d => d.id !== deleteTarget.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const normalizeStatus = (s) => s || 'néant';

  const getStatusColor = (status) => {
    const colors = {
      'néant': '#6c757d',
      'Pending Final Approval': '#ffc107',
      'Final Approval Passed': '#28a745',
      'Final Approval Rejected': '#dc3545',
      'Production Completed': '#e83e8c',
    };
    return colors[normalizeStatus(status)] || '#17a2b8';
  };

  const filteredDemandeurs = demandeurs.filter(d => {
    const matchStatus = filterStatus === 'all' || normalizeStatus(d.statut_actuel) === filterStatus;
    const matchDate = !filterDate || (d.date_enregistrement && d.date_enregistrement.startsWith(filterDate));
    return matchStatus && matchDate;
  });

  const uniqueStatuts = [...new Set(demandeurs.map(d => normalizeStatus(d.statut_actuel)))];

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
        <button onClick={loadDemandeurs} className="btn-reload">🔄 Rafraîchir</button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="filter-section">
        <label>Filtrer par statut:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="all">Tous</option>
          {uniqueStatuts.map(status => (
            <option key={status} value={status}>
              {status} ({demandeurs.filter(d => normalizeStatus(d.statut_actuel) === status).length})
            </option>
          ))}
        </select>
        <label style={{ marginLeft: '16px' }}>Filtrer par jour:</label>
        <input
          type="date"
          className="filter-select"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
        />
        {filterDate && (
          <button className="btn-reload" style={{ marginLeft: '8px' }} onClick={() => setFilterDate('')}>
            ✕ Effacer
          </button>
        )}
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
                <th>Statut</th>
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
                    {demandeur.ticket_number
                      ? <span className="ticket-badge">{demandeur.ticket_number.substring(0, 12)}...</span>
                      : <span className="no-ticket">-</span>}
                  </td>
                  <td className="status-cell">
                    <span className="status-badge" style={{
                      backgroundColor: getStatusColor(demandeur.statut_actuel),
                      color: 'white', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem'
                    }}>
                      {normalizeStatus(demandeur.statut_actuel)}
                    </span>
                  </td>
                  <td className="date-cell">
                    {demandeur.derniere_verification
                      ? new Date(demandeur.derniere_verification).toLocaleString('fr-FR')
                      : '—'}
                  </td>
                  <td className="action-cell">
                    <div className="action-buttons">
                      <button
                        className={`btn-send-sms ${sendingId === demandeur.id ? 'loading' : ''}`}
                        onClick={() => handleSendSMS(demandeur.id, demandeur)}
                        disabled={sendingId === demandeur.id}
                        title="Envoyer SMS"
                      >
                        {sendingId === demandeur.id ? '...' : '📱'}
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => openEdit(demandeur)}
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => setDeleteTarget(demandeur)}
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL ÉDITION ── */}
      {editDemandeur && (
        <div className="modal-overlay" onClick={() => setEditDemandeur(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modifier le demandeur</h3>
              <button className="modal-close" onClick={() => setEditDemandeur(null)}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom</label>
                  <input
                    type="text" required
                    value={editForm.prenom}
                    onChange={e => setEditForm(f => ({ ...f, prenom: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text" required
                    value={editForm.nom}
                    onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel" required
                  value={editForm.telephone}
                  onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))}
                  placeholder="+224XXXXXXXXX"
                />
              </div>
              <div className="form-group">
                <label>Email <span style={{fontWeight:'normal',color:'#9ca3af'}}>(optionnel)</span></label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="optionnel"
                />
              </div>
              <div className="form-group">
                <label>Numéro de ticket (IRIS)</label>
                <input
                  type="text"
                  value={editForm.ticket_number}
                  onChange={e => setEditForm(f => ({ ...f, ticket_number: e.target.value }))}
                  placeholder="optionnel"
                />
              </div>
              {editError && <div className="error-message">{editError}</div>}
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditDemandeur(null)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL SUPPRESSION ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal modal-confirm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirmer la suppression</h3>
            </div>
            <div className="modal-body">
              <p>Supprimer définitivement <strong>{deleteTarget.prenom} {deleteTarget.nom}</strong> ?</p>
              <p className="text-muted">Cette action est irréversible. Tout l'historique SMS associé sera conservé.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                Annuler
              </button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DemandeursManagement;
