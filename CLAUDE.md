# Mecca Agenda — contexto del proyecto

**Al día a v117 — 19 de septiembre de 2026.** Antes de escribir, comprueba
la versión real del repo (`APP_VERSION` en `index.html`, línea ~890): este
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
a **v117 (19 sep 2026)**. Si lo que vas a hacer se parece a algo de aquí,
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
| **Renombrar o juntar una ubicación, o ponérsela a las que no tienen** | **Partidas → Ubicaciones** — `catUbicsAbrir()`, `_catUbicMover()`. Toca el `area` de todas sus actividades, avisando a cuántas |
| **Crear una ubicación que no existe todavía** | **Partidas → Ubicaciones → «+ Nueva ubicación»** — `catUbicNuevaAbrir()` (v116). Vive en `obra_ubicaciones` y nace vacía |
| **Poner un avance a mano en lo construido antes de mayo-2026** | **Partidas** — `catManualAbrir()`, en el capítulo, en la línea del presupuesto y en la ubicación. Nunca se mezcla con el contado ni sube de nivel |
| **Armar el plan: jerarquías, entregables y notas** | **Partidas → vista Árbol** — `_catArbolHTML()`, `nodosSembrar()`, `nodoNuevoAbrir()`, `nodoMoverAbrir()`. Es el OTRO eje; no toca el catálogo |
| **Ver y trabajar el cronograma** | **Partidas → Cronograma** — tabla de filas que se abren con sus botones (v115). Columnas: quién, costo, inicio, fin, fin real, días, estado. El nombre va fijo a la izquierda, en dos líneas, y el costo abreviado (v117) |
| **Los otros tres botones de una tarea** | **Partidas → Cronograma → la fila abierta → «Más»** — Avance a mano, Correr fechas y Abrirla sola (v117). Son las mismas llamadas de siempre |
| **Refechar el plan, que venció en julio** | **Partidas → Cronograma → «Refechar el plan entero»** o «Correr fechas» en una tarea — `nodoCorrerAbrir()`, en días de trabajo y con deshacer |
| **Ver el atraso y las barras en el tiempo** | **Partidas → vista Tiempo** — `_catTiempoHTML()`, `_nodoEstado()`. La barra se llena con el avance de la obra |
| **Cambiar fechas, duración, costo o predecesoras** | **Partidas → una tarea → «Fechas y costo»** — `nodoPlanAbrir()`. Deja rastro con viejo y nuevo |
| **Repartir las 430 sin sitio en el cronograma** | **Partidas → Árbol → «Por ubicar»** — `nodoUbicarAbrir()`, «Llevar a…» |
| **Poner las operaciones de un elemento** | **Partidas → Árbol → un elemento** — `nodoOperaciones()`, `CAT_OPERACIONES`. Plantilla, no siembra |
| **Meter actividades que ya existen en un entregable** | **Partidas → un nodo → «Traer actividades»** — `nodoTraerAbrir()`. No cambia la actividad |
| **Ver lo mismo de otra manera** | **Partidas**, selector `[ Lista ] [ Edificio ] [ Matriz ] [ Árbol ]` — `catVistaSet()`, `_catAmbito()` |
| **Ordenar las partidas a tu gusto, renombrarlas, juntarlas, quitarlas o agregar** | **Partidas → un capítulo → «Por partida»** — `_catPorPartidaHTML()`, `CAT_ORDENES`, `catPartidaCorrer()`, `catPNuevaAbrir()` (v114) |
| **Sacar del plan lo que sobra** | **Partidas → Árbol → «Lo que está fuera del plan»** — `catFueraAbrir()`. Descartar **no borra** |


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

**Los grupos de la lista se separan POR CONTRATISTA, no en un montón (v105).**
`getActGroupsFromActs` agrupa según `S.actFiltro`, y de sus ocho modos hay tres
que tocan personal. Hasta v104 dos de ellos —«Tipo de personal», que es **el de
entrada**, y «Personal x la casa»— metían a **todos** los contratistas en un
solo bloque «Contratistas». Con 958 de las 1.059 abiertas en ese bloque, era
casi la lista entera bajo una cabecera que no dice de quién es nada: había que
leer la columna de responsable renglón a renglón. Ahora sale uno por
contratista —hoy **17 grupos**— con el prefijo «Contratista · » porque encima
van los del personal propio con el nombre pelado.

El criterio de quién es cada contratista vive en **`_contNombres(acts)` y
`_contActs(acts,c)`**, y **nada más que ahí**. Lo usan los tres modos: tres
copias del mismo criterio terminan contando distinto.

**El agrupador que se toca es el `<select>`, no las pastillas.** Las pastillas
(`grupoPills`) tienen las mismas etiquetas pero viven dentro del panel de
Filtros, que viene **plegado**. Es la trampa del v58: una prueba que las
clickee está tocando lo que el usuario no puede tocar.

**Los grupos tienen que sumar el total de la cabecera.** Las que no tienen
`tipo_personal` —hoy 9 abiertas— no son `propio`, ni `contratista`, ni
`ingeniero`: **desaparecían de la pantalla agrupada** en los tres modos, y en
«Contratista» faltaban además las 9 de ingeniero. Ahora hay bloque **«Sin tipo
de personal»** y los tres modos suman 1.059 y 347 vencidas. Si un modo suma
menos que la cabecera, alguien volvió a dejar un `tipo_personal` fuera.

### La planificación por partidas madre (v106) — el esqueleto de Partidas

**Una línea de presupuesto NO es una unidad de trabajo.** Palabras del dueño:
*«hay términos que son de presupuesto y tú los copiaste y los pegaste igual. Y
aquí estamos haciendo una planificación: una que contenga lo ya realizado y lo
que falta por hacer, agrupándolo en partidas madres».* «Zapata ZR-1, 6.12 M³»
sirve para medir y para pagar; nadie sale a la obra a hacer «Zapata ZR-1».

**Las 274 del presupuesto SE QUEDAN en la base** —son el amarre con lo
contratado y con lo que se paga, y siguen sin poder editarse— pero **dejaron de
ser el esqueleto de la pantalla**. Se entra a ellas desde abajo del capítulo,
con «Las líneas del presupuesto (N)» (`catCurarAbrir`, `S.catCurar`): es trabajo
de escritorio, no de obra. El esqueleto es:

```
CAPÍTULO  →  GRUPO DE TRABAJO  →  UBICACIÓN  →  ACTIVIDADES
```

y **ninguno de los cuatro niveles necesita que el dueño clasifique nada a
mano**: el capítulo sale de `_catCapDe`, el grupo de las palabras del nombre
(`_catSubDe`), la ubicación del campo `area`. La curación dejó de ser el peaje
de entrada.

**El grupo lo arma `CAT_SUBGRUPOS` y GANA LA PRIMERA REGLA QUE COINCIDE**, así
que el orden de cada lista es parte de la regla: no lo reordenes sin volver a
medir. Solo se subdividen seis capítulos (8.00, 4.00, 10.00, 11.00, 5.00,
12.00); los demás van de capítulo directo a ubicación porque son chicos y
partirlos sería ruido.

**Los nombres de los grupos los escogió el dueño; las PALABRAS no** —salieron de
leer la base—, y por eso **el grupo se corrige a mano y lo corregido MANDA**:
`obra_partidas.grupo` (columna nueva de la v106), sobre la PARTIDA, no sobre
cada actividad. `catMoverGrupo` lo escribe y `_catGrupoDe` lo prefiere sobre la
regla. Se puede devolver a la regla vaciándola. Y se pueden **crear grupos**
(`catGrupoNuevoCrear`, el dueño lo pidió para los *talleres pendientes*): viven
en `obra_config`, clave `cat_grupos`, un JSON — así el módulo se sigue borrando
entero con las dos tablas.

**«Luces», NO «Luces y abanicos»:** la palabra «abanico» sale en **una sola
actividad de toda la obra**. Nombrar un grupo de 69 por una mención es mentir
sobre lo que hay dentro. Lo corrigió el dueño.

#### El orden que la obra ya demostró — y por qué no hay fechas

Los apartamentos de abajo van muy por delante, así que **ya demostraron en qué
orden se hacen las cosas**. Lo que falta en una unidad sale ordenado por la
**mediana de la fecha en que esa misma descripción se cerró en las OTRAS
unidades** (`_catPrecedentes`, `_catOrdenFaltantes`). No es un Gantt inventado:
es su propia obra devuelta.

- **Cada línea dice en cuántas unidades se basa** («visto en 3»). «Visto en 1» y
  «visto en 5» no valen lo mismo y el dueño tiene que distinguirlo de un vistazo.
- **Lo que no tiene precedente va en su propio bloque al final**, SIN posición
  inventada. Ese bloque va a ser grande, y está bien.
- **NINGUNA FECHA FUTURA CALCULADA.** Es un orden, no un calendario: poner
  fechas exigiría duraciones, y el presupuesto se quedó sin cantidades por
  decisión del dueño en la v101.
- La comparación es por **texto exacto**, y ahí está el argumento para curar:
  «Instalacion Pisos Porcelanato» no se reconoce con «Instalación Pisos
  Porcelanato». Cuando el dueño junte esas dos con Juntar, el precedente sube.

**Las fechas de cierre salen de `obra_cambios`**, porque `obra_actividades` **no
tiene columna de cuándo se cerró algo**. `cargarCatalogo` las pide filtradas
(`accion in (completado,completar)`, dos columnas, ~1.500 filas) y las guarda en
`S.catCierres`. Cubren **1.273 de las 1.405 cerradas**: a las otras 132 nadie
les registró el cierre, así que no hacen de precedente — y eso es correcto, no
se inventa una fecha. Si esa consulta falla, el módulo **abre igual** y la
pantalla dice que no hay orden demostrado.

#### Buscar, que es como se registra rápido

Queja textual: **«todavía se dificulta registrar»**. La caja va **arriba y
siempre visible en los cuatro niveles**, sobre las **2.466** —abiertas y
cerradas—, por descripción, área o contratista, sin acentos ni mayúsculas.
Espera 260 ms a que deje de teclear, corta en 50 con «Ver 50 más», y dice
cuántas encontró. Medido: **3 ms** filtrar las 2.466, **8 ms** pintar las 50.

#### `_catMapa` — el índice partida→actividades

`_catActsDe` recorría las 2.466 enteras por cada partida: pintar un capítulo con
200 partidas eran medio millón de comparaciones. El sello se cae solo cuando
cambia el número de actividades o de amarres; `Acciones._sincronizar` parchea los
objetos **en sitio** (`Object.assign`), así que un avance nuevo se ve sin
reconstruir nada.

#### `AC` — un capítulo que NO existe en el presupuesto

El trabajo de aires acondicionados existe pero estaba repartido en cuatro
capítulos, porque cada paso es de un oficio distinto: la posición es del técnico
de aires, el drenaje del plomero, la alimentación del electricista y el registro
del de sheetrock. Nadie podía contestar «cómo va el aire del gimnasio».
Decisión del dueño: **capítulo propio**, `AC`, con las **6** del lobby y el
gimnasio. Va **al final de `CAT_CAPITULOS`, antes de `'0'`**, para que el
desempate por índice de `_catCapMayoria` siga dando lo mismo en todo lo demás.
Las correcciones de registro de la habitación secundaria y de la sala del
penthouse **no entran**: esas son de la unidad, no del área común.

#### EL CAPÍTULO ESTÁ GUARDADO — cambiar la regla no mueve nada por sí solo

