# Mecca Agenda — contexto del proyecto

**Al día a v104 — 17 de septiembre de 2026.** Antes de escribir, comprueba
la versión real del repo (`APP_VERSION` en `index.html`, línea ~820): este
documento se queda viejo si nadie lo actualiza, y ya pasó una vez que se
pidió construir algo que llevaba veinte versiones hecho.

Léelo entero antes de tocar nada. Aquí está por qué el proyecto es como es,
y qué ya salió mal antes. Varias de las reglas de abajo se escribieron con
el app caído.

---

## 1. Qué es esto y para quién

App de seguimiento de obra de **Mecca Residence**, una torre de 11
apartamentos en Santiago de los Caballeros, República Dominicana. La usa
**Bridex Comercial, S.R.L.**

El usuario principal es **Ing. Nilson Enrique Morales Reyes**, Gerente
General. La usa **desde un iPad y un iPhone, parado en la obra, con polvo
y sol**. No desde un escritorio.

Eso manda sobre todo el diseño:

- Los botones se tocan con el dedo: **mínimo 40px de alto**.
- Nada puede desbordar el ancho de la pantalla. Si una tabla es ancha,
  hace scroll **dentro de su propio contenedor**, no la página.
- Los textos van en **español de obra**, no en jerga de programador.
  «Falta», «Completada», «Sin cambios», «Vencidas». No «status», no «commit»,
  no «sync».
- Si algo falla, el app **no puede quedarse en blanco**. Un error de red
  no puede dejar a un ingeniero sin su lista en medio de un recorrido.

Hay otros usuarios: ingenieros residentes y de apoyo, con permisos más
limitados (`canEdit()`, rol `view`).

---

## 2. Arquitectura — cuatro piezas, ningún servidor propio

```
  iPad / iPhone
       │
       ▼
  GitHub Pages  ──────►  Supabase (Postgres + PostgREST)
  index.html               la base de datos, sin backend propio
  sw.js
       │
       ▼
  Cloudflare Worker  ──►  Workers AI (Whisper + Mistral)
  mecca-agenda-api         voz → texto → orden
```

**GitHub Pages** — `nilsonemorales-sketch/mecca-agenda`, rama `main`.
Publicar es hacer push: GitHub sirve la versión nueva en 1-2 minutos.
No hay build, ni bundler, ni npm. Lo que está en el repo es lo que corre.
**Solo se publica `main`.** No se puede pedir al usuario que pruebe desde
una rama: esa URL no existe.

**Supabase** — proyecto `qeurcozssghkqgezilfj`. Se le habla por PostgREST
con la llave pública (anon), que está en el `index.html` porque el app es
estático y no tiene dónde esconderla. **No hay servidor intermedio.**

**Cloudflare Worker** — `worker/worker.js`, nombre `mecca-agenda-api`.
Dos puertas: `POST /api/transcribir` (audio → texto, Whisper) y
`POST /api/entender` (texto → orden, Mistral). Existe porque el
reconocedor de voz del navegador **se congelaba en el iPhone**; grabar
audio sí lo hace bien cualquier teléfono.
Corre gratis debajo de las 10,000 neuronas diarias que regala Cloudflare
(≈3 horas y media de dictado al día).

**Google Apps Script** — `driveUpload.gs`, para subir fotos a Drive.

### Secretos — dónde NO están

- La clave del Worker (`CLAVE_APP`) es un secreto de Cloudflare y está
  espejada en la tabla `obra_config` de Supabase. **No está en el repo y
  no debe estarlo nunca.** El app la lee de `obra_config` al arrancar
  (`cargarVozApi()`).
- El token de GitHub vive fuera del repo.
- **Nunca metas una llave, un token ni una contraseña en el código.**
  El repositorio es público.

---

## 3. El repositorio

| Archivo | Qué es |
|---|---|
| `index.html` | **El app entero.** ~21,100 líneas, 1.36 MB. HTML, CSS y JS en un solo archivo. |
| `sw.js` | Service worker. 61 líneas. **Pieza frágil, ver §5.** |
| `worker/worker.js` | El Worker de Cloudflare (voz e inteligencia). |
| `worker/wrangler.toml` | Configuración del Worker. |
| `driveUpload.gs` | Script de Google para subir fotos a Drive. |
| `migrate-fotos.js` | Script de migración, de una sola vez. |
| `bridex-logo.png` | Logo para los PDF. |
| `bridex-marca.png` | La marca de Bridex dentro del app (v70). |
| `icono-app.png`, `icono-180.png` | El icono de la app en la pantalla de inicio (v74). |
| `CLAUDE.md`, `README.md`, `LICENSE`, `.gitignore` | Este documento y lo de siempre. |

**Un solo archivo es una decisión, no un descuido.** No lo partas, no
crees archivos nuevos, no metas un bundler. GitHub lo entrega comprimido:
son 346 KB por la red, en 0.12 segundos. El peso real del arranque son los
datos, no el código.

---

## 3.5 Dónde vive cada cosa — mapa del app

Antes de construir una pantalla, busca si ya existe. Este mapa está al día
a **v104 (17 sep 2026)**. Si lo que vas a hacer se parece a algo de aquí,
**amplíalo en su sitio; no lo hagas otra vez en otra pestaña.**

El menú es: **Obra · Actividades · Equipo · Reportes · Fotos · Planos ·
Compras · Bitácora · Gerencia · Partidas · Metodología.** *Partidas* es un
módulo de PRUEBA y solo lo ve el administrador — ver «El Catálogo de
partidas» más abajo. El app **abre en Obra**
desde v88: se usa de pie en la obra, y Obra pregunta dónde estás en vez de
soltar 1.080 renglones. Actividades queda a un toque en la barra de abajo.

**Si cambias la pantalla de entrada, hay tres sitios, no uno:**
`S.currentTab` en el estado inicial, la clase `active` del `<div class="view">`
en el HTML, y el `goTab(...)` del arranque (justo antes de `loadAll()`) — sin
ese último la barra de abajo no marca ningún botón, porque `updateBNav` solo
se llama desde `goTab`. Y **`loadAll` pinta la pantalla que se está viendo**
(`if(S.currentTab==='terreno') renderTerreno(); else renderActs();`): antes
llamaba solo a `renderActs`, así que con Obra de entrada los datos llegaban y
la pantalla se quedaba en «Cargando la obra…» para siempre.

**Actividades es el corazón y Obra es la cola.** Lo dijo el dueño en una
línea: en Actividades están *todas* las opciones de modificación, registro
y actualización —y sus botones pueden ir plegados, no hace falta verlos de
entrada—; Obra es para la agilidad, el manejo de la información en obra y
un flujo de trabajo fluido. Son dos pantallas con dos trabajos distintos,
no dos pieles de lo mismo.

Dos módulos se retiraron por la misma razón — eran Actividades con otra
cara: **«En Obra» en v77** y **«Hoy» en v84**. Lo de Hoy estaba tres veces
en otro sitio (el plan ya era un filtro de la lista, el edificio es una
vista, la asistencia está en Equipo); lo único suyo era repartir el plan,
y eso se mudó. **No los vuelvas a crear.**

### El módulo Obra (v87) — qué lo hace distinto, y cómo no arruinarlo

Se llama **`terreno`** por dentro: el id `obra` ya es el de Actividades,
heredado de la pestaña «En Obra» retirada. La vista es `view-terreno`, el
contenedor `c-terreno`, el CSS `.ob-*` y las funciones `tr*` / `_tr*`.

La diferencia con Actividades **no es la piel, son tres cosas**:

1. **Abre por contexto, no por lista.** La primera pantalla no enseña ni
   una partida: enseña sitios y contratistas con sus números. Hoy y En Obra
   abrían con una lista larga y pedían filtrarla — por eso sobraban.
2. **La cola se vacía.** Lo que marcas sale de la tarjetería y el contador
   sube (`S._trHechas`, «N marcadas hoy», con «Verlas» para deshacer la
   vista). Actividades no puede hacer eso: es un registro, tiene que seguir
   enseñando la partida mientras cumpla el filtro.
3. **Dos toques hasta registrar.** Sitio (o contratista) → tarjeta con los
   botones ya puestos. El cruce apartamento × contratista es un tercer
   toque opcional, y se calcula sobre la cola **sin** cruce (si no, al
   elegir uno los demás desaparecen y no hay forma de cambiar).

**Las cuatro salidas de una visita** están en la tarjeta, en dos filas de
cuatro: `25% · 50% · 75% · ✓ Completada` y `Sin cambios · +1 sem · Viernes`
(el 🎙️ se fue en v97 con la voz). **Cuatro por fila y no cinco**: a 390px el
quinto deja las etiquetas ilegibles al sol. Por eso en v89 entró el botón de
revisar-sin-cambio y salió «Hoy» —poner la entrega en hoy sobre una partida
que tienes delante es lo que menos se hace de las tres fechas, y sigue
estando en Actividades.

**«Sin cambios» (`trIgual` → `Acciones.revisar`) es la pieza del
seguimiento.** NO toca la actividad —ni estado, ni avance, ni fecha, ni
notas—: solo deja constancia en `obra_cambios` de que alguien la miró. Sin
ese rastro el app sabe qué está vencido pero **no sabe qué ya miraste**, y
cada mañana salen las mismas revueltas: las que resolviste ayer y las que
nadie ha visto en tres semanas, iguales en pantalla. El botón existía desde
v76 —entonces se llamaba «Sigue igual»— pero solo dentro del modo selección
de la lista, y se usó **cero veces en toda la obra**: por eso se trajo a donde
se trabaja.

El atajo **«Sin mirar»** va primero en la portada, antes que «Vencidas»: de
las vencidas la mayoría ya las revisaste; lo que se pierde de vista es lo
que nadie toca hace semanas. Usa `FILTRO_HUECO.congeladas` —el MISMO
criterio que las congeladas de Actividades, `CONGELADA_DIAS`=15— y ordena
con `_ordenCongeladas`. La tarjeta dice **«quieta Nd»** desde 7 días
(`_diasQuieta`). Todo eso necesita `loadTocadasRecientes()`, que Actividades
pedía sola al pintarse: **`renderTerreno` tiene que pedirlo también**, o el
atajo no aparece nunca ahora que Obra es la entrada.

Escribe **todo** por `Acciones`, y cerrar por `marcarActCompletada` — el
mismo camino del ✓ de la lista. `trTodas()` mueve la cola entera reusando
`_correrPlan` / `_correrAplicar`: es lo que más se hace y hasta v86
obligaba a irse a la lista y entrar en modo selección.

**El plan del día vive en la lista**, como pastilla: `Plan hoy N` /
`Plan mañana N` al principio de la fila de filtros (`S.actFiltroPlan`, que
ya existía). Con la pastilla puesta sale `_planBarraHTML()` con **Generar
PDF** y **WhatsApp**. Las partidas del plan son filas normales, con los
mismos botones que cualquier otra.

