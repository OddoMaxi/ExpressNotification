import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import RegistrationForm from './components/RegistrationForm';
import StatusChecker from './components/StatusChecker';
import Statistics from './components/Statistics';
import DemandeursManagement from './components/DemandeursManagement';
import Login from './components/Login';
import { restoreAuth, logout } from './services/auth';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(restoreAuth());
  }, []);

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
  };

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
              {/* <img src="/logo.jpg" alt="Louba Services logo" className="app-logo" /> */}
              <div className="header-text">
                <h1>Louba Services</h1>
                <p>Gestion sécurisée des notifications SMS pour les demandeurs de passeport</p>
              </div>
            </div>
            <nav className="main-nav">
              <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                Tableau de bord
              </NavLink>
              <NavLink to="/management" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>
                Gestion des demandeurs
              </NavLink>
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
                element={authenticated ? <Navigate to="/" /> : <Login onLogin={() => setAuthenticated(true)} />}
              />
              <Route
                path="/management"
                element={authenticated ? <DemandeursManagement /> : <Navigate to="/login" />}
              />
              <Route
                path="/"
                element={authenticated ? <Dashboard /> : <Navigate to="/login" />}
              />
              <Route
                path="*"
                element={<Navigate to={authenticated ? '/' : '/login'} />}
              />
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