`obra_partidas.capitulo` se escribió al sembrar. **Corregir `_catCapDe` en el
código no reclasifica ni una partida.** En la v106 hizo falta un `UPDATE` de una
sola vez sobre las partidas de la **agenda** (no es una resiembra: es la regla
arreglada). Medido antes de ejecutarlo: **cambian 27 partidas y ninguna otra**,
así que no se pisó ninguna curación del dueño. Si vuelves a tocar `_catCapDe`,
**mide el diff antes y dilo**; y al mover de capítulo se suelta `padre_id`,
porque la subpartida que tenía es de otro capítulo.

Dos reglas que se corrigieron ahí, medidas contra la base:

- **`Carpintería` iba a Puertas y es Hormigón** (`'3.00'`): la carpintería de
  obra es encofrado, no portaje. 5 actividades.
- **Las gavetas y los gabinetes de cocina caían en Puertas.** La regla del
  Ebanista solo miraba `gabinete|mueble de ba|closet|isla|pantry`. Ahora lleva
  `gaveta|gabeta|gabiten|cocina` — así está escrito en la obra. **36 actividades.**
  *Avisado:* `cocina` es ancho y arrastra dos que son de puerta («desmontar la
  puerta de paso… que da acceso a la cocina caliente», «retoque de pintura —
  puerta de la cocina caliente»). El dueño decide si se afinan; para eso está
  «No es de este grupo».

**«Organización y Fijación Tubos Patinillos»** (11 actividades, hoy en Puertas)
**se queda donde está**: no es de puertas, pero de quién es lo dice el dueño.

#### Editar de verdad desde el módulo (v107)

Palabras del dueño: *«necesito poder editar actividades. Me siento muy limitado
en el módulo de prueba, no tengo todas las funciones»*. La tarjeta sabía hacer
seis cosas —Sin empezar, En proceso, un porcentaje, Completada, Nota y Foto— y
todo lo demás (el nombre, el apartamento, el contratista, las fechas, la cadena,
los pendientes) estaba en el app **sin una sola puerta desde Partidas**.

**NO se hizo un formulario nuevo.** `revCard` ganó tres botones —**Editar ·
Repetir en… · Borrar**— y Editar abre **el de siempre**: `editAct` →
`showAddAct`, que reparte en los tres tipos (propio / contratista /
administrativa) y guarda por `saveAct` → `Acciones`. Dos formularios para lo
mismo serían dos verdades sobre cómo se registra el trabajo, que es el error que
este proyecto ya cometió con Hoy y con En Obra.

**`editAct` y `delAct` trabajan por ID y miran `S.catActs`.** Aquí estaba la
trampa: `showAddAct` va por **índice de `S.acts`**, y `S.acts` se pide con
`estado=neq.completado`. Partidas es la única pantalla que enseña trabajo
cerrado, así que sobre las **1.406 cerradas** el botón no habría hecho
absolutamente nada — sin error y sin mensaje. Es el mismo fallo que costó la
v103 en otra función. Ahora los dos usan **`_findActAny`**, meten la actividad
en `S.acts` antes de abrir el formulario, **avisan si no la encuentran** y
repintan con **`_repintarDondeEstoy()`** — con `renderActs()` a secas, editar
desde el catálogo repintaba la pantalla equivocada.

**La tanda llama a `Acciones` una vez por actividad, pero repinta UNA sola vez.**
Marcar varias y cambiar contratista, entrega, grupo o estado: cada actividad
pasa por la capa —para que selle su hora y deje su rastro— y el repintado va al
final. Repintar por fila sobre decenas de tarjetas es lo que hacía que cada toque
fuera un tirón (v86). **Una que se caiga no tumba las demás y se dice CUÁL**, el
mismo criterio del Repaso. Y la tanda entera **se deshace de golpe**
(`catTandaDeshacer`, con el retrato de antes guardado en `S.catUndo`), igual que
`cadDeshacerTanda` en la v104.

Del estado solo se ofrecen **Completada** y **Sin empezar**: un porcentaje a
medias en bloque no significa nada, porque no todas las partidas de una tanda van
por el mismo sitio. Y cerrar va por **`Acciones.completar`**, el mismo camino que
el botón de la tarjeta.

**Duplicar copia el TRABAJO, no el AVANCE.** «Repetir en…» ofrece solo los
apartamentos que **todavía no la tienen** —comparando por descripción, el criterio
exacto del Repaso—, **los enseña antes de crearlos**, y reusa
`Acciones.crear(datos,{ubicaciones:[...]})`, que ya sabe crear una por área. Se
copian descripción, contratista, tipo y la ventana de fechas; **no** se copian
porcentaje, estado, notas, fotos ni horas: nacen en cero.

**Lo que nace aquí queda dentro del grupo.** Una actividad recién creada no tiene
partida y caería en la bandeja de sueltas, fuera de donde el dueño está parado.
`_catAmarrar` le busca la partida por descripción exacta y, si no existe, la crea
con el capítulo y el grupo de donde nació. **Si la partida ya existía en otro
grupo NO se le cambia el grupo**: el dueño la movió ahí y un alta no es motivo
para mover trabajo ya clasificado. Si el amarre falla, **se dice** — la actividad
sí se creó y buscarla en el grupo y no encontrarla es peor que el error.

**El rastro del borrado va ANTES del borrado** y lleva **estado, avance,
responsable y ubicación**. Hasta la v106 el `logCambio` de `Acciones.eliminar` iba
DESPUÉS del DELETE y decía solo «Actividad eliminada»: si la red se caía en medio
no quedaba nada escrito, y aunque cuajara, el historial no guardaba en qué estado
ni de quién era lo que se fue. Una actividad borrada no se puede volver a mirar: o
el rastro lo dice todo, o se perdió. Si el borrado no cuaja se escribe una segunda
línea diciéndolo; la primera **no se retira**, porque «se intentó borrar esto» es
verdad.

**Los paneles de borrar, repetir y la tanda viven fuera de `#c-catalogo`**
(`_catPanelHost`, el mismo patrón que la salud de cadenas de la v104): `revCard`
se pinta desde Partidas **y** desde Revisión, y la pregunta tiene que salir en las
dos sin que cada pantalla sepa pintarla. Llevan `var(--st)` arriba y `var(--sb)`
abajo — sin eso la × nace debajo del notch del iPhone (v78).

**Las casillas van FUERA de `revCard`** (`_catCasillaHTML`), no dentro: `revCard`
se pinta también en Revisión, donde el modo marcar no existe. Meterlas dentro
habría sido una tarjeta con dos comportamientos según quién la pinta.

**`Acciones.crear` empuja también a `S.catActs`** y avisa con `_catTrasCrear`. Sin
lo primero, lo recién creado no aparecía en Partidas hasta recargar, porque el
catálogo tiene su propia carga. Las dos líneas están en la capa de escritura
porque es el único sitio que sabe con certeza que la actividad existe en la base.

#### La estructura vive en la BASE, no en el código (v108)

Palabras del dueño: *«quiero poder visualizar las partidas madre en una lista y
poder agregar lo que sea necesario y poder trabajar todo desde la app»*.
Mientras `CAT_CAPITULOS` y `CAT_SUBGRUPOS` fueran constantes, **cada partida
madre nueva era una versión nueva** — pasó dos veces en dos días, `AC` para los
aires del lobby y del gimnasio y la verja perimetral, y va a volver a pasar
porque la obra descubre trabajo que el presupuesto de 2024 no tenía.

Ahora viven en **`obra_capitulos`** y **`obra_subgrupos`**, y se leen por
**`_capsLista()`** y **`_sgLista(cap)`**. Nada lee ya las constantes
directamente.

**LAS CONSTANTES SE QUEDAN EN EL ARCHIVO COMO RESPALDO.** Si las tablas no
cargan o vienen vacías, los dos accesos caen en `CAT_CAPITULOS` y
`CAT_SUBGRUPOS` y el módulo sigue entero — con un aviso en la pantalla de
partidas madre diciendo que no se puede editar. Un catálogo que se cae porque
no contestó una tabla no sirve en una obra. **No las borres.**

**EL CÓDIGO DE UN CAPÍTULO NO SE EDITA NUNCA.** Es el amarre con el presupuesto:
si se cambia, la estructura deja de cuadrar con lo contratado y con lo que se
paga. Se cambia el **nombre**, que es lo que se lee. Un código repetido se
rechaza **diciendo cuál es** el que ya lo tiene.

**`en_presupuesto=false`** marca lo que la obra descubrió y el Excel de 2024 no
tenía. Hoy son dos: `AC` y `'0'`. Lo que se crea desde el app nace así, porque
si fuera del presupuesto ya estaría.

**`orden` ordena la lista Y ROMPE LOS EMPATES** de `_catCapMayoria` — ahora
`_catCapIdx` lee de `_capsLista()`, así que subir un capítulo en la pantalla
cambia de verdad quién gana. Comprobado: con 8.00 por encima de 5.00, el empate
1-1 de «Resane» pasa de 5.00 a 8.00 y vuelve al bajarlo. **`'0'` tiene que
quedar el último**: es lo que hace que un empate contra un capítulo de verdad lo
gane el capítulo de verdad, y por eso al crear uno nuevo se corre `'0'` detrás.

**Las palabras sustituyen a las expresiones.** Se guardan en llano, separadas por
coma, y se buscan **dentro** de la descripción normalizada con `_catNorm`: por
eso «grifer» coge «grifería». **Gana el primer grupo que coincide**, así que el
orden de los grupos es parte de la regla. Medido al convertir: **cero
actividades cambian de grupo** en los seis capítulos (1.706 actividades), en la
base y comprobado otra vez dentro del app contra la constante.

*Lo que costó llegar a ese cero, para que no se repita:* la conversión de
expresión a palabras tiene tres trampas y las tres se vieron midiendo, no
leyendo. `\b` desaparece —`gas` suelto también entra en «fu**gas**», así que la
palabra sembrada es **`de gas`**, que cubre las 53 sin coger la de las fugas—;
`\s?` es un espacio **opcional** y hay que emitir las dos formas, o se pierde
«denglass» pegado; y `[oa]s?` necesita expandir **también** la interrogación
suelta, o queda un `rotos?` que no casa nunca. **Si tocas el conversor, vuelve a
medir contra la base capítulo por capítulo.**

**«Otros» va siempre al final y no se quita.** Es donde cae lo que no reconoce
ninguna regla; sin él se pierde trabajo de vista. Al crear un grupo nuevo se
inserta antes y se corre «Otros» detrás.

**NINGUNA REGLA SE GUARDA SIN QUE EL DUEÑO HAYA VISTO QUÉ CAMBIA.**
`catSgProbar` simula la lista con el cambio puesto en su sitio y dice, antes de
escribir nada: cuántas quedarían, cuántas ya estaban, cuántas **entran** de qué
grupos y cuántas **salen** a qué grupos, con la lista de las que se mueven.
`catSgGuardar` **se niega si no se ha probado**. Sin esto, editar una regla es a
ciegas: en este proyecto una palabra mal puesta —«mueble de ba», que no cogía
«muebles de baño»— mandó 22 actividades al capítulo equivocado y nadie lo vio
hasta que se midió.

**«Ordenar las partidas de este capítulo»** es el botón que antes decía «Las
líneas del presupuesto (N) y las partidas sueltas». Ese nombre no decía en
ninguna parte que ahí se reclasifica y **el dueño lo buscó y no lo encontró**.
Mueve en bloque con `catMover`: una llamada por partida, **un solo repintado**, y
`catDeshacer` devuelve la tanda entera. Al cambiar de capítulo la partida **se
suelta de su línea del presupuesto** —la que tenía es de otro capítulo— y ahora
**se avisa**, no se hace callado.

*El caso que lo destapó:* de las 11 partidas de `2.00 Movimiento de tierra`, 9
están mal — seis son de plomería (agua negra, registros, trampas de grasa) y
tres de la verja y las casetas. Cayeron ahí porque la regla mira el oficio
Ayudante más *excavación*, *compactación* y *nivelación*: **excava el ayudante,
pero el trabajo es de otro.**

