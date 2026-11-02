# Resolución del challenge CH-DEV-SS-05: «La suite en verde sobre un bug en producción»

**Cargo:** Desarrollador Backend y Automatización — Tooltips SpA
**Postulante:** Benjamín Alonso Carmona Vega
**Fecha:** 2 de noviembre de 2026
**Alcance:** bug de formateo de tramos de días en la función `rangoDeDias`

---

## Dónde está cada entregable

| Entregable pedido | Ubicación |
| --- | --- |
| Test que reproduce el bug, fallando antes del arreglo | `resolucion/bug-produccion.spec.ts` · salida en `resolucion/evidencia/salida-antes.txt` |
| Tabla con los 22 tests clasificados | Sección 3 de este documento |
| Función corregida | `resolucion/rango-de-dias.ts` |
| Suite final y salida de la corrida | `resolucion/rango-de-dias.spec.ts` · `resolucion/evidencia/salida-final.txt` |
| Prueba de que la suite nueva atrapa el bug | `resolucion/evidencia/salida-bug-reintroducido.txt` |
| Huecos conocidos | Sección 6 |
| Lo que no alcancé a hacer | Sección 7 |

## Estructura del repositorio y cómo ejecutar

- **En la raíz:** los tres archivos originales entregados por Tooltips (`casos-de-produccion.md`, `rango-de-dias.ts`, `rango-de-dias.spec.ts`), sin modificar, para trazabilidad. **La función de la raíz es la original, con el bug.**
- **En `resolucion/`:** el proyecto ejecutable (`package.json`, configuración de TypeScript y Jest), la función corregida, la suite final y la carpeta `evidencia/`.

```bash
cd resolucion
npm install
npx jest
```

---

## Nota sobre el enunciado

El correo y el enunciado describen un «cálculo de descuentos sobre una liquidación», pero los tres archivos descargables corresponden a `rangoDeDias`, la función que arma la etiqueta de un tramo de días. La cantidad de tests (22) y de casos reales (3) coincide con lo descrito, y la descripción de los materiales en el mismo portal habla de «la etiqueta que sale en la pantalla y en el PDF». Por eso asumí que el párrafo introductorio quedó de otra versión del desafío y apliqué los seis puntos sobre los archivos entregados.

## Declaración de uso de herramientas de IA

Las reglas permiten usar IA siempre que se declare. Usé dos herramientas:

- **Claude (Anthropic):** me explicó los conceptos necesarios (instante frente a fecha de calendario, zonas horarias, cómo juzgar si un test protege algo), propuso el plan de trabajo y los experimentos, me dio el esqueleto del primer test, y revisó mi repositorio y este documento. Sus observaciones sobre mis errores (por ejemplo, un experimento cuya constante coincidía con lo esperado por dos tests) las corregí yo.
- **Google AI Studio:** lo usé para contrastar hipótesis de fallo, diseñar los experimentos de mutación y analizar el efecto de las zonas horarias en un CI frente a un equipo local.

Los comandos los ejecuté yo en mi entorno Linux local (Bazzite), inspeccioné cada salida de Jest y verifiqué los resultados contra los casos de producción.

---

## 1. El test que reproduce el bug (fallando antes del arreglo)

`bug-produccion.spec.ts` reproduce los tres casos reales con las entradas tal como vienen de Mongo (`T00:00:00.000Z`) y afirma el resultado de la columna «Correcto»:

- **Caso 1:** licencia médica TT-2026-00471 (17 al 28 de agosto).
- **Caso 2:** feriado legal de septiembre (1 al 15 de septiembre).
- **Caso 3:** permiso de un día, 1 de enero de 2027.

Contra la función original, los tres fallan **por la razón correcta**: el `Received` coincide con lo que mostró la pantalla en producción.

```text
FAIL ./bug-produccion.spec.ts
  ✕ Caso 1: Expected "del 17 al 28 de agosto", Received "del 16 al 27 de agosto"
  ✕ Caso 2: Expected "del 1 al 15 de septiembre", Received "del 31 de agosto al 14 de septiembre"
  ✕ Caso 3: Expected "el 1 de enero", Received "el 31 de diciembre"
Tests: 3 failed, 3 total
```

