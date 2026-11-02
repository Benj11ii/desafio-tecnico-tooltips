import { rangoDeDias } from './rango-de-dias';

// Las fechas se escriben con hora explícita para que el test no dependa de la
// zona horaria de la máquina en que corre.
const f = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('rangoDeDias', () => {
  describe('un solo día', () => {
    it('lo escribe sin «del … al …»', () => {
      expect(rangoDeDias(f('2026-08-17'), f('2026-08-17'))).toEqual({
        etiqueta: 'el 17 de agosto',
        dias: 1,
      });
    });

    it('cuenta 1 día', () => {
      expect(rangoDeDias(f('2026-03-05'), f('2026-03-05')).dias).toBe(1);
    });

    it('no le pone cero adelante al día', () => {
      expect(rangoDeDias(f('2026-08-03'), f('2026-08-03')).etiqueta).toBe(
        'el 3 de agosto',
      );
    });
  });

  describe('dentro del mismo mes', () => {
    it('nombra el mes una sola vez', () => {
      expect(rangoDeDias(f('2026-08-17'), f('2026-08-28'))).toEqual({
        etiqueta: 'del 17 al 28 de agosto',
        dias: 12,
      });
    });

    it('cuenta los dos extremos', () => {
      expect(rangoDeDias(f('2026-08-17'), f('2026-08-18')).dias).toBe(2);
    });

    it('sirve para el mes completo', () => {
      expect(rangoDeDias(f('2026-08-01'), f('2026-08-31'))).toEqual({
        etiqueta: 'del 1 al 31 de agosto',
        dias: 31,
      });
    });

    it('febrero de un año normal tiene 28', () => {
      expect(rangoDeDias(f('2026-02-01'), f('2026-02-28')).dias).toBe(28);
    });

    it('febrero de un año bisiesto tiene 29', () => {
      expect(rangoDeDias(f('2028-02-01'), f('2028-02-29')).dias).toBe(29);
    });
  });

  describe('cruzando de mes', () => {
    it('nombra los dos meses', () => {
      expect(rangoDeDias(f('2026-08-28'), f('2026-09-03'))).toEqual({
        etiqueta: 'del 28 de agosto al 3 de septiembre',
        dias: 7,
      });
    });

    it('cuenta bien pasando por un mes de 30', () => {
      expect(rangoDeDias(f('2026-06-25'), f('2026-07-05')).dias).toBe(11);
    });

    it('cuenta bien pasando por febrero', () => {
      expect(rangoDeDias(f('2026-02-25'), f('2026-03-02')).dias).toBe(6);
    });

    it('escribe septiembre entero', () => {
      expect(rangoDeDias(f('2026-09-30'), f('2026-10-01')).etiqueta).toBe(
        'del 30 de septiembre al 1 de octubre',
      );
    });
  });

  describe('cruzando de año', () => {
    it('agrega el año a los dos extremos', () => {
      expect(rangoDeDias(f('2026-12-28'), f('2027-01-05'))).toEqual({
        etiqueta: 'del 28 de diciembre de 2026 al 5 de enero de 2027',
        dias: 9,
      });
    });

    it('cuenta los días del salto de año', () => {
      expect(rangoDeDias(f('2026-12-31'), f('2027-01-01')).dias).toBe(2);
    });
  });

  describe('los doce meses se escriben en minúscula y sin abreviar', () => {
    it.each([
      ['2026-01-10', 'el 10 de enero'],
      ['2026-04-10', 'el 10 de abril'],
      ['2026-07-10', 'el 10 de julio'],
      ['2026-11-10', 'el 10 de noviembre'],
    ])('%s → %s', (iso, esperado) => {
      expect(rangoDeDias(f(iso), f(iso)).etiqueta).toBe(esperado);
    });
  });

  describe('entradas inválidas', () => {
    it('rechaza una fecha que no se puede leer', () => {
      expect(() => rangoDeDias(new Date('no es fecha'), f('2026-08-01'))).toThrow(
        'Fecha inválida',
      );
    });

    it('rechaza un término anterior al inicio', () => {
      expect(() => rangoDeDias(f('2026-08-10'), f('2026-08-01'))).toThrow(
        'El término no puede ser anterior al inicio',
      );
    });
  });

  describe('acepta Date o string', () => {
    it('da lo mismo pasar un Date', () => {
      expect(rangoDeDias(f('2026-05-04'), f('2026-05-09')).etiqueta).toBe(
        'del 4 al 9 de mayo',
      );
    });

    it('da lo mismo pasar el ISO completo', () => {
      expect(
        rangoDeDias('2026-05-04T12:00:00.000Z', '2026-05-09T12:00:00.000Z')
          .etiqueta,
      ).toBe('del 4 al 9 de mayo');
    });
  });
});
