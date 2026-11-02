import { rangoDeDias } from './rango-de-dias';

// Helper limpio: fechas calendario a medianoche UTC (como almacena Mongo y viaja en APIs)
const f = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('rangoDeDias — Suite Corregida y Blindada', () => {
  describe('Casos reales de producción (regresión)', () => {
    it('Caso 1 — Licencia médica TT-2026-00471 (medianoche UTC en Mongo)', () => {
      expect(
        rangoDeDias(
          new Date('2026-08-17T00:00:00.000Z'),
          new Date('2026-08-28T00:00:00.000Z'),
        ),
      ).toEqual({
        etiqueta: 'del 17 al 28 de agosto',
        dias: 12,
      });
    });

    it('Caso 2 — Feriado legal de septiembre (inicio de mes no debe retroceder)', () => {
      expect(
        rangoDeDias('2026-09-01T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
      ).toEqual({
        etiqueta: 'del 1 al 15 de septiembre',
        dias: 15,
      });
    });

    it('Caso 3 — Permiso de un día en año nuevo (no debe retroceder de año)', () => {
      expect(
        rangoDeDias(
          new Date('2027-01-01T00:00:00.000Z'),
          new Date('2027-01-01T00:00:00.000Z'),
        ),
      ).toEqual({
        etiqueta: 'el 1 de enero',
        dias: 1,
      });
    });
  });

  describe('Formateo de tramos y etiquetas', () => {
    it('un solo día dentro del mes', () => {
      expect(rangoDeDias(f('2026-08-17'), f('2026-08-17'))).toEqual({
        etiqueta: 'el 17 de agosto',
        dias: 1,
      });
    });

    it('día único sin cero a la izquierda', () => {
      expect(rangoDeDias(f('2026-08-03'), f('2026-08-03'))).toEqual({
        etiqueta: 'el 3 de agosto',
        dias: 1,
      });
    });

    it('dentro del mismo mes nombra el mes una sola vez', () => {
      expect(rangoDeDias(f('2026-08-17'), f('2026-08-28'))).toEqual({
        etiqueta: 'del 17 al 28 de agosto',
        dias: 12,
      });
    });

    it('mes completo (del primer al último día)', () => {
      expect(rangoDeDias(f('2026-08-01'), f('2026-08-31'))).toEqual({
        etiqueta: 'del 1 al 31 de agosto',
        dias: 31,
      });
    });

    it('cruzando de mes nombra ambos meses', () => {
      expect(rangoDeDias(f('2026-08-28'), f('2026-09-03'))).toEqual({
        etiqueta: 'del 28 de agosto al 3 de septiembre',
        dias: 7,
      });
    });

    it('cruzando de año explicita el año en ambos extremos', () => {
      expect(rangoDeDias(f('2026-12-28'), f('2027-01-05'))).toEqual({
        etiqueta: 'del 28 de diciembre de 2026 al 5 de enero de 2027',
        dias: 9,
      });
    });
  });

  describe('Nombres de meses en español', () => {
    it.each([
      ['2026-01-10', 'el 10 de enero'],
      ['2026-04-10', 'el 10 de abril'],
      ['2026-07-10', 'el 10 de julio'],
      ['2026-11-10', 'el 10 de noviembre'],
    ])('%s → %s', (iso, esperado) => {
      expect(rangoDeDias(f(iso), f(iso)).etiqueta).toBe(esperado);
    });
  });

  describe('Flexibilidad de tipos (contrato Date | string)', () => {
    it('acepta objetos Date nativos', () => {
      expect(
        rangoDeDias(
          new Date('2026-05-04T00:00:00.000Z'),
          new Date('2026-05-09T00:00:00.000Z'),
        ),
      ).toEqual({
        etiqueta: 'del 4 al 9 de mayo',
        dias: 6,
      });
    });

    it('acepta cadenas ISO completas', () => {
      expect(
        rangoDeDias('2026-05-04T00:00:00.000Z', '2026-05-09T00:00:00.000Z'),
      ).toEqual({
        etiqueta: 'del 4 al 9 de mayo',
        dias: 6,
      });
    });

    it('acepta fechas cortas YYYY-MM-DD sin hora', () => {
      expect(rangoDeDias('2026-05-04', '2026-05-09')).toEqual({
        etiqueta: 'del 4 al 9 de mayo',
        dias: 6,
      });
    });
  });

  describe('Validaciones y errores defensivos', () => {
    it('rechaza una fecha inválida lanzando excepción', () => {
      expect(() => rangoDeDias(new Date('invalida'), f('2026-08-01'))).toThrow(
        'Fecha inválida',
      );
    });

    it('rechaza un término anterior al inicio', () => {
      expect(() => rangoDeDias(f('2026-08-10'), f('2026-08-01'))).toThrow(
        'El término no puede ser anterior al inicio',
      );
    });
  });
});
