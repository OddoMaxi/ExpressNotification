#!/usr/bin/env node

/**
 * Script d'installation et de configuration
 * Système de Notification SMS - Passeport Express Guinée
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║     Installation - Système de Notification SMS             ║');
console.log('║     Passeport Express - Guinée GCPIS                       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Chemins
const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');
const backendEnvPath = path.join(backendDir, '.env');
const backendEnvExamplePath = path.join(backendDir, '.env.example');
const frontendEnvPath = path.join(frontendDir, '.env.local');

console.log('📋 Étape 1: Vérification des fichiers .env\n');

// Créer .env backend s'il n'existe pas
if (!fs.existsSync(backendEnvPath)) {
  if (fs.existsSync(backendEnvExamplePath)) {
    const envContent = fs.readFileSync(backendEnvExamplePath, 'utf8');
    fs.writeFileSync(backendEnvPath, envContent);
    console.log('✅ Fichier backend/.env créé à partir du template');
  } else {
    console.log('⚠️  Fichier template backend/.env.example non trouvé');
  }
} else {
  console.log('✅ Fichier backend/.env existe déjà');
}

// Créer .env.local frontend s'il n'existe pas
if (!fs.existsSync(frontendEnvPath)) {
  const frontendEnvContent = `REACT_APP_API_URL=http://localhost:5000/api\n`;\n  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('✅ Fichier frontend/.env.local créé');
} else {\n  console.log('✅ Fichier frontend/.env.local existe déjà');
}

console.log('\n📋 Étape 2: Vérification des répertoires\n');

// Créer répertoire data pour SQLite
const dataDir = path.join(backendDir, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Répertoire backend/data créé');
} else {
  console.log('✅ Répertoire backend/data existe déjà');
}

console.log('\n🔧 Configuration Requise:\n');
console.log('1️⃣  Backend (backend/.env):');
console.log('   • SMS_USER = louba');
console.log('   • SMS_HASH = 97962ccc0add0f87b0570561acc59b45');
console.log('   • SMS_FROM = LOUBA');
console.log('   • IRIS_BASE_URL = http://172.16.4.57/GCPIS/Apps/WebServices/CentralMOFANotification');
console.log('   • IRIS_USERNAME = MOFA');
console.log('   • IRIS_PASSWORD = M0fa2025!');\n
console.log('2️⃣  Frontend (frontend/.env.local):');
console.log('   • REACT_APP_API_URL = http://localhost:5000/api\n');

console.log('📦 Installation des dépendances:\n');
console.log('Backend:\n  cd backend && npm install\n');
console.log('Frontend:\n  cd frontend && npm install\n');

console.log('🚀 Démarrage des serveurs:\n');
console.log('Backend (Terminal 1):\n  cd backend && npm start');
console.log('  → API disponible sur http://localhost:5000\n');
console.log('Frontend (Terminal 2):\n  cd frontend && npm start');
console.log('  → Application sur http://localhost:3000\n');

console.log('📚 Documentation:\n');
console.log('  • docs/README.md - Vue d\'ensemble complet');
console.log('  • docs/API_IRIS.md - Documentation API Iris/GCPIS');
console.log('  • docs/SMS_API.md - Documentation API SMS Interactgroup');
console.log('  • QUICKSTART.md - Guide de démarrage rapide\n');

console.log('✅ Initialisation terminée!\n');