| Quiero… | Está en |
|---|---|
| Ver y filtrar todas las actividades | **Actividades → Lista** |
| Trabajar un apartamento completo | **Actividades → Por Apto** |
| Ver taller × apartamento | **Actividades → Matriz** |
| Ver el edificio por niveles | **Actividades → Edificio** (v55) |
| **Revisar por contratista** | **Actividades → Revisión** — `renderRevision()`, `revAbrir()` |
| **Poner la obra al día por partida repetida** | **Actividades → Revisión → Por partida** — `revListaPartidas()`, `revPartidaAbierta()` |
| **El panel de un apartamento, por contratista** | Tocar el apartamento en la torre, **en Hoy o en Actividades → Edificio** — `abrirAptoTorre()`, `_recPanelApto()` |
| **Mover fechas en bloque** | Modo selección en la lista, **o** el panel del apartamento por contratista — `_correrPlan()`, `_correrAplicar()` |
| **REGISTRAR rápido, de pie, en la obra** | **Obra** — `renderTerreno()`, `trPct()`, `trListo()`, `trFecha()`, `trCorrer()` |
| **Dejar dicho que la miraste y sigue igual** | **Obra**, botón «Sin cambios» — `trIgual()` → `Acciones.revisar()`. No toca la partida |
| **Lo que nadie ha mirado hace semanas** | **Obra**, atajo «Sin mirar» — `FILTRO_HUECO.congeladas`, `_ordenCongeladas()`, `_diasQuieta()` |
| **Mover TODAS las fechas de un sitio o un contratista** | **Obra**, barra «Todas a…» — `trTodas()` |
| **REGISTRAR con todo el detalle** | **Actividades**, al abrir la fila — `_actFilaRapidaHTML()`, `_actFilaAvanceHTML()` |
| **Agrupar la obra en capítulos, subpartidas y partidas (PRUEBA)** | **Partidas** — `renderCatalogo()`, solo admin. Ver «El Catálogo de partidas» en §3.5 |


**Los botones de registrar son LOS MISMOS en los dos sitios, aunque no
estén en el mismo lugar de la pantalla.** En Obra van siempre a la vista
en la tarjeta; en Actividades van **dentro del pliegue** (`det-`), y salen
al tocar la fila. Los dos escriben por `Acciones` y cierran por
`marcarActCompletada`. Hasta v83 Hoy tenía sus propios controles —un select
de 11px, una casilla de 52px y tres botones diminutos— que además
registraban por otra vía: se aprendía dos veces y en obra no se aciertan.

**En Actividades los botones van PLEGADOS** (`_actFilaRapidaHTML` y
`_actFilaAvanceHTML`, ambos dentro de `det-` desde v87). En v86 estuvieron
siempre a la vista: son seis botones por renglón sobre 1.080 filas y la
lista dejaba de poder leerse. Registrar rápido lo hace Obra, que trabaja
con decenas de tarjetas. **Van dentro de `det-`, nunca fuera**:
`toggleActDet` solo cambia el `display` de esa caja, no repinta — fuera no
aparecerían nunca (v79).

**Nunca repintes la lista entera para cambiar una tarjeta.** Con las 1.080
abiertas, `renderActs()` tarda **~1,1 s** en escritorio y bastante más en el
teléfono. Usa **`_repintarFila(id)`**, que cambia solo esa tarjeta (16 ms
medidos) y devuelve `false` si con el cambio dejaría de cumplir el filtro —
ahí sí hay que repintar de verdad.

**Las cinco pastillas de arriba conmutan** (`_actAtajoHTML`,
`actAtajo`, v87): se ven puestas, se quitan tocándolas otra vez, se
combinan, y **su número es el que vas a ver** — se cuenta llamando a
`applyActFilters(acts, true)` con ese filtro añadido a los que ya están.
Antes hacían `S.actFiltroRapidos=['x']`, no se marcaban, y contaban sobre
`S.acts` entero: con Yelson elegido, «vencidas» decía 326 y al tocarla
salían 85. Si con el filtro puesto no queda nada, la pastilla no se
ofrece. El segundo argumento de `applyActFilters` **solo** salta el
ordenado: ordenar 2.465 filas cinco veces por repintado costaba ~58 ms de
cada toque.

**Contratista y apartamento son pastillas de un toque**
(`_actPillsRapidasHTML`), fuera del panel de Filtros: los seis que más
deben y los apartamentos con trabajo abierto, en `REC_ORDEN`. Filtran por
`personas`, **no** por `contratistas` — ese exige `tipo_personal` y no es
de fiar.

El resto de la explicación: `_actFilaAvanceHTML()`, `actFilaPct()`, `actFilaFecha()`, todo
por `Acciones`. **Cerrar NO está ahí**: lo hace el ✓ verde de la fila, que
está siempre a la vista y a un toque. Una sola forma de cerrar por tarjeta.

### El Repaso por partida repetida (v94) — por qué existe

**El dueño pone la obra al día por PARTIDA REPETIDA, no por apartamento.** Ese
es el modo principal, y el app no sabía hacer esa pregunta.

Las 1.077 abiertas son solo **394 descripciones distintas**: 124 repetidas
cubren **807 partidas**, el 75% de la obra. «Enderezar las llaves de codo de
los aparatos de baño y los fregaderos» está abierta en los **once**
apartamentos, toda de Daniel Espinal. Para actualizarlas había que entrar once
veces —unos 60 toques— y la pregunta es UNA: «¿en cuáles ya está?».

Vive **dentro de Revisión**, como segunda forma de agrupar el nivel 2
(`S.revAgrupar`, **'partida' por defecto**), más un nivel 3 nuevo.

- **Nivel 2** `revListaPartidas` — agrupa por descripción **EXACTA**. Sin
  normalizar y sin recortar **a propósito**: si dos textos difieren son dos
  grupos, y que se vean los dos es lo que destapa los duplicados. Cabecera:
  «138 partidas · 36 preguntas». Las de una sola vez van tras «Sueltas (n)».
- **Nivel 3** `revPartidaAbierta` — una línea por apartamento en `REC_ORDEN`,
  con **Completada · Sin cambios · %**. Los nombres de los dos primeros los
  eligió el dueño y **no se cambian**.

**Por qué NO es la Matriz.** La Matriz agrupa por `Parecido` (difuso), así que
**junta los textos distintos y esconde los duplicados**; solo cubre los once
apartamentos; hace su propia consulta; y para actuar abre el editor completo de
UNA partida. El Repaso agrupa por texto exacto y contesta por apartamento sin
salir de la pantalla.

Cuatro reglas que no se tocan:

- **Los ids del grupo se fijan AL ABRIR** (`S._revPartidaIds`). Si se
  recalcularan, cada una que marcas Completada desaparecería de la pantalla y
  «fecha de una vez» no sabría a cuáles no aplicar.
- **Uno por uno, con su propio catch.** Si una falla, ESA línea se marca en
  rojo (`S._revPtdErr`) y las demás sí se guardan.
- **La fecha de grupo toca `fecha_fin`, no `fecha_plan`.** En todo el app
  «ponle fecha» es la entrega; `fecha_plan` es el plan del día, otra cosa.
  (`Acciones.planificar` escribe `fecha_plan` — no sirve aquí.)
- **«Falta una aquí» SIEMPRE pregunta el apartamento**, aunque quede uno solo
  libre. Elegirlo solo ahorraba un toque y creaba la partida donde el ingeniero
  no la nombró.

**El alta tiene pantalla propia desde v95** (`revAltaAbrir`, `revAltaPantalla`,
`revAltaCrear`, estado en `S.revAlta`). **Cero `prompt()`, `confirm()` ni
`alert()`**: hasta v94 eran tres diálogos del navegador seguidos, y el primero
obligaba a escribir un número. Los apartamentos que le FALTAN a la partida van
primero y marcados «falta aquí»; los demás debajo. Las fechas son los mismos
botones que la fecha de grupo — no se inventa un cuarto juego.
**`_revAltaLeer()` guarda lo escrito antes de cada repintado**: sin eso, tocar
un apartamento borraba la descripción a medio escribir.

*Limitación conocida:* el micrófono llama a `abrirComando()`, que abre la caja
de ÓRDENES y crea la partida por esa vía — **no vuelca el texto en el campo**.
Volcarlo exigiría tocar el motor de voz, que apunta a `#cmd-txt` en nueve
sitios y en el iPhone va por el Worker. No se hizo a ciegas.

### El Catálogo de partidas (v98, v100, v101, v102, v103) — un módulo de PRUEBA que se borra entero

Pestaña **«Partidas»**, `style="display:none"` en el HTML y encendida con
`isAdmin()` en el mismo bloque que Gerencia. Por dentro se llama `catalogo`:
vista `view-catalogo`, contenedor `c-catalogo`, funciones `cat*` / `_cat*`.

**Contesta UNA pregunta**, con las palabras del dueño: *«una prueba para ver
si conviene que el app trabaje de esa manera, para que sea más eficiente dar
seguimiento y no haya tantas actividades que se sientan sueltas»*. No es una
pantalla de trabajo: es un experimento con fecha de caducidad.

#### Tres niveles, y CADA UNO VIENE DE UN SITIO DISTINTO

| Nivel | Qué es | De dónde sale | Cuántos |
|---|---|---|---|
| **1 · Capítulo** | La partida madre del **presupuesto** | `resumenCostos.js` de la app de costos | **46** códigos fijos, en `CAT_CAPITULOS` |
| **2 · Subpartida** | La **línea del presupuesto** | el presupuesto original (`Presupuesto 2-10-2024.xlsx`, hoja «Res. Presupuesto») | **274**, en `CAT_SUBPARTIDAS` |
| **3 · Partida** | Lo que **se hace** en cada apartamento | las descripciones de la **agenda** | ~1.027, una por descripción distinta |

Debajo cuelgan **todas** las actividades.

#### `S.acts` NUNCA trae las completadas — y por eso el catálogo carga lo suyo

**Grábate esto antes de escribir nada que cuente actividades.** `S.acts` se pide
con `estado=neq.completado` en **los tres sitios** que la cargan: el arranque, la
recarga y `loadActsAll` —y este último solo trae todo si `S.actMostrarTodas`
está en `true`, que es **una bandera de la pantalla de Actividades** y además se
apaga sola—.

La v102 escribió `_catTodas(){ return S.acts; }` dando por hecho que ahí estaban
todas. **No estaban**: eran 1.060 de 2.464, y el avance volvía a contar solo lo
que falta, que es exactamente el cero que la v102 venía a quitar.

Desde v103 el catálogo **se paga su propia carga**: `cargarCatalogo()` trae
`S.catActs` con `sbTodo` y **sin filtro de estado**, y `_catTodas()` devuelve eso.
**NO toques la consulta de `S.acts`**: traer las 2.464 en todas las pantallas es
un coste que nadie pidió y en el teléfono se nota.

Tres cosas cuelgan de eso y las tres hacen falta:

- **`_findActAny` mira también en `S.catActs`.** El catálogo es la única pantalla
  que enseña actividades cerradas; sin esto `revEstado` no encontraba una cerrada
  y **se salía en silencio** — el botón parecía muerto y no decía por qué. Lo
  mismo le pasaba a `handleFotoFile`, que buscaba solo en `S.acts`.
- **`'catActs'` está en `COLECCIONES` de `Acciones`**, o el porcentaje de la
  partida no se movía hasta recargar.
- `_catAbiertas()` **se queda**: sigue haciendo falta para decir cuántas faltan.

#### El catálogo mira TODAS las actividades, no solo las abiertas (v102)

Hay **más trabajo cerrado que abierto** —1.404 actividades cerradas contra 1.060
abiertas—, así que con el denominador puesto solo en lo que falta **la torre
entera salía en 0%**. Un porcentaje que siempre dice cero no es un porcentaje.
- Entrar lo cerrado subió las partidas de 391 a **1.027** y los amarres de
  1.060 a **2.464**.