**Son 48 capítulos, no 47**: 29 numéricos (28 del presupuesto más «Sin
clasificar»), 17 CI, IMP.1 y AC.

#### EL CATÁLOGO NO PUEDE SERVIR DATOS VIEJOS (v109)

**Pasó en obra y casi cuesta caro.** El dueño vio una tarjeta que decía «sin
empezar · 4 días vencida» sobre `rec0817-2a-ptaserv` —«Instalación de la puerta
del baño de servicio», 2A—, que está **completada al 100% desde el 13 de
septiembre**, cerrada por él mismo. **Estuvo a punto de reabrir seis actividades
buenas por creerle a la pantalla.**

La causa: `cargarCatalogo()` corría **una sola vez por sesión** —la primera que
se entra a Partidas— y `refrescarApp()` (el ↺) recargaba `S.acts` pero **no**
`S.catActs`. Por eso la barra de arriba decía «sincronizado 8:56 p.m.» mientras
la tarjeta enseñaba un estado de hacía cinco días: **las dos cosas eran ciertas
a la vez**.

Cuatro piezas, y ninguna es opcional:

1. **El ↺ recarga también el catálogo**, pero solo si ya estaba cargado — no se
   paga esa consulta a quien no ha entrado a Partidas.
2. **Entrar con datos de más de 5 minutos los recarga solos** (`CAT_FRESCO_MS`).
   No se bloquea la pantalla: se sigue pintando lo que hay y se repinta al
   llegar lo nuevo.
3. **LA HORA DE ESOS DATOS SE VE**, arriba de las cuatro pantallas del módulo
   (`_catFrescoHTML`, dentro de `_catBuscaBarraHTML`, que es la única pieza que
   se pinta en todos los niveles). A los 15 minutos pasa a **ámbar**
   (`CAT_AMBAR_MS`), y mientras carga dice «trayendo datos…».
4. **Lo que se escribe desde otra pantalla lo marca viejo** (`catMarcarViejo`,
   llamado desde `_repintarDondeEstoy` cuando NO estás en el catálogo, y desde
   `loadAll`). `Acciones` parchea `S.catActs` de lo que pasa por él, pero las
   **partidas y los amarres no**, y lo que entra por otro camino —otra sesión,
   la cola que sale sola— tampoco.

**Si añades una pantalla que lea `S.catActs`, hereda este problema.** Un módulo
que enseña lo que no es, no se puede usar para decidir.

#### Posibles repetidas (v109) — que las busque el app

Queja del dueño: *«ir agrupando las actividades en esas partidas que creamos,
borrando las que sobren»*. `catJuntar` existe desde la v98, pero **había que
saber de antemano cuáles se repiten** y marcarlas a mano entre 1.029. Eso no lo
hace nadie.

**LOS TOKENS CORTOS CUENTAN, y esa es la decisión que hace que la pantalla sirva
o estorbe.** Comparando solo palabras de más de tres letras, «Limpieza en N6» y
«Limpieza en N7» salían al **100%** — y son **dos pisos distintos**: `N6` y `N7`
se caían por cortas. Contándolas dan **0,50** y no aparecen. Solo se tiran las de
relleno (`CAT_RELLENO_REP`: de, la, el, los, las, en, del, con, por, una, uno).
`parecido = palabras compartidas / las del nombre más largo`, **dentro del mismo
capítulo**.

Medido contra la base: **47** parejas a ≥0,90 · **214** a ≥0,75 · **498** a
≥0,60. **La pantalla abre en ≥0,90**: bajar de tramo es una decisión, no lo
primero que se ve.

- **Juntar reusa `catJuntarEn`** de la v98: las actividades pasan a la que
  queda, la otra se **desactiva, no se borra**, y `catDeshacer` lo devuelve. No
  se abrió un segundo camino para lo mismo.
- **Nada se junta sin ver las dos y escoger cuál queda**: los dos nombres están
  en pantalla con su número de actividades, y se toca el que se queda.
- **«No son la misma»** se guarda en `obra_config`, clave `cat_no_iguales`, un
  JSON de parejas. Sin esto las 498 del tramo bajo reaparecen en cada carga y la
  pantalla se vuelve ruido.
- **Un índice por palabra** evita comparar las que no comparten ninguna: sin él
  es n² dentro del capítulo. Y hay **tope de 2.000 parejas**, que la pantalla
  **dice** si se alcanza — una lista de diez mil no la revisa nadie y en el
  teléfono no se pinta.

**Las EXACTAS son otra cosa**: misma descripción **y** mismo apartamento, o sea
dos apuntes del mismo trabajo. Hoy son **15 grupos, 36 actividades, 21
sobrantes**. Se quitan en tanda por **`Acciones.eliminar`** —que desde la v107
escribe el rastro antes de borrar— y **se queda la MÁS ADELANTADA**: quedarse
con la de cero y borrar la cerrada sería tirar trabajo hecho.

#### El marcador y las partidas vacías (v109)

**`_catMarcadorHTML`** va en la portada del módulo y sale de la base al pintarse,
no se guarda: partidas, cuántas están colgadas de su línea del presupuesto y el
porcentaje, posibles repetidas sin revisar, y cuántas actividades siguen en «Sin
clasificar». Es el marcador del trabajo, y es lo que dice cuándo se puede parar.
Hoy: 1.029 partidas · **1 colgada** · **417** actividades sin capítulo propio.

**Quitar las vacías** vive dentro de «Ordenar las partidas de este capítulo».
**Solo las que no tienen ni una actividad**: una partida con trabajo dentro no se
quita, primero se mueven. Se desactivan —no se borran— y `catDeshacer` las
devuelve.

#### El formato de lista (v110) — filas, no tarjetas

Dentro de un capítulo las ubicaciones salían en **rejilla de tarjetas**: en el
iPad se veían tres enormes con el resto de la pantalla vacío, en el teléfono
obligaban a bajar, y **no decían de qué eran** —«General 100% · 1/1» sin saber a
qué colgaba—. Ahora hay **una fila por cosa** (`_catFilaHTML`, clases
`.cat-filas` / `.cat-fila`): nombre a la izquierda, y a la derecha porcentaje,
barra y `cerradas/total` **alineados**, para que se lean en columna. La fila dice
**qué es**: partida madre, clasificación o ubicación.

**Dos columnas en pantalla ancha y una en el teléfono, con `@media`, no con
`auto-fill`**: `repeat(auto-fill,minmax(160px,1fr))` metía cuatro a 1024px y
volvía a ser una rejilla. Las filas miden 47px — el mínimo de este app son 44.

Lo usan la portada de capítulos, los grupos de trabajo y la lista de
ubicaciones. **Sin actividades no hay barra ni porcentaje**, igual que en la
tarjeta: dice «—  sin tareas».

#### Las ubicaciones ya son una lista (v110)

**La ubicación no existe como cosa: es un texto suelto dentro de cada actividad**
(`obra_actividades.area`). Por eso no se podía renombrar, y por eso está sucia.
Medido: **29 ubicaciones**, con cuatro fachadas (una se llama solo «Fachada», con
1), dos generales («General» 28 y «Toda la obra» 8), «techo» en minúscula y **17
actividades sin ninguna**.

La pantalla es **Partidas → Ubicaciones** (`catUbicsAbrir`,
`_catUbicsPantallaHTML`, `_catUbicsTodas`). Desde ahí:

- **Renombrar** (`catUbicRenAbrir` → `_catUbicMover`) — cambia el `area` de
  **todas** sus actividades.
- **Juntar en otra** (`catUbicJuntarAbrir` → `_catUbicMover`) — el **mismo
  motor**: las dos cosas son escribir otro `area` en las mismas actividades, y
  dos funciones separadas terminarían contando distinto.
- **Ponerle ubicación a las que no tienen** (`catSinUbicAbrir`), marcando varias.

**RENOMBRAR O JUNTAR DICE A CUÁNTAS ACTIVIDADES TOCA, ANTES DE TOCARLAS.**
Renombrar «N2 — Apto 2A» toca **240**. Si el dueño se equivoca de fila tiene que
verlo antes, no después. El aviso se repinta **solo él** (`cat-ur-aviso`), no el
panel: repintar ahí perdería el foco y el nombre a medio escribir.

Todo va por **`Acciones.editar`**, una llamada por actividad y **un solo
repintado** al final —repintar por actividad sobre 240 es el tirón de la v86—, y
la tanda entera se deshace de golpe (`catTandaDeshacer`, rama `campo==='area'`).
Una que se caiga no tumba las demás y **se dice cuál**.

Las actividades sin `area` se llaman **«Sin ubicación»** en todo el app, desde la
constante **`PAL_SIN_UBIC`**. Con dos nombres distintos parecerían dos cosas.

#### El porcentaje a mano (v110) — el único número que no se cuenta

Existe porque **la obra anterior a mayo de 2026 no tiene ni una actividad**: la
agenda arrancó el 27 de mayo y todo lo de antes está construido y pagado sin
tareas que contar. Medido: **29 capítulos de 48** y **273 líneas del presupuesto
de 274** salen en cero **para siempre** sin él.

Se pone en tres niveles —**línea del presupuesto, capítulo y ubicación**—, con
columnas `avance_manual`, `avance_manual_por` y `avance_manual_fecha` en
`obra_partidas` y `obra_capitulos`, y **tabla propia `obra_ubicaciones`** porque
la ubicación no existe como fila.

Tres reglas, y ninguna es de estilo:

- **NUNCA SE MEZCLA CON EL CONTADO.** Si hay actividades **manda el contado** y
  el de a mano va debajo etiquetado; si no hay, se enseña el de a mano, también
  etiquetado; si los dos existen y no coinciden, **se ven los dos**.
  Promediarlos inventaría un tercer número que no es ninguno de los dos.
  Todo eso vive en **`_catAvanceConManoHTML`**, en un solo sitio.
- **NO SUBE DE NIVEL.** Un capítulo no hereda el de sus líneas ni la torre el de
  los capítulos. Comprobado: poner 100% a mano en una línea vacía **no mueve el
  capítulo**.
- **SE VE DISTINTO SIEMPRE** (`.cat-mano`, ámbar y borde punteado), con **quién
  lo puso y cuándo**. Si se viera igual que los demás, en seis meses nadie
  sabría cuál se contó y cuál se escribió.

**Solo administrador**, comprobado en `catManualAbrir` **y otra vez en la
escritura** (`_catManualAplicar`) por si alguien llega por otro camino. El rastro
en `obra_cambios` lleva **el valor viejo y el nuevo**.

*Ojo:* el de la ubicación **no se enseña dentro de un capítulo**
(`_catUbicListaHTML`): ahí el contado es de esa ubicación **dentro de ese
capítulo** y el de a mano es de la ubicación entera. Mezclar dos alcances es lo
mismo que prohíbe la regla 1.

### DOS EJES Y NO UNO (v111) — el capítulo para la plata, el árbol para entregar

Seis versiones construyeron una **clasificación**: reglas que reparten solas
las 2.466 actividades por capítulo del presupuesto y el dueño corrige lo que
caiga mal. Eso está bien y **se queda**. Pero no es con lo que se dirige una
obra. Palabras suyas: *«Quiero poder trabajar con libertad, teniendo a mano y
pudiendo utilizar las actividades que tengo. Quiero poner jerarquías,
entregables, y también poder limpiar un poco.»*

| | para qué | quién lo arma |
|---|---|---|
| **Capítulo del presupuesto** | cuadrar con lo contratado y lo que se paga | las reglas |
| **El plan** (`obra_nodos`) | saber qué falta para poder **entregar** | **el dueño** |

