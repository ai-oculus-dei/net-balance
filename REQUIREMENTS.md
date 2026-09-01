# REQUIREMENTS.md — App de Gastos, Ingresos y Objetivos de Ahorro

## 1. Visión general

App web personal (PWA) para dos usuarios (pareja) que permite registrar gastos e ingresos, calcular el "disponible" real de cada mes en función de objetivos de ahorro, y visualizar la evolución de las finanzas. Prioridad: **simplicidad**, fricción mínima al introducir movimientos, y sostenibilidad a largo plazo (sin coste de mantenimiento, sin dependencias frágiles).

## 2. Usuarios y autenticación

- 2 usuarios nominales: Alvaro y Lauri. No hay registro público, solo estas 2 cuentas.
- Autenticación por email + contraseña (Supabase Auth).
- Sesión persistente: login una única vez; el token se mantiene activo en el dispositivo (no se debe pedir credenciales en cada visita, salvo cierre de sesión manual o expiración de larga duración).
- PWA instalable (icono en pantalla de inicio del móvil).

## 3. Modelo de datos: Movimientos

Cada movimiento (gasto o ingreso) tiene:

- `fecha`
- `nombre` (texto libre, ej. "Cena viernes")
- `importe` (positivo = ingreso, negativo = gasto — se usa la misma entidad/tabla para ambos)
- `categoria` / `subcategoria` (ver taxonomía en sección 5)
- `usuario` (Alvaro o Lauri)
- `visibilidad`: `privado` | `compartido` — determina si el otro usuario puede ver este movimiento
- `nota` (opcional)

**Regla clave — balance neto por categoría:** una categoría admite tanto gastos como ingresos (ej. "Restaurantes −100€" + "Restaurantes +80€" de un reembolso = −20€ neto, que refleja el coste real). No existe un mecanismo separado de "reembolso vinculado" ni de liquidación de saldos entre usuarios — todo se resuelve por el neto de la categoría.

**Regla especial — "mes" personalizado (periodo de nómina a nómina):** cada mes de calendario tiene por defecto sus límites normales (día 1 al día 1 del mes siguiente). Cada usuario puede sustituir esos límites marcando la casilla **"Hacer primer día del mes"**, que aparece justo antes del campo Fecha al registrar un ingreso en la subcategoría **Salario** (Finanzas): la fecha y hora exactas de ese movimiento pasan a ser el inicio del mes siguiente al que cae esa fecha (etiqueta decidida al momento de marcar la casilla, sin esperar a la siguiente nómina) — y, automáticamente, el cierre del mes anterior a ese, que pasa a terminar justo en el instante anterior a esa marca (con precisión de hora, no solo de día: si el salario llega a mitad del día, el mes anterior cierra justo antes de registrar ese ingreso). Cada mes se resuelve de forma independiente: si no se marca ninguna nómina que le corresponda, simplemente conserva sus límites de calendario normales — no se ve arrastrado por lo que pase en los meses vecinos. Ejemplo: nómina marcada el 26 de agosto a mediodía → "Septiembre" pasa a empezar en ese instante exacto; si no se marca nada en septiembre, "Septiembre" cierra igualmente el 30 de septiembre a medianoche (su límite normal) y "Octubre" empieza el 1 de octubre sin más. Si además se marca la nómina del 28 de septiembre, esa misma marca fija a la vez el inicio de "Octubre" y el cierre de "Septiembre" en ese instante. Cada usuario tiene su propio calendario, calculado solo a partir de sus propias nóminas marcadas (`usuario_id`) — no se comparte entre los 2 usuarios aunque compartan movimientos. Esta redefinición de "mes" se aplica en toda la app — Inicio (mes en curso), Movimientos (selector de mes) y Visualizaciones (rango Desde/Hasta) — pero no al cálculo de "meses restantes" de un objetivo de ahorro automático (sección 7), que sigue usando meses de calendario para esa estimación de planificación futura. La casilla es editable también al editar un movimiento existente (permite tanto marcarla como desmarcarla).

**Aviso de cierre de mes corto:** al guardar (alta o edición) con la casilla marcada, si el mes que se cerraría como consecuencia quedaría con menos de 20 días de duración, aparece un aviso de confirmación ("Vas a cerrar el mes X con D días. ¿Quieres proceder a cerrarlo?") con botones Sí/No. "No" cancela el guardado sin cambios; "Sí" continúa con el guardado normal.

## 4. Interacción de alta de movimiento (UX)

