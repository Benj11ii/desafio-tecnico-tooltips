# Tres casos reales de producción

Los tres salen de reclamos: alguien miró la pantalla y el número no era el que
tenía en el papel. La columna «correcto» está verificada a mano contra el
documento original.

Los tres tramos vienen de Mongo. Así se ven los documentos:

```json
{
  "folio": "TT-2026-00471",
  "inicio": { "$date": "2026-08-17T00:00:00.000Z" },
  "termino": { "$date": "2026-08-28T00:00:00.000Z" }
}
```

---

## Caso 1 — licencia médica TT-2026-00471

| | |
| --- | --- |
| Entrada | `inicio` = `2026-08-17T00:00:00.000Z`, `termino` = `2026-08-28T00:00:00.000Z` |
| La pantalla mostró | **del 16 al 27 de agosto**, 12 días |
| Correcto | del 17 al 28 de agosto, 12 días |

La persona reclamó porque la licencia en papel dice 17 al 28.

## Caso 2 — feriado legal de septiembre

| | |
| --- | --- |
| Entrada | `desde` = `2026-09-01T00:00:00.000Z`, `hasta` = `2026-09-15T00:00:00.000Z` |
| La pantalla mostró | **del 31 de agosto al 14 de septiembre**, 15 días |
| Correcto | del 1 al 15 de septiembre, 15 días |

Acá además cambió el mes de la etiqueta: el resumen decía «agosto» para unas
vacaciones que empezaron en septiembre.

## Caso 3 — permiso de un día, 1 de enero

| | |
| --- | --- |
| Entrada | `desde` = `hasta` = `2027-01-01T00:00:00.000Z` |
| La pantalla mostró | **el 31 de diciembre** |
| Correcto | el 1 de enero |

---

## Lo que ya se descartó

- **No es el navegador.** El mismo texto sale del PDF, que lo genera el servidor.
- **No son los datos.** Los documentos en Mongo tienen las fechas correctas: se
  verificaron con `mongosh` en los tres casos.
- **El conteo de días nunca falló.** Los tres dieron el número correcto; lo que
  está mal es solo la etiqueta.
- **No pasa siempre.** Hay tramos que salen bien. Los que salen bien y los que
  salen mal están mezclados en la misma pantalla.
