export const STATUS_CONFIG = {
  'néant':                   { label: 'Non traité',             color: '#6b7280', bg: '#f3f4f6', icon: '⏸' },
  'Pending Final Approval':  { label: 'En attente approbation', color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
  'Final Approval Passed':   { label: 'Approuvé',               color: '#10b981', bg: '#ecfdf5', icon: '✅' },
  'Final Approval Rejected': { label: 'Rejeté',                 color: '#ef4444', bg: '#fef2f2', icon: '❌' },
  'Production Completed':    { label: 'Passeport prêt',         color: '#3b82f6', bg: '#eff6ff', icon: '🎉' },
};

export const STATUS_ORDER = Object.keys(STATUS_CONFIG);

export const ROLES = ['admin', 'superviseur', 'agent'];

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