- «Sin clasificar» pasó de 34 partidas a **272** (411 actividades). Casi todas
  son de Ayudante —limpieza de entrega, escombros, subida de materiales— y
  **eso es correcto: no existe línea de presupuesto para limpiar**. **No
  inventes reglas nuevas para vaciar ese bloque**; qué hacer con él lo decide
  el dueño.

#### El avance es CONTEO DE TAREAS, no medición de obra (v102)

```
pct(actividad)     = 100 si está cerrada, si no su porcentaje (0-100)
avance(partida)    = media de pct de SUS actividades
avance(subpartida) = media de pct de TODAS las actividades de sus partidas colgadas
avance(capítulo)   = media de pct de TODAS las actividades del capítulo
```

**Se promedia por actividad, no promediando promedios**: una partida con 30
actividades no puede pesar lo mismo que una con 1. Junto al número va siempre
**`cerradas / total`** — un 74% sin saber si es de 8 o de 466 no dice nada.

**La frase de honradez está en pantalla y no se quita** (`.cat-honradez`): un
capítulo al 74% quiere decir que de sus tareas registradas tres de cada cuatro
están cerradas, **no** que tres cuartas partes de la albañilería estén
construidas. Sin medición ni dinero no se puede decir más con honradez, y si no
está escrito **se lee mal**.

**`_catAvance` devuelve `null` cuando no hay nada**, y la pantalla dice
**«— sin partidas»**. **Cero y vacío no son lo mismo**, y confundirlos es lo que
hace que nadie vuelva a creerle a un módulo.

#### Se clasifica DESDE la subpartida, en bloque (v102)

Hasta v101 se colgaba de una en una: abrir la ficha, buscar en un `<select>` de
85 opciones, salir, volver a entrar. **Con 1.027 partidas eso no lo hace nadie**,
y por eso el dueño decía que el módulo no era funcional.

**«Buscarle sus partidas»** (`catBuscarPartidas`) abre la lista de las partidas
del mismo capítulo que no cuelgan de nadie, **ordenadas por parecido de nombre**,
con casilla cada una y **«Colgar las N marcadas»** abajo.

- **NADA SE MARCA SOLO.** El dueño rechazó expresamente colgar en bloque y
  corregir después. **La sugerencia es el ORDEN, no la casilla.**
- **Las de parecido cero también se listan, al final.** Si solo se ve lo que la
  máquina cree, no hay forma de corregir a la máquina.
- **`catColgarVarias` manda UN solo `PATCH`** con `id=in.(...)` y **una sola**
  recarga —veinte de una en una serían veinte viajes— pero deja **un `logCambio`
  por partida**: lo que se quiere saber después es qué partida se colgó de qué
  línea, no que hubo una tanda.

**El parecido** (`_catParecido`): palabras comunes, sin relleno, sin las de
menos de tres letras, y **una palabra vale doble si sale en menos de 20 partidas
del capítulo** —«vertedero» dice mucho más que «instalación»—. Tramos a la
vista y **en texto**, no solo color: alto >=0,50 · medio 0,20-0,49 · bajo <0,20.

**`_catRaiz` recorta el plural, y hace falta.** La subpartida dice «Baños» y la
partida dice «baño»; «pared» y «paredes» son la misma pared. Sin eso,
«Completar la cerámica de revestimiento de las paredes» se quedaba abajo. Es el
mismo tropiezo del `mueble de ba` que no cogía «muebles de baño».

#### `revCard` y `revEstado` se usan desde DOS pantallas (v103)

**No pueden depender de nada que nazca dentro de `renderRevision`.** `S.revHechas`
se creaba ahí (`if(!S.revHechas) S.revHechas={}`) y `revCard` la leía sin guardia:
en una sesión donde el dueño iba **directo a Partidas**, la variable no existía,
`revCard` reventaba con un `TypeError`, lo cazaba el `catch` de `renderCatalogo` y
salía **«No se pudo pintar esta pantalla»**, sin un botón que tocar. En
`revEstado` era peor: reventaba **después** de escribir en la base, así que decía
«Error al guardar» sobre algo que sí se había guardado.

**`revHechas` nace ahora en el estado inicial**, con guardia además en las dos
funciones. Auditado el resto de lo que nace en `renderRevision`: `_revSesion`,
`_revPtdErr` y `_revPtdPct` se leen siempre con `||{}`, y `revContratista`,
`revPartida`, `revAlta`, `revAreaAbierta`, `revSueltasOpen` y `revAgrupar` se
comprueban con `if(!…)`, así que `undefined` no las rompe — **pero los dos
`_revPtd*` están a salvo por casualidad, no por diseño**. Si algún día el
catálogo llega a `revPartidaAbierta`, míralos.

**Y esto era imposible de ver con la prueba de la v102**, porque el arnés ponía
`S.revHechas={}` y `S.actMostrarTodas=true` a mano: las dos muletas que tapaban
los dos fallos. **Si una prueba prepara el estado que el app debería crear solo,
no está probando el arranque real.** Arranca la sesión de prueba donde arranca el
usuario.

#### Se toca la actividad sin salir del módulo — y pasa por `Acciones` (v102)

La ficha de una partida usa **`revCard(a)`**, la MISMA tarjeta de Revisión: Sin
empezar / En proceso / Completada, los chips de 10·25·50·75·90, Nota, Foto. No
se hizo una copia **a propósito**: dos tarjetas para lo mismo es el error que
este proyecto ya cometió con Hoy y con En Obra, y sobre todo `revCard` escribe
por **`Acciones`**, que es lo único que garantiza el sellado de horas, el
registro en `obra_cambios` y que no quede una partida «pendiente» con 100%.

**`_repintarDondeEstoy()` conoce el catálogo, y va PRIMERO por `currentTab`.**
Es su propia pestaña: mirando solo `obraVista` caía en `renderActs()` y desde el
catálogo **el botón parecía muerto aunque el dato sí se había guardado**, que es
la peor forma de fallar. Lo usan `revEstado` y `handleFotoFile`.

#### Una partida en varios niveles cuelga de UNA sola madre, y se avisa

`padre_id` es **una** columna, pero el presupuesto **repite la misma línea por
nivel** y hay partidas que viven en varios a la vez. Para esas **ninguna madre
es del todo correcta**. No se inventó una tabla de muchos a muchos: se **dice**
(`_catAvisoNivelHTML`) —«está en N2 · N4 · N6, colgada de la línea de SEGUNDO
NIVEL»— para que el dueño lo vea y decida. Callarlo sería mentirle sobre dónde
está el trabajo.

#### El guardia de resiembra (v102)

**Resembrar borra la curación.** `catSembrar` **PARA** si hay una sola partida
con `padre_id`, deja el aviso en rojo en la portada y no escribe nada. Migrar es
una decisión; arrasar no.

#### La barra de progreso (v103)

Palabras del dueño: *«falta ver el progreso — no hay barras ni nada visual, solo
números sueltos; no se capta de un golpe qué va adelantado y qué atrasado»*.
`_catBarraHTML` pinta **una barra de 7px**, a lo ancho de la fila, en tres sitios:
la tarjeta del capítulo, la de la subpartida y la ficha de la partida.

- **Sin actividades no hay barra**, igual que no hay porcentaje. Una barra en
  cero y una barra vacía se ven igual y **no son lo mismo**.
- **El color no es la única señal**: el número y el `cerradas/total` siguen
  escritos al lado. La barra acompaña, no sustituye.
- Es una barra y **nada más**. El rediseño se propuso dos veces y lo rechazó las
  dos.

#### El capítulo de una partida lo decide la MAYORÍA de sus actividades

Con lo cerrado dentro apareció el caso: **«Resane del alambrado de la
iluminación — cocina principal»** tiene 7 actividades, 5 de Jordy (Pintura) y 2
de Felix y Jefrey (Albañilería). Mirando solo la primera, el capítulo dependía
de en qué orden llegaran las filas de la base — o sea, de nada.
`_catCapMayoria` lo hace determinista. **Y el empate lo rompe el ORDEN DEL
CAPÍTULO** (`_catCapIdx`), no el orden en que Supabase devuelva las filas: hay 2
descripciones con empate exacto 1-1, y dejarlo a la llegada era volver al desorden
que la mayoría venía a quitar. «Sin clasificar» va el último de `CAT_CAPITULOS`,
así que un empate contra un capítulo de verdad lo gana el capítulo de verdad.

**Por qué hacía falta el nivel 2.** La agenda **arranca el 27 de mayo de 2026**
y toda la estructura se construyó antes: «se vaciaron las zapatas, luego la
platea, luego la columna» no está en ninguna actividad y no podía estarlo. El
presupuesto sí lo tiene, línea por línea.

#### El catálogo NO guarda medición (v101)

Decisión del dueño, en sus palabras: **«fuera de todo — ni guardar»**. Ni
cantidades, ni unidades, ni dinero. **El módulo prueba estructura, no costos**;
el control de la plata vive en la app de costos.

- `CAT_SUBPARTIDAS` pasó de 9 campos a **7**:
  `[ id, capitulo, seccion, madre_presupuesto, codigo_excel, nombre, precio_unitario ]`
- La columna `cantidad` **se borró** de `obra_partidas`.
- `unidad` **se queda** —viene de la v98 y la usan las partidas de la agenda—,
  pero ya no se llena ni se muestra en las subpartidas.
- `_catMoneda()` sigue en el archivo **sin una sola llamada**, esperando a que
  haya cubicación de verdad. No la borres: es lo que pintará el dinero el día
  que vuelva.

**El dato no se pierde: vive en el Excel del presupuesto.** Reponerlo es
regenerar la constante, un paso.

**Lo que quedó cojo y está avisado:** `precio_unitario` se sigue guardando —así
se decidió antes de quitar las cantidades— pero **solo, sin cantidad, no
calcula nada**, y `valor` quedó en nulo por lo mismo. Es una línea de la
siembra; que el dueño decida si lo saca también.

#### El nivel del edificio (v101) — se calcula, no se guarda

De una **subpartida del presupuesto**, su nivel es su `seccion`, que ya tiene.

De una **partida de la agenda** se calcula al pintar, de las áreas de sus
actividades — y **no siempre es uno solo**. Medido con lo cerrado dentro (v102):
de 1.027 partidas, **797 viven en un nivel y 230 en varios, hasta seis**, sobre
**18 niveles** distintos. *(Con solo lo abierto eran 284/107 sobre 15: si
cambias lo que entra al catálogo, estas cifras se mueven — vuelve a medirlas.)* «Instalación de cerradura —
puerta principal» está en los seis. **No le inventes un nivel único, y no
añadas columna para esto.**

`_catNivel(area)` corta el área en el guión largo: `N7 — Áreas Comunes N7` → N7,
y lo que no lleva guión se queda igual (`Parqueo`, `Escalera Principal`,
`General`, `techo`…). `_catNivelOrden` pone **N2…N7 primero y en orden**, el
resto detrás y alfabético — los 15 niveles reales de hoy. En la lista caben
cuatro y el resto se cuenta («+2»); la ficha los enseña todos.

**El capítulo es LO QUE SE ENTREGA; el oficio es QUIÉN LO HACE.** Y **el área
NO es un nivel**: la platea de la caseta es Hormigón Armado en el Parqueo, y si
el área fuera capítulo la plomería quedaría partida en dos.

