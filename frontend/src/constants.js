export const STATUS_CONFIG = {
  'néant':                   { label: 'Non traité',             color: '#6b7280', bg: '#f3f4f6', icon: '⏸' },
  'Pending Final Approval':  { label: 'En attente approbation', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  'Final Approval Passed':   { label: 'Approuvé',               color: '#10b981', bg: '#ecfdf5', icon: '✅' },
  'Final Approval Rejected': { label: 'Rejeté',                 color: '#ef4444', bg: '#fef2f2', icon: '❌' },
  'Production Completed':    { label: 'Passeport prêt',         color: '#3b82f6', bg: '#eff6ff', icon: '🎉' },
};

export const STATUS_ORDER = Object.keys(STATUS_CONFIG);

export const ROLES = ['admin', 'superviseur', 'agent'];

export const BRANCHES = {
  // ── Centre Conakry ──────────────────────────────────────
  '320': { name: 'Branche 1 — Coleah',    type: 'centre' },
  '331': { name: 'Branche 2 — Nongo',     type: 'centre' },
  '332': { name: 'Branche 3 — Matoto',    type: 'centre' },
  '396': { name: 'Centre Express Kipé',   type: 'centre' },
  // ── Ambassades ──────────────────────────────────────────
  '323': { name: 'Embassy 3 — Rabat, Maroc',             type: 'ambassade' },
  '324': { name: 'Embassy 4 — Luanda, Angola',           type: 'ambassade' },
  '325': { name: 'Embassy 5 — Paris 1, France',          type: 'ambassade' },
  '326': { name: 'Embassy 6 — Pékin, Chine',             type: 'ambassade' },
  '327': { name: 'Embassy 7 — Moscou, Russie',           type: 'ambassade' },
  '328': { name: 'Embassy 8 — New York, USA',            type: 'ambassade' },
  '329': { name: 'Embassy 9 — Ryad, Arabie Saoudite',   type: 'ambassade' },
  '333': { name: 'Embassy 11 — Kuala Lumpur',            type: 'ambassade' },
  '334': { name: 'Embassy 12 — Madrid, Espagne',         type: 'ambassade' },
  '335': { name: 'Embassy 13 — Le Caire, Égypte',       type: 'ambassade' },
  '336': { name: 'Embassy 14 — Berlin, Allemagne',       type: 'ambassade' },
  '337': { name: 'Embassy 15 — Pretoria, Afrique du Sud',type: 'ambassade' },
  '338': { name: 'Embassy 16 — Djeddah, Arabie Saoudite',type: 'ambassade' },
  '339': { name: 'Embassy 17 — Washington DC, USA',      type: 'ambassade' },
  '340': { name: 'Embassy 18 — Ankara, Turquie',         type: 'ambassade' },
  '341': { name: 'Embassy 19 — Bruxelles, Belgique',     type: 'ambassade' },
  '342': { name: 'Embassy 20 — Rome, Italie',            type: 'ambassade' },
  '344': { name: 'Embassy 21 — Paris 2, France',         type: 'ambassade' },
  // ── MEU Mobile / Ligue ──────────────────────────────────
  '345': { name: 'MEU 22 — Conakry Kits Mobile',         type: 'meu_mobile' },
  '346': { name: 'Ligue 1 (23) — Conakry Kits Mobile',   type: 'meu_mobile' },
  '347': { name: 'Ligue 2 (24) — Conakry Kits Mobile',   type: 'meu_mobile' },
  '348': { name: 'Ligue 3 (25) — Conakry Kits Mobile',   type: 'meu_mobile' },
  // ── MEU Ambassades ──────────────────────────────────────
  '349': { name: 'MEU Embassy 22 — Abidjan, Côte d\'Ivoire', type: 'meu_ambassade' },
  '350': { name: 'MEU Embassy 23 — Dakar, Sénégal',          type: 'meu_ambassade' },
  '351': { name: 'MEU Embassy 24 — Abuja, Nigeria',           type: 'meu_ambassade' },
  '352': { name: 'MEU Embassy 25 — Ottawa, Canada',           type: 'meu_ambassade' },
  '353': { name: 'MEU Embassy 26 — Accra, Ghana',             type: 'meu_ambassade' },
  '354': { name: 'MEU Embassy 27 — Éthiopie',                 type: 'meu_ambassade' },
  '355': { name: 'MEU Embassy 28 — Guinée Équatoriale',       type: 'meu_ambassade' },
  '356': { name: 'MEU Embassy 29 — Angleterre',               type: 'meu_ambassade' },
  '357': { name: 'MEU Hadj 01',                               type: 'hadj' },
  '358': { name: 'MEU Hadj 02',                               type: 'hadj' },
  '359': { name: 'MEU Embassy 30 — Suisse',                   type: 'meu_ambassade' },
  '360': { name: 'MEU Embassy 31 — Kigali, Rwanda',           type: 'meu_ambassade' },
  '361': { name: 'MEU Embassy 32 — Libreville, Gabon',        type: 'meu_ambassade' },
  '362': { name: 'MEU Hadj 03',                               type: 'hadj' },
  '363': { name: 'MEU Hadj 04',                               type: 'hadj' },
  '364': { name: 'MEU Embassy 33 — Berlin 2, Allemagne',      type: 'meu_ambassade' },
  '365': { name: 'MEU Embassy 34 — Japon',                    type: 'meu_ambassade' },
  '366': { name: 'MEU Embassy 35 — Abu Dhabi',                type: 'meu_ambassade' },
  '367': { name: 'MEU Embassy 36 — RDC',                      type: 'meu_ambassade' },
  '368': { name: 'MEU Embassy 37 — Ankara 2, Turquie',        type: 'meu_ambassade' },
  '369': { name: 'MEU Embassy 38 — New Delhi, Inde',          type: 'meu_ambassade' },
  '370': { name: 'MEU Embassy 39 — Brasília, Brésil',         type: 'meu_ambassade' },
  '371': { name: 'MEU Embassy 40 — Doha, Qatar',              type: 'meu_ambassade' },
  '372': { name: 'MEU Embassy 41 — Banjul, Gambie',           type: 'meu_ambassade' },
  '374': { name: 'MEU Embassy 42 — Bamako, Mali',             type: 'meu_ambassade' },
  '376': { name: 'MEU Embassy 44 — Alger, Algérie',           type: 'meu_ambassade' },
  '379': { name: 'MEU Région Kankan',                         type: 'region' },
  '380': { name: 'MEU Région N\'Zérékoré',                    type: 'region' },
  '382': { name: 'MEU Région Mamou',                          type: 'region' },
  '383': { name: 'MEU Région Boké',                           type: 'region' },
  '384': { name: 'MEU Région Labé',                           type: 'region' },
  '385': { name: 'MEU Région Faranah',                        type: 'region' },
  '386': { name: 'MEU Région Kindia',                         type: 'region' },
  '387': { name: 'MEU Embassy 45 — Bouaké, Côte d\'Ivoire',  type: 'meu_ambassade' },
  '388': { name: 'MEU Embassy 46 — Dakhla, Maroc',           type: 'meu_ambassade' },
  '389': { name: 'MEU Embassy 47 — Freetown, Sierra Leone',  type: 'meu_ambassade' },
  '391': { name: 'MEU Embassy 48 — Chine 3',                 type: 'meu_ambassade' },
};

export const BRANCH_TYPE_CONFIG = {
  centre:        { label: 'Centre Conakry', color: '#7c3aed', bg: '#ede9fe' },
  ambassade:     { label: 'Ambassade',      color: '#0369a1', bg: '#e0f2fe' },
  meu_mobile:    { label: 'MEU Mobile',     color: '#059669', bg: '#d1fae5' },
  meu_ambassade: { label: 'MEU Ambassade',  color: '#d97706', bg: '#fef3c7' },
  hadj:          { label: 'Hadj',           color: '#be185d', bg: '#fce7f3' },
  region:        { label: 'Région',         color: '#475569', bg: '#f1f5f9' },
};

export const PHONE_REGEX = /^(\+224|00224)?[0-9]{9}$/;

export function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatDateShort(str) {
  if (!str) return '';
  const [, m, d] = str.split('-');
  return `${d}/${m}`;
}