Salida completa en `resolucion/evidencia/salida-antes.txt`.

**Causa raíz.** `diaDe`, `mesDe` y `anioDe` leían el instante en `America/Santiago` (UTC-4 en invierno, UTC-3 en verano). Una fecha guardada a medianoche UTC es, en Chile, las 20:00 o 21:00 del día anterior, así que el día retrocedía. El conteo de días nunca falló porque se calcula sobre el instante, sin pasar por la zona.

---

## 2. Por qué la suite original no lo atrapaba

Convivían tres problemas de tipos distintos. Los comprobé con experimentos, no solo leyendo los nombres.

1. **Datos de prueba que nunca tocan la zona del error.** El helper `f()` construía todas las fechas a las 12:00 UTC (`T12:00:00.000Z`), que en Chile son las 08:00 o 09:00 del mismo día. La zona ciega del bug es de 00:00 a unas 03:59 UTC, y ningún test pasaba por ahí. *Experimento:* cambié `'America/Santiago'` por `'UTC'` en las tres funciones y los 22 tests siguieron en verde, es decir, la suite era indiferente a la zona horaria.
2. **Aserciones que no miran lo que está roto.** 7 de los 22 tests comprueban solo `.dias`, que nunca falló, y ignoran `.etiqueta`. *Experimento:* forcé la función a devolver `etiqueta: 'ETIQUETA_ROTA'` y esos 7 siguieron en verde.
3. **Nombres que prometen más de lo que verifican.** Los tests 21 y 22 («da lo mismo pasar un Date» y «da lo mismo pasar el ISO completo») nunca comparan una forma de entrada contra la otra: cada uno prueba una sola, ambos con las 12:00Z, y solo miran `.etiqueta`.

Además, la suite nunca probó el contrato real de los datos (fecha de calendario guardada como medianoche UTC): probó reglas de ortografía aisladas.

---

## 3. Clasificación de los 22 tests originales

Las categorías son las del enunciado: **protege algo de verdad**, **pasa por la razón equivocada** (pasa, pero no por lo que su nombre dice) y **aserción ciega** (no miraría la etiqueta rota). La última columna dice qué hice con cada uno.