**El 18.00, el 20.00, el 22.00 y el 29.00 no existen** en este presupuesto. No
los rellenes.

#### Las subpartidas del presupuesto NO SE EDITAN

No se juntan, no se renombran y no se mueven de capítulo. **Son el
presupuesto**: si se editan, deja de cuadrar con lo que se contrató y con lo
que se paga. Lo único que se puede hacer es **desactivarlas** (`activo=false`)
cuando una no aplica. La interfaz no lo ofrece —ni casilla de marcar, ni ficha
editable— y además `catFichaSet`, `catJuntarEn`, `catBajarEn` y `_catSelIds`
llevan guardia por si alguien llega por otro camino.

**Las cuatro herramientas —Juntar, Renombrar, Mover y Bajar a actividad— son
SOLO para las partidas de la agenda (nivel 3).**

#### Cómo se distingue un nivel del otro: por `tipo`, no por `seccion` ni por `padre_id`

`padre_id` **no sirve**: al sembrar, las 274 del presupuesto y las de la agenda
lo tienen **todas en nulo**, porque a la agenda nadie le adivina la subpartida.

Hasta v100 se miraba la **sección**, y funcionaba. Desde v101 **no**: las
partidas de la agenda también enseñan nivel del edificio, y dejar que una
columna signifique dos cosas —en qué nivel del edificio estás y de qué nivel
del catálogo eres— es cómo se rompen las cosas más tarde. Ahora hay columna
propia:

```
tipo = 'presupuesto'  →  una de las 274 líneas del presupuesto
tipo = 'agenda'       →  una partida salida de las descripciones de la obra
```

`_catEsSub(p)` mira `p.tipo`, y **solo si no lo hay** recurre a la sección —
para que una fila vieja, entre la migración y el repintado, no se enseñe como
si fuera de la agenda.

La sección **se sigue mostrando**, que para eso está: «HORMIGÓN ARMADO»
aparece en cuatro (Bajo Nivel 17, Primer Nivel 30, Segundo 27, Séptimo 11) y
sin ella el usuario vería cuatro «Replanteo» sin saber cuál es cuál.

#### Colgar y descolgar — es el trabajo del dueño

`catColgar(pid, subId)` y `catDescolgar(pid)`. El bloque **«Sin subpartida (N)»**
de cada capítulo es la bandeja de ese trabajo: de ahí salen las partidas hacia
su línea del presupuesto. **Al mover una partida de capítulo se le suelta la
subpartida**: la que tenía es de otro capítulo y dejarla sería mentir sobre el
presupuesto.

#### Cómo se borra entero, si no convence

```sql
DROP TABLE IF EXISTS obra_partida_actividad;
DROP TABLE IF EXISTS obra_partidas;
```

…más el bloque `CATÁLOGO DE PARTIDAS` de `index.html` y sus seis enganches
(`tab-catalogo`, `view-catalogo`, `dw-catalogo`, `'catalogo'` en `VIEWS`, la
rama de `goTab` y las dos líneas de la puerta de admin). **El app queda
exactamente como en v97.** Está montado así a propósito.

#### Reglas que no se tocan

- **CERO escrituras a `obra_actividades`.** Ni una. El amarre es una **tabla**
  (`obra_partida_actividad`), **no una columna**: por eso se borra sin rastro y
  ninguna consulta de las que ya existen tiene que enterarse. Si la prueba
  gradúa, **entonces** se vuelve columna.
- **Cero cambios en pantallas existentes.** Verificado lado a lado: los ocho
  filtros y las cuatro vistas dan byte a byte lo mismo.
- **La siembra no es automática.** `catSembrar()` dice cuántas va a crear antes
  de crearlas y se puede repetir. Crea las 274 del presupuesto **con el id de
  la constante** (por eso resembrar no duplica) y **una partida por
  `descripcion` abierta distinta, tal cual** — sin agrupar, sin limpiar.
- **`padre_id` nace en nulo, siempre.** Nadie adivina de qué subpartida cuelga
  una partida de la agenda.
- **La siembra VA A QUEDAR MAL en varios sitios y está bien.** La limpieza de
  entrega y los escombros caen en «Sin clasificar» **a propósito**: no hay
  línea de presupuesto para eso y la decisión es del dueño. **No inventes una.**

#### `_catCapDe(oficio, descripcion)` — el oficio solo NO basta

Tres contratistas se parten entre dos códigos: Dimedes (puertas y jambas →
Portaje; gabinetes, muebles de baño, clósets e islas → Cocina y Muebles),
Yelson (pisos y zócalos → Pisos; revestimiento cerámico → Revestimientos) y los
ayudantes, que por decisión del dueño **se reparten a la partida donde ayudan**.

**Ojo con los acentos y los plurales.** La primera versión de la regla decía
`mueble de ba` y `closet`, y mandaba **22 actividades al capítulo equivocado**:
«Instalación de muebles de baño» y «Pintar puertas del clóset» no casaban. Está
en `mueble[s]? de ba` y `cl[oó]set`. **Si tocas una regla, pruébala contra la
base antes de darla por buena.**

#### Lo que NO hace, a propósito

**No calcula avance ni dinero por subpartida.** Hace falta que el dueño cure
primero —que cuelgue las partidas de su línea—; si el cálculo sale ahora, sale
mal y después nadie vuelve a confiar en el módulo. Esto es solo la estructura.

#### Dos detalles de implementación que ya costaron

**El escogedor es una PANTALLA, no un `prompt()`** (`S.catPick`,
`_catPickHTML`). Escoger entre cientos de partidas escribiendo un número en un
diálogo del navegador no se hace ni de pie ni sentado — mismo motivo que el
alta del Repaso en v95.

**Cuidado con `sbTodo` en tablas sin `id`.** Pagina con `Range` y exige un
orden único: si el path no trae `order=…id.…`, le pega `order=id.asc`. Por eso
`obra_partida_actividad` tiene una columna `id` que el app nunca lee — sin ella
la lectura devolvía 400 y el catálogo no cargaba nunca. Su clave primaria sigue
siendo `actividad_id`: **una actividad, una partida.**

**Toda actividad creada en el app nace sin partida** y cae en la bandeja de
sueltas. No se bloquea el alta pidiendo partida: en obra eso no se contesta.

### La salud de las cadenas (v104) — límpialas antes de que muevan nada

Un arrastre sobre datos sucios propone disparates el primer día, y entonces el
dueño no vuelve a confiar en él. Medido sobre las 2.464 actividades: **375 con
algo en `predecesoras`, 431 enlaces**, y de ahí

| | |
|---|---|
| **Rota** — el campo no es una lista (`"["`, `"[{"`) | **18** |
| **Apunta a la nada** — la de delante fue borrada | **38** |
| **Se contradicen** — la de atrás empieza antes de que acabe la de delante | **164** |

La pantalla vive **dentro de Obra** (`cadAbrirSalud`, pastilla en la portada que
**no sale si no hay nada**), y **nada se arregla solo**: un botón por cosa.
Vaciar la rota, quitar el enlace huérfano o buscarle otra, y en los solapes
**no hay arreglo automático** —puede ser un error de fechas o puede ser que de
verdad se trabaje a la vez— así que solo se puede anotar «así está bien».

**`solapes_ok` es la única columna nueva de v104**, y guarda **los ids de las
predecesoras aceptadas**, no un sí/no: una partida puede tener dos
predecesoras, una bien y otra mal. Sin un sitio donde guardar la respuesta, el
app le vuelve a preguntar lo mismo cada vez que abre.

**`predecesoras` se guarda como TEXTO.** La columna es `text`, no `jsonb`, y
por eso `getPreds` hace `JSON.parse` al leer. Si escribes un array de verdad,
el siguiente que lo lea no lo entiende. Lo mismo hace el editor de la ficha.

### Las cadenas (`predecesoras`) — dos formatos en la misma columna

En la base conviven **objetos** `[{"id":"x","tipo":"FS","lag":0}]` (369 filas)
y **textos** `["x"]` (3 filas, todas completadas). Todo lo que las usa compara
contra `a.id`, que es un texto, así que con los objetos la comparación daba
siempre `false` **en silencio**: 121 partidas abiertas que esperan por otra
sin terminar nunca enseñaron el candado 🔒, y el editor abría en blanco las
predecesoras que ya tenían puestas.

**Lee siempre por `getPreds(a)` o `_predIds(campo)`**, que normalizan con
`_normPreds` a ids de texto. **`"tipo"` y `"lag"` están GUARDADOS en la base
pero nadie los lee**: `_normPreds` los tira. Trátalos como lo que son hoy —
«esto va detrás de esto»—; meter FS/SS/FF y retardos es construir sobre algo
que nadie usa. No compares `a.predecesoras` a mano.

Una predecesora **que ya no existe no bloquea** (hay 18 apuntando a partidas
borradas): si bloqueara, la partida quedaría trabada para siempre sin nada
que se pueda terminar para soltarla.

### El recorrido paso a paso NO existe. No lo vuelvas a construir.

Se construyó en v76, se le dieron tres formas de entrar (v77), se le movió
la entrada a la lista (v79)… y el dueño dijo tres veces que no le era
práctico. **Se retiró entero en v81** (~475 líneas). Si alguien pide «una
pantalla que pase las partidas una por una», esto ya se intentó: lo que
funciona en obra es la lista, con las acciones en la fila.

### El panel del apartamento se organiza POR CONTRATISTA

Tocar un apartamento en la torre abre `_recPanelApto()`: sus cuatro números
y **un bloque por contratista**, ordenados por quién debe más vencido. Al
abrir un contratista salen, **arriba de sus partidas**, sus fechas:
`+1 semana · +2 semanas · Entrega el viernes · Entrega hoy · fecha libre`.
Mueven todas las de **ese** contratista en **ese** apartamento.

Por qué así: en esta obra se planifica por contratista — a cada uno se le
entrega su hoja, no un listado del apartamento. Y mover fechas es lo que
más se hace (247 de 349 ediciones del historial), que antes obligaba a
irse a la lista, entrar en modo selección y marcarlas una por una.

Las tres pestañas que había (Panel · Pendientes · Quién debe) **se
fundieron en v82**: las tres agrupaban por contratista, una con números,
otra con la lista y otra con el conteo.

**La propuesta del plan del día se probó en v81 y se retiró en v82**: le
decía al dueño lo que ya sabía y lo único que hacía era alejar el plan.
No la vuelvas a construir.

**Volver.** Cuando algo te manda a la lista con un filtro puesto
(`aptoVerEnLista`), se guarda `S._vengoDeApto` y la cinta de filtros
muestra un botón **«‹ Apto 2A»** (`volverAlApto()`) que reabre el panel y
suelta ese filtro. Quitar el filtro **no es volver**: te deja donde estabas
pero perdido. Si abres un camino nuevo hacia la lista, deja también el de
vuelta.

**Lo que es consulta va plegado.** En la tarjeta abierta, las horas, el
registro de tiempo y «Verificar trabajo» están tras un pliegue
(`toggleActMas`). Abrir una partida en obra es para cambiarla, no para
leerla. Igual en el Plan del día: organizar, filtrar y buscar van tras un
solo botón (`S.planFiltrosOpen`).

**Correr la cadena (v93, v104).** Al mover una entrega hacia adelante, el app
ofrece correr también lo que espera por ella: `_cadenaAbajo(id)` baja por
TODA la cadena (no solo el eslabón siguiente) con un `vistos` que corta los
ciclos, y `_ofrecerCorrerCadena(id, dias, detalle)` pregunta y aplica.
Lo usan `actFilaCorrer`, `trCorrer`, `actFilaFecha` y `trFecha`.

