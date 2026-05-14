const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'notifications.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✓ Connecté à SQLite:', DB_PATH);

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS demandeurs (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_recu        TEXT UNIQUE NOT NULL,
      nom                   TEXT NOT NULL,
      prenom                TEXT NOT NULL,
      telephone             TEXT NOT NULL,
      email                 TEXT,
      ticket_number         TEXT,
      service_type          TEXT DEFAULT 'Express 72h',
      statut_actuel         TEXT DEFAULT 'néant',
      derniere_verification DATETIME,
      sms_envoye            INTEGER DEFAULT 0,
      date_enregistrement   DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_mise_a_jour      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Table demandeurs prête');

  // Migrations sécurisées (SQLite ne supporte pas IF NOT EXISTS sur ALTER TABLE)
  const existingCols = db.pragma('table_info(demandeurs)').map(c => c.name);
  const toAdd = [
    ['service_type',          "TEXT DEFAULT 'Express 72h'"],
    ['ticket_number',         'TEXT'],
    ['statut_actuel',         "TEXT DEFAULT 'néant'"],
    ['derniere_verification', 'DATETIME'],
    ['sms_envoye',            'INTEGER DEFAULT 0'],
  ];
  for (const [col, def] of toAdd) {
    if (!existingCols.includes(col)) {
      db.exec(`ALTER TABLE demandeurs ADD COLUMN ${col} ${def}`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications_sms (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      demandeur_id     INTEGER NOT NULL REFERENCES demandeurs(id),
      statut_iris      TEXT NOT NULL,
      message          TEXT NOT NULL,
      numero_telephone TEXT NOT NULL,
      statut_envoi     TEXT DEFAULT 'en_attente',
      response_api_sms TEXT,
      date_envoi       DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Table notifications_sms prête');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notifications_demandeur
    ON notifications_sms(demandeur_id, date_envoi)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      action        TEXT NOT NULL,
      demandeur_id  INTEGER,
      details       TEXT,
      date_action   DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Table audit_log prête');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_demandeurs_ticket
    ON demandeurs(ticket_number)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      username         TEXT UNIQUE NOT NULL,
      password         TEXT NOT NULL,
      role             TEXT NOT NULL DEFAULT 'agent',
      nom              TEXT,
      prenom           TEXT,
      email            TEXT,
      actif            INTEGER DEFAULT 1,
      date_creation    DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_mise_a_jour DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Table users prête');

  seedDefaultUsers();
  return Promise.resolve();
}

function seedDefaultUsers() {
  const bcrypt = require('bcryptjs');
  const defaults = [
    { username: 'admin',       password: 'Admin123!',  role: 'admin',       nom: 'Admin',       prenom: 'Super' },
    { username: 'superviseur', password: 'Super123!',  role: 'superviseur', nom: 'Superviseur', prenom: 'Chef'  },
    { username: 'agent',       password: 'Agent123!',  role: 'agent',       nom: 'Agent',       prenom: 'Louba' },
  ];
  for (const u of defaults) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (!existing) {
      const hash = bcrypt.hashSync(u.password, 10);
      db.prepare('INSERT INTO users (username, password, role, nom, prenom) VALUES (?, ?, ?, ?, ?)').run(u.username, hash, u.role, u.nom, u.prenom);
      console.log(`✓ Utilisateur par défaut créé: ${u.username} (${u.role})`);
    }
  }
}

// ─── Helpers (interface identique à l'ancienne version PostgreSQL) ──────────

function runQuery(query, params = []) {
  return Promise.resolve().then(() => {
    const stmt = db.prepare(query);
    const isInsert = query.trim().toUpperCase().startsWith('INSERT');
    const result = stmt.run(...params);
    return {
      lastID: isInsert ? result.lastInsertRowid : null,
      changes: result.changes,
    };
  });
}

function getQuery(query, params = []) {
  return Promise.resolve().then(() => {
    return db.prepare(query).get(...params) ?? null;
  });
}

function allQuery(query, params = []) {
  return Promise.resolve().then(() => {
    return db.prepare(query).all(...params);
  });
}

// Les callbacks sont async mais toutes les opérations tx.run/tx.get sont
// synchrones sous le capot — BEGIN/COMMIT encadrent correctement la transaction.
async function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const tx = {
      run: (q, p = []) => {
        const r = db.prepare(q).run(...p);
        return Promise.resolve({ lastID: r.lastInsertRowid, changes: r.changes });
      },
      get: (q, p = []) => Promise.resolve(db.prepare(q).get(...p) ?? null),
    };
    const result = await fn(tx);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, initializeDatabase, runQuery, getQuery, allQuery, withTransaction };