| # | Test original | Clasificación | Justificación | Destino |
| --- | --- | --- | --- | --- |
| 1 | un solo día > lo escribe sin «del … al …» | Razón equivocada | Pasa por el sesgo de las 12:00Z; con medianoche UTC retrocede al día anterior. | Reescrito (medianoche UTC, objeto completo) |
| 2 | un solo día > cuenta 1 día | Aserción ciega | Solo evalúa `.dias`; pasó intacto con la etiqueta rota. | Borrado (el #1 ya verifica `dias: 1` con `toEqual`) |
| 3 | un solo día > no le pone cero adelante | Razón equivocada | Sesgado por las 12:00Z; a medianoche UTC habría mostrado el 2 de agosto. | Reescrito |
| 4 | mismo mes > nombra el mes una sola vez | Razón equivocada | Es el caso 1 de producción; las 12:00Z ocultaron el desfase. | Reescrito |
| 5 | mismo mes > cuenta los dos extremos | Aserción ciega | Solo evalúa `.dias`. | Borrado (el conteo queda cubierto por los tramos con `dias` verificado) |
| 6 | mismo mes > mes completo | Razón equivocada | Con medianoche real retrocede al mes anterior. | Reescrito |
| 7 | mismo mes > febrero normal tiene 28 | Aserción ciega | Prueba aritmética de `Date`, no la lógica de negocio. | Borrado |
| 8 | mismo mes > febrero bisiesto tiene 29 | Aserción ciega | Igual: calendario gregoriano de JavaScript, ignora la etiqueta. | Borrado |
| 9 | cruzando mes > nombra los dos meses | Razón equivocada | Oculta el caso 2, que mostró agosto en un tramo de septiembre. | Reescrito |
| 10 | cruzando mes > mes de 30 | Aserción ciega | Solo evalúa `.dias`. | Borrado |
| 11 | cruzando mes > pasando por febrero | Aserción ciega | Solo evalúa `.dias`. | Borrado |
| 12 | cruzando mes > escribe septiembre entero | Razón equivocada | Valida ortografía, enmascarado por las 12:00Z. | Borrado (cruzar de mes queda cubierto por el #9) |
| 13 | cruzando año > agrega el año a los dos extremos | Razón equivocada | Oculta el caso 3, donde el 1 de enero retrocedió a diciembre. | Reescrito |
| 14 | cruzando año > cuenta días del salto de año | Aserción ciega | Solo evalúa `.dias`. | Borrado (cruzar de año queda cubierto por el #13) |
| 15 | meses > `2026-01-10` | Protege algo de verdad | Verifica que el mes 0 se escriba «enero». | Conservado (medianoche UTC) |
| 16 | meses > `2026-04-10` | Protege algo de verdad | Verifica «abril». | Conservado |
| 17 | meses > `2026-07-10` | Protege algo de verdad | Verifica «julio». | Conservado |
| 18 | meses > `2026-11-10` | Protege algo de verdad | Verifica «noviembre». | Conservado |
| 19 | inválidas > fecha ilegible | Protege algo de verdad | Protege el rechazo de fechas `NaN`. | Conservado |
| 20 | inválidas > término anterior al inicio | Protege algo de verdad | Protege la regla de dominio contra rangos invertidos. | Conservado |
| 21 | Date o string > da lo mismo un Date | Razón equivocada (falso contrato) | No compara `Date` contra string; solo mira `.etiqueta` a las 12:00Z. | Reescrito («acepta objetos Date») |
| 22 | Date o string > da lo mismo el ISO completo | Razón equivocada (falso contrato) | Usa `12:00:00Z`, replicando el sesgo del helper; solo mira `.etiqueta`. | Reescrito («acepta cadenas ISO completas») |

**Costo asumido al borrar.** Con los borrados dejé de tener tests explícitos de año bisiesto, de mes de 30 días y de salto de año con `dias: 2`. Lo acepté porque esos tests verificaban aritmética de `Date` y no la lógica de la función, y porque el conteo sigue protegido por los tramos que verifican `dias` completo (1, 12, 31, 7, 9, 6). Si el conteo se rompiera en un borde específico, esta suite podría no verlo.

---

## 4. Arreglo de la función

**Firma intacta:** `rangoDeDias(desde: string | Date, hasta: string | Date): RangoDeDias`.

**Decisión de contrato.** La entrada representa una **fecha de calendario** (un día civil) guardada por convención como medianoche UTC (`00:00:00.000Z`), que es como están los documentos de Mongo (verificados con `mongosh` según el documento de casos). La hora no determina nada en una licencia o un feriado legal.

**Alternativa descartada: normalizar a `America/Santiago`.** Proyectar `2026-08-17T00:00:00.000Z` a Chile da las 20:00 del 16, que es exactamente el bug. Para que funcionara, habría que sumar el desfase a cada fecha antes de leerla, con la complicación del horario de verano.

**Evidencia a favor del contrato UTC.** El propio comentario de la función dice que «dos fechas de calendario consecutivas siempre difieren en 24 h exactas», y eso solo es cierto en UTC (en Santiago, con horario de verano, hay días de 23 y 25 horas). El autor ya razonaba en UTC para contar; solo la etiqueta leía en otra zona.

**El arreglo.** Sustituí `toLocaleDateString` con `timeZone: 'America/Santiago'` por `getUTCDate()`, `getUTCMonth()` y `getUTCFullYear()`. Así el conteo y la etiqueta leen el instante en la misma zona.

**Riesgo no verificable.** Las tres llamadas a la función no se entregan. Si alguna pasa instantes reales (por ejemplo, un `Date` creado con hora local) en vez de fechas de calendario, ese contrato no se cumple. Está en la sección 6.

---

## 5. Reingeniería de la suite

**Resultado:** 18 tests en `rango-de-dias.spec.ts` (más los 3 de `bug-produccion.spec.ts`), todos en verde con la función corregida (`evidencia/salida-final.txt`).

**Qué cambié y por qué:**

1. **Reemplacé el helper `f()`.** Ahora fija `T00:00:00.000Z`: los datos de prueba pasan por el borde exacto donde vive el bug, que es como llegan los datos de Mongo.
2. **Aserciones de objeto completo.** Todos los tests de formato comparan `{ etiqueta, dias }` con `toEqual`, de modo que no se puede romper una parte sin que alguno falle.
3. **Casos reales como regresión permanente.** Los tres están en la suite principal. `bug-produccion.spec.ts` se conserva además como evidencia histórica del rojo inicial, por eso hay tres casos duplicados a propósito.
4. **Un test nuevo:** acepta fechas cortas `YYYY-MM-DD`, que JavaScript interpreta como medianoche UTC y reproducen el bug original.
5. **Borré** los tests que solo miraban `.dias` o probaban aritmética de `Date` (tabla de la sección 3).

**Prueba de que la suite atrapa el bug.** Reintroduje a propósito el bug en `rango-de-dias.ts` y corrí la suite: **16 de los 18 tests fallaron** (los 2 que pasan son los de validación, que fallan antes de leer la fecha, y eso es correcto). Evidencia en `evidencia/salida-bug-reintroducido.txt`.

---

## 6. Huecos conocidos que siguen existiendo

1. **La suite depende de la zona horaria del equipo que la corre.** Si alguien «arregla» con `getDate()`, `getMonth()` y `getFullYear()` (hora local) en vez de los métodos UTC:
   - con `TZ=UTC` (como corre un CI en la nube) los 21 tests pasan en verde: falso positivo;
   - con `TZ=America/Santiago` fallan 19 de 21.

   Lo comprobé ejecutando ambas corridas. Mitigación recomendada y **no implementada**: correr la suite en al menos dos zonas (por ejemplo `TZ=UTC` y `TZ=America/Santiago`) en el script de tests y en el CI.

2. **Tramos con horas distintas entre inicio y término.** De las 08:00Z del 17 de agosto a las 20:00Z del 18 son 36 horas: `Math.round(36 / 24) + 1 = Math.round(1.5) + 1 = 3`. La etiqueta dice «del 17 al 18 de agosto» (2 días de calendario) pero `dias` vale 3. Es silencioso, y ningún test usa horas distintas.

3. **Cadenas con formato ambiguo o sin zona.**
   - `'03/05/2026'` no lanza error: Node/V8 la lee como 5 de marzo, no 3 de mayo.
   - `'2026-08-17T10:00'` sin `Z` se interpreta en la zona del equipo, así que el resultado cambia según el servidor.

4. **Un `Date` con hora local, o llamadas externas con instantes reales.** `new Date(2026, 7, 17, 23, 0)` en un equipo con UTC-4 es 03:00Z del 18, y la función muestra el 18 en lugar del 17, sin error. No puedo verificar si las tres llamadas que no se entregan pasan fechas de calendario o instantes.

---

## 7. Lo que no alcancé a hacer y cómo lo abordaría

- **Ejecutar la suite en varias zonas dentro del propio repositorio** (cierra el hueco 1): un script `test` que corra Jest con `TZ=UTC` y con `TZ=America/Santiago`, y el mismo paso en el CI.
- **Alinear el conteo con la etiqueta** (cierra el hueco 2): calcular los días con `Date.UTC(año, mes, día)` de cada extremo en vez de restar los instantes, y agregar un test con horas distintas (08:00Z a 20:00Z del día siguiente, esperado: `dias: 2`).
- **Validar el formato de entrada** (cierra el hueco 3): aceptar solo ISO `YYYY-MM-DD` o con `Z`, y lanzar error con cualquier otra cosa, para que lo ambiguo falle con ruido en vez de mostrar una fecha equivocada.
- **Confirmar el contrato con los dueños de las tres llamadas** (hueco 4) antes de tocar cualquier otra cosa.