**EL ARRASTRE VA EN DÍAS DE TRABAJO (v104).** `_sumarDiasLab` y `_diasLabEntre`
usan `esDiaLaboral` —lunes a sábado, menos `FERIADOS`—. Si el pañete se atrasa
3 días de trabajo, lo de atrás se mueve 3 días de trabajo: saltando domingos y
feriados. En días de calendario, el app metía trabajo en domingo y el dueño
tenía que corregirlo a mano, que es justo lo que se venía a quitar.

**Pero los botones de mano siguen en días de calendario.** «+1 semana» quiere
decir una semana. Por eso `_correrPlan(ids, modo, dias, laboral)` lleva un
**interruptor** y no hay dos aritméticas: el modo selección y el panel del
apartamento no llaman con `laboral`, el arrastre sí. Dos criterios terminan
dando números distintos.

**Qué mueve el arrastre**: `fecha_inicio` y `fecha_fin`, el mismo salto, para
que **la duración no cambie**. `fecha_plan` se mueve **solo si caía dentro de
la ventana vieja** —es el día asignado a alguien, lo que escribe
`Acciones.planificar`, y **no es lo mismo que la entrega**—; si caía fuera, no
se toca y **se avisa en la pantalla**. `fecha` no se toca nunca.

**Nada se mueve sin que el dueño lo vea antes** (`_cadPreguntar`,
`_cadDragHTML`). Hasta v103 esto era un `confirm()` que decía «7 partidas
esperan por esta» y ya: ni cuáles, ni a qué fechas, ni forma de dejar una
fuera. Ahora es una lista con casillas —**marcadas por defecto**, porque el
arrastre es lo que él ya hace a mano—, con el aviso de `fecha_plan` fuera de
ventana y el de fechas que ya se contradicen. Y la tanda entera **se deshace de
golpe** (`cadDeshacerTanda`, botón en la pantalla de cadenas).

**Lo cerrado no se mueve, nunca.** `_sucesoresAbiertos` ya lo filtraba desde
v93; de los 431 enlaces medidos, **241 tienen la de delante ya cerrada**. Mover
la fecha de algo terminado sería reescribir la historia.

Tres reglas de esto:
- **Se ofrece, no se hace solo.** Si el resto se corre o se aprieta para
  recuperar es decisión de quien manda la obra.
- **Solo hacia adelante** (`_diasCorridos` devuelve 0 si se adelanta): que la
  predecesora termine antes no significa que el de atrás pueda entrar antes.
- **La aritmética no se toca.** Una partida sin fecha de entrega pero con
  inicio recibe el corrimiento en el inicio y no se le inventa entrega —
  igual que en el modo selección y en el panel. Hacer una excepción aquí
  sería una segunda regla de fechas.

La aritmética de mover fechas vive en **un solo sitio**, `_correrPlan(ids,
modo, dias)` y `_correrAplicar(plan, detalle)` — los usan el modo selección,
el panel del apartamento y ahora la cadena. El fin nunca queda antes del inicio, «correr»
se salta las que no tienen fecha, y se guarda de 5 en 5.

**Cerrar una partida va SIEMPRE por `marcarActCompletada()`**, que es quien
exige la foto. `Acciones.setAvance(id,100)` también la cierra, pero se
salta esa puerta: no lo uses para cerrar desde la interfaz.

**`dictarSobre(id)`** es el micrófono de UNA partida — nació en Revisión
(`revNota`) y ahora sirve también desde la fila. Si lo dictado trae un
porcentaje («esta va en sesenta»), lo aplica además de guardar la nota;
`_pctDictado()` solo lo acepta pegado a la idea de avance, para que un
«puerta de 60 centímetros» no mueva nada.

Los cuatro filtros rápidos (`retrasadas`, `sinfecha`, `sincontratista`,
`congeladas`) **también aplican dentro de Revisión** desde v76, con aviso
arriba y botón «Ver todas». Su criterio vive en un solo sitio,
`FILTRO_HUECO`: si necesitas ese criterio en otra pantalla, úsalo de ahí.
Dos copias del mismo criterio terminan contando distinto.

**Una sola carga de datos** desde v77: `S.acts` la trae entera por `sbTodo`
(sin tope), y `S.abiertas` y `S.actsActivas` **se derivan de ella** con
`_derivarAbiertas()` — son el mismo array, no copias. No añadas una
segunda consulta de actividades: eso fue justo lo que hacía que Hoy y
Actividades cantaran números distintos.

---

## 4. La capa `Acciones` — la regla de oro

Está en `index.html` (busca `var Acciones = (function(){`).

**TODA escritura de actividades pasa por ahí. Sin excepción.**

```
crear · editar · eliminar · completar · setAvance · setEstado
setPrioridad · asignar · planificar · pausar · agregarNota · revisar
```

Esa capa garantiza cuatro cosas que se rompen solas si alguien escribe
directo con `sb()`:

1. **Coherencia** entre `estado` y `porcentaje`. Una actividad al 100% que
   no esté `completado` es un dato corrupto.
2. **Registro en `obra_cambios`** del 100% de las escrituras, con quién y
   cuándo. Ese historial es lo que permite saber qué se movió y qué lleva
   semanas quieto.
3. **Sellado de horas** en las que están en curso.
4. **Apagar la marca de foto** al cerrar la partida. Hay 766 partidas ya
   terminadas que siguen pidiendo foto porque se cerraron por fuera.

Si necesitas escribir algo nuevo, **agrega un método a `Acciones`**. No
llames a `sb()` con PATCH o POST desde la interfaz.

`editar(id, cambios, detalle)` acepta un tercer argumento opcional para
dejar dicho en la bitácora **desde dónde** se editó («en revisión»,
«recorrido»). Úsalo en vez de abrir otra vía de escritura.

La única excepción existente es `Acciones.revisar(id)`, que a propósito
**no** escribe en `obra_actividades`: solo registra en `obra_cambios` que
alguien miró la partida y sigue igual.

### La cola — lo que no se pudo guardar no se pierde (v91)

`sb()` distingue **dos** fracasos y lo marca en el error:

- **`e.sinRed === true`** — `fetch` reventó, no hubo respuesta. `Acciones._patch`
  lo mete en la cola (`localStorage`, clave `mecca_cola_v1`) y **NO revierte**
  el cambio en pantalla: revertirlo era perder el trabajo sin decir cuál.
- **la base contestó que no** (`r.ok` false) — se revierte y se lanza con el
  motivo. **No se encola**: reintentarlo sería repetirlo para siempre.

La cola sale sola al volver la señal (`online`), al volver al app
(`visibilitychange`), cada 30 s si hay algo, y **al arrancar** — si ayer se
quedó algo sin señal, sale hoy sin que nadie se acuerde. La barra de arriba
dice «N cambios sin guardar · toca para enviar» y **se queda puesta**: un
toast de 6 segundos no sirve para algo que hay que resolver antes de irse.

Dos detalles que parecen pequeños y no lo son:

- El registro de `obra_cambios` se construye con **`_logRec`** al marcar, y se
  guarda en la cola junto al patch. Si se armara al enviarlo, el historial
  diría que el avance se puso a las 6 de la tarde en vez de a las 9 de la
  mañana, que es cuando el ingeniero lo vio.
- **`_derivarAbiertas` repinta la cola encima de lo que trae la base**
  (`_colaAplicarLocal`). Sin eso, al recargar en obra saldría el valor viejo
  mientras la cola guarda el nuevo, y parecería que el app perdió lo marcado.

### Lo que todavía escribe por fuera — no lo imites, y si lo tocas, arréglalo

**A v77 no queda ninguno.** Los seis que había se cerraron:

| Función | Qué se hizo |
|---|---|
| `revEstado`, `revNota` | Reconectadas a `Acciones` (v76) |
| `setAvanceRapido()` | Reconectada en la Fase 0, y retirada en la Fase 3 con «En Obra» |
| `accionActObra()`, `mostrarPausaObra()` | Retiradas con «En Obra»; ahora son botones del paso a paso, por `Acciones` |
| `cierreAvGuardar()` | Retirada: el Cierre del día es un reporte, de solo lectura |
| `planDiaGuardar()` | Reconectada a `Acciones.setAvance` |

Puedes comprobarlo tú: busca `obra_actividades` junto a `PATCH` y mira si
la línea toca `estado` o `porcentaje`. **Si aparece uno nuevo, es un bug.**

Estos `PATCH` directos **sí son legítimos**, no los toques:

- `Acciones._patch` — es la capa misma.
- `stampHora` — es el sellado de horas.
- `undoAction` / `redoAction` — reponen un retrato exacto del estado
  anterior. Pasarlos por `_coherencia` los rompería: deshacer un
  «completar» tiene que poder devolver la partida a `en-progreso` con su
  100%, que es justo lo que la regla de coherencia prohíbe crear. **Sí
  registran** en `obra_cambios`.
- Los que escriben fotos, pendientes, área, planos, asistencia y personal
  — no son estado ni avance.

---

## 5. Reglas duras — esto ya costó caro

### NO toques `sw.js` salvo que la tarea sea exactamente eso

Ese archivo dejó el app inservible **dos veces**:

- **v27** — `e.waitUntil()` llamado dentro de un `.then()` lanza
  `InvalidStateError` en Safari y tumba la navegación entera. El app
  quedó en blanco en el iPhone. Las 16 pruebas corrían en Chromium y
  pasaron todas.
- **v28-v31** — el service worker guardaba en caché las respuestas de
  Supabase y las servía para siempre. El app mostraba datos viejos y no
  había forma de refrescarlos. Se arregló, se volvió a romper al revertir,
  y se arregló otra vez.

Si la tarea obliga a tocarlo: cambia el nombre de la caché (`CACHE`),
prueba en Safari, y no toques nada más en ese archivo.

### NO escribas en Supabase durante las pruebas

Es la base de producción de una obra real. Intercepta `window.sb` y deja
las escrituras en memoria. Al terminar, reporta cuántas interceptaste.

### NO cambies la consulta de arranque ni sus columnas

`obra_actividades` tiene 39 columnas y casi todas se usan en alguna
pantalla. Quitar columnas del arranque para «adelgazar» rompe features que
no vas a ver hasta que alguien abra esa pantalla en obra.

### NO rompas lo que ya está verificado

Estos ocho filtros rápidos y estas cuatro vistas están comprobados contra
los datos reales. **Después de tu cambio tienen que dar exactamente lo
mismo:**

- Filtros: `retrasadas`, `sinfecha`, `sincontratista`, `congeladas`,
  `en-progreso`, `pendiente`, `completado`, `activas`
  **`retrasadas` cambió a propósito en v92**: pasó de 383 a 325 porque las 58
  sin fecha de entrega dejaron de contarse también ahí. Ese es el número
  nuevo de referencia; si vuelve a 383, alguien deshizo el arreglo.
- Vistas: **Lista**, **Por Apto**, **Matriz**, **Edificio**
- Modo selección: reprogramar en bloque, cerrar en bloque, «Marcar revisadas»
- **Revisión por contratista**: los cuatro números de la cabecera
  (abiertas, vencidas, sin fecha, **en curso** — «revisadas» va en la
  línea de arriba, no en las tarjetas), el orden por `REC_ORDEN` y las
  áreas plegables