**UNA MISMA ACTIVIDAD VIVE EN LOS DOS.** El plan se monta **al lado** del
catálogo, no encima: **el árbol no toca `obra_partidas`, ni sus amarres, ni los
capítulos.** Si se borrara entero, el catálogo seguiría exactamente igual.
Comprobado antes y después de sembrar: 2.433 partidas y 2.466 amarres, y **cero
escrituras** a `obra_partidas` / `obra_partida_actividad`.

Por lo mismo, **«descartada del plan» NO es una columna de `obra_actividades`**:
vive en `obra_plan_fuera`. Se llegó a escribir la columna y se retiró en el acto
— ese módulo nació con la regla de CERO escrituras a `obra_actividades`, y es lo
único que permite borrarlo sin dejar rastro.

#### LAS UBICACIONES YA SE PUEDEN CREAR (v116)

Palabras del dueño, con el 3.00 delante: *«Esto es lo que tengo y no puedo crear
ubicación.»* Tenía razón, y era **un círculo cerrado**: `ubicacionSelect` es una
lista escrita a mano más las áreas que ya aparecen en `S.acts`, la pantalla de
Ubicaciones de la v110 renombra/junta/asigna pero no crea, y `_catCrearHTML` solo
ofrece casillas de `_catUbicsTodas()`, que salía de las actividades. **Una
ubicación solo podía nacer dentro de una actividad, y no había dónde
escribirla.** Un sitio nuevo —un local, un cuarto de máquinas— no tenía entrada.

**No hizo falta tabla nueva:** viven en `obra_ubicaciones`, la de la v110.
`_catUbicsTodas()` devuelve ahora **la unión** de las que usan las actividades y
las filas activas de esa tabla. Una recién creada sale **con 0 actividades**, y
eso es correcto: es un sitio donde todavía no se ha registrado nada.

- **Crear NO toca ninguna actividad.** Comprobado: 0 escrituras a
  `obra_actividades`.
- **No se duplica**: se compara con `_catNorm` —sin tildes ni mayúsculas—, así
  que «prueba claude» encuentra «Prueba Claude» y **se niega diciendo cuál**.
- **Va al final**, nunca entre los apartamentos: el orden es `_revOrdenArea`, el
  del edificio, y a un sitio nuevo no se le adivina el nivel.
- Tres puertas: «+ Nueva ubicación» en Ubicaciones, «+ Otra ubicación» dentro de
  «Crear actividad» —que la crea y **la deja marcada**— y el `<select>` de
  siempre, en un grupo «Creadas a mano».

**Cambio declarado fuera del módulo:** `ubicacionSelect` lee `S.catUbicRows`, y
`loadAll` pide `obra_ubicaciones` al arrancar —cuatro filas, **fuera del
`Promise.all`** para que si esa tabla no contesta el arranque no se caiga—.
Sin eso, una ubicación creada no aparecía en el formulario de Actividades hasta
pasar por Partidas.

#### EL SELECTOR DE VISTAS VA PEGADO ARRIBA (v116)

Se pintaba una sola vez al principio de la pantalla. Con 25 partidas debajo se
iba fuera de la vista, y **el dueño pasó días sin poder llegar al Cronograma,
creyendo que no existía**. Ahora es `position:sticky` con fondo propio: medido,
tras desplazar 900px estaría en **-678** y se queda en **106** — sigue visible.
Una línea de 44px que no se mueve, y desde cualquier sitio del módulo se ve
dónde estás y a dónde puedes ir.

#### QUE SE LEA EN EL TELÉFONO (v117)

Captura del iPhone y tres palabras: **«No se lee bien.»** Y la decisión, suya:
**tabla, pero que se lea.** No se convirtió en fichas, no se añadió ni un dato ni
una función nueva. Se repartieron los píxeles que ya había, midiendo.

**El nombre no se corta nunca.** Salía **«ANIFICACION MECCA»**, comido por la
izquierda. Tres cosas, y las tres hacían falta:

- **`-webkit-overflow-scrolling:touch` ROMPE `position:sticky` en Safari de
  iPhone.** Se quitó **solo del contenedor del cronograma**; los otros dos del
  módulo no se tocaron. Desde iOS 13 la inercia es la de serie, así que no
  cuesta nada. **Esto Chromium no lo reproduce:** ahí sticky agarra con la
  propiedad puesta, medido en las dos versiones. Es el bug de la v27 otra vez.
- **176 → 210px y dos líneas**, con corte por palabra (`-webkit-line-clamp:2`).
  Si aun así no cabe, el recorte es **por el final**, nunca por el principio.
- **El botón es `display:flex` en columna.** El contenido de un `<button>` se
  mete en una caja anónima que se encoge hasta el texto: el nombre se quedaba en
  **76px de los 196** que hay, y **`width:100%` no lo arregla** porque ese 100%
  es de la caja encogida. Medido: 76 → 178. Antes, además, se salía **por encima
  de la columna vecina**, porque al `flex:1` le faltaba `min-width:0`.

**Ninguna celda enseña un número a medias.** Salía «$94,90…». El costo se
abrevia en la FILA —**`$94.9 MM`**, **`$992.6 k`**, y entero por debajo de cien
mil— con el tercer argumento de `_nodoCosto`; el número exacto **sigue entero en
la ficha**, que es donde se cuadra la plata. La cabecera dice **INICIO**, que
cabe; «COMIENZO» salía «COMI…». Medido a 390px: **18 celdas cortadas → 0**.

**Y la cabecera no cuadraba con sus columnas.** Desde la v116 la fila lleva el
atajo `+ ✎` y la cabecera no dejaba su hueco: las etiquetas iban **72px a la
izquierda** de sus números, «COSTO» encima de QUIÉN. Se comprueba comparando los
bordes izquierdos de cabecera y celdas, no leyéndolo.

**Las columnas llevan holgura a propósito.** En el iPhone la tipografía mono es
más ancha que la de escritorio, así que lo que cuadra justo en Chromium sale
cortado en la obra. Se exige **16px de margen** sobre lo medido aquí. La celda
más larga de la tabla es **«desde 18-mar-26»** (fin real a medias), por eso esa
columna es la ancha.

**El pliegue mide lo que mide la PANTALLA, no la tabla.** Con `width:100%` medía
los 850px del contenedor que se desplaza y los botones se repartían a lo ancho
de la tabla: **dos quedaban fuera del teléfono**. Y `max-width:100vw` tampoco
vale —100vw son 390px y lo que de verdad se ve son 359—. El ancho **se mide del
`#c-catalogo` al pintar** y se le pasa a `_catCronoFilaHTML`. Medido: 390 → 359
a 390px, y 789 sobre un contenedor de 790 en el iPad.

**Tres botones a la vista y tres detrás de «Más».** Seis en una fila de 359px los
dejaba de 34px. A la vista: **Traer actividades · Crear actividad · Fechas y
costo**; detrás: **Avance a mano · Correr fechas · Abrirla sola** (`CRONO_MAS`,
`nodoMasBtns`). **SON LAS MISMAS SEIS LLAMADAS**: aquí solo se reparten.

**Al entrar, solo la raíz.** Se abría también cada hija suya —quince filas de
golpe— y la primera decisión del dueño era cerrar cosas.

**Y en QUIÉN, «varios (N)» de cuatro en adelante** (`NODO_QUIEN_MAX`). En la raíz
salía «Dimedes Estebe…» porque es quien más se repite entre 2.445 actividades, y
eso no es el responsable de nada: medido contra la base, **son 38 distintos**.

**Fuera el marco de las cinco vistas.** Iban con borde y el puesto lo llevaba en
morado claro: en el teléfono se lee como un recuadro rosado alrededor de la barra
entera. Sin borde, el puesto se distingue por el relleno.

*Lo que cambia de paso y está bien:* con el árbol cerrado, el **‹ N de M ›** de
la pantalla de una tarea cae en su rama de respaldo —`_nodoFilasCrono()` no la
contiene— y pasa a recorrer **el plan entero** en vez de las filas visibles. Es
la rama que ya existía, y recorrer las 190 en orden es más útil que recorrer
quince.

#### El atajo de la fila NO reescribe nada (v116)

«Traer actividades» y «Crear actividad» existen desde la v112. El problema era
**llegar**. En la fila cerrada del cronograma hay ahora **`+`** y **`✎`** que
llaman a `nodoTraerAbrir` y a `catCrearAbrir` — las de siempre, no una copia. Y
el nombre de la tarea lleva un **chevron** que dice que se toca: sin esa señal la
fila parecía una línea de tabla muerta.

#### CUATRO VERSIONES RECHAZADAS, Y LO QUE LAS ARREGLÓ (v115)

Después de la v114 el dueño dijo: *«No me gusta cómo me estás presentando la
información… no me convence cómo se ve… todavía me siento confuso para trabajar
con él. No me acoplo.»* **Era la cuarta versión seguida del módulo** (v111, v112,
v113, v114). Es exactamente el patrón del recorrido paso a paso y de «Hoy»: una
pantalla que hay que rescatar cada versión no tiene un problema de puerta.

**Lo que lo desbloqueó fue preguntar, no construir.** Preguntado con opciones,
lo dijo en una línea suya: **«listas q se oculta y cada fila con sus botones»**,
y «como en Project: tabla con columnas».

**Las dos cosas son el pliegue de Actividades** (`det-`, v87), que él ya sabe
usar. Así que la vista **no es nueva: es ese patrón traído al cronograma**. Y
**NO se añadió una sexta vista: sustituyó al Árbol** — tenía cinco y dijo estar
confuso; meterle otra habría empeorado lo que vino a contar.

Cómo es: la fila cerrada es **una línea de tabla** con sus columnas —**quién,
costo, comienzo, fin, fin real, días, estado**— en un contenedor que se desplaza
a lo ancho, con el nombre **fijo** a la izquierda. Al tocarla, el detalle se abre
**debajo y pegado a la izquierda**, con los botones de esa tarea y sus
actividades en `revCard`. Y hay **‹ N de M ›** para pasar de una tarea a la
siguiente sin volver a la lista.

**Lo que faltaba del cronograma, y de dónde sale ahora:**

- **Quién hace cada tarea** (`_nodoQuien`) — Project no lo trajo, así que sale
  del responsable que más se repite en sus actividades. Es un hecho de la obra.
- **Fechas reales** (`_nodoFechasReales`) — de `obra_cambios`, el único sitio
  donde consta cuándo se cerró algo. **Solo hay fin real si están TODAS
  cerradas**; si falta una, no se inventa. Medido: **10 hojas con fin real, 71
  empezadas, 99 con actividades**.
- **Las 57 vacías** — un interruptor las esconde, y abierta cada una dice qué
  es y qué hacer en vez de quedarse muda.
- **Refechar** (`nodoCorrerAbrir`) — el plan venció en julio. Se corre todo o
  una tarea y lo suyo, **en días de trabajo** (`_sumarDiasLab`), con la vista
  previa antes y **deshacer** después.

*Y el % del archivo casi no sirve: solo **16 de 189** traen algo distinto de 0.*

#### ORDENAR Y MODIFICAR LAS PARTIDAS, DESDE LA LISTA (v114)

Palabras del dueño con el 3.00 delante: **«Necesito poder ordenar y
modificar»**. Preguntado con opciones, escogió: **su propio orden arrastrando**,
**ordenar por fechas**, **renombrar sin entrar**, **editar las actividades ahí
mismo**, **borrar o juntar**, y **agregar**.

**EL DESORDEN QUE VEÍA ERA NUESTRO.** La lista ordenaba con `localeCompare`
sobre el nombre, y como cuatro partidas del 3.00 empiezan por número salían
**10, 11, 4, 6** — alfabético sobre dígitos. Hoy hay **14 partidas así en 5
capítulos**. Se lee el número como número (`_catNumDe`) y `localeCompare` va con
`{numeric:true}`.

