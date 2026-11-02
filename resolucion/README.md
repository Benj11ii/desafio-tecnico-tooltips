# Resolución Challenge Técnico: CH-DEV-SS-05

## Desarrollador Backend y Automatización — Tooltips SpA

**Postulante:** Benjamín Alonso Carmona Vega
**Fecha:** Noviembre 2026
**Repositorio:** Solución a bug en producción de formateo de tramos de días (`rangoDeDias`)

---

## 📌 Nota sobre el enunciado y alcance

Se identificó una discrepancia en el portal/correo: la descripción introductoria mencionaba un *«cálculo de descuentos sobre una liquidación»*, mientras que los archivos adjuntos y descargables (`casos-de-produccion.md`, `rango-de-dias.ts` y `rango-de-dias.spec.ts`) correspondían a la función de licencias y ausencias `rangoDeDias`.

Siguiendo el criterio de ingeniería de considerar el código ejecutable como la **fuente de verdad**, los 6 requerimientos se aplicaron e implementaron íntegramente sobre la lógica de `rangoDeDias`.

---

## 🤖 Declaración de uso de herramientas

Conforme a las reglas del desafío (*«puedes usar la documentación y las herramientas que quieras, incluida IA; si la usas, dilo en el documento de entrega»*), se utilizaron herramientas de IA generativa como asistentes de consulta y copiloto para el diseño de experimentos de mutación de código y el contraste conceptual de zonas horarias. Todo el código, análisis, ejecución y validación fue realizado y verificado manualmente en entorno Linux local.

---

## 1. El test que reproduce el bug (fallando antes del arreglo)

Se creó la suite `bug-produccion.spec.ts`, que reproduce los tres casos reales extraídos de MongoDB (`00:00:00.000Z`):

- **Caso 1:** Licencia médica TT-2026-00471 (17 al 28 de agosto).
- **Caso 2:** Feriado legal de septiembre (1 al 15 de septiembre).
- **Caso 3:** Permiso de un día, 1 de enero (1 de enero de 2027).

Al correr contra la función sin modificar, los tres tests fallaron de forma exacta:

```text
FAIL ./bug-produccion.spec.ts
  ✕ Caso 1: Expected "del 17 al 28 de agosto", Received "del 16 al 27 de agosto"
  ✕ Caso 2: Expected "del 1 al 15 de septiembre", Received "del 31 de agosto al 14 de septiembre"
  ✕ Caso 3: Expected "el 1 de enero", Received "el 31 de diciembre"
Tests: 3 failed, 3 total
```

> Evidencia completa capturada en `evidencia/salida-antes.txt`.

---

## 2. Por qué la suite original no atrapaba el bug

Mediante pruebas empíricas de mutación de código se demostró que coexistían múltiples fallas de diseño en los tests originales:

1. **Sesgo sistemático en el fixture (`f` con `T12:00:00.000Z`).**
   El helper `f()` inyectaba artificialmente las 12:00 PM UTC. Al convertir a `America/Santiago` (UTC-4 en invierno, UTC-3 en verano), la hora resultante caía en las 08:00 o 09:00 AM del mismo día, por lo que nunca cruzó el umbral crítico de medianoche hacia atrás. Al mutar la función a huso `'UTC'`, los 22 tests siguieron pasando idénticos: la suite original era completamente ciega al huso horario.

2. **Aserciones ciegas e incompletas.**
   7 de los 22 tests verificaban únicamente la propiedad numérica `.dias` (`toBe(...)`), ignorando por completo la cadena `.etiqueta`. Al mutar la función para retornar una etiqueta rota, esos 7 tests continuaron en verde.

3. **Falsa cobertura de tipos.**
   El test para strings (*da lo mismo pasar el ISO completo*) replicó el artificio de las 12:00Z y solo evaluó `.etiqueta`, pasando incluso cuando se forzó el retorno de una constante.

---

## 3. Clasificación de los 22 tests originales

