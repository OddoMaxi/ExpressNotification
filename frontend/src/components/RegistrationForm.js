import React, { useState } from 'react';
import { registrationService } from '../services/api';
import './RegistrationForm.css';

/**
 * Formulaire d'enregistrement des demandeurs
 */
function RegistrationForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    reference_recu: '',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    service_type: 'Express 72h'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
    setMessage('');

    try {
      const response = await registrationService.register(formData);
      setMessage('✓ Demandeur enregistré avec succès !');
      setFormData({
        reference_recu: '',
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        service_type: 'Express 72h'
      });

      if (onSuccess) {
        onSuccess(response.data.demandeur);
      }
    } catch (err) {
      const apiError = err.response?.data;
      let errorMessage = apiError?.error || err.message;
      if (apiError?.errors && apiError.errors.length > 0) {
        errorMessage = apiError.errors.map((e) => e.msg).join(' ; ');
      }
      setError('Erreur lors de l\'enregistrement : ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-form-container">
      <h2>📝 Enregistrement d'un demandeur</h2>

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-group">
          <label htmlFor="reference_recu">Référence de Reçu:</label>
          <input
            type="text"
            id="reference_recu"
            name="reference_recu"
            value={formData.reference_recu}
            onChange={handleChange}
            required
            placeholder="Ex: REC2024001"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="nom">Nom:</label>
            <input
              type="text"
              id="nom"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              required
              placeholder="Nom de famille"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prenom">Prénom:</label>
            <input
              type="text"
              id="prenom"
              name="prenom"
              value={formData.prenom}
              onChange={handleChange}
              required
              placeholder="Prénom"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="telephone">Téléphone:</label>
          <input
            type="tel"
            id="telephone"
            name="telephone"
            value={formData.telephone}
            onChange={handleChange}
            required
            placeholder="+224 XXX XX XX XX"
          />
        </div>

        <div className="form-group">
          <label htmlFor="service_type">Type de service:</label>
          <select
            id="service_type"
            name="service_type"
            value={formData.service_type}
            onChange={handleChange}
            required
          >
            <option value="Express 24h">Express 24h</option>
            <option value="Express 48h">Express 48h</option>
            <option value="Express 72h">Express 72h</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="nom@exemple.com"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? '⏳ Enregistrement...' : '✓ Enregistrer le demandeur'}
        </button>
      </form>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default RegistrationForm;
