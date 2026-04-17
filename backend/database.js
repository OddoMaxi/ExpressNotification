const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'notifications.db');

// Créer le répertoire data s'il n'existe pas
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Créer la connexion à la base de données
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erreur de connexion à la BD:', err.message);
  } else {
    console.log('✓ Connecté à la base de données SQLite');
  }
});

// Initialiser les tables
function initializeDatabase() {
  db.serialize(() => {
    // Table des demandeurs
    db.run(`
      CREATE TABLE IF NOT EXISTS demandeurs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_recu TEXT UNIQUE NOT NULL,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        telephone TEXT NOT NULL,
        email TEXT NOT NULL,
        ticket_number TEXT,
        service_type TEXT DEFAULT 'Express 72h',
        statut_actuel TEXT DEFAULT 'néant',
        derniere_verification DATETIME,
        sms_envoye INTEGER DEFAULT 0,
        date_enregistrement DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_mise_a_jour DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erreur création table demandeurs:', err);
      else console.log('✓ Table demandeurs prête');
    });

    // Migration: ajouter colonne service_type si nécessaire
    db.all(`PRAGMA table_info(demandeurs)`, (err, rows) => {
      if (err) {
        console.error('Erreur vérification colonnes:', err);
        return;
      }

      const columnsToAdd = [
        { name: 'service_type', sql: `ALTER TABLE demandeurs ADD COLUMN service_type TEXT DEFAULT 'Express 72h'` },
        { name: 'ticket_number', sql: `ALTER TABLE demandeurs ADD COLUMN ticket_number TEXT` },
        { name: 'statut_actuel', sql: `ALTER TABLE demandeurs ADD COLUMN statut_actuel TEXT DEFAULT 'néant'` },
        { name: 'derniere_verification', sql: `ALTER TABLE demandeurs ADD COLUMN derniere_verification DATETIME` },
        { name: 'sms_envoye', sql: `ALTER TABLE demandeurs ADD COLUMN sms_envoye INTEGER DEFAULT 0` }
      ];

      columnsToAdd.forEach(column => {
        const hasColumn = rows.some((row) => row.name === column.name);
        if (!hasColumn) {
          db.run(column.sql, (alterErr) => {
            if (alterErr) console.error(`Erreur ajout colonne ${column.name}:`, alterErr);
            else console.log(`✓ Colonne ${column.name} ajoutée à la table demandeurs`);
          });
        }
      });
    });

    // Table des notifications SMS envoyées
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications_sms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        demandeur_id INTEGER NOT NULL,
        statut_iris TEXT NOT NULL,
        message TEXT NOT NULL,
        numero_telephone TEXT NOT NULL,
        statut_envoi TEXT DEFAULT 'en_attente',
        response_api_sms TEXT,
        date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (demandeur_id) REFERENCES demandeurs(id)
      )
    `, (err) => {
      if (err) console.error('Erreur création table notifications:', err);
      else console.log('✓ Table notifications_sms prête');
    });

    // Table d'audit
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        demandeur_id INTEGER,
        details TEXT,
        date_action DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erreur création table audit:', err);
      else console.log('✓ Table audit_log prête');
    });
  });
}

// Fonctions utilitaires pour les requêtes
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  runQuery,
  getQuery,
  allQuery
};