| #  | Test en la suite original | Clasificación | Justificación empírica |
|----|---------------------------|---------------|------------------------|
| 1  | un solo día > lo escribe sin «del … al …» | Pasa por la razón equivocada | Pasa solo por el sesgo de `f()` a las 12:00Z; con medianoche UTC retrocede al día anterior. |
| 2  | un solo día > cuenta 1 día | Pasa con una constante / Aserción ciega | Solo evalúa `.dias.toBe(1)`; pasó intacto en el experimento con la etiqueta rota. |
| 3  | un solo día > no le pone cero adelante al día | Pasa por la razón equivocada | Valida formato pero sesgado por las 12:00Z; a medianoche UTC habría evaluado el 2 de agosto. |
| 4  | mismo mes > nombra el mes una sola vez | Pasa por la razón equivocada | Es el Caso 1 de producción; el sesgo de las 12:00Z impidió que la suite detectara el desfase de días. |
| 5  | mismo mes > cuenta los dos extremos | Pasa con una constante / Aserción ciega | Solo evalúa `.dias.toBe(2)`; pasó intacto en el experimento con la etiqueta rota. |
| 6  | mismo mes > sirve para el mes completo | Pasa por la razón equivocada | Con datos reales de medianoche falla retrocediendo al mes anterior (de agosto a julio). |
| 7  | mismo mes > febrero normal tiene 28 | Pasa con una constante / Aserción ciega | No valida la etiqueta de negocio; solo prueba la resta de milisegundos de JavaScript. |
| 8  | mismo mes > febrero bisiesto tiene 29 | Pasa con una constante / Aserción ciega | Pasó intacto con la función rota; prueba el calendario gregoriano pero ignora la salida. |
| 9  | cruzando mes > nombra los dos meses | Pasa por la razón equivocada | Oculta el bug del Caso 2, que en producción mostró agosto en un tramo de septiembre. |
| 10 | cruzando mes > cuenta bien mes de 30 | Pasa con una constante / Aserción ciega | Solo evalúa `.dias.toBe(11)`; ignoró completamente que la etiqueta estaba adulterada. |
| 11 | cruzando mes > cuenta bien pasando por febrero | Pasa con una constante / Aserción ciega | Solo evalúa `.dias.toBe(6)`; pasó con éxito cuando devolvimos una constante. |
| 12 | cruzando mes > escribe septiembre entero | Pasa por la razón equivocada | Valida la ortografía de septiembre, pero enmascarado por la hora de mediodía de `f()`. |
| 13 | cruzando año > agrega el año a los dos extremos | Pasa por la razón equivocada | Oculta el bug del Caso 3, donde el 1 de enero retrocedió a diciembre del año anterior. |
| 14 | cruzando año > cuenta días del salto de año | Pasa con una constante / Aserción ciega | Solo evalúa `.dias.toBe(2)`; no valida si los años en la etiqueta son consistentes. |
| 15 | meses en minúscula > `2026-01-10` | Protege algo de verdad | Verifica que el mes 0 mapee a «enero» en minúscula sin abreviaciones. |
| 16 | meses en minúscula > `2026-04-10` | Protege algo de verdad | Verifica que el mes 3 mapee a «abril» en minúscula sin abreviaciones. |
| 17 | meses en minúscula > `2026-07-10` | Protege algo de verdad | Verifica que el mes 6 mapee a «julio» en minúscula sin abreviaciones. |
| 18 | meses en minúscula > `2026-11-10` | Protege algo de verdad | Verifica que el mes 10 mapee a «noviembre» en minúscula sin abreviaciones. |
| 19 | entradas inválidas > rechaza fecha ilegible | Protege algo de verdad | Protege el contrato defensivo lanzando excepción ante fechas `NaN`. |
| 20 | entradas inválidas > rechaza término anterior | Protege algo de verdad | Protege la regla de dominio evitando duraciones negativas o rangos invertidos. |
| 21 | acepta Date o string > da lo mismo Date | Pasa con una constante / Incompleto | Pasó con la constante `'del 4 al 9 de mayo'`; no valida la propiedad `.dias`. |
| 22 | acepta Date o string > da lo mismo ISO completo | Pasa por la razón equivocada / Constante | Usa `12:00:00Z` en el string replicando el sesgo del helper y solo evalúa la etiqueta. |

---

## 4. Arreglo de la función (`rango-de-dias.ts`)

Se mantuvo la firma intacta:

```ts
export function rangoDeDias(desde: string | Date, hasta: string | Date): RangoDeDias
```

El autor original ya había establecido que:

> «Los días corridos se cuentan sobre el instante, sin pasar por la zona: dos fechas de calendario consecutivas siempre difieren en 24 h exactas.»

La contradicción residía en que `diaDe`, `mesDe` y `anioDe` convertían ese instante a `America/Santiago`, restándole 4 horas y haciendo retroceder el día civil.

El arreglo consistió en sustituir `toLocaleDateString` por los métodos nativos de UTC (`getUTCDate()`, `getUTCMonth()`, `getUTCFullYear()`). Esto alinea la extracción de componentes con la representación de fechas calendario de MongoDB y con el conteo de días.

---

## 5. Reingeniería de la suite y prueba de mutación

**Criterio aplicado:**

- **Eliminación del helper `f()` sesgado:** las fechas ahora se evalúan en medianoche UTC (`00:00:00.000Z`) o mediante strings ISO estándar (`YYYY-MM-DD`).
- **Aserciones de objeto completo:** todos los tests de reglas de negocio ahora evalúan `{ etiqueta, dias }` íntegramente con `toEqual()`.
- **Incorporación formal de regresión:** los 3 casos reales de producción quedaron incorporados en la suite permanente.
- **Prueba de fuego (mutation testing):** al reintroducir a propósito el bug en `rango-de-dias.ts`, 16 de los 18 tests de la nueva suite fallaron de inmediato, confirmando su capacidad para detectar regresiones de zona horaria.

> Evidencia capturada en `evidencia/salida-bug-reintroducido.txt`.

---

## 6. Anticipar: huecos conocidos que aún persisten

1. **Objetos `Date` instanciados con horas locales nocturnas.** Si un consumidor externo genera `new Date(2026, 7, 17, 23, 0)` en una máquina con UTC-4, el instante pasa a ser 03:00 UTC del día 18. Al extraer con `getUTCDate()`, se leerá el día 18. Se asume que las fechas provienen normalizadas en UTC o en cadenas sin hora.

2. **Desacople en tramos con horas dispares.** Si se proveen horas dispares (por ejemplo, 23:30 de un día a 00:30 del siguiente), el cálculo en milisegundos (`UN_DIA`) puede redondear a 1 día corrido mientras que la etiqueta cruzará dos días calendario.

3. **Formatos de fecha regionales.** Strings no estándar como `'17/08/2026'` no son procesados de forma determinista por `new Date()`.

---

## Cómo reproducir los resultados

```bash
# Instalar dependencias
npm install

# Correr toda la suite corregida (debe estar 100% en verde)
npx jest
```