- **Obra**: los siete botones de la tarjeta (25% · 50% · 75% · ✓ Completada ·
  Sin cambios · +1 sem · Viernes), la barra «Todas a…» y el contador de
  revisadas. *(Aquí decía «Paso a paso» con sus ocho botones: esa pantalla se
  retiró en v81 y no se podía comprobar.)*
- **La sub-nav de Actividades** (Actividades · Kanban · Revisión) se ve
  **siempre**. Esconderla en la vista de entrada deja Kanban y Revisión sin
  ninguna puerta — pasó en v77 y es el mismo error de v58
- **«Todas» carga las 2.465 filas**, no 500. El tope viejo estaba
  invertido: pedir «ver todas» lo bajaba
- **El Catálogo de partidas no escribe en `obra_actividades`.** Cuenta los
  `PATCH` y `POST` interceptados y mira a qué tabla va cada uno: los de
  `obra_actividades` tienen que ser **cero**
- **El catálogo incluye lo CERRADO, y lo carga ÉL.** Si la siembra da ~391
  partidas en vez de ~1.027, alguien volvió a leer de `S.acts` —que nunca trae
  las completadas— y el avance va a salir en cero
- **La prueba del catálogo arranca DIRECTO en Partidas**, sin pasar por Revisión
  y sin preparar `S.revHechas` ni `S.actMostrarTodas` a mano. Así es como entra el
  dueño, y así fue como se escaparon los dos fallos de bloqueo de la v102
- **El avance se promedia por ACTIVIDAD.** Compruébalo capítulo por capítulo
  contra la base; si un capítulo sin nada cerrado sale al 60%, la fórmula está mal
- **El catálogo no enseña cantidad, unidad ni dinero.** Recorre la lista de
  subpartidas y la ficha del 3.00: `RD$`, `M²`, `M³`, «Cantidad», «Precio
  unitario» y «Valor» tienen que dar **cero**
- **El arrastre de la cadena va en días de TRABAJO.** Mueve una que caiga en
  sábado y comprueba que lo de atrás salta el domingo; y prueba contra un
  feriado de `FERIADOS`. Si aparece trabajo en domingo, alguien volvió a
  `_isoAddDias`
- **La duración no cambia con el arrastre.** Una de 8 días de trabajo sigue
  siendo de 8 después de moverse
- **El catálogo se comprueba contra INVARIANTES, no contra cifras.** La obra se
  mueve mientras programas —un día se cerraron 13 partidas en una tarde y el
  reparto dejó de cuadrar contra una tabla congelada—. Lo que tiene que dar
  siempre: **274 subpartidas** fijas, **una partida por descripción abierta
  distinta** y **un amarre por actividad abierta**, contra lo que diga la base
  en ese momento

Sobre el orden de las áreas: **alfabético no sirve.** Para los once
apartamentos suena igual — `N2 — Apto 2A` … `N7 — Penthouse B` ya ordenan
bien por texto — pero «Escalera de Emergencia», «Fachada» y «General»
caen **antes** de «N2 — Apto 2A», así que la pantalla abría por la
escalera. Usa siempre `_revOrdenArea()`: primero los once de `REC_ORDEN`,
luego las áreas de un nivel que no son apartamento, y al final lo que no
pertenece a ningún nivel.

---

## 6. Los bugs que ya pasaron — para que no se repitan

| Qué pasó | La lección |
|---|---|
| `sb()` perdía la llave de Supabase: `...opts` se esparcía **después** de `headers` y borraba el objeto entero. Toda consulta paginada (que manda `Range`) salía sin llave. El app entraba y no traía nada. | El orden del spread importa. `...opts` primero, `headers` al final. |
| `JSON.stringify()` dentro de un atributo HTML con comillas dobles: el navegador cortaba el valor en la primera comilla. Reventaba al escribir en el buscador de predecesoras. | Escapa a `&quot;` y envuelve el `JSON.parse` en try/catch. |
| El filtro de vencidas trataba `'retrasadas'` como si fuera un estado. Decía «863 vencidas» y al tocarlo mostraba **cero**. | Los pedidos que no son estados (`retrasadas`, `sinfecha`, `sincontratista`, `congeladas`) se resuelven aparte, y el `else-if` final de «no completado» no puede anularlos. |
| Un filtro pedía `tipo_personal === 'contratista'` para encontrar lo no asignado. Los 30 sin asignar reales estaban marcados `propio` o sin tipo. Daba cero. | **Mira los datos reales antes de escribir un criterio.** Lo que parece lógico casi nunca coincide con lo que hay en la base. |
| Al crear una actividad copiando fechas de sus hermanas: ninguna tenía fecha de inicio y la de fin ya había pasado. Inicio en hoy, fin en agosto → rechazada. | Si la fecha heredada no sirve, pon un plazo desde hoy. Nunca dejes el fin antes del inicio. |
| **v60** — dos `id="torre-svg"` en la página. La torre escondida de «Hoy» ganaba el `getElementById` y la de Actividades no dibujaba nunca. | Si una pieza se pinta en dos pantallas, no puede tener un `id` fijo. Y la prueba tiene que montar **las dos**. |
| **v58** — el selector de vistas vivía dentro del panel de Filtros, que está `display:none`. Se elegía una vista y ya no se podía cambiar. La prueba ponía `S.actVista` por código, así que nunca lo vio. | **Toca botones de verdad y cuenta solo lo visible.** Fijar el estado a mano se salta justo el bug. |
| **v49** — un login nuevo dejó a todo el mundo fuera en la obra. La prueba usaba un Supabase de mentira que devolvía lo que se esperaba. | Lo que no se puede probar contra lo real, no se sube. |
| **v77** — `loadActsAll` pedía `limit = actMostrarTodas ? 500 : 2000`. Al revés: tocar «Todas» bajaba el tope a 500 sobre 2.465 filas, sin avisar. | Un tope silencioso miente peor que un error. Si hay que paginar, `sbTodo`. |
| **v77** — `fixActsConsistency` cerraba partidas sola en cada carga, sin preguntar y sin dejar rastro de quién. | Un dato incoherente se avisa, no se tapa. Cuadrarlo es una decisión de quien manda la obra, y queda escrita. |
| **v77** — el manejador de teclas hacía `e.target.closest(...)` sin comprobar que `e.target` fuera un elemento. Cuando no lo era reventaba el manejador **entero**. | Un guardia que falla no puede llevarse por delante todo lo que protege. |
| **v78** — la × del recorrido nacía **debajo del notch** del iPhone: la cabecera se escribió con `padding:12px` pelado, sin `var(--st)`. No se podía cerrar. El panel del apartamento sí lo hacía bien. | Toda pantalla completa lleva `var(--st)` arriba y `var(--sb)` abajo. Y arriba a la derecha no puede ser la única salida: el pulgar vive abajo. |
| **v79** — la barra de acciones se pintaba fuera de `det-<id>` y gateada por `S.actAbiertas`. `toggleActDet` solo cambia el `display`, **no repinta**, así que al tocar la fila no aparecía nunca. | Si algo tiene que aparecer con un toggle, ponlo **dentro** de lo que el toggle muestra. Y mide lo VISIBLE, no el innerHTML. |
| **v79** — «Ya está» cerraba con `Acciones.setAvance(100)` y se saltaba la exigencia de foto que sí aplica el ✓ de la fila. | Dos botones que dicen lo mismo tienen que hacer lo mismo, por el mismo camino. |
| **v80** — llegaron a existir **tres** formas de cerrar una partida en la misma tarjeta: el ✓ de la fila, «Ya está» y «Completar». El dueño lo dijo en una línea: «no quiero cosas de más». | Antes de añadir un botón, busca si lo que hace ya está en esa pantalla. Que dos caminos lleguen al mismo sitio no los hace útiles: obligan a elegir. |
| **v76→v81** — el recorrido paso a paso: cinco versiones construyéndolo y moviéndole la puerta, y nunca se usó en obra. Se retiró entero. | Una pantalla que hay que seguir rescatando no tiene un problema de puerta: no encaja en cómo se trabaja. Pregunta antes de la tercera versión. |
| **v81** — se estuvo a punto de añadir un filtro «esta semana» que la lista no sabe enseñar ni soltar: habría recortado la lista sin nada en pantalla que lo dijera. | No filtres con estado invisible. Si el usuario no lo ve, no lo puede quitar — y entonces la lista miente. |
| **v76→v82** — tres pantallas seguidas rechazadas en obra: el recorrido, la propuesta del plan y el panel de tres pestañas. Las tres **guiaban** al usuario. Lo que sí funcionó: acciones en la fila, y fechas por contratista dentro del apartamento. | Este usuario no quiere que lo lleven de la mano; quiere menos toques para lo que ya sabe hacer. Antes de construir una pantalla, pregunta **qué le hace el día más largo**, no qué le gustaría ver. |
| **v84** — «Hoy» se rescató cuatro veces (reordenar, plegar, botones nuevos, subir el plan) y el dueño siguió diciendo que no era funcional. Era Actividades con otra piel. | Segunda vez que pasa lo mismo, después de «En Obra» y del recorrido. Si una pantalla repite lo que ya hay en otra, arreglarla no la salva: **compárala con lo que ya existe antes de tocarla**. |
| **v86** — la lista tardaba **~1 segundo** en repintarse con 1.080 filas, y marcar un avance repintaba las 1.080 para cambiar un botón. Cada toque era un tirón. | Mide antes de dar algo por rápido. Si un cambio afecta a una fila, toca **esa** fila. `_repintarFila` bajó la acción de 1.016 ms a 16 ms. |
| **v85** — «Error cargando» en obra: `loadActsAll` tenía `catch(e){setSS('err','Error cargando');}` — se tragaba el motivo y la barra roja no hacía nada. Y con «Todas» son **tres** peticiones de 1.000 filas: que una se cayera tiraba las 2.465. | Un `catch` que no dice qué pasó ni ofrece salida es peor que el error. Toda carga larga y por páginas necesita **reintento por página** y decir que lo anterior sigue en pantalla. |
| **v85** — una prueba contaba peticiones y salían de más: el **arranque del app seguía corriendo** y sus reintentos caían sobre el doble recién instalado. | Espera a que el arranque termine antes de instalar el doble. Si cuentas llamadas, asegúrate de que nadie más las esté haciendo. |
| **v84** — al quitar el contenedor de Hoy, un regex `(?:.*\n)*?` se llevó también el de Actividades y el app se quedó sin `#c-act`. | Para borrar bloques de HTML, cuenta las etiquetas o recórtalo a mano. Un no-greedy multilínea no sabe dónde cierra un `<div>`. |
| **v84** — una prueba medía el alto de los botones **dos veces** (una para listar las alturas y otra para el veredicto) y el navegador recalculaba en medio: fallaba 3 de cada 8 veces. | Lee el diseño **una sola vez** a un array y decide sobre ese array. Y una prueba intermitente no vale nada: arréglala o bórrala. |
| **v83** — se llegaba a la lista filtrada desde el panel y no había vuelta: la cinta de chips deja **quitar** el filtro, que no es lo mismo que **volver**. | Todo camino que lleve a otra pantalla con estado puesto necesita su camino de vuelta, visible. |
| **v83** — en Hoy había ocho filas de controles —fecha, asistencia, HOY/MAÑANA, título, PDF, organizar, chips, buscar— antes de la primera actividad, y la cabecera «Plan del día · HOY» salía dos veces. | Cada fila de controles empuja el trabajo fuera de la pantalla. Con menos de diez partidas, filtrar y organizar sobran: plégalos. |
| **v82** — el panel pedía a la base los pendientes del apartamento (`cargarPendRec`, `S._recPend`) cuando `S.acts` ya los tenía desde v77. Una consulta por apartamento, y dos copias que podían decir números distintos. | Desde la carga única, **nada** necesita su propia consulta de actividades. Si vas a pedir a `obra_actividades`, mira primero si ya está en `S.acts`. |