**Cinco criterios** (`CAT_ORDENES`): **Mi orden · Nº · Nombre · Fecha ·
Avance**, recordados en la sesión. Solo uno se guarda en la base:

- **«Mi orden»** es el suyo, en `obra_partidas.orden` (columna nueva de la
  v114). Con ese criterio puesto salen las flechas ▲▼, que **intercambian el
  `orden` con el vecino** — dos escrituras, sin renumerar. La primera vez sí
  numera la lista entera de 10 en 10, porque si todas están en nulo no hay con
  quién intercambiar. **Con otro criterio las flechas no aparecen y, si se
  llama a la función, se niega diciendo por qué**: mover a mano una lista
  ordenada por avance no significaría nada.
- Las que él no ha tocado van **detrás** de las que sí, en orden natural. Si
  fueran delante, mover una sola mandaría el resto al azar.
- **La fecha de una partida** es la entrega más próxima de sus actividades
  **abiertas**; si están todas cerradas, la última que se cerró; si no hay,
  al final. No se inventa ninguna.

**Modificar sin salir de la lista:** el lápiz abre el nombre **en la propia
fila** y guarda por `catFichaSet`, el camino de siempre; tocar la partida la
**despliega** con sus actividades en `revCard` —la misma tarjeta del resto del
módulo, no otra—; y con «Marcar varias» se **juntan** (reusa `catJuntarEn`) o se
**quitan**.

**Quitar no borra: desactiva, y `catDeshacer` la devuelve.** Si la partida tiene
actividades dentro **se dice cuántas antes**, porque quitarla las deja sueltas
—siguen vivas, pero fuera del capítulo— y eso no puede pasar callado.

**Agregar** (`catPNuevaAbrir`) crea la partida en el capítulo y grupo que se
esté mirando, vacía y al final de su orden. **Una repetida se rechaza diciendo
cuál ya existe**: dos partidas iguales es lo que la pantalla de repetidas viene
a limpiar.

#### EL PLAN ES EL CRONOGRAMA DEL DUEÑO, Y VIVE SOLO EN LA BASE (v113)

El dueño pasó su MS Project completo —«PLANIFICACION MECCA 2-12-24», **189
tareas, $94.905.422,35, 463 días, del 14-oct-2024 al 22-jul-2026**— y dijo:
*«usar este que está más completo, que lo pueda editar y visualizar y trabajar
de manera eficiente e interactiva».*

Está sembrado **desde SQL, no desde el app**: 190 nodos (189 del cronograma + 1
de «POR UBICAR»), una raíz `cr_2`, 2.445 amarres, cero rotos y cero sueltas. El
costo de cada tarea madre cuadra con la suma de sus hijas hasta los
$94.905.422,35.

La jerarquía es **capítulo → nivel del edificio (N1…N7)**: `HORMIGON ARMADO` →
`HORMIGÓN ARMADO N1…N7`, `PISOS N1` → `PISOS N1…N7`. El árbol
capítulo→elemento de la v112 **ya no existe**.

**🚨 NO HAY BOTÓN DE SEMBRAR, Y NO PUEDE HABERLO.** `nodosSembrar` y
`_nodoPlanSiembra` **se quitaron enteros en la v113**. Construían el árbol desde
el CATÁLOGO: pulsar «Volver a sembrar» habría **destruido el cronograma sin
forma de rehacerlo desde el app**, porque los datos del Project no están en el
código. Estaba frenado de casualidad —un nodo llevaba una nota y `_nodoCurado()`
lo contaba como trabajo del dueño—, y eso no es una protección, es un accidente.
En su sitio hay una línea que dice de dónde sale el árbol. **Si hay que volver a
cargarlo, se carga del archivo.**

`obra_nodos` guarda ahora `costo_plan`, `dias_plan`, `pred_plan` (tal como lo
escribe Project: `'11CC+10 días;21'`), `inicio_plan`, `fin_plan`, `pct_plan`,
`costo_real_plan` y las tres de `avance_manual`. `id` = `'cr_'+Id de Project` y
`ref` = ese mismo Id, **que es lo que permite traducir las predecesoras a
nombres**.

#### EL % DEL ARCHIVO NO ES EL AVANCE

Decisión del dueño, textual: el % sale **«de las actividades o los avances que yo
llene»**. `_nodoReal(id)` lo resuelve **en un solo sitio**:

1. con actividades → el **contado**, con `_catAvance`;
2. sin ellas → el **de a mano** (`obra_nodos.avance_manual`), etiquetado con
   quién y cuándo;
3. sin ninguno → **«—»**. El del Project **no** se pone de sustituto.

`pct_plan` se enseña siempre al lado, en gris y etiquetado «plan». **Ahí está el
valor del módulo**, porque la diferencia es enorme: medido hoy, HORMIGON ARMADO
va al **15% en el archivo y al 85% en la obra** (25/30); PORTAJE al 0% y al 42%
(70/172); VENTANAS al 0% y al 9%. El archivo es de diciembre de 2024 y la obra
lleva casi dos años andando.

#### EL CRONOGRAMA SE ACABÓ, Y LA PANTALLA LO DICE

`_nodoEstado` da tres estados —vencida, en curso, por venir— contando los días
con `esDiaLaboral`. Medido el 18-sep-2026: de las **155 hojas con fecha, 144 ya
pasaron su fin sin estar al 100%**, cero en curso y cero por venir. **No es que
la obra vaya mal: es que el plan terminaba el 22-jul-2026.** La vista sale entera
en rojo, y `_nodoAvisoPlanHTML` lo escribe arriba para que nadie crea que el
módulo se rompió. Por eso lo que más falta es **volver a fechar**, y por eso
existe «Fechas y costo».

#### La línea de tiempo (quinta vista)

Una barra por tarea, colocada por `inicio_plan`/`fin_plan` y **llena con el %
REAL**, no con el del plan: una barra a medio llenar a la izquierda de la raya de
hoy es una tarea atrasada y se ve de un golpe. Arranca por capítulo —se abren
solos los hijos de la raíz que tengan algo— y **tocar una barra abre esa tarea**.

**No se dibujan las flechas de las predecesoras**: en un teléfono no se leen.
Van en la ficha, en texto y **con el nombre** de la tarea de la que depende.

#### Editar el cronograma

Fechas, duración, costo y predecesoras (`nodoPlanAbrir`), y el % a mano
(`nodoManualAbrir`). **Todo cambio va a `obra_cambios` con el valor viejo y el
nuevo**, campo por campo: es plata y son fechas de entrega.

**El descuadre de costo SE ENSEÑA, NO SE ARREGLA SOLO.** Si el dueño escribe un
costo distinto de la suma de sus hijas, manda lo suyo y queda marcado en la ficha
y en un aviso. Él decide; el app avisa. Y hay un botón para calcularlo de las
hijas cuando sí quiera eso.

#### «POR UBICAR EN EL CRONOGRAMA» — 430 actividades

El reparto cuadró 1.938 en una tarea exacta y 77 en el capítulo. Las **430** que
quedaron **no son un error**: **415 nunca se clasificaron en el app**, 9 son de
Subida de Materiales y 6 de aires acondicionados — y **el cronograma no tiene
ninguno de esos dos capítulos**. Tienen pantalla propia (`nodoUbicarAbrir`) con
buscador, filtros, casillas y «Llevar a…», porque de una en una eso no se termina
nunca. **Llevar no cambia la actividad**: solo cambia de nodo.

#### LA JERARQUÍA DE LA v112 (retirada, para que no se reconstruya)

Pasó su **MS Project** —«PLANIFICACION MECCA», 285 tareas, 159 días, de julio a
diciembre de 2024— y dijo: **«toma esto de guía para las jerarquías».** Su
cronograma ordena así:

```
proyecto → NIVEL del edificio → CAPÍTULO → ELEMENTO → OPERACIÓN
```

**Y EL NIVEL VA ARRIBA DEL CAPÍTULO.** La v111 lo había puesto al revés
—capítulo → grupo—, que es como se clasifica para pagar, no como se construye.

**No hubo que inventar nada: el nivel de «elemento» ya estaba en la base.** Las
**274 subpartidas del presupuesto SON los elementos** y su campo **`seccion` es
el nivel**. Comprobado contra el cronograma en el `BAJO NIVEL DE PISO → 3.00`:
los 17 elementos salen uno por uno — Replanteo, Zapata ZR-1…ZR-6, Platea de
fundación, Terminación de Platea, Muro Cisterna, Muro M-1, Muro M-6, Platea
Cisterna, Viga/Losa/Tapa Cisterna y Rampa.

Los cinco niveles y lo que llevan: **BAJO NIVEL DE PISO 27 · PRIMER NIVEL —
PARQUEOS GENERALES 83 · SEGUNDO NIVEL 85 · SEPTIMO NIVEL 73 · SUBIDA DE
MATERIALES 6**.

#### DOS RAMAS, Y HAY QUE DECIRLO EN PANTALLA

**El presupuesto tiene 4 niveles y el edificio tiene 18.** Se costeó **un nivel
tipo** y se multiplicó: por eso dice «SEGUNDO NIVEL» y no 2A ni 2B. La obra
registrada, en cambio, vive en los **29 sitios reales**. Forzar lo segundo
dentro de lo primero sería mentir sobre dónde está el trabajo, así que cuelgan
de ramas distintas:

```
PLANIFICACIÓN MECCA
├── BAJO NIVEL DE PISO … SUBIDA DE MATERIALES   ← lo COSTEADO (274 elementos)
└── ACABADOS Y TERMINACIÓN                      ← lo REGISTRADO (la agenda)
    └── N2 → Apto 2A → 10.00 · Pisos → Zócalos → las actividades
```

**El aviso de las dos ramas (`NODO_AVISO_RAMAS`) se ve en la portada del árbol,
en la raíz, en los niveles y en la rama de acabados, y no se quita.** Los
números de una rama y de la otra **no se suman**. Si no está escrito, el dueño
lo descubre el día que los números no cuadren.

**Los 274 elementos no tienen ni una actividad, y está bien:** la agenda arranca
el 27-may-2026 y la estructura es de 2024. Es exactamente donde sirve el
**porcentaje a mano de la v110** — y el del elemento **ES el de su línea del
presupuesto** (`origen='elemento'`, `ref`=id de la subpartida), no otro número
que pueda contradecirla.

#### Las operaciones son PLANTILLA, no siembra

El cronograma repite el mismo juego de verbos bajo cada elemento: **Subida de
Materiales · Nivelación y Compactación · Envarillado · Encofrado · Vaciado ·
Desencofrado** (`CAT_OPERACIONES`, con el nombre del cronograma). **No se
siembran:** 274 × 6 serían **1.644 nodos vacíos** que nadie pidió. Hay un botón
dentro del elemento que crea los seis de una vez, y el dueño quita los que no
apliquen. Tocarlo dos veces no duplica: lo dice y no hace nada.

#### `origen` y `ref` — qué es cada nodo

`obra_nodos.origen` vale `raiz · nivel · capitulo · elemento · acabados ·
nivel-real · ubicacion · capitulo-real · grupo · operacion`, y **nulo en los que
crea el dueño**. La pantalla lo usa para saber qué ofrecer sin adivinarlo del
nombre: en un elemento se añaden las operaciones y se pone el avance a mano; en
un grupo de acabados, no. `ref` guarda de qué fila salió.

#### El guardia de resiembra

**NO SE RESIEMBRA SOBRE TRABAJO DEL DUEÑO.** `_nodoCurado()` mira entregables
marcados y notas escritas; si hay uno solo, `nodosSembrar` **para y dice cuál**.
Cuando la v112 se sembró, el árbol tenía 62 nodos de la v111, **0 entregables y
0 notas** — comprobado antes de tocar nada. El botón no desaparece cuando no se
puede: **dice por qué**.

