import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm';
import Statistics from './components/Statistics';
import DemandeursManagement from './components/DemandeursManagement';
import SupervisorDashboard from './components/SupervisorDashboard';
import UsersManagement from './components/UsersManagement';
import StatusVerification from './components/StatusVerification';
import Login from './components/Login';
import { restoreAuth, logout, getRole, getUser } from './services/auth';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const ok = restoreAuth();
    setAuthenticated(ok);
    if (ok) setRole(getRole());
  }, []);

  const handleLogin = () => {
    setAuthenticated(true);
    setRole(getRole());
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setRole(null);
  };

  const user = getUser();

  const Dashboard = () => (
    <>
      <RegistrationForm />
      <Statistics />
    </>
  );

  return (
    <BrowserRouter>
      <div className="App">
        {authenticated && (
          <header className="app-header">
            {/* Logo + titre */}
            <div className="nav-brand">
              <img src="/logo.jpg" alt="Louba Services" className="nav-logo" />
            </div>

            {/* Liens de navigation */}
            <nav className="main-nav">
              {(role === 'admin' || role === 'agent') && (
                <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-link-icon">🏠</span>
                  Tableau de bord
                </NavLink>
              )}
              {(role === 'admin' || role === 'agent') && (
                <NavLink to="/management" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-link-icon">👥</span>
                  Demandeurs
                </NavLink>
              )}
              {(role === 'admin' || role === 'superviseur') && (
                <NavLink to="/supervisor" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-link-icon">📊</span>
                  Superviseur
                </NavLink>
              )}
              <NavLink to="/verification" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <span className="nav-link-icon">🔍</span>
                Vérification
              </NavLink>
              {role === 'admin' && (
                <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span className="nav-link-icon">⚙️</span>
                  Utilisateurs
                </NavLink>
              )}
            </nav>

            {/* User info + déconnexion */}
            <div className="nav-user-section">
              <div className="nav-user-info">
                <div className="nav-avatar">{(user?.prenom || user?.username || '?')[0].toUpperCase()}</div>
                <div className="nav-user-details">
                  <span className="nav-username">{user?.prenom || user?.username}</span>
                  <span className={`nav-role-badge nav-role-${role}`}>{role}</span>
                </div>
              </div>
              <button className="nav-logout-btn" onClick={handleLogout} title="Se déconnecter">
                <span>↩</span>
              </button>
            </div>
          </header>
        )}

        <main className="app-main">
          <div className="container">
            <Routes>
              <Route
                path="/login"
                element={authenticated ? <Navigate to={role === 'superviseur' ? '/supervisor' : '/'} /> : <Login onLogin={handleLogin} />}
              />
              <Route
                path="/"
                element={
                  !authenticated ? <Navigate to="/login" /> :
                  (role === 'superviseur') ? <Navigate to="/supervisor" /> :
                  <Dashboard />
                }
              />
              <Route
                path="/management"
                element={
                  !authenticated ? <Navigate to="/login" /> :
                  (role === 'superviseur') ? <Navigate to="/supervisor" /> :
                  <DemandeursManagement />
                }
              />
              <Route
                path="/supervisor"
                element={
                  !authenticated ? <Navigate to="/login" /> :
                  (role === 'agent') ? <Navigate to="/" /> :
                  <SupervisorDashboard />
                }
              />
              <Route
                path="/verification"
                element={authenticated ? <StatusVerification /> : <Navigate to="/login" />}
              />
              <Route
                path="/users"
                element={
                  !authenticated ? <Navigate to="/login" /> :
                  (role !== 'admin') ? <Navigate to="/" /> :
                  <UsersManagement />
                }
              />
              <Route path="*" element={<Navigate to={authenticated ? (role === 'superviseur' ? '/supervisor' : '/') : '/login'} />} />
            </Routes>
          </div>
        </main>

        {authenticated && (
          <footer className="app-footer">
            <p>© {new Date().getFullYear()} Louba Services - Système de Notification SMS</p>
          </footer>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
