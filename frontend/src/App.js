import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm';
import StatusChecker from './components/StatusChecker';
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
      <StatusChecker />
      <Statistics />
    </>
  );

  return (
    <BrowserRouter>
      <div className="App">
        {authenticated && (
          <header className="app-header">
            <div className="header-branding">
              <div className="header-text">
                <h1>Louba Services</h1>
                <p>Gestion sécurisée des notifications SMS pour les demandeurs de passeport</p>
              </div>
            </div>
            <nav className="main-nav">
              {(role === 'admin' || role === 'agent') && (
                <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                  Tableau de bord
                </NavLink>
              )}
              {(role === 'admin' || role === 'agent') && (
                <NavLink to="/management" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                  Gestion des demandeurs
                </NavLink>
              )}
              {(role === 'admin' || role === 'superviseur') && (
                <NavLink to="/supervisor" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                  Superviseur
                </NavLink>
              )}
              <NavLink to="/verification" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                Vérification
              </NavLink>
              {role === 'admin' && (
                <NavLink to="/users" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                  Utilisateurs
                </NavLink>
              )}
              <div className="nav-user-info">
                <span className="nav-username">{user?.prenom || user?.username}</span>
                <span className={`nav-role-badge nav-role-${role}`}>{role}</span>
              </div>
              <button className="nav-btn logout-btn" onClick={handleLogout}>
                Déconnexion
              </button>
            </nav>
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
            <p>© 2024 Louba Services - Système de Notification SMS</p>
          </footer>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