- Botón flotante **`+`** siempre visible para añadir un movimiento en el mínimo número de pasos posible. Es la interacción más frecuente de la app y debe ser la más cuidada.
- Campos del formulario de alta, con estos valores por defecto (todos editables):
  - **Usuario**: por defecto, el usuario que ha iniciado sesión en el dispositivo. Editable mediante selector, para poder registrar un movimiento a nombre del otro usuario si hace falta.
  - **Fecha**: por defecto, el momento exacto de meter el movimiento. Editable.
  - **Nombre**: campo de texto libre para identificar el movimiento (ej. "Cena viernes").
  - **Categoría / Subcategoría**: selector de la taxonomía cerrada (sección 5).
  - **Importe**: por defecto con signo **negativo** (gasto) preseleccionado. El usuario puede cambiar el signo a positivo (ingreso) dentro de la misma categoría.
- **Código de color por signo**: el importe se muestra en **rojo** cuando es gasto (negativo) y en **verde** cuando es ingreso (positivo), para diferenciar de un vistazo qué se está registrando.
- Principio de diseño: minimizar taps para el caso más común (gasto rápido: categoría + importe + guardar).

## 5. Taxonomía de categorías (cerrada, fija)

| Categoría | Subcategorías |
|---|---|
| Vivienda | Alquiler, Luz, Agua, Gas, Internet, Limpieza, Línea Móvil, Facturas |
| Transporte | Letra Coche, Combustible, Mantenimiento, Seguro Coche, TTP, Taxi/Uber, Parking, Peaje |
| Alimentación | Supermercado, Expendedora, Chino, Comida a Domicilio, Alcohol, Refresco, Café, Restaurantes |
| Salud | Seguro Médico, Farmacia, Peluquería, Higiene, Dentista, Fisioterapia |
| Deporte | Gimnasio, Running, Material Deportivo, Clases de Padel, Partido Padel, Crossfit |
| Ocio | Viajes, Cines, Conciertos, Espectáculos, Actividades, Suscripciones, Videojuegos, Apuestas/Lotería, Libros, Discotecas |
| Compras | Ropa, Electrónica, Muebles, Decoración, Regalos, Juguetes |
| Finanzas | Inversiones, Efectivo, Salario, Paga Extra, Variable, Beneficios, Ingreso Extra, Ahorro, Impuestos |

**Regla especial — "Ingreso real":** de la categoría Finanzas, las subcategorías **Salario, Paga Extra, Variable, Beneficios e Ingreso Extra** cuentan siempre como ingreso real, con signo (base para el cálculo de aportaciones a objetivos, sección 7). **Impuestos, Ahorro, Efectivo e Inversiones** son condicionales: cada una suma al ingreso real solo si su propio balance neto ese mes es positivo (p. ej. una devolución de impuestos, o retirar de Ahorro/Inversiones/Efectivo más de lo aportado). Si el balance de una de estas es negativo, no resta del ingreso real — simplemente no suma nada. Cada subcategoría condicional se evalúa de forma independiente.

Categorías fijas, sin gestión de alta/baja desde la interfaz en la v1 (se editan directamente en código/config si hace falta cambiarlas).

## 6. Gastos fijos

No existe una lista de recurrentes que se generen solos ni una pantalla dedicada: **"gastos fijos" es el balance neto (gasto − ingreso) del mes de un conjunto cerrado de subcategorías**, marcadas de antemano en la taxonomía (columna `es_gasto_fijo` en `subcategorias`):

Alquiler, Luz, Agua, Gas, Internet, Limpieza, Línea Móvil, Letra Coche, Combustible, Seguro Coche, Facturas, Supermercado, Seguro Médico, Crossfit, Gimnasio, Clases de Padel, Suscripciones, Electrónica.

Cada movimiento normal (alta rápida) que caiga en una de estas subcategorías cuenta automáticamente como gasto fijo ese mes — no hace falta marcarlo aparte ni configurar nada por movimiento.

## 7. Objetivos de ahorro (individuales, no compartidos)

Dos tipos de objetivo, cada usuario gestiona los suyos:

**a) Acumulativo** (ej. Vacaciones)
- Importe meta + fecha objetivo → barra de progreso (acumulado / meta).
- No se resetea mensualmente, el saldo se acumula.
- Modo de aportación configurable por objetivo:
  - **Automático**: el sistema calcula el % de ingreso real necesario cada mes para alcanzar la meta en la fecha marcada.
  - **Manual**: el usuario fija el % y la meta es solo referencia visual (sin garantía de llegar a tiempo).

**b) Recurrente** (ej. Ocio)
- % fijo de ingreso real / mes.
- Se resetea cada mes (no acumula remanente).
- Funciona como tope de gasto para ese mes.

