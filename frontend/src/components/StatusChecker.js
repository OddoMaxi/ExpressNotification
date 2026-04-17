import React, { useState } from 'react';
import { statusService } from '../services/api';
import './StatusChecker.css';

/**
 * Composant pour vérifier le statut et envoyer un SMS
 */
function StatusChecker() {
  const [formData, setFormData] = useState({
    demandeur_id: '',
    ticket_number: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await statusService.checkAndNotify(formData);
      setResult(response.data.verification);
    } catch (err) {
      setError('Erreur : ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="status-checker-container">
      <h2>📞 Vérifier le statut et envoyer SMS</h2>

      <form onSubmit={handleSubmit} className="status-form">
        <div className="form-group">
          <label htmlFor="demandeur_id">ID du Demandeur:</label>
          <input
            type="number"
            id="demandeur_id"
            name="demandeur_id"
            value={formData.demandeur_id}
            onChange={handleChange}
            required
            placeholder="1"
          />
        </div>

        <div className="form-group">
          <label htmlFor="ticket_number">Numéro de Ticket (Payment Reference):</label>
          <input
            type="text"
            id="ticket_number"
            name="ticket_number"
            value={formData.ticket_number}
            onChange={handleChange}
            required
            placeholder="Ex: F20250603000"
          />
          <small style={{marginTop: '5px', fontSize: '12px', color: '#666'}}>
            Format de ticket: FYYYYMMDD[XXXXX]
          </small>
        </div>

        <button type="submit" disabled={loading} className="btn-check">
          {loading ? '⏳ Vérification en cours...' : '🔍 Vérifier et envoyer SMS'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="result-container">
          <div className="result-success">
            <h3>✓ Opération réussie !</h3>
            
            <div className="result-section">
              <h4>Demandeur</h4>
              <p><strong>Nom:</strong> {result.demandeur.nom} {result.demandeur.prenom}</p>
              <p><strong>Téléphone:</strong> {result.demandeur.telephone}</p>
            </div>

            <div className="result-section">
              <h4>Statut Iris</h4>
              <p><strong>Statut:</strong> <span className="status-badge">{result.statut_iris}</span></p>
              <p><strong>Type de message:</strong> {result.type_message}</p>
            </div>

            <div className="result-section">
              <h4>Message personnalisé</h4>
              <p className="message-text">"{result.message_personnalise}"</p>
            </div>

            <div className="result-section">
              <h4>Résultat d'envoi SMS</h4>
              <p><strong>État:</strong> {result.sms_result.success ? '✓ Envoyé' : '✗ Erreur'}</p>
              {result.sms_result.messageId && <p><strong>ID Message:</strong> {result.sms_result.messageId}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusChecker;
