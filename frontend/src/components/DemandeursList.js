import React, { useState } from 'react';
import './DemandeursList.css';
import { registrationService } from '../services/api';

/**
 * Composant pour afficher et gérer la liste des demandeurs
 */
function DemandeursList() {
  const [demandeurs, setDemandeurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDemandeurs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await registrationService.getAll();
      setDemandeurs(response.data.demandeurs || []);
    } catch (err) {
      setError('Erreur lors du chargement des demandeurs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demandeurs-list-container">
      <h2>Liste des demandeurs</h2>
      <button onClick={loadDemandeurs} className="btn-load">
        🔄 Charger la liste
      </button>

      {loading && <p>⏳ Chargement...</p>}
      {error && <p className="error">{error}</p>}

      {demandeurs.length > 0 ? (
        <div className="demandeurs-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Référence</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {demandeurs.map(d => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.reference_recu}</td>
                  <td>{d.nom}</td>
                  <td>{d.prenom}</td>
                  <td>{d.telephone}</td>
                  <td>{d.email}</td>
                  <td><span className="status">{d.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && <p>Aucun demandeur trouvé.</p>
      )}
    </div>
  );
}

export default DemandeursList;
