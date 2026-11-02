/**
 * Arma la etiqueta con que se muestra un tramo de días en el CRM.
 *
 * Lo usan la ficha de licencias médicas, el listado de ausencias, el
 * calendario del dashboard y el resumen que sale impreso en la liquidación.
 *
 *   rangoDeDias('2026-08-17', '2026-08-28')
 *   → { etiqueta: 'del 17 al 28 de agosto', dias: 12 }
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const UN_DIA = 24 * 60 * 60 * 1000;

export interface RangoDeDias {
  /** «del 17 al 28 de agosto», o «el 17 de agosto» si es un solo día. */
  etiqueta: string;
  /** Días corridos, ambos extremos incluidos. */
  dias: number;
}

/** El día del mes de la fecha calendario (UTC). */
function diaDe(f: Date): number {
  return f.getUTCDate();
}

/** El mes (0-11) de la fecha calendario (UTC). */
function mesDe(f: Date): number {
  return f.getUTCMonth();
}

/** El año de la fecha calendario (UTC). */
function anioDe(f: Date): number {
  return f.getUTCFullYear();
}

export function rangoDeDias(desde: string | Date, hasta: string | Date): RangoDeDias {
  const a = desde instanceof Date ? desde : new Date(desde);
  const b = hasta instanceof Date ? hasta : new Date(hasta);

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    throw new Error('Fecha inválida');
  }
  if (b.getTime() < a.getTime()) {
    throw new Error('El término no puede ser anterior al inicio');
  }

  // Los días corridos se cuentan sobre el instante, sin pasar por la zona:
  // dos fechas de calendario consecutivas siempre difieren en 24 h exactas.
  const dias = Math.round((b.getTime() - a.getTime()) / UN_DIA) + 1;

  const dA = diaDe(a);
  const dB = diaDe(b);
  const mA = mesDe(a);
  const mB = mesDe(b);
  const yA = anioDe(a);
  const yB = anioDe(b);

  if (dias === 1) {
    return { etiqueta: `el ${dA} de ${MESES[mA]}`, dias };
  }

  if (yA !== yB) {
    return {
      etiqueta: `del ${dA} de ${MESES[mA]} de ${yA} al ${dB} de ${MESES[mB]} de ${yB}`,
      dias,
    };
  }

  if (mA !== mB) {
    return {
      etiqueta: `del ${dA} de ${MESES[mA]} al ${dB} de ${MESES[mB]}`,
      dias,
    };
  }

  return { etiqueta: `del ${dA} al ${dB} de ${MESES[mA]}`, dias };
}