| **v86→v87** — los botones de avance se pusieron siempre a la vista en la lista. Con 1.080 filas son seis botones por renglón: la lista dejó de poder leerse de un vistazo, que es para lo que sirve. | Un atajo que se repite mil veces deja de ser un atajo. Si algo hace falta a cada rato, merece **su propia pantalla corta** —no meterlo en la larga. |
| **v87** — las cinco pastillas de filtro hacían `S.actFiltroRapidos=['x']`: reemplazaban en vez de conmutar, no se marcaban al estar puestas, y su número se contaba sobre `S.acts` entero en vez de sobre lo que ya estaba filtrado. | Una pastilla de filtro tiene que decir tres cosas: cuántas, si está puesta, y cómo quitarla. Si falta una, el usuario deja de creerle al número — es el mismo engaño de «863 vencidas → cero». |
| **v87** — contar las cinco pastillas llamaba a `applyActFilters` cinco veces, y cada llamada **ordenaba** las 2.465 filas: `renderActs` pasó de 442 ms a 468 ms sin que nadie lo notara. | Mide **después** también. Un cambio que solo añade un conteo puede pagar el precio de toda la cadena que hay detrás. |
| **v87** — una prueba usaba `#c-act [id^="act-"]` para coger la primera fila y cogía `act-filtros-box`. Los clics no hacían nada y la prueba decía que el pliegue no abría. | Un selector por prefijo de `id` casa con más de lo que crees. Usa la clase de la fila (`.act-item`), y comprueba que lo que cogiste es lo que querías. |

| **v88** — se cambió la pantalla de entrada a Obra y los datos llegaban (1.080 cargadas) pero la pantalla seguía diciendo «Cargando la obra…»: `loadAll` llamaba solo a `renderActs`, que pinta un contenedor oculto. | Cambiar la puerta de entrada toca **tres** sitios (estado, clase `active`, `goTab` del arranque) y **quien carga los datos tiene que repintar la pantalla que se ve**, no la que solía verse. |
| **v88** — el aviso de «Tardando más de lo normal», con su botón de Reintentar, se pintaba en `#c-act`. Con Obra de entrada quedaba detrás de una vista oculta: el ingeniero veía «Cargando…» sin ninguna salida. | Todo aviso de error se pinta **donde el usuario está mirando**. Un botón de reintentar en un contenedor oculto es lo mismo que no tenerlo. |
| **v88** — una prueba lado a lado dio `checkVisible: 0` y pareció que el ✓ de la fila había desaparecido. Era la prueba: medía `#c-act` sin activar la pestaña, y desde v88 nace oculta. | Cuando midas lo VISIBLE, abre la pestaña de verdad primero. Si no, un cambio de pantalla de entrada hace que toda la prueba mienta a la vez. |

| **v89** — el botón «Sigue igual» llevaba desde v76 en el código y se había usado **cero veces** en 4.800 cambios: vivía dentro del modo selección de la lista, a cuatro toques. | Una función que nadie usa casi nunca está mal hecha — está mal **puesta**. Antes de construir algo nuevo, mira en `obra_cambios` si lo que ya existe se está usando: el dato está ahí. |
| **v89** — una prueba pasaba el estado anterior a `page.evaluate` con un segundo argumento, pero el ayudante `G` era `async(f)=>p.evaluate(f)` y se lo comía: la comprobación reventaba en vez de comparar. | Un ayudante de pruebas que descarta argumentos en silencio hace fallar la comprobación más importante y parece un bug del app. |

| **v90** — `isBlocked` hacía `S.acts.find(x=>x.id===id)` donde `id` venía siendo un OBJETO `{id,tipo,lag}`: comparar un texto con un objeto da siempre `false`. **121 partidas abiertas y trabadas nunca enseñaron el candado**, y el editor abría vacías las predecesoras de 369 filas. Todo el trabajo de armar cadenas no producía ninguna señal en el app. | Cuando una columna guarda JSON, comprueba **qué forma tiene de verdad en la base** antes de escribir el código que la lee. Aquí había dos formas y el código solo entendía la que casi no se usa. Un `===` entre tipos distintos falla callado: no hay error, solo una función que siempre dice que no. |
| **v90** — la prueba del candado buscaba `/lock/i` en el HTML de la fila y casaba con `display:**block**`: daba verdadero para todas y no probaba nada. | Un selector flojo hace que la prueba diga que sí a todo. Busca el marcador exacto (el trazo del icono, un `title=`), no una palabra suelta que puede estar en un estilo. |

| **v91** — una escritura que fallaba se revertía y se tiraba: quedaba un aviso de 6 segundos y ya. Las LECTURAS reintentaban desde v85; las escrituras, no. En una torre de siete niveles, marcando veinte partidas seguidas, las que caían desaparecían sin que nadie supiera cuáles. | Lo que el usuario ya hizo no se tira nunca. Si no se puede guardar ahora, se guarda en el teléfono y se manda después — y el aviso **se queda puesto** hasta que se resuelva. Y distingue «no hay red» (reintentable) de «la base dijo que no» (no lo es): encolar un rechazo es reintentarlo para siempre. |

| **v92** — «383 vencidas» y «58 sin fecha» eran **las mismas 58 contadas dos veces**: `isRetrasada` usaba `fechaVenc()`, que cae en `fecha` cuando no hay `fecha_fin`. Las pastillas no sumaban contra nada. | Separa el helper de MOSTRAR del criterio de CONTAR. `fechaVenc` está bien para pintar y ordenar; para contar hay que preguntar por el campo exacto. Dos pastillas que se solapan hacen que el usuario deje de creerle a las dos. |
| **v92** — la comparación lado a lado dijo «idénticos» y no probaba nada: en los datos de `comp87` las «sin fecha» tienen `fecha` FUTURA, así que nunca caían en vencidas. El caso real —sin `fecha_fin` y con `fecha` pasada— no estaba montado. | Que la comparación no cambie puede querer decir que el cambio no rompió nada… o que los datos de prueba no tienen el caso. Antes de darla por buena, comprueba que el escenario existe **en el doble**, no solo en la base. |

| **v93** — una prueba dio por hecho que una partida sin fecha de entrega no debía tocarse al correr la cadena. `_correrPlan` sí le corre el INICIO (tiene uno) y no le inventa entrega — que es lo mismo que hace en el modo selección y en el panel. La equivocada era la prueba. | Cuando una prueba choca con una regla que ya vive en un solo sitio, sospecha primero de la prueba. Cambiar el criterio «solo para este caso» crea una segunda aritmética de fechas, y dos criterios terminan dando números distintos. |

| **v94** — `revAbrir(nm)` no soltaba `S.revPartida`: al cambiar de contratista desde el nivel 3 se seguía pintando el grupo del anterior, con sus ids fijados al abrir. Parecía que el contratista nuevo tenía las partidas del viejo. | Todo estado de «lo que tengo abierto» se suelta al cambiar de contexto. Si guardas ids fijados a propósito, quien cambia el contexto tiene que limpiarlos — si no, la pantalla enseña datos que no son de ahí. |
| **v94** — «Falta una aquí» elegía el apartamento SOLO cuando quedaba uno libre, sin decirlo. Ahorraba un toque y creaba la partida en un sitio que nadie nombró. | Adivinar está bien para ordenar y para sugerir. Para **crear** no: una partida que aparece donde nadie la puso cuesta más que el toque que ahorró. |
| **v94** — el prompt venía escrito contra `8201afa`/v76 y citaba `_pasoGuardar` y `pasoFecha`, que se fueron con el paso a paso en v81. Las CIFRAS, en cambio, estaban exactas: 1.077 / 394 / 124→807 / 138/36 / el duplicado de 12 filas en 10 aptos. | Un prompt viejo puede tener el diagnóstico perfecto y las referencias podridas. Comprueba **las dos cosas por separado**: los números contra la base, y los nombres contra el código. Descartarlo entero por los segundos habría tirado un diagnóstico bueno. |

| **v95** — la Metodología documentaba **dos módulos que no existen**: el recorrido paso a paso (retirado en v81) con sus ocho botones, y «Hoy» (retirado en v84). Más un botón «Sin cambios hoy» que no existió nunca. La guía llevaba 14 versiones mandando a pantallas muertas. | Cuando retires una pantalla, **busca su nombre en la guía**. Un módulo se borra en un commit; su documentación se queda años diciendo que está ahí, y el usuario que la lee cree que hace algo mal. |
| **v95** — el barrido de vocabulario encontró **«✓ Lista»**, un sexto nombre para cerrar que el prompt no tenía en su tabla, y la tarjeta de actividad enseñaba `completado` crudo (el valor de la base) cuando estaba cerrada. | La tabla de un prompt es un punto de partida, no el inventario. **Haz el barrido tú**: `grep` de cada palabra y mira lo que queda. Lo que el prompt no vio es justo lo que lleva más tiempo sin arreglarse. |

| **v97** — la tecla `C` abría la caja de órdenes y **tapaba el atajo de Compras** que anuncia la barra lateral (`H O A E R C`): el segundo `else if(k==='c')` de la cadena era **inalcanzable**. Con la voz escondida, `C` vuelve a ser Compras. | Dos ramas con la misma condición en un `if/else if`: la segunda no se ejecuta nunca y nadie lo nota, porque la primera hace *algo*. Cuando añadas un atajo, comprueba que la letra no esté ya cogida más arriba. |
| **v97** — la tabla del prompt listaba siete sitios de voz. El barrido encontró **tres más**, y eran los que más se ven: el 🎙️ de la tarjeta de Obra, el de la fila de Actividades y el botón «Nota» de Revisión. Total real: **21 micrófonos visibles**. | Para esconder algo transversal no basta con la lista que te den: **cuenta lo VISIBLE antes y después**. 21 → 0 es una comprobación; «quité los siete que decía la tabla» no lo es. |

**El patrón de todos los bugs graves:** las pruebas pasaron y el app se
cayó igual. **Lo que los cazó fue abrir el app publicado con la base
real** — o el usuario, parado en la obra.

Cuando arregles un bug, la prueba nueva tiene que **fallar contra la
versión anterior** antes de darla por buena. Si pasa en las dos, no está
probando el arreglo.

---

## 7. Cómo verificar antes de subir — obligatorio

**1. Sintaxis.** Extrae los bloques `<script>` inline a un archivo y
corre `node --check`. El app es un solo HTML: un paréntesis suelto lo deja
en blanco.

**2. Contra datos reales.** Abre el app publicado
`https://nilsonemorales-sketch.github.io/mecca-agenda/` en un navegador de
pruebas y comprueba tu cambio contra la base real.

> **SOLO LECTURA.** Intercepta `window.sb` y deja cualquier PATCH o POST
> en memoria. A Supabase no puede llegar ninguna escritura. Reporta
> cuántas interceptaste: tiene que ser el número esperado.

