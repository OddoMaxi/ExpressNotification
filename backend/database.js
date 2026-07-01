const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => console.log('✓ Connecté à PostgreSQL'));
pool.on('error', (err) => console.error('❌ Erreur pool PostgreSQL:', err.message));

// Convertit les placeholders SQLite (?) en PostgreSQL ($1, $2, ...)
function toPostgresParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS demandeurs (
        id                    SERIAL PRIMARY KEY,
        reference_recu        TEXT UNIQUE NOT NULL,
        nom                   TEXT NOT NULL,
        prenom                TEXT NOT NULL,
        telephone             TEXT NOT NULL,
        email                 TEXT,
        ticket_number         TEXT,
        service_type          TEXT DEFAULT 'Express 72h',
        statut_actuel         TEXT DEFAULT 'néant',
        derniere_verification TIMESTAMP,
        sms_envoye            INTEGER DEFAULT 0,
        date_enregistrement   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_mise_a_jour      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table demandeurs prête');

    const migrations = [
      `ALTER TABLE demandeurs ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'Express 72h'`,
      `ALTER TABLE demandeurs ADD COLUMN IF NOT EXISTS ticket_number TEXT`,
      `ALTER TABLE demandeurs ADD COLUMN IF NOT EXISTS statut_actuel TEXT DEFAULT 'néant'`,
      `ALTER TABLE demandeurs ADD COLUMN IF NOT EXISTS derniere_verification TIMESTAMP`,
      `ALTER TABLE demandeurs ADD COLUMN IF NOT EXISTS sms_envoye INTEGER DEFAULT 0`,
      `ALTER TABLE demandeurs ADD COLUMN IF NOT EXISTS reference_recu_express TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_demandeurs_recu_express ON demandeurs(reference_recu_express) WHERE reference_recu_express IS NOT NULL`,
    ];
    for (const sql of migrations) await client.query(sql);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications_sms (
        id               SERIAL PRIMARY KEY,
        demandeur_id     INTEGER NOT NULL REFERENCES demandeurs(id),
        statut_iris      TEXT NOT NULL,
        message          TEXT NOT NULL,
        numero_telephone TEXT NOT NULL,
        statut_envoi     TEXT DEFAULT 'en_attente',
        response_api_sms TEXT,
        date_envoi       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table notifications_sms prête');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_demandeur
      ON notifications_sms(demandeur_id, date_envoi)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id            SERIAL PRIMARY KEY,
        action        TEXT NOT NULL,
        demandeur_id  INTEGER,
        details       TEXT,
        date_action   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table audit_log prête');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_demandeurs_ticket
      ON demandeurs(ticket_number) WHERE ticket_number IS NOT NULL
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id               SERIAL PRIMARY KEY,
        username         TEXT UNIQUE NOT NULL,
        password         TEXT NOT NULL,
        role             TEXT NOT NULL DEFAULT 'agent',
        nom              TEXT,
        prenom           TEXT,
        email            TEXT,
        actif            INTEGER DEFAULT 1,
        date_creation    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_mise_a_jour TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Table users prête');

    await client.query('COMMIT');
    await seedDefaultUsers();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur initialisation base de données:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function seedDefaultUsers() {
  const bcrypt = require('bcryptjs');
  const defaults = [
    { username: 'admin',       password: 'Admin123!',  role: 'admin',       nom: 'Admin',       prenom: 'Super' },
    { username: 'superviseur', password: 'Super123!',  role: 'superviseur', nom: 'Superviseur', prenom: 'Chef'  },
    { username: 'agent',       password: 'Agent123!',  role: 'agent',       nom: 'Agent',       prenom: 'Louba' },
  ];
  for (const u of defaults) {
    const res = await pool.query('SELECT id FROM users WHERE username = $1', [u.username]);
    if (res.rows.length === 0) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (username, password, role, nom, prenom) VALUES ($1, $2, $3, $4, $5)',
        [u.username, hash, u.role, u.nom, u.prenom]
      );
      console.log(`✓ Utilisateur par défaut créé: ${u.username} (${u.role})`);
    }
  }
}

function runQuery(query, params = []) {
  const sql = toPostgresParams(query);
  const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
  const finalSql = isInsert ? `${sql} RETURNING id` : sql;
  return pool.query(finalSql, params).then(result => ({
    lastID:  result.rows[0]?.id ?? null,
    changes: result.rowCount
  }));
}

function getQuery(query, params = []) {
  const sql = toPostgresParams(query);
  return pool.query(sql, params).then(result => result.rows[0] ?? null);
}

function allQuery(query, params = []) {
  const sql = toPostgresParams(query);
  return pool.query(sql, params).then(result => result.rows);
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn({
      run: (q, p = []) => client.query(toPostgresParams(q), p).then(r => ({ lastID: r.rows[0]?.id ?? null, changes: r.rowCount })),
      get: (q, p = []) => client.query(toPostgresParams(q), p).then(r => r.rows[0] ?? null),
    });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase, runQuery, getQuery, allQuery, withTransaction };