**Cómo se acumula de verdad (`acumulado` / barra de progreso):** el % o importe calculado en "Automático"/"Manual" es solo el **objetivo del mes** (lo que se muestra como "Ahorrar este mes" en Objetivos/Inicio) — no mueve la barra por sí solo. La barra sube únicamente cuando el usuario registra un **gasto real en la subcategoría "Ahorro"** (Finanzas) y, al darlo de alta, elige a qué objetivo de ahorro destinarlo (total o parcialmente): ese importe se suma al `acumulado` del objetivo elegido. Editar o borrar ese movimiento ajusta (o revierte) la barra en consecuencia. No existe ningún proceso automático de "cierre de mes" que sume el objetivo del mes al acumulado — la aportación real siempre es una acción explícita del usuario, ligada a un movimiento de dinero de verdad.

**Aviso informativo en el alta de movimiento:** al elegir la subcategoría "Ahorro" o "Inversiones", se muestra un mensaje breve y no intrusivo recordando que un gasto en esas subcategorías es un traspaso a otra cuenta propia (no dinero perdido), aunque aparezca en rojo en el balance.

## 8. Cálculo de disponible

```
Disponible = Ingreso real del mes − Gastos fijos del mes − Aportaciones a objetivos del mes
```

- Si el resultado es negativo: reducción automática y proporcional de las aportaciones a objetivos de ese mes (entre todos los objetivos activos, a prorrata) hasta que el disponible sea ≥ 0.

## 9. Visualización

**Página de Inicio:**
- **Métricas del mes**: grid de 2 columnas, en este orden — Ingreso real / Gastos totales (Gastos fijos + Gastos variables), Gastos fijos / Gastos variables, Balance neto (todo lo ingresado menos todo lo gastado, sin excluir nada) / Operating margin ((Ingreso real − Gastos fijos) / Ingreso real × 100), Ahorro total / Inversión total, Tasa de ahorro (Ahorro total / Ingreso real × 100) / Tasa de inversión (Inversión total / Ingreso real × 100).
  - **Ahorro total** e **Inversión total**: un gasto (importe negativo) en esas subcategorías es dinero que de verdad se guarda/invierte; un ingreso (positivo) es una retirada de vuelta a la cuenta de gastos. Se invierte el signo para que "ahorrar de verdad" se vea en positivo.
  - **Colores de Tasa de ahorro**: verde si > 30%, rojo si < 20%, blanco (neutro) entre 20% y 30%.
  - **Colores de Tasa de inversión**: verde si > 15%, rojo si ≤ 15% (sin zona neutra).
- **Este mes**: balance neto de cada subcategoría con movimientos ese mes, agrupado por categoría (solo las que han tenido actividad, no las 60 siempre).
- Progreso de cada objetivo de ahorro (acumulado vs meta / % de presupuesto recurrente usado).
- Vista combinada: movimientos propios + movimientos compartidos visibles del otro usuario.

**Página "Visualizaciones" (comparador libre):**
- Rango de meses (selector "Desde" / "Hasta", tipo mes/año).
- **Métricas** y **Resumen Categorías**: los mismos bloques que en Inicio (grid de métricas y balance neto por categoría/subcategoría), pero calculados sobre el rango de meses elegido en vez del mes en curso.
- Una o varias "líneas" a comparar, cada una una categoría + subcategoría (o **Todas** las subcategorías de esa categoría, sumando su balance neto). No hay desplegables: el botón "+ Añadir categoría" activa un modo de selección en el que los propios nombres de **Resumen Categorías** (arriba) se vuelven pulsables — seleccionado = texto normal + punto de color, sin seleccionar = atenuado. Botón "Seleccionar todas" para elegir las 8 categorías de golpe. Máximo 8 líneas a la vez (techo real de la paleta de colores categórica sin perder distinción por daltonismo).
- Gráfico de serie temporal (una serie por línea, un punto por mes del rango) y gráfico de tarta (una porción por línea, con el total neto de todo el rango). El mismo color identifica a la misma línea en ambos gráficos.
- Cada gráfico tiene un botón "Pantalla grande" (esquina superior derecha) que lo amplía a pantalla completa; en móvil en vertical se rota 90° para aprovechar el lado largo de la pantalla como ancho del gráfico. Sigue siendo interactivo (tooltips, puntos) igual que en tamaño normal.

## 10. Estilo visual

- **Temas**: Claro y Oscuro, seleccionables por el usuario. La app recuerda la última preferencia elegida (no hay un tema por defecto fijo; se persiste por usuario/dispositivo).
- **Inspiración**: lenguaje visual de webs de visualización financiera tipo finviz.com — paleta de color, tipografía compacta/funcional, estética de terminal financiero.
  - **No** se traslada el nivel de densidad de información de finviz (tablas muy comprimidas, muchos datos simultáneos). La app mantiene el principio de simplicidad (sección 1): solo se adopta el lenguaje visual, no la densidad.
