/**
 * Utilidades para formateo bidireccional de roles del sistema:
 * - BD (backend): Prefijo técnico en mayúsculas 'ROLE_OPERADOR'
 * - UI (usuario): Formato amigable en mayúscula inicial 'Operador'
 */

/**
 * Convierte un nombre amigable o libre a formato de BD:
 * 'Operador' -> 'ROLE_OPERADOR'
 * 'Analista de Costos' -> 'ROLE_ANALISTA_DE_COSTOS'
 * 'ROLE_ADMIN' -> 'ROLE_ADMIN'
 */
export function formatRoleForDb(role: string): string {
  if (!role) return '';
  let clean = role.trim();

  // Si ya tiene ROLE_ al inicio, lo removemos temporalmente para normalizar
  if (clean.toUpperCase().startsWith('ROLE_')) {
    clean = clean.substring(5);
  }

  clean = clean
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9]/g, '_')                    // Espacios o caracteres especiales a _
    .replace(/_+/g, '_')                              // Evitar múltiples guiones consecutivos
    .replace(/^_|_$/g, '')                            // Quitar _ al inicio o al final
    .toUpperCase();

  return clean ? `ROLE_${clean}` : '';
}

/**
 * Convierte un rol técnico de BD a presentación legible para el usuario:
 * 'ROLE_OPERADOR' -> 'Operador'
 * 'ROLE_SUPER_ADMINISTRADOR' -> 'Super Administrador'
 * 'ROLE_ANALISTA' -> 'Analista'
 */
export function formatRoleDisplay(role: string): string {
  if (!role) return '';
  let clean = role.trim();

  if (clean.toUpperCase().startsWith('ROLE_')) {
    clean = clean.substring(5);
  }

  const words = clean.split('_').filter(Boolean);
  if (words.length === 0) return role;

  return words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

