import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/api';
import './Statistics.css';

/**
 * Composant pour afficher les statistiques
 */
function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await notificationService.getStats();
      setStats(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="stats-container">⏳ Chargement...</div>;
  if (error) return <div className="stats-container error">{error}</div>;

  return (
    <div className="stats-container">
      <h2>Statistiques</h2>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.demandeurs.total}</div>
            <div className="stat-label">Demandeurs enregistrés</div>
            <div className="stat-icon">👥</div>
          </div>

          <div className="stat-card">
            <div className="stat-number">{stats.sms.total}</div>
            <div className="stat-label">SMS totaux</div>
            <div className="stat-icon">📨</div>
          </div>

          <div className="stat-card success">
            <div className="stat-number">{stats.sms.reussis}</div>
            <div className="stat-label">SMS réussis</div>
            <div className="stat-icon">✓</div>
          </div>

          <div className="stat-card error">
            <div className="stat-number">{stats.sms.erreurs}</div>
            <div className="stat-label">SMS en erreur</div>
            <div className="stat-icon">✗</div>
          </div>
        </div>
      )}

      {stats && stats.par_statut && stats.par_statut.length > 0 && (
        <div className="statut-breakdown">
          <h3>Répartition par statut Iris</h3>
          <div className="status-list">
            {stats.par_statut.map((status, index) => (
              <div key={index} className="status-item">
                <span className="status-name">{status.statut_iris}</span>
                <span className="status-count">{status.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={loadStatistics} className="btn-refresh">
        🔄 Rafraîchir
      </button>
    </div>
  );
}

export default Statistics;