- **Código de color rojo/verde**: consistente en toda la app, no solo en el formulario de alta (sección 4). Se aplica también a gráficos, balances por categoría y cualquier cifra con signo:
  - Rojo → gasto / valor negativo
  - Verde → ingreso / valor positivo

## 11. Prerrequisitos antes de empezar a construir

Antes de montar el proyecto, pedir al usuario lo siguiente (no asumir ni generar valores):

1. **Repositorio GitHub**: crear un repositorio vacío en GitHub (botón "New repository") y hacer `git clone` en local, dando a Claude Code acceso a esa carpeta ya conectada al repo. Alternativa: si se dispone de `gh` CLI autenticado, Claude Code puede crear el repo él mismo (`gh repo create`) sin este paso manual.
   - Requisito previo en la máquina local: `git` instalado y autenticación contra GitHub configurada (clave SSH registrada, `gh auth login`, o token de acceso personal). Sin esto, Claude Code no puede hacer `git push` aunque genere el código correctamente.
2. **Proyecto de Supabase**: el usuario debe crear un proyecto nuevo en supabase.com y facilitar:
   - `Project URL`
   - `anon/public API key` (segura para el frontend; la protección real la da Row Level Security)
3. **GitHub Pages**: confirmar que Pages está activado en el repo (Settings → Pages) y sobre qué rama/carpeta debe publicar.
4. **Credenciales de los 2 usuarios**: email de Alvaro y email de Lauri, para crear las cuentas en Supabase Auth.

**Nunca pedir ni usar la `service_role key` de Supabase** — es secreta, da acceso total saltándose Row Level Security, y no debe usarse en el frontend ni en el repositorio público.

## 12. Arquitectura técnica

- **Frontend**: Web app (PWA), instalable, alojada en GitHub Pages (dominio `*.github.io` por defecto, sin dominio propio).
- **Backend/BBDD**: Supabase (Postgres + Auth + Row Level Security). GitHub Pages es hosting estático puro y no puede alojar base de datos ni lógica de servidor — Supabase actúa como backend separado.
- **Autenticación**: Supabase Auth, email + contraseña, sesión persistente.
- **Privacidad**: reglas de Row Level Security en Postgres para:
  - Restringir el acceso a solo los 2 usuarios (Alvaro y Lauri).
  - Aplicar la regla de visibilidad `privado`/`compartido` por movimiento.
- **Control de versiones**: repositorio Git en GitHub. Historial de commits/tags como registro de versiones.
- **Gestión de tareas**: fichero `TODO.md` en la raíz del repo, mantenido actualizado con las tareas pendientes de implementación.

## 13. Fuera de alcance (v1)

- Sincronización bancaria automática / open banking.
- Liquidación de saldos entre usuarios (tipo Splitwise).
- Gestión de altas/bajas de categorías desde la interfaz.
- Notificaciones/recordatorios.
- Exportación de datos.
- Multi-moneda.
- Dominio propio.

## 14. Pendiente de definir (no bloqueante para empezar)

- Nivel de agregación de las series temporales (semana/mes/año).
- Edición/borrado de movimientos históricos (asumir CRUD estándar salvo que se indique lo contrario).
- Backup/exportación de la base de datos.

## 15. Patrimonio (posiciones de inversión)

Página aparte ("Patrimonio"), completamente independiente del flujo de caja de Movimientos: no crea ni depende de ningún movimiento.

**Posiciones**: cada una tiene Tipo (uno de 9 fijos: Stock, ETFs, Fondo Indexado, Fondo Monetario, Cuenta Remunerada, Cuenta de Ahorro, Commodity, Cuenta Corriente, Criptomoneda), Nombre, Tickr y Mercado (solo relevantes para los tipos "por unidad", ver abajo), Cantidad, Precio de compra, Precio actual, y Fecha de compra. P&L € y P&L % son siempre calculados (nunca almacenados): `P&L € = Precio actual total − Precio de compra total`, `P&L % = P&L € / Precio de compra total × 100` (null si el coste de compra es 0).

**Grupo de agrupación** — calculado siempre a partir del Tipo, nunca un campo propio:
- Renta Variable = Stock + ETFs + Fondo Indexado + Commodity + Criptomoneda
- Renta Fija = Fondo Monetario + Cuenta Remunerada + Cuenta de Ahorro
- Efectivo = Cuenta Corriente

