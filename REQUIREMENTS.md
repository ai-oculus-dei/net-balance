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
- Una o varias "líneas" a comparar, cada una una categoría + subcategoría (o **Todas** las subcategorías de esa categoría, sumando su balance neto). Se eligen desde un selector modal con el nombre de cada categoría y subcategoría (seleccionado = texto normal, sin seleccionar = atenuado); botón "Seleccionar todas" para elegir las 8 categorías de golpe. Máximo 8 líneas a la vez (techo real de la paleta de colores categórica sin perder distinción por daltonismo).
- Gráfico de serie temporal (una serie por línea, un punto por mes del rango).
- Gráfico de tarta (una porción por línea, con el total neto de todo el rango).
- El mismo color identifica a la misma línea en ambos gráficos.

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

- Cálculo de patrimonio neto (retirado del alcance).
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