#### La siembra: sobre lo que ya hay, no en blanco

Decisión del dueño: **«sí, pero sobre lo que ya hay»**. Un nodo por capítulo
**con actividades** y, debajo, uno por grupo de trabajo. Las actividades se
cuelgan del nodo del grupo si lo tiene; si no, del capítulo — así **las 2.466
quedan en alguno**.

**Solo los grupos que tienen algo.** De los 44 definidos hay **uno vacío hoy**
—«Closets y despensa» en 11.00—: sembrarlo fabricaría de entrada un nodo que la
pantalla de limpiar ofrecería quitar. Contra la base de hoy, la siembra son
**19 nodos de capítulo + 43 de grupo = 62 nodos** y **2.466 amarres**.

**Todos nacen `rama`. NINGÚN ENTREGABLE SE INVENTA:** los marca él, y un
entregable sin clase (apartamento / taller / hito) se rechaza.

`nodosSembrar` **para** si ya hay un solo nodo, igual que `catSembrar` en la
v102: sembrar encima duplicaría el plan que el dueño armó a mano.

#### Traer, quitar, y lo que eso NO hace

**Traer y quitar NO cambian la actividad**: ni estado, ni contratista, ni fecha.
Solo escriben en `obra_nodo_actividad`. **Por eso no pasan por `Acciones`** —no
hay coherencia ni sellado de horas que garantizar, y hacerlo pasar por ahí
dejaría en el historial que la actividad se editó, que es mentira. Comprobado:
traer cinco son **1 `POST obra_nodo_actividad` y 0 escrituras a
`obra_actividades`**, y el retrato de las cinco no cambia en nada.

**Quitar del nodo no borra**: la actividad sigue viva en Obra y en su capítulo.

**Una actividad puede estar en varios nodos A PROPÓSITO** —«Instalación de
cerraduras — 4B» es de *Entregar el 4B* y de *Dimedes termina su taller*— y
entonces **cuenta en los dos avances y se dice**, en la lista al traerla y en la
ficha del nodo. Dentro de un mismo subárbol, en cambio, se cuenta **una sola
vez**: eso no sería «está en dos sitios», sería sumar mal.

**El avance del nodo es `_catAvance`, la misma cuenta del catálogo.** Comprobado
nodo por nodo contra su capítulo: los siete dan lo mismo. Una segunda fórmula
haría que el árbol y el capítulo cantaran números distintos — el error de Hoy.

#### Las cuatro maneras de verlo

`[ Lista ] [ Edificio ] [ Matriz ] [ Árbol ]`, y **el selector se recuerda en la
sesión**. **Lo que se ve cambia; lo que se mira, no**: el ámbito se resuelve en
**un solo sitio** (`_catAmbito`) y las cuatro leen de ahí. Si cada vista
resolviera lo suyo, cambiar de vista terminaría cambiando lo que se mira.

**EL EDIFICIO ES EL ALZADO QUE YA EXISTE. No dibujes otro.** Es el mismo SVG de
Hoy —`torreHTML` / `_dibujarTorreEn`—, con el núcleo de escaleras, las celosías,
los balcones y el penthouse retranqueado. Lo único que se le cambió es **de
dónde saca los números**: `torreHTML(persona, fuente)` y `_torreDatos(persona,
fuente)`, y con `fuente='catalogo'` salen de **`S.catActs`**, filtrados por lo
que se esté mirando.

**NO se reusó `S._torre`** a propósito: `cargarTorre` guarda su resultado y **no
respeta la frescura de la v109**. Pintar el catálogo con eso traería de vuelta
el fallo que casi cuesta seis actividades reabiertas. Comprobado: con `S.catActs`
vacío el dibujo se queda sin una sola área.

El toque se resuelve **una vez, con la caja delante** (`var tap=…` en
`_dibujarTorreEn`): el dibujo vive en tres pantallas y el del catálogo lleva a
otro sitio. Con `_torreTap` a secas dentro de cada closure, abría la hoja del
apartamento de Hoy.

**Lo que no es apartamento va DEBAJO, en filas** (`_torreOtras`), no dentro del
alzado. En el catálogo salen todas las que tengan algo; en Hoy, solo las que
tienen trabajo abierto.

**La matriz es NUEVA, y aquí está por qué.** `renderActsMatriz` es ubicaciones ×
**talleres de UN contratista**, con su `<select>`, su consulta (`loadMatrizActs`)
y su caché. Generalizarla pedía cambiarle las tres cosas, y es una pantalla
verificada que se usa en Actividades. La del módulo es **ubicaciones ×
capítulos** (o × grupos, o × hijos del nodo), lee de `S.catActs` y calcula con
`_catAvance`. **Vacío y cero no se ven igual**: la celda sin nada va rayada y
con un guión; la de 0% lleva su número.

#### «Por partida» — lo que faltaba era llegar

El dueño abrió **3.00 · Hormigón Armado**, le salieron las nueve ubicaciones y
nada más: *«No puedo editar estas partidas dentro de hormigón armado.»* Tenía
razón: desde ahí no había camino a las partidas. Ahora hay un interruptor
**[ Por ubicación ] [ Por partida ]** dentro del capítulo, y desde cada fila se
entra a la ficha de siempre — que ya sabía renombrar, cambiar de capítulo y
cambiar de grupo. **No se construyó otra ficha.**

#### Crear en varias ubicaciones a la vez

*«Muchas de ellas se pudieran repetir en varias ubicaciones.»* `catCrearAbrir`
solo **escoge las ubicaciones** y se las pasa al formulario de siempre por
`ctx.areas`; el alta sigue siendo `showAddAct` → `saveAct` → `Acciones.crear`.
**No se abrió la puerta once.** El resumen con los nombres sale antes de
continuar, y lo que nace queda amarrado al nodo de donde salió.

**No lo juntes con «Repetir en…» de la v107**: aquella parte de una actividad
que YA existe y ofrece los apartamentos que no la tienen. Ésta es al crearla de
cero. Dos momentos, dos pantallas.

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
DROP TABLE IF EXISTS obra_subgrupos;
DROP TABLE IF EXISTS obra_capitulos;
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
- **Los grupos de la lista suman el total de la cabecera** en los tres modos
  que tocan personal (Tipo de personal, Contratista, Personal x la casa):
  **1.059 y 347 vencidas** hoy. Y ninguno vuelve a enseñar un bloque
  «Contratistas» con todos dentro — son **17 grupos**, uno por contratista
- **Editar una actividad CERRADA desde Partidas abre el formulario.** Es la
  comprobación que importa: hasta la v106 no hacía nada y no decía nada. Y
  `editAct('no-existe')` **avisa**
- **Toda escritura a `obra_actividades` lleva su `POST obra_cambios` en la misma
  operación.** Esa es la firma de `Acciones`: uno suelto quiere decir que alguien
  escribió por fuera. *Ojo desde la v113:* `Acciones.eliminar` manda ahora tres
  escrituras seguidas —los dos amarres y la actividad—, así que el `obra_cambios`
  ya **no es el vecino inmediato** del `DELETE obra_actividades`. Las pruebas de
  la v107 a la v109 que miran solo el vecino de al lado marcan ese borrado como
  «suelto»: **es un falso positivo de la prueba, no una fuga**. El `logCambio` va
  antes, como desde la v107
- **El catálogo no sirve datos viejos.** Cambia un estado por fuera, toca el ↺ y
  la tarjeta tiene que cambiar. Y la hora de los datos se ve arriba, en ámbar a
  los 15 minutos
- **«Limpieza en N6» y «Limpieza en N7» NO pueden salir como repetidas.** Es la
  prueba que decide si esa pantalla sirve: si sale, alguien volvió a tirar los
  tokens cortos y la pantalla propone fusionar plantas distintas
- **La estructura de Partidas sale de `obra_capitulos` y `obra_subgrupos`**, con
  las constantes de respaldo. Fuerza las tablas a vacío y comprueba que el módulo
  sigue: 48 capítulos, «4.00 · Plomería», y los grupos siguen repartiendo
- **Convertir o tocar las palabras de un grupo no mueve el reparto sin que se
  vea.** Compara capítulo por capítulo contra la constante: hoy dan **cero
  diferencias** sobre 1.706 actividades
- **El capítulo de Partidas está GUARDADO.** Si tocas `_catCapDe`, mide cuántas
  partidas cambiarían ANTES de escribir, y dilo. Un cambio de regla sin `UPDATE`
  no mueve nada; un `UPDATE` sin medir pisa la curación del dueño
- **El orden demostrado no calcula fechas.** Si aparece una fecha futura en
  Partidas, alguien convirtió un orden en un calendario
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
- **El capítulo 2.00 sale en FILAS, no en tarjetas**, con Parqueo 94% · 8/9,
  General 100% · 1/1 y Sin ubicación 100% · 1/1, y la cabecera 95% · 10/11. Una
  columna a 390px, **dos** a 1024px, y ninguna fila por debajo de 44px
- **La lista de ubicaciones da 29**, con «Sin ubicación 17» entre ellas, sobre
  2.466 actividades
- **Renombrar o juntar una ubicación DICE A CUÁNTAS TOCA antes de tocarlas**:
  «techo» → «Techo» avisa de 1; «Fachada» dentro de «Fachada Frontal» avisa de 1
  y deja 12; «N2 — Apto 2A» avisa de **240**. Si un aviso sale sin número o con
  el número equivocado, no se puede usar
- **Ponerle ubicación a tres sin ubicación son 3 llamadas a `Acciones` y UN
  repintado**, y la tanda se deshace entera
- **El porcentaje a mano no se mezcla ni sube.** Ponle 100% a una línea del
  presupuesto vacía: sale **etiquetado** con quién y cuándo, y **el capítulo no
  cambia**. En un capítulo con actividades, manda el contado y el de a mano sale
  debajo. Si los dos existen y difieren, se ven los dos
- **Un ingeniero no puede poner porcentajes a mano** —ni desde el botón ni
  llamando a la función— y sigue sin ver la pestaña
- **El árbol NO toca el catálogo.** Cuenta `obra_partidas` y sus amarres antes y
  después de sembrar el plan: tienen que dar lo mismo, y las escrituras a esas
  dos tablas **cero**
- **El árbol del plan sale de la BASE, no de una siembra.** Busca `nodosSembrar`
  y `_nodoPlanSiembra` en el código: tienen que dar **cero**. Si alguien los
  repone, el primer toque destruye el cronograma
- **El % del Project nunca es el avance.** `PISOS N4` va al **48% (21/44)** con
  `pct_plan` en 0: si la fila enseña 0%, alguien puso el del archivo de
  sustituto
- **La fila del cronograma enseña costo, duración, fechas y el plan
  etiquetado**: `$992.568 · 14 días · 18-mar-26 → 7-abr-26 · plan 0%`
- **El contador de vencidas cuadra con la base**: hoy **144 de 155 hojas**, 0 en
  curso y 0 por venir, porque el plan terminaba el 22-jul-2026
- **Cambiar una fecha o un costo deja rastro con viejo y nuevo** en
  `obra_cambios`
- **El descuadre de costo se avisa y no se arregla solo**
- **Borrar una actividad no deja amarres huérfanos.** Cuenta
  `obra_partida_actividad` y `obra_nodo_actividad` antes y después
- **Juntar partidas en la dirección prohibida se niega y dice por qué**
- **Se puede crear una ubicación**, no se duplica comparando sin tildes ni
  mayúsculas, va al final y **no toca ninguna actividad**. Y sale en el
  `<select>` de Actividades sin haber entrado a Partidas
