import { rangoDeDias } from './rango-de-dias';

describe('Reproducción de bugs reales en producción (casos de MongoDB a medianoche UTC)', () => {
  it('Caso 1 — Licencia médica TT-2026-00471 (desfase de días dentro del mismo mes)', () => {
    expect(
      rangoDeDias('2026-08-17T00:00:00.000Z', '2026-08-28T00:00:00.000Z'),
    ).toEqual({
      etiqueta: 'del 17 al 28 de agosto',
      dias: 12,
    });
  });

  it('Caso 2 — Feriado legal de septiembre (inicio de mes retrocede a agosto)', () => {
    expect(
      rangoDeDias('2026-09-01T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
    ).toEqual({
      etiqueta: 'del 1 al 15 de septiembre',
      dias: 15,
    });
  });

  it('Caso 3 — Permiso de un día, 1 de enero (retrocede al año anterior)', () => {
    expect(
      rangoDeDias('2027-01-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z'),
    ).toEqual({
      etiqueta: 'el 1 de enero',
      dias: 1,
    });
  });
});