**3. Lado a lado con la versión anterior.** Saca el `index.html` de antes
(`git show HEAD:index.html`), sírvelo en otro puerto y corre el mismo
script contra los dos. Es la única forma de decir «no rompí nada» sin que
sea una opinión.

**4. Reporta siempre estos números, con datos de verdad:**

- lo que agregaste o arreglaste, con su conteo
- los ocho filtros rápidos
- las cuatro vistas

Si alguno cambió respecto a antes de tu cambio, **no subas: arréglalo.**

**5. Sube `APP_VERSION`** (línea ~820, formato `'AAAAMMDD_NN'`).
Sin eso el usuario no sabe si le bajó la versión nueva.

---

## 8. La base de datos

Proyecto Supabase `qeurcozssghkqgezilfj`. Catorce tablas (más backups).
Conteos al **13 de septiembre de 2026** — crecen cada día, tómalos como
orden de magnitud.

| Tabla | Para qué | Escala real |
|---|---|---|
| `obra_actividades` | El corazón. Cada partida de obra. 39 columnas. | **2,455 filas**, 1,142 abiertas |
| `obra_cambios` | Historial de todo lo que se escribe. Quién, cuándo, qué. | **4,833 filas** |
| `obra_personal` | Contratistas y personal propio. | 37 |
| `obra_asistencia` | Asistencia diaria. | ~1,400 |
| `obra_ordenes_compra` | Órdenes a proveedores. | ~72 |
| `obra_config` | Configuración compartida, clave/valor. | — |
| `obra_bitacora`, `obra_penalidades`, `obra_planos`, `obra_planos_mapa`, `obra_plan_semanal`, `obra_plan_actividades`, `obra_semanas`, `obra_tareas` | Bitácora, penalidades, planos, plan semanal. | — |
| `obra_partidas`, `obra_partida_actividad` | **Del módulo de PRUEBA «Partidas» (v98, v100, v101).** Guarda DOS niveles en la misma tabla, separados por `tipo` (`presupuesto` / `agenda`). **Sin `cantidad` desde v101.** Se borran las dos y el app queda como en v97. | 274 + ~391 al sembrar |

### Cosas de los datos que hay que saber

- **`REC_ORDEN`** define los 11 apartamentos y su orden. Úsala, no
  inventes otra lista:
  `N2 — Apto 2A`, `2B`, `N3 — 3A`, `3B`, `N4 — 4A`, `4B`, `N5 — 5A`,
  `5B`, `N6 — 6A`, `6B`, `N7 — Penthouse B`.
  Hay otras áreas que **no** son apartamentos: `Parqueo`, `Fachada
  Frontal`, `Fachada Posterior`, `Escalera Principal`, `Escalera de
  Emergencia`, `Terraza`, `General`, `Toda la obra`, y las áreas comunes
  de cada nivel (`N7 — Áreas Comunes N7`).
- **`tipo_personal`** no es de fiar. Vale `contratista`, `propio`, o está
  vacío. Un filtro que exija `'contratista'` va a dejar fuera trabajo
  real.
- **`personal_nombre`** puede traer **varios nombres separados por coma**
  («Antonio, Gregory, Maison…»). Hay helpers: `_responsables()`,
  `_ingenieros()`, y `_personaEn(actividad, nombre)` para preguntar si
  alguien está en una partida.
- **Las fechas son texto**, formato `AAAA-MM-DD`, y **pueden venir
  vacías**: 89 actividades abiertas no tienen fecha de fin. Compara
  siempre contra `''` antes de usarlas.
  Ojo: `fechaVenc()` cae en `a.fecha` cuando `fecha_fin` viene vacía. Eso
  vale para MOSTRAR y para ORDENAR, pero **no para contar**: desde v92
  `isRetrasada` e `isProximaRetraso` miran `fecha_fin` a secas, y «vencida» y
  «sin fecha de entrega» ya son excluyentes.
- **`porcentaje` es texto**, no número. `'0'`, `'50'`, `'100'`.
- **Dos de cada tres actividades abiertas están vencidas** (757 de 1,142).
  **No diseñes suponiendo que las fechas son confiables.**
- Una partida marcada `completado` **no siempre está hecha**. Ya pasó con
  el ajuste de puertas y con «Tapar patinillos con sheetrock». Cuando el
  usuario diga en un recorrido que algo falta, **búscalo también entre las
  completadas** antes de crear una partida nueva encima.

---

## 9. El motor `Parecido`

Agrupa partidas que son el mismo taller escrito distinto («Revestimiento
en cerámica — cocina caliente» ≈ «Revestimiento de cocina caliente»).

Funciones: `normalizar`, `raiz`, `sitiosDe`, `nivelesDe`, `parecido`,
`buscarParecidas`.
Umbrales: `UMBRAL_DUPLICADO` 0.90, `FALTA_UMBRAL` 0.72, `APLICAR_UMBRAL`
0.80.

Lo usan «¿Falta algo aquí?», el aviso de duplicados y la vista Matriz.
**Si necesitas agrupar talleres, usa este motor.** No escribas otro: si
dos pantallas agrupan distinto, cuentan distinto y el usuario deja de
creerle al app.

`nivelesDe` existe porque el detector daba «100% parecidas» a «hasta el
4to nivel» y «hasta el 4to a 7mo nivel», que son partidas distintas.

`ETAPA_VERBO` existe porque daba casi 100% a «Instalar las puertas» y
«Ajustar las puertas instaladas». Instalar, ajustar, dar acabado,
corregir, revisar y limpiar son **etapas distintas** del mismo taller: si
dos partidas están en etapas distintas, el parecido se corta en 0.55. El
verbo se busca por orden de aparición en el texto, no por orden de la
tabla — si no, «ajustar las puertas **insta**ladas» salía como «instalar».

---

## 9.5 Una acción, una palabra — en un solo sitio

**`PAL_COMPLETADA` y `PAL_SIN_CAMBIOS`** viven junto a `MODULOS_OCULTOS`
(index.html, ~línea 880). **Toda pantalla las usa desde ahí.** 27 sitios usan
la primera, 8 la segunda.

Cerrar una partida llegó a llamarse de **seis** formas: «Hecha», «Ya está»,
«✓ Ya está», «✓ Lista», «Completada» y «Completado». Revisar-sin-cambio, de
**dos**: «Sigue igual» y «Sin cambios». El dueño pasó semanas arreglando ese
mismo defecto **en los datos de la obra** — dos vocabularios para el mismo
trabajo es la razón por la que un apartamento no cerró con su nivel. No tiene
sentido que el app tenga el defecto que él corrige a mano.

**La regla: si una acción se llama de dos formas, es un bug.** Si añades una
pantalla que cierra o que registra «sin cambios», usa la constante. Escribir
la palabra a mano es cómo se volvió seis.

**Lo que NO se unifica:**

- **Los patrones de voz** (`Comandos`, `REGLAS`). El botón se lee, la voz se
  habla: el ingeniero dice «termínala», «está hecha», «al cien», y todas tienen
  que seguir entendiéndose. **No las toques al renombrar botones.**
- **El valor de la base** sigue siendo `completado`. Esto es solo lo visible.
- **«Sin cambios registrados aún»** (historial vacío) y **«Ya estás en la
  última versión»** no son botones.

**Un hueco conocido de la voz, comprobado idéntico en v94 y v95:** decir
**«ya está la instalación de luces»** NO se entiende — la regla exige la
palabra de cierre **al final** de la frase. «La instalación de luces está
hecha» sí. No es una regresión del renombrado; viene de antes.

## 9.6 La voz está ESCONDIDA, no retirada (v97)

**`VOZ_ACTIVA = false`** y **`vozActiva()`**, junto a `MODULOS_OCULTOS`
(index.html, ~línea 883). **Volver a encenderla es cambiar ese `false` por
`true`. Nada más.**

**No se borró ni una línea del motor.** Siguen enteros: el Worker, la clave en
`obra_config` (`voz_api_url`, `voz_api_clave` — **no los borres de la base**),
`Comandos` y sus patrones, `_cmdVoz`, `_cmdGrabar`, `_cmdAnalizar`,
`dictarSobre` y `cargarVozApi`. Lo que hay son **diez guardias**, todas la
misma línea.

**Qué apaga:** el botón de la cabecera (`#btn-cmd`, se oculta en el arranque
porque es HTML fijo), la tecla `C`, `abrirComando()`, `#cmd-mic`,
`dictarEnRecorrido()`, `revAltaDictar()`, el botón «Nota» de Revisión, el 🎙️
de la fila de Actividades, el 🎙️ de la tarjeta de Obra, y la llamada a
`cargarVozApi()` al arrancar — **una consulta menos a `obra_config` en cada
carga**. Medido: **21 micrófonos visibles → 0**, y con la bandera en `true`
vuelven los 21.

**El micrófono DEL TECLADO del teléfono no es esto.** Es del sistema operativo
y sigue funcionando en todos los campos de texto. Los avisos que lo mencionan
se quedan.

### Los TRES problemas que hay que resolver antes de encenderla

Se escondió porque **se comporta distinto según por dónde entre el audio**, y
media función en obra es peor que ninguna: si no sabes si registró, la vuelves
a hacer o la dejas sin hacer.

1. **El patrón no entiende «ya está la X» ni «la X ya está»**, que es como se
   dice en obra — la regla exige la palabra de cierre **al final**. Lo salva la
   IA del Worker, pero **solo con señal**.
2. **«Las luces están listas» entra, pero mal**: se lleva el «están» pegado al
   nombre y busca una partida llamada «las luces están». **Un mal entendido es
   peor que un no-entendido.**
3. **Los dos caminos del audio no dan lo mismo.** El reconocedor del navegador
   llama a `_cmdAnalizar(txt)` **sin** el segundo argumento, así que no permite
   la IA; el camino del Worker sí (`_cmdAnalizar(txt, true)`). **La misma frase
   da dos resultados distintos según por dónde entre.**

**Arregla los tres —y unifica los dos caminos— antes de poner `true`.**

## 10. Estilo

- **Comentarios en español**, y explican **por qué**, no qué. El «qué» se
  lee en el código. El «por qué» se pierde.
- Cuando arregles un bug, deja escrito **qué pasaba y por qué**. Varios
  comentarios del archivo son eso, y han evitado que se repita.
- **JavaScript llano.** Sin frameworks, sin TypeScript, sin librerías
  nuevas. `var` y `function` conviven con `const` y flechas: sigue el
  estilo del bloque que estés tocando.
- Los mensajes al usuario, en español de obra. Mira `showToast` para el
  tono.
- Mensajes de commit en español, explicando el cambio como se lo
  explicarías al dueño de la obra.

---

## 11. Cómo trabajar aquí

1. Lee el código alrededor antes de escribir. Casi todo lo que necesitas
   ya existe con otro nombre.
2. Haz **una sola cosa** por tarea. Este archivo aguanta mal los cambios
   grandes de golpe.
3. Prueba, y prueba contra datos reales.
4. Si algo no cuadra entre lo que te pidieron y lo que ves en el código
   o en los datos, **dilo antes de programar**. Ya pasó: un criterio
   equivocado en la instrucción produjo un filtro que daba cero. Y ya pasó
   al revés: se pidió construir dos pantallas que llevaban veinte
   versiones hechas.
5. El usuario trabaja **con selección múltiple**: ofrécele opciones para
   escoger, no preguntas abiertas.