- **El selector de vistas se queda pegado arriba** al bajar por una lista larga.
  Si se pierde de vista, el Cronograma vuelve a ser invisible
- **A 390px, NINGUNA celda del cronograma enseña un número a medias**, y con
  **16px de holgura** sobre lo que mide Chromium — en el iPhone la mono es más
  ancha. Mide el texto con un `Range`: en una caja con `overflow:hidden` el
  `scrollWidth` nunca baja del `clientWidth` y decía «cabe justo» en todas
- **El nombre de la tarea se queda fijo al desplazar la tabla a lo ancho.**
  Mídelo desplazando 400px y comparando la posición, no a ojo. Y el contenedor
  **no puede llevar `-webkit-overflow-scrolling:touch`**: en Safari de iPhone eso
  rompe `sticky` y el nombre vuelve a salir comido por la izquierda. Chromium no
  lo reproduce — compruébalo sobre el estilo
- **La cabecera del cronograma cuadra con sus columnas.** Compara los bordes
  izquierdos de las etiquetas y de las celdas: si el atajo `+ ✎` se queda sin su
  hueco, todas las etiquetas se corren 72px
- **El pliegue de la fila cabe en la pantalla**, con sus botones dentro y ninguno
  fuera. Compruébalo a 390px **y a 1024**: el ancho sale del contenedor, no de
  `100vw`
- **Al entrar al cronograma solo viene abierta la raíz.** Si una prueba toca la
  primera fila, la CIERRA — abre una cerrada, o deja el árbol igual en las dos
  versiones antes de medir
- **En QUIÉN, con más de tres responsables distintos sale «varios (N)».** En la
  raíz son 38: si vuelve a salir un nombre propio, alguien quitó `NODO_QUIEN_MAX`
- **Las cinco vistas siguen, y son CINCO**: Lista, Edificio, Matriz, Cronograma
  y Tiempo. Si aparece una sexta, alguien volvió a añadir en vez de sustituir —
  y el dueño ya dijo que con cinco estaba confuso
- **La fila del cronograma se abre y trae SUS botones dentro.** Es el pliegue de
  Actividades, no una pantalla aparte. Si los botones salen fuera de la fila, se
  perdió lo único que hizo que se acoplara
- **Refechar corre en días de TRABAJO y se deshace.** Corre 60 días y comprueba
  que ningún fin cae en domingo, y que deshacer devuelve las fechas exactas
- **«Por partida» ordena los números como NÚMEROS.** En el 3.00 tienen que salir
  **4, 6, 10, 11**. Si vuelven a salir 10, 11, 4, 6, alguien quitó el
  `{numeric:true}`
- **«Mi orden» se guarda y sobrevive a recargar.** Sube una partida, recarga el
  catálogo y tiene que seguir donde la dejaste. Y con otro criterio puesto, las
  flechas **no mueven nada** y lo dicen
- **Quitar una partida con actividades dentro avisa de cuántas quedan sueltas**,
  y se puede deshacer
- **Una partida repetida no se crea**: se rechaza diciendo cuál ya existe
- **La siembra deja las 2.466 en algún nodo**, con un nodo por capítulo con
  actividades y uno por grupo. Y **sembrar dos veces no duplica**: para y lo dice
- **Traer al plan no cambia la actividad.** Guarda el retrato de estado, avance,
  responsable, fecha y área de las que traigas y compáralo después: idéntico. Y
  **cero escrituras a `obra_actividades`**
- **El avance de un nodo da lo mismo que el de su capítulo.** Si un nodo sembrado
  y su capítulo no coinciden, alguien escribió una segunda fórmula
- **El selector cambia la vista sin cambiar el ámbito**, y se recuerda
- **El edificio del módulo se pinta con `S.catActs`.** Demuéstralo: vacía
  `S.catActs` y el dibujo tiene que quedarse sin una sola área. Si sigue
  pintando, volvió a leer del guardado de `cargarTorre` y con él el fallo de los
  datos viejos de la v109
- **Mirando 10.00 · Pisos, el alzado pinta PH 20% · 6A 47% · 6B 45% · 5A 55% ·
  5B 60% · 4A 57% · 4B 39%** (medido el 18-sep-2026). Y **la torre de Hoy sigue
  igual**: es el mismo dibujo, no una copia
- **En la matriz, una celda sin actividades se ve DISTINTA de una en 0%**
- **3.00 «Por partida» da 25 partidas y 30 actividades**, y desde la fila se
  llega a la ficha que renombra y cambia de capítulo. **«Por ubicación» sigue
  dando** 4A 1/1 · 4B 3/3 · PH 5/5 · Áreas Comunes N7 6/7 · Parqueo 4/8
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

