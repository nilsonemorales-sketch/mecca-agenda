# Mecca Agenda — contexto del proyecto

**Al día a v79 — 14 de septiembre de 2026.** Antes de escribir, comprueba
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
a **v77 (14 sep 2026)**. Si lo que vas a hacer se parece a algo de aquí,
**amplíalo en su sitio; no lo hagas otra vez en otra pestaña.**

El menú es: **Hoy · Actividades · Equipo · Reportes · Fotos · Planos ·
Compras · Bitácora · Gerencia · Metodología.** «En Obra» **se retiró en
v77**: era el mismo módulo que Actividades con otra cara.

| Quiero… | Está en |
|---|---|
| Ver y filtrar todas las actividades | **Actividades → Lista** |
| Trabajar un apartamento completo | **Actividades → Por Apto** |
| Ver taller × apartamento | **Actividades → Matriz** |
| Ver el edificio por niveles | **Actividades → Edificio** (v55) |
| **Revisar por contratista** | **Actividades → Revisión** — `renderRevision()`, `revAbrir()` |
| **El panel de un apartamento** | Tocar el apartamento en la torre, **en Hoy o en Actividades → Edificio** — `abrirAptoTorre()`, `_recPanelApto()` |
| **REGISTRAR: avance, cerrar, fecha, iniciar, interrumpir** | **El recorrido paso a paso** — `pasoIniciar(area, filtro, idInicial)` |

**Se registra en dos sitios, y los dos pasan por `Acciones`:**

1. **En la fila de la lista.** Un toque en la fila abre sus acciones ahí
   mismo: `25% · 50% · 75% · Ya está`, `Entrega hoy · El viernes`, y el
   micrófono. `_actFilaAvanceHTML()`, `actFilaPct()`, `actFilaFecha()`.
2. **El recorrido paso a paso**, para pasar varias seguidas de pie.

v77 le quitó el registro a la lista entera y lo mandó todo al recorrido.
**En obra resultó peor**: sacarte de la lista para marcar un avance es más
fricción, no menos. Volvió en v79 — pero por `Acciones`, que era el
problema de verdad del registro viejo, no el sitio donde estaba.

**El recorrido se arma desde la lista** (`actSelRecorrer()`): marcas en
modo selección y tocas «Recorrer estas N». Recorre lo que marcaste, en el
orden en que lo estás viendo. Antes lo armaba el app por ti («las de esta
semana», «las vencidas») y te las pasaba en un orden que no es el que se
camina.

El panel del apartamento y el paso a paso se reparten así:

- **`abrirAptoTorre` / `pintarRecorrido` / `_rec*`** = el panel del
  apartamento: sus cuatro números y tres pestañas (Panel · Pendientes ·
  Quién debe). **No escribe.**
- **`pasoIniciar` / `paso*`** = el recorrido, «7 de 23».

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
  Ojo: `fechaVenc()` cae en `a.fecha` cuando `fecha_fin` viene vacía, así
  que «sin fecha de entrega» y «vencida» **no** son excluyentes.
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