**Tipos "por unidad" vs "de saldo"**: Stock, ETFs, Fondo Indexado, Commodity y Criptomoneda tienen Cantidad real y Tickr/Mercado con sentido — el formulario permite introducir el precio de compra y el precio actual como Total o Por unidad (toggle), convirtiendo internamente entre ambos. Fondo Monetario, Cuenta Remunerada, Cuenta de Ahorro y Cuenta Corriente son posiciones "de saldo": Cantidad fija en 1, sin Tickr/Mercado, un único valor (el total).

**Precio actual — automático para Stock/ETF/Fondo Indexado/Commodity/Criptomoneda**: una Edge Function de Supabase (`supabase/functions/actualizar-precios-patrimonio`), programada por `pg_cron` dos veces al día (8:00 y 18:00 UTC — ver `supabase/migrations/0011_patrimonio_cron_precios.sql`), actualiza `precio_actual_unitario` de cada posición activa sin `tae` consultando en vivo el ticker guardado — sin ninguna lista intermedia que mantener a mano: se consulta directamente con el ticker de la posición en el momento de la ejecución. Fuentes: **CoinGecko** (gratis, sin clave) para Criptomoneda — el campo Ticker debe ser el **ID de CoinGecko**, no el símbolo bursátil (p. ej. `bitcoin`, no `BTC`); **Twelve Data** (clave gratuita, 800 peticiones/día) para Stock/ETF/Fondo Indexado/Commodity — el Ticker es el símbolo de Twelve Data, y el campo Mercado (opcional) se manda como parámetro `exchange` para desambiguar si el símbolo existe en varias bolsas. El precio siempre se pide en el momento con el ticker que ya tiene la posición: dar de alta una posición nueva no requiere ningún paso de configuración aparte, más allá de escribir el ticker en el formato correcto. Fondo Monetario, Cuenta Remunerada, Cuenta de Ahorro y Cuenta Corriente (posiciones "de saldo") no tienen ticker, así que no entran en esta actualización automática — para las 3 primeras, ver la TAE más abajo; Cuenta Corriente siempre es manual.

**Rentabilidad conocida (TAE) para Fondo Monetario, Cuenta Remunerada y Cuenta de Ahorro**: alternativa al precio actual manual para estos 3 tipos — se fija una TAE (%) una sola vez al dar de alta o editar la posición, y el valor actual se calcula solo por interés simple anualizado, sin depender de ninguna fuente externa: `Valor actual = Precio de compra × (1 + TAE% × días transcurridos desde la fecha de compra / 365)`. Con TAE, `precio_actual_unitario` queda a `null` en la base de datos (una posición siempre tiene uno de los dos, nunca ninguno) — tanto la vista en vivo como el histórico diario (que puede así calcular el valor exacto de cualquier día pasado, no solo aproximarlo con el precio de hoy) usan la misma fórmula. Si más adelante se edita el importe base o la TAE, el cálculo se reinicia desde `fecha_compra` con los nuevos valores — para llevar la cuenta exacta de varias aportaciones a la misma cuenta remunerada en momentos distintos, hay que dar de alta una posición separada por cada una.

**Visibilidad**: las posiciones son siempre privadas por usuario, igual que los Objetivos de ahorro (sección 7) — nunca compartidas entre Alvaro y Lauri.

**Histórico diario**: una vez al día se guarda un snapshot del valor de cada posición activa (tabla `patrimonio_historico`, solo escribible por la función `generar_snapshot_patrimonio`, nunca por el cliente). Se genera al abrir la app (como mucho una vez al día, comprobado por `localStorage`), rellenando hacia atrás cualquier día saltado desde el último snapshot (o desde la fecha de compra si no tiene ninguno) — cada día rellenado hacia atrás usa el precio actual vigente en el momento de generar el backfill, no el valor real que tuviera ese día pasado (limitación conocida, ya que no se guarda un histórico de precios independiente). El snapshot de "hoy", una vez generado, no se reescribe aunque el precio actual cambie después ese mismo día — se actualizará en el snapshot de mañana.

**"Borrar" una posición la archiva** (no la elimina): conserva su histórico ya generado, pero deja de contar en los totales y en el snapshot diario.

**Página**: patrimonio total y desglose por grupo, histórico total del patrimonio (gráfico de una línea), histórico por posición (gráfico multilínea, limitado a las 8 posiciones de mayor valor actual — mismo techo que Visualizaciones, sección 9), y las posiciones agrupadas por Renta Variable/Renta Fija/Efectivo. El botón **+** global abre "Añadir Patrimonio" en vez de "Nuevo movimiento" cuando se está en esta página.
