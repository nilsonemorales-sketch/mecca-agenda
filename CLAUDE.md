# Mecca Agenda — contexto del proyecto

**Al día a v94 — 16 de septiembre de 2026.** Antes de escribir, comprueba
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
  «Falta», «Ya está», «Sigue igual», «Vencidas». No «status», no «commit»,
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
a **v94 (16 sep 2026)**. Si lo que vas a hacer se parece a algo de aquí,
**amplíalo en su sitio; no lo hagas otra vez en otra pestaña.**

El menú es: **Obra · Actividades · Equipo · Reportes · Fotos · Planos ·
Compras · Bitácora · Gerencia · Metodología.** El app **abre en Obra**
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
cuatro: `25% · 50% · 75% · ✓ Ya está` y `Sigue igual · +1 sem · Viernes ·
🎙️`. **Cuatro por fila y no cinco**: a 390px el quinto deja las etiquetas
ilegibles al sol. Por eso en v89 entró «Sigue igual» y salió «Hoy» —poner la
entrega en hoy sobre una partida que tienes delante es lo que menos se hace
de las tres fechas, y sigue estando en Actividades.

**«Sigue igual» (`trIgual` → `Acciones.revisar`) es la pieza del
seguimiento.** NO toca la actividad —ni estado, ni avance, ni fecha, ni
notas—: solo deja constancia en `obra_cambios` de que alguien la miró. Sin
ese rastro el app sabe qué está vencido pero **no sabe qué ya miraste**, y
cada mañana salen las mismas revueltas: las que resolviste ayer y las que
nadie ha visto en tres semanas, iguales en pantalla. El botón existía desde
v76 pero solo dentro del modo selección de la lista, y se usó **cero veces
en toda la obra** — por eso se trajo a donde se trabaja.

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
| **Dejar dicho que la miraste y sigue igual** | **Obra**, botón «Sigue igual» — `trIgual()` → `Acciones.revisar()`. No toca la partida |
| **Lo que nadie ha mirado hace semanas** | **Obra**, atajo «Sin mirar» — `FILTRO_HUECO.congeladas`, `_ordenCongeladas()`, `_diasQuieta()` |
| **Mover TODAS las fechas de un sitio o un contratista** | **Obra**, barra «Todas a…» — `trTodas()` |
| **REGISTRAR con todo el detalle** | **Actividades**, al abrir la fila — `_actFilaRapidaHTML()`, `_actFilaAvanceHTML()` |


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

### Las cadenas (`predecesoras`) — dos formatos en la misma columna

En la base conviven **objetos** `[{"id":"x","tipo":"FS","lag":0}]` (369 filas)
y **textos** `["x"]` (3 filas, todas completadas). Todo lo que las usa compara
contra `a.id`, que es un texto, así que con los objetos la comparación daba
siempre `false` **en silencio**: 121 partidas abiertas que esperan por otra
sin terminar nunca enseñaron el candado 🔒, y el editor abría en blanco las
predecesoras que ya tenían puestas.

**Lee siempre por `getPreds(a)` o `_predIds(campo)`**, que normalizan con
`_normPreds` a ids de texto. Nadie lee `tipo` ni `lag` en todo el archivo. No
compares `a.predecesoras` a mano.

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

**Correr la cadena (v93).** Al mover una entrega hacia adelante, el app
ofrece correr también lo que espera por ella: `_cadenaAbajo(id)` baja por
TODA la cadena (no solo el eslabón siguiente) con un `vistos` que corta los
ciclos, y `_ofrecerCorrerCadena(id, dias, detalle)` pregunta y aplica.
Lo usan `actFilaCorrer`, `trCorrer`, `actFilaFecha` y `trFecha`.

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
- Modo selección: reprogramar en bloque, cerrar en bloque, «Sigue igual»
- **Revisión por contratista**: los cuatro números de la cabecera
  (abiertas, vencidas, sin fecha, **en curso** — «revisadas» va en la
  línea de arriba, no en las tarjetas), el orden por `REC_ORDEN` y las
  áreas plegables
- **Paso a paso**: los ocho botones (Ya está · Sigue igual · Cambiar
  avance · Ponle fecha · Iniciar/Retomar · Interrumpir · No aplica aquí ·
  Saltar), el micrófono, el Atrás y el resumen final
- **La sub-nav de Actividades** (Actividades · Kanban · Revisión) se ve
  **siempre**. Esconderla en la vista de entrada deja Kanban y Revisión sin
  ninguna puerta — pasó en v77 y es el mismo error de v58
- **«Todas» carga las 2.465 filas**, no 500. El tope viejo estaba
  invertido: pedir «ver todas» lo bajaba

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
