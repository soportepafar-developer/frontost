import { formatRoleForDb, formatRoleDisplay } from './role-formatter.helper';

describe('role-formatter.helper', () => {
  describe('formatRoleForDb', () => {
    it('debe transformar nombre amigable a formato ROLE_...', () => {
      expect(formatRoleForDb('Operador')).toBe('ROLE_OPERADOR');
      expect(formatRoleForDb('operador')).toBe('ROLE_OPERADOR');
      expect(formatRoleForDb('Super Administrador')).toBe('ROLE_SUPER_ADMINISTRADOR');
      expect(formatRoleForDb('Analista de Costos')).toBe('ROLE_ANALISTA_DE_COSTOS');
    });

    it('debe preservar prefijo si ya viene como ROLE_...', () => {
      expect(formatRoleForDb('ROLE_OPERADOR')).toBe('ROLE_OPERADOR');
      expect(formatRoleForDb('role_admin')).toBe('ROLE_ADMIN');
    });

    it('debe limpiar tildes y caracteres especiales', () => {
      expect(formatRoleForDb('Diseñador / Técnico')).toBe('ROLE_DISENADOR_TECNICO');
    });

    it('debe retornar vacio para strings vacios', () => {
      expect(formatRoleForDb('')).toBe('');
    });
  });

  describe('formatRoleDisplay', () => {
    it('debe remover ROLE_ y mostrar en mayuscula inicial amigable', () => {
      expect(formatRoleDisplay('ROLE_OPERADOR')).toBe('Operador');
      expect(formatRoleDisplay('ROLE_SUPER_ADMINISTRADOR')).toBe('Super Administrador');
      expect(formatRoleDisplay('ROLE_ANALISTA')).toBe('Analista');
    });

    it('debe manejar roles sin prefijo', () => {
      expect(formatRoleDisplay('OPERADOR')).toBe('Operador');
    });

    it('debe retornar vacio si no hay valor', () => {
      expect(formatRoleDisplay('')).toBe('');
    });
  });
});