| **v104** — la agrupación de entrada de la lista («Tipo de personal») metía a los 17 contratistas en un solo bloque, «Contratistas · 958 actividades». El dueño lo vio en obra y lo dijo en siete palabras: «aquí quiero q se separe por contratista». La agrupación «Contratista», que ya hacía eso, llevaba versiones ahí sin que nadie la tocara. | Una cabecera que agrupa el 90% de la lista bajo una sola palabra no agrupa nada. Y que la función exista en otra pastilla no vale: si el usuario entra por otra puerta, hay que arreglar **la puerta por la que entra**. |
| **v106** — se corrigió `_catCapDe` (carpintería, gavetas, el capítulo AC) y en pantalla no cambió NADA: el capítulo de cada partida está **guardado** en `obra_partidas` desde la siembra, y la regla solo se consulta al sembrar. Hizo falta un `UPDATE` de una vez, midiendo antes que tocaba 27 partidas y ninguna más. | Cuando una regla se ejecuta UNA vez y su resultado se guarda, arreglar la regla no arregla los datos. Antes de dar por bueno un cambio de criterio, pregúntate si lo que ve el usuario sale de la regla o de una columna — y si es de la columna, mide el diff **antes** de escribirlo. |
| **v106** — el prompt traía la tabla de subpartidas con sus conteos, pero no las palabras que los producen. Reconstruirlas a ciegas dio 12.00 exacto y el resto a ±3, con dos grupos bastante fuera. | La tabla de un prompt es el **destino**, no el camino. Si te dan números sin la regla que los genera, reconstruye lo que puedas, **di en qué te separas** y deja la corrección a mano puesta — no te inventes palabras hasta que el número cuadre, porque entonces el grupo deja de querer decir algo. |
| **v107** — el botón de editar iba a ponerse tal cual sobre las tarjetas del catálogo. `showAddAct` va por **índice de `S.acts`**, que no trae las cerradas: sobre las 1.406 cerradas —que son justo las que Partidas enseña y ninguna otra pantalla— no habría hecho nada, sin error y sin mensaje. | Antes de poner un botón nuevo sobre una pantalla, mira **de qué array lee** la función que va a llamar. En este app hay dos cargas de actividades y solo una trae lo cerrado; el `if(ai>=0)` sin `else` convierte esa diferencia en un botón muerto. Tercera vez que la misma grieta corta en sitio distinto (v102, v103, v107). |
| **v107** — una sonda de la prueba buscaba las casillas por `textContent==='Marcar'` y daba **cero**: el botón lleva el símbolo ☐ pegado al texto, así que el contenido real era «☐Marcar». Parecía que las casillas no se pintaban. | Un botón con icono no tiene el texto que crees. Busca por el `onclick` —que es exacto y es lo que de verdad hace— y no por lo que se lee. Y de paso, esa sonda encontró un botón de 34 px que llevaba una versión colado: **medir lo visible paga, aunque el fallo no sea el que buscabas**. |
| **v108** — convertir las expresiones de `CAT_SUBGRUPOS` a listas de palabras parecía mecánico y movió **44 actividades** de grupo en la primera medición. Ninguna era culpa del concepto: `\s?` emitía solo «den glass» y perdía «denglass»; `rot[oa]s?` dejaba la interrogación dentro y no casaba nunca; y la tabla de acentos del SQL de prueba mapeaba `ñ` a `e`, así que «pañete» no encontraba «panete». Con las tres arregladas: **cero**. | Una conversión «mecánica» de expresión a texto tiene más trampas de las que se ven leyendo. Lo único que las cazó fue **medir el antes y el después contra la base entera**, no revisar el conversor. Y dos de las tres estaban en el arnés, no en el app: cuando una medición da un número raro, **sospecha primero de lo que mide**. |
| **v108** — dos sondas de la prueba daban «no cambia nada» y parecían un fallo: una editaba las palabras del grupo que va DESPUÉS (y gana el primero que coincide, así que no podía cambiar nada), y la otra escribía en un doble que no aplicaba las escrituras, así que al recargar volvía el estado viejo. | Para probar una regla de prioridad hay que tocar el lado que MANDA, no el que obedece. Y un doble que se traga las escrituras solo sirve mientras nada relea: en cuanto el código hace `cargarCatalogo()` después de escribir, el doble tiene que comportarse como la base o la prueba miente. |
| **v109** — el módulo Partidas enseñó durante días un estado que ya no existía: «sin empezar · 4 días vencida» sobre una actividad **cerrada al 100% cinco días antes**. `cargarCatalogo()` corría una sola vez por sesión y el ↺ no la tocaba, así que la barra decía «sincronizado» y la tarjeta mentía, **las dos a la vez**. El dueño estuvo a punto de reabrir seis actividades buenas. | Una pantalla con su propia carga de datos necesita su propia política de frescura: **cuándo se recarga, y la hora a la vista**. Que otra parte del app diga «sincronizado» no cubre a la que lee de otro sitio — y dos relojes que no se miran hacen que el usuario le crea al equivocado. |
| **v109** — la primera medición de «posibles repetidas» dio 2,8 millones de parejas: el relleno del arnés eran 2.400 partidas con nombres casi idénticos en el mismo capítulo. No existe en la obra —el capítulo más grande tiene 278— pero destapó que la comparación era n² sin tope. | Un fixture irreal puede señalar un límite real. En vez de arreglar solo el fixture, se metió un índice por palabra y un tope de 2.000 parejas que la pantalla dice. **Cuando una medición se dispara, pregunta si el dato es absurdo o si el código no aguanta el caso** — aquí eran las dos. |
| **v110** — la lista de ubicaciones daba **30** en la prueba y **29** contra la base. No era el app: el arnés de la v106 trae una actividad en «N1 — Lobby», que en la obra no es una ubicación. Media hora buscando un fallo que estaba en el fixture. | Cuando un conteo se separa **en uno** del medido contra la base, mira primero de dónde salen las filas de la prueba. Un fixture que no reproduce la distribución real convierte cualquier número en una opinión — y al arreglarlo, arréglalo para que dé **exactamente** el de la base, no «parecido». |
| **v110** — las tarjetas en rejilla usaban `repeat(auto-fill,minmax(160px,1fr))`. A 390px daban dos y a 1024px **cuatro**: en el iPad seguía siendo una rejilla, que es justo lo que el dueño pidió quitar. | «Dos columnas en pantalla ancha» es una `@media query`, no un `auto-fill`. `auto-fill` mete las que quepan, y en una pantalla grande eso nunca son dos. Y la prueba tiene que **contar cuántas caben por fila a cada ancho**, no mirar el CSS. |
| **v111→v115** — cuatro versiones seguidas del módulo y el dueño seguía sin acoplarse: «no me convence cómo se ve», «me siento confuso», «no me acoplo». Cada versión añadió funciones buenas —el plan, el cronograma, las vistas, ordenar— y ninguna preguntó **cómo quería trabajar**. Lo desbloqueó una pregunta con opciones: quería el pliegue que ya usa en Actividades, no una pantalla más. | **Es la cuarta vez que pasa lo mismo** (En Obra, el recorrido, Hoy, y ahora Partidas). El aviso está escrito desde la v82 y aun así se construyeron cuatro versiones antes de preguntar. Cuando el usuario diga «no me acoplo», **para y pregunta con opciones concretas**; añadir la quinta versión es repetir el error. Y fíjate si lo que pide **ya existe en otra pantalla del app**: casi siempre sí. |
| **v116** — el dueño pasó días sin poder llegar al Cronograma: el selector de vistas se pintaba arriba del todo y con 25 filas debajo se iba fuera de la pantalla. No era un fallo de la vista, era que **no se podía llegar a ella**. | Una pantalla a la que no se llega no existe, aunque funcione. Cuando el usuario diga que algo «falta», comprueba primero si está y **no se ve**: es más barato de arreglar y es lo que pasa casi siempre. Un selector de navegación va pegado (`sticky`), no al principio del documento. |
| **v117** — el nombre del cronograma salía «ANIFICACION MECCA» en el iPhone: `-webkit-overflow-scrolling:touch` rompe `position:sticky` en Safari. **En Chromium sticky agarraba igual con la propiedad puesta**, medido en las dos versiones, así que ninguna prueba de escritorio podía cazarlo. Es la misma forma del `InvalidStateError` de la v27. | Cuando el fallo es del navegador del usuario y no del tuyo, **la prueba no puede ser «se ve bien aquí»**: comprueba la CAUSA sobre el estilo —que la propiedad ya no esté— y dilo claro en el informe. Medir en el navegador equivocado y dar por bueno es cómo se tumbó el app dos veces. |
| **v117** — el nombre se quedaba en **76px de los 196** que tenía el botón, así que partía muchísimo antes de tiempo, y `width:100%` no lo arreglaba. El contenido de un `<button>` va en una caja anónima que se encoge hasta el texto, y ese 100% es de la caja encogida. Aparte, se salía **por encima de la columna vecina** porque al `flex:1` le faltaba `min-width:0`. | Un `<button>` no es un `<div>`: si dentro va una maqueta, hazlo `display:flex` tú. Y `flex:1` **no encoge** sin `min-width:0` — por eso el texto se desborda en vez de recortarse con «…». Las dos se vieron midiendo el ancho de la caja, no leyendo el CSS. |
| **v117** — la primera medición de «celdas cortadas» dio **cero en todas**: comparaba `scrollWidth` con `clientWidth`, y en una caja con `overflow:hidden` el `scrollWidth` nunca baja del `clientWidth`. La sonda decía que todo cabía justo, incluidas las que en el teléfono salían recortadas. | Para saber si un texto cabe, mide **el texto** (`Range.getBoundingClientRect`), no la caja. Una comparación que da siempre el mismo resultado no está midiendo: es el `/lock/i` de la v90 con otra cara. |
| **v116** — `catCrearAbrir` no hacía nada si se llamaba desde la pantalla de Ubicaciones: `S.catUbics` se comprueba antes en `renderCatalogo`, así que se ponía `S.catCrear` y se seguía pintando lo de antes. **Tercera vez con la misma forma** (v111 con `catFuera`, v113/v114 con los paneles). | En una función que despacha por una cadena de `else if`, **abrir una pantalla es también cerrar las que se comprueban antes**. Si esto vuelve a pasar, la cadena tiene que dejar de ser una cadena: una sola variable «qué estoy mirando» en vez de doce banderas. |
| **v114** — `catPNuevaAbrir` asignaba su estado y **después** llamaba a `catPanelOtrosCerrar()`, que lo ponía a null: el panel nacía vacío. **Es el mismo fallo de la v113**, que ya se había «arreglado» reordenando las líneas en las dos funciones de entonces. Reordenar depende de que el siguiente se acuerde, y el siguiente fui yo. | Cuando un fallo vuelve, **el arreglo anterior era una disciplina, no un diseño**. `catPanelOtrosCerrar(salvo)` recibe ahora la clave que se está abriendo y no la toca: da igual el orden en que se llame. Si un error se puede repetir siguiendo las reglas, cambia las reglas. |
| **v113** — el botón «Volver a sembrar» de la v112 reconstruía el árbol desde el CATÁLOGO. Con el cronograma del dueño ya en la base, pulsarlo lo habría **destruido sin forma de rehacerlo**: los datos del Project no están en el código. Estaba frenado por casualidad, porque un nodo llevaba una nota. | Un botón que puede destruir algo que el app **no sabe reconstruir** no se protege con una condición: se quita. Y cuando una función deja de tener sentido, se borra entera — dejarla «por si acaso» es dejar el gatillo puesto. |
| **v113** — `nodoPlanAbrir` asignaba `S.nodoPlan` y **después** llamaba a `catPanelOtrosCerrar()`, que lo pone a null: el panel de fechas y costo nacía vacío y el campo no existía. Lo mismo en `nodoManualAbrir`. | Una función de «cerrar todo lo demás» que enumera estados acaba incluyendo el que estás abriendo. Ciérrala **antes** de asignar, nunca después. Lo cazó la prueba al escribir en un campo que era `null`, no la lectura. |
| **v113** — la línea de tiempo arrancaba con tres barras y parecía vacía: se abrían solos los contenedores con **10 hijos o más**, y ese umbral funcionaba contra la base (cr_9 tiene 31) pero no contra un árbol de prueba más pequeño. | Un umbral por tamaño convierte una regla en «depende de cuántos datos haya». Si la regla es «arranca por capítulo», exprésala por **estructura** —los hijos de la raíz que tengan algo— y funcionará igual con 26 nodos que con 190. |
| **v112** — `Acciones.eliminar` **no limpia los amarres**. El dueño borró 21 actividades repetidas y quedaron **21 amarres huérfanos** en `obra_partida_actividad` y otros 21 en `obra_nodo_actividad`. Los conteos por actividad no mienten —se construyen desde `S.catActs`— pero la portada del plan contaba FILAS de la tabla de amarres y decía 2.466 donde había 2.445. | Cuando una fila se borra, **busca quién la apuntaba**. Y un contador que suma filas de una tabla de amarres miente en cuanto algo se borra: cuenta lo que existe de verdad, no lo que quedó apuntando. |
| **v112** — 4 actividades vivas colgaban de una partida **desactivada** (la dejó `catJuntarEn` al juntar dos): como `_catAgendaDe` filtra por `activo`, esas cuatro **no salían en ningún capítulo del módulo**, invisibles. La siembra las habría perdido. | Una siembra que recorre CONTENEDORES pierde lo que cuelga de un contenedor apagado. Recorre **lo que se quiere colocar** —las actividades— y para cada una busca dónde va. Así «ninguna queda suelta» es verdad y no una esperanza. |
| **v111** — se añadió `fuera_plan` como columna de `obra_actividades` y hubo que quitarla en el acto. Ese módulo nació con la regla de CERO escrituras a `obra_actividades` —es lo que permite borrarlo entero sin rastro— y la consulta de arranque tampoco se toca. El descarte es una decisión DEL PLAN: vive en `obra_plan_fuera`. | Antes de añadir una columna, pregunta **de quién es el dato**. Una decisión sobre el plan guardada en la tabla del trabajo ata dos cosas que se diseñaron para poder separarse, y se nota el día que hay que borrar una de las dos. |
| **v111** — dos sondas señalaron fallos que se había causado la propia prueba: la que compara el avance del nodo con el de su capítulo corría DESPUÉS de que otra sonda metiera nodos nuevos dentro de un capítulo (95% contra 97%), y la de «quitar del nodo» esperaba que quedara en 1 nodo cuando la siembra ya la había dejado en uno, así que quedaban 2. | Una sonda que escribe **contamina a las de abajo**. Ponla antes, o mide contra el estado que tú misma dejaste. Y cuando una comprobación falle por uno, repasa **qué hizo la prueba antes**, no solo lo que hace el app. |
| **v111** — con «Lo que está fuera del plan» abierto, el selector de vistas **no hacía nada**: `S.catFuera` se comprueba antes que la vista en `renderCatalogo` y `catVistaSet` no lo soltaba. Se tocaba Edificio y seguía la misma pantalla. Lo cazó una sonda que medía el texto de las cuatro vistas y **las cuatro daban lo mismo**. | Cuando una pantalla se comprueba ANTES que el selector, el selector deja de existir para ella. Y la manera de verlo no es leer el `if`: es **medir que las cuatro vistas dan cosas distintas**. Dos botones que devuelven la misma pantalla no se distinguen de dos botones que funcionan. |
| **v111** — la sonda de «crear en cuatro ubicaciones» dio cero ubicaciones en el formulario: `showAddAct` abre PRIMERO el menú de tipo (propio / contratista / administrativa) y el formulario no existe hasta que se escoge. La prueba estaba midiendo el menú. | Si una pantalla tiene un paso intermedio, la prueba **lo tiene que dar**, como lo da el usuario. Medir el primer modal que aparece y llamarlo «el formulario» es el mismo error de v58: tocar lo que no se toca. |
| **v105** — la prueba esperaba con `window.S && S.acts.length`, y `S` se declara con `let`: **no está en `window`**. La guarda daba siempre falso y la prueba se quedó 60 s dando por hecho que el app no había cargado. Antes de eso, buscaba el agrupador entre los `<button>` y el visible es un `<select>` —las pastillas con esas etiquetas viven en el panel de Filtros, plegado. | Un `let` de nivel superior es un global, pero **no una propiedad de `window`**: preguntar por `window.X` miente sin error. Y antes de dar por rota una pantalla, comprueba que estás tocando el control que el usuario ve — es otra vez el v58. |

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
| `obra_capitulos`, `obra_subgrupos` | **La estructura del módulo «Partidas», editable desde el app (v108).** Los capítulos con su `orden` (que rompe empates) y `en_presupuesto`; los grupos de trabajo con sus `palabras` y su `orden` (gana el primero que coincide). Las constantes del código se quedan de respaldo. `obra_capitulos` lleva además el **`avance_manual`** de la v110. | 48 + 44 |
| `obra_partidas`, `obra_partida_actividad` | **Del módulo de PRUEBA «Partidas» (v98, v100, v101, v106).** Guarda DOS niveles en la misma tabla, separados por `tipo` (`presupuesto` / `agenda`). **Sin `cantidad` desde v101**; **con `grupo` desde v106** (el grupo de trabajo puesto a mano, que manda sobre la regla); **con `avance_manual`, `avance_manual_por` y `avance_manual_fecha` desde v110**; **con `orden` desde v114** (el orden que el dueño pone a mano en «Por partida»). Se borran las dos y el app queda como en v97. | 274 + 1.029, 2.466 amarres |
| `obra_nodos`, `obra_nodo_actividad`, `obra_plan_fuera` | **EL PLAN (v111→v113)** — el segundo eje. Desde la v113 son **las 189 tareas del MS Project del dueño**, sembradas desde SQL: `costo_plan`, `dias_plan`, `pred_plan`, `inicio_plan`, `fin_plan`, `pct_plan`, `costo_real_plan` y `avance_manual`. **No hay siembra desde el app.** El árbol del dueño: `tipo` (`rama`/`entregable`), `clase` (apartamento/taller/hito), `orden`, `notas` para lo que no es actividad. El amarre es una tabla aparte porque **una actividad puede estar en varios nodos a propósito**. `obra_plan_fuera` son los descartes: **no borra nada**, saca del plan. Se borran las tres y el catálogo queda exactamente igual. | 190 + 2.445 |
| `obra_ubicaciones` | **Del módulo «Partidas» (v110, v116).** Guarda el porcentaje a mano de una ubicación **y, desde la v116, las ubicaciones que el dueño crea**: `_catUbicsTodas()` devuelve la unión de las que usan las actividades y las filas activas de aquí. El nombre sigue viviendo en `obra_actividades.area`. | 0 al nacer |

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
