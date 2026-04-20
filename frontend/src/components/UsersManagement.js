import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import './UsersManagement.css';

const ROLES = ['admin', 'superviseur', 'agent'];

const ROLE_CONFIG = {
  admin:       { label: 'Admin',       color: '#7c3aed', bg: '#f5f3ff' },
  superviseur: { label: 'Superviseur', color: '#0369a1', bg: '#e0f2fe' },
  agent:       { label: 'Agent',       color: '#065f46', bg: '#ecfdf5' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span className="um-badge" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}

const EMPTY_FORM = { username: '', password: '', role: 'agent', nom: '', prenom: '', email: '' };

export default function UsersManagement() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data.users);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setEditUser(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(user) {
    setEditUser(user);
    setForm({ username: user.username, password: '', role: user.role, nom: user.nom || '', prenom: user.prenom || '', email: user.email || '' });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() { setShowForm(false); setEditUser(null); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editUser) {
        const payload = { role: form.role, nom: form.nom, prenom: form.prenom, email: form.email };
        if (form.password) payload.password = form.password;
        await apiClient.put(`/users/${editUser.id}`, payload);
      } else {
        await apiClient.post('/users', form);
      }
      await fetchUsers();
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActif(user) {
    try {
      await apiClient.put(`/users/${user.id}`, { actif: user.actif ? 0 : 1 });
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur');
    }
  }

  async function handleDelete(id) {
    try {
      await apiClient.delete(`/users/${id}`);
      setConfirmDelete(null);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression');
    }
  }

  const counts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <div className="um-page">
      <div className="um-header">
        <div>
          <h2 className="um-title">Gestion des utilisateurs</h2>
          <span className="um-muted">{users.length} utilisateur{users.length !== 1 ? 's' : ''} enregistrés</span>
        </div>
        <button className="um-btn-primary" onClick={openCreate}>+ Nouvel utilisateur</button>
      </div>

      {/* Compteurs par rôle */}
      <div className="um-role-cards">
        {ROLES.map(r => (
          <div className="um-role-card" key={r} style={{ borderColor: ROLE_CONFIG[r].color + '50' }}>
            <div className="um-role-num" style={{ color: ROLE_CONFIG[r].color }}>{counts[r]}</div>
            <div className="um-role-lbl">{ROLE_CONFIG[r].label}{counts[r] !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {error && <div className="um-alert">{error}</div>}

      {/* Tableau */}
      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Nom complet</th>
              <th>Rôle</th>
              <th>Email</th>
              <th>Statut</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="um-empty">Chargement…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={7} className="um-empty">Aucun utilisateur</td></tr>}
            {users.map(u => (
              <tr key={u.id} className={!u.actif ? 'um-row-inactive' : ''}>
                <td><span className="um-username">@{u.username}</span></td>
                <td>{u.prenom} {u.nom}</td>
                <td><RoleBadge role={u.role} /></td>
                <td className="um-muted">{u.email || '—'}</td>
                <td>
                  <span className={`um-status ${u.actif ? 'active' : 'inactive'}`}>
                    {u.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="um-muted um-small">
                  {new Date(u.date_creation).toLocaleDateString('fr-FR')}
                </td>
                <td>
                  <div className="um-actions">
                    <button className="um-btn-edit" onClick={() => openEdit(u)}>Modifier</button>
                    <button className="um-btn-toggle" onClick={() => toggleActif(u)}>
                      {u.actif ? 'Désactiver' : 'Activer'}
                    </button>
                    <button className="um-btn-delete" onClick={() => setConfirmDelete(u)}>Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <div className="um-overlay" onClick={closeForm}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-header">
              <h3>{editUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
              <button className="um-close" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="um-form">
              <div className="um-form-row">
                <div className="um-field">
                  <label>Prénom</label>
                  <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" />
                </div>
                <div className="um-field">
                  <label>Nom</label>
                  <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom" />
                </div>
              </div>
              <div className="um-field">
                <label>Nom d'utilisateur *</label>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="username"
                  required
                  disabled={!!editUser}
                />
              </div>
              <div className="um-field">
                <label>{editUser ? 'Nouveau mot de passe (laisser vide pour conserver)' : 'Mot de passe *'}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required={!editUser}
                />
              </div>
              <div className="um-form-row">
                <div className="um-field">
                  <label>Rôle *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>)}
                  </select>
                </div>
                <div className="um-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
                </div>
              </div>
              {formError && <div className="um-form-error">{formError}</div>}
              <div className="um-form-actions">
                <button type="button" className="um-btn-cancel" onClick={closeForm}>Annuler</button>
                <button type="submit" className="um-btn-save" disabled={saving}>
                  {saving ? 'Enregistrement…' : (editUser ? 'Sauvegarder' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className="um-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="um-modal um-modal-sm" onClick={e => e.stopPropagation()}>
            <h3 className="um-modal-danger-title">Confirmer la suppression</h3>
            <p className="um-confirm-text">
              Supprimer l'utilisateur <strong>@{confirmDelete.username}</strong> ({ROLE_CONFIG[confirmDelete.role]?.label}) ?<br/>
              Cette action est irréversible.
            </p>
            <div className="um-form-actions">
              <button className="um-btn-cancel" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="um-btn-delete-confirm" onClick={() => handleDelete(confirmDelete.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
