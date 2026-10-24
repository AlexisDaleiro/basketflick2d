# PROMPT MAESTRO — ThreeBall 2D (Three Dogs by Districo)

> **Corrección de dirección autorizada por el usuario (23/10/2026):** la vista
> jugable es **frontal / POV**, con tablero y aro centrados, pelota en primer
> plano y profundidad simulada en Canvas 2D. La sección 13 define el modelo
> vigente y sustituye los detalles de geometría, lanzamiento y contactos laterales
> de §3 para las rondas. El texto lateral original queda como referencia histórica
> de H2; no debe restablecerse en la experiencia jugable. El resto de requisitos,
> hitos y reglas de ronda sigue vigente.

> **Rol:** Eres un ingeniero senior de videojuegos web y arquitecto front-end. Vas a construir **desde cero**, en este repositorio vacío, un juego web 2D completo, listo para producción, que correrá en una tableta en un stand de convención durante jornadas de 8–10 horas sin supervisión técnica. No es un prototipo: cada sección de esta especificación es un requisito. Si algo no está especificado, elige la opción más robusta y simple, y documéntala en `DECISIONS.md`.

---

## 0. Resumen del producto

| Campo | Valor |
|---|---|
| Nombre | **ThreeBall 2D** |
| Marca | **Three Dogs by Districo**: estilo canino moderno, divertido, enérgico y profesional |
| Plataforma | Tableta táctil en **cualquier orientación**, PWA en modo kiosk (Chrome Android / Safari iPadOS, pantalla completa). Mouse también habilitado en producción. |
| Core loop | "Basketball Flick 2D": el jugador desliza el dedo desde la pelota hacia el aro y la suelta para lanzarla. Partidas de 30/45/60 s (por defecto 45 s) |
| Entorno | Stand de convención: **100 % offline** después de la primera carga. Cero CDNs, cero fuentes remotas, cero APIs externas |
| Objetivo de negocio | Atraer público al stand, entregar premios por puntaje y **capturar leads** (nombre + teléfono) exportables a Excel |

---

## 1. Stack tecnológico y reglas de código

### 1.1 Stack obligatorio
- **HTML5 + CSS3 moderno + Vanilla JavaScript (ES2020, módulos ES nativos `type="module"`)**.
- **Canvas 2D API nativa** para todo el render del juego. La UI de pantallas (portada, game over, admin) va en **DOM superpuesto** al canvas.
- **Motor de física 2D propio** (no Matter.js). Motivo: solo necesitamos círculo vs. punto, círculo vs. AABB y círculo vs. plano. Un motor propio de ~300 líneas es más determinista, más liviano y más fácil de calibrar.
- **Sin bundler y sin dependencias de runtime.** Se permite un `package.json` **solo** para scripts de desarrollo (`npm run dev` con un servidor estático, `npm test` con `node --test`). El juego debe funcionar sirviendo la carpeta tal cual.
- **Service Worker** propio para el modo offline (sin Workbox).

### 1.2 Arte 100 % procedural
- **Prohibido** usar imágenes rasterizadas para el arte del juego. Todo (fondo, tablero, aro, red, pelota, huellitas, huesitos, llamas de racha, confeti, logo placeholder) se dibuja con **Canvas paths** o **SVG inline**.
- **Sin fuentes remotas.** Usa este stack del sistema: `font-family: "Arial Black", "Helvetica Neue", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;` con `font-weight: 900`. El impacto visual sale de contorno, sombras y escala, no de una tipografía descargada.
- **Sin emojis en la UI** (se ven distinto en cada sistema operativo). Íconos como SVG inline.
- El logo de marca vive en un único módulo (`js/render/brand.js`) como SVG inline placeholder (tres cabezas de perro estilizadas con círculos y orejas triangulares + wordmark "THREE DOGS"). Debe poder reemplazarse por el SVG oficial cambiando **un solo string**.

### 1.3 Manejo táctil estricto (crítico para kiosk)
Implementa todo lo siguiente sin excepción:
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`
- CSS global: `html, body { touch-action: none; overscroll-behavior: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; overflow: hidden; position: fixed; inset: 0; }`. Los `<input>` del formulario de leads y del admin son la única excepción a `user-select`.
- Listeners de `touchstart`, `touchmove` y `touchend`/`touchcancel` registrados con `{ passive: false }` y `preventDefault()` en canvas y overlays (salvo dentro de inputs, sliders y botones nativos, donde no debe romperse el foco).
- Bloquear `gesturestart`, `gesturechange`, `gestureend` (pinch de Safari), `contextmenu`, `dblclick` y `selectstart`.
- **Un solo dedo activo**: guarda el `identifier` del primer toque y descarta los demás hasta su `touchend`.
- Entrada con mouse en desarrollo y producción cuando hay puntero preciso. Ignora los eventos de mouse emulados que siguen a un toque (marca de tiempo del último toque < 800 ms ⇒ descartar).
- Usa `event.timeStamp` (base `performance.now()`) para medir el tiempo del swipe, nunca `Date.now()`.

### 1.4 Reglas de calidad de código
- Identificadores en **inglés**; textos visibles al usuario en **español**, centralizados en `js/i18n/es.js` (nada de strings de UI sueltos en el código).
- **Cero números mágicos**: todas las constantes de física, layout y gameplay en `js/config/constants.js`, con comentario de unidad (`u`, `u/s`, `u/s²`, `ms`).
- JSDoc con tipos en todas las funciones públicas. Módulos pequeños con una sola responsabilidad. Sin variables globales (salvo `window.__TB2D_DEBUG__` cuando hay `?debug=1`).
- Física, scoring, flick y storage como **funciones puras o clases sin dependencia del DOM**, testeables con `node --test`.
- **Sin allocations en el hot loop**: reutiliza vectores, usa object pools para partículas y pelotas, sin closures nuevas por frame.
- **Seguridad**: nunca uses `innerHTML` con datos del usuario (nombres en el ranking ⇒ `textContent`). Sanitiza el CSV contra inyección de fórmulas (ver §5.4).
- Todo acceso a `localStorage` va envuelto en `try/catch`, pasando por el módulo `Storage`. Nadie más toca `localStorage`.
- Manejador global (`window.onerror`, `unhandledrejection`) que registra el error en un ring buffer persistente y, si ocurre en `PLAYING`, aborta la ronda y vuelve a `ATTRACT_MODE` sin pantalla blanca.

---

## 2. Arquitectura

### 2.1 Estructura de archivos (obligatoria)
```
/index.html
/manifest.webmanifest
/sw.js
/css/main.css                 # tokens de marca, layout de overlays, animaciones CSS
/js/main.js                   # bootstrap: kiosk, storage, state machine, loop
/js/config/constants.js       # física, layout del mundo, gameplay, timeouts
/js/config/theme.js           # paleta de marca (espejo de los tokens CSS para el canvas)
/js/i18n/es.js
/js/core/EventBus.js
/js/core/StateMachine.js
/js/core/GameLoop.js          # rAF + paso fijo con acumulador
/js/core/IdleWatcher.js
/js/kiosk/Kiosk.js            # wake lock, fullscreen y bloqueo de gestos; sin bloqueo de orientación
/js/input/InputManager.js     # touch/mouse unificado, un solo dedo
/js/input/FlickTracker.js     # muestras del swipe ⇒ vector de lanzamiento (puro)
/js/physics/Vec2.js
/js/physics/collide.js        # círculo-punto, círculo-AABB, círculo-plano (puro)
/js/physics/World.js          # integración, sub-pasos, resolución (puro)
/js/game/Ball.js
/js/game/Hoop.js              # aro, tablero, red, compuertas de canasta
/js/game/ShotJudge.js         # detección de canasta/swish/fallo por pelota (puro)
/js/game/Round.js             # temporizador, puntaje, racha, spawn, buzzer
/js/game/DemoPlayer.js        # tiros automáticos para el attract mode
/js/render/Renderer.js        # transformación mundo⇒pantalla, DPR, orden de capas
/js/render/draw/background.js
/js/render/draw/hoop.js
/js/render/draw/ball.js
/js/render/draw/paw.js
/js/render/Particles.js       # pool de partículas (huellas, confeti, llamas)
/js/render/brand.js           # logo SVG inline (reemplazable)
/js/audio/Sfx.js              # Web Audio procedural, sin archivos
/js/storage/Storage.js        # repositorio, schema, migraciones
/js/storage/csv.js            # exportación CSV (pura)
/js/storage/hash.js           # hash del PIN
/js/ui/dom.js                 # helpers (h(), show/hide)
/js/ui/AttractScreen.js
/js/ui/Hud.js
/js/ui/GameOverScreen.js
/js/ui/AdminTrigger.js
/js/ui/PinPad.js
/js/ui/AdminPanel.js
/js/ui/IdleWarning.js
/js/debug/DebugOverlay.js     # solo con ?debug=1
/tools/make-icons.html        # renderiza el SVG del ícono y descarga PNG 192/512/180
/icons/icon.svg
/icons/icon-maskable.svg
/tests/*.test.js              # node --test
/README.md
/DECISIONS.md
/package.json                 # solo scripts de desarrollo, "type": "module"
```

### 2.2 Bucle principal
- `requestAnimationFrame` para render. **Física a paso fijo** `FIXED_DT = 1/240 s` con acumulador; máximo `MAX_STEPS_PER_FRAME = 10` (si se supera, se descarta el resto del acumulador para evitar la espiral de la muerte).
- Render interpolado opcional (`alpha = accumulator / FIXED_DT`); si complica, renderiza el último estado.
- `document.visibilitychange` ⇒ `hidden`: pausa el loop. Si el estado era `PLAYING`, al volver se **aborta la ronda** (sin guardar) y se va a `ATTRACT_MODE`.
- Canvas a pantalla completa con `devicePixelRatio` limitado a `Math.min(dpr, 2)` por rendimiento. Recalcula en `resize` y en `visualViewport.resize`.

### 2.3 Sistema de coordenadas del mundo
- **Mundo lógico fijo de gameplay: 1080 × 1600 u** (u = unidad de mundo), con el eje Y hacia abajo. Toda la física y las constantes están en unidades de mundo, así el juego es **idéntico en cualquier tableta** (justo para el umbral de premio).
- Transformación: `scale = min(canvasCssW / 1080, canvasCssH / 1600)`; el rectángulo de gameplay se centra. El fondo decorativo se extiende más allá para cubrir el letterbox (nunca bandas negras).
- Conversión de pantalla a mundo: `wx = (sx - offsetX) / scale`, `wy = (sy - offsetY) / scale`.
- Por petición del usuario (23/10/2026), no hay bloqueo ni aviso de orientación:
  el juego funciona en vertical y horizontal, con la cancha centrada y escalada.

### 2.4 Máquina de estados
Estados de primer nivel (exactamente estos cuatro):

| Estado | Subfases internas | Descripción |
|---|---|---|
| `ATTRACT_MODE` | `idle` | Portada con demo automática. Estado inicial y de reposo |
| `PLAYING` | `countdown` → `live` → `buzzer` | Ronda activa |
| `GAME_OVER` | `summary` → `lead_form` → `thanks` | Resultados, premio y captura de leads |
| `ADMIN_PANEL` | `pin` → `panel` | Panel de staff (overlay modal) |

Transiciones permitidas (cualquier otra lanza error en desarrollo y se ignora en producción):

| Desde | Evento | Hacia |
|---|---|---|
| `ATTRACT_MODE` | tap en CTA "¡TOCA AQUÍ PARA JUGAR!" | `PLAYING` |
| `PLAYING` | fin de `buzzer` | `GAME_OVER` |
| `PLAYING` | idle 35 s / `visibilitychange` / error | `ATTRACT_MODE` (ronda descartada) |
| `GAME_OVER` | "JUGAR DE NUEVO" | `PLAYING` |
| `GAME_OVER` | "Saltar" / guardado + 2,5 s / idle 35 s | `ATTRACT_MODE` |
| cualquiera | disparador secreto | `ADMIN_PANEL` (subfase `pin`) |
| `ADMIN_PANEL` | "Salir" / PIN cancelado / idle 35 s | `ATTRACT_MODE` |
| `ADMIN_PANEL` | "Probar tiro" (solo desde el panel autenticado) | `PLAYING` (práctica 20 s) |
| `PLAYING` (práctica) | fin de `buzzer` | `ADMIN_PANEL` (retorno al panel, sin guardar) |

Reglas:
- Cada estado implementa `enter(payload)`, `exit()`, `update(dt)`, `render(ctx)` y `onInput(evt)`. `exit()` debe **remover todos los listeners y timers** que su `enter()` creó (para no tener fugas en jornadas de 10 h).
- Entrar a `ADMIN_PANEL` desde `PLAYING` aborta la ronda sin guardar.
- `StateMachine` emite `state:change` en el `EventBus`; el HUD y los overlays se suscriben.

### 2.5 Inactividad (Idle Timeout)
- `IdleWatcher` se reinicia con cualquier `touchstart`, `pointerdown`, `keydown` o `input`.
- `IDLE_TIMEOUT_MS = 35000` aplica en **todas** las pantallas, excepto `ATTRACT_MODE` (ya es el destino).
- A los **30 s** se muestra el overlay `IdleWarning`: "¿Sigues ahí? Toca la pantalla para continuar" con cuenta regresiva grande 5…1. Un toque lo cierra y reinicia el contador.
- Al cumplirse los 35 s: transición a `ATTRACT_MODE`. En `GAME_OVER`, la partida **ya quedó guardada** como anónima (ver §5); solo se descarta lo que se estaba escribiendo en el formulario.
- En `ATTRACT_MODE`, el teclado virtual se cierra (`blur()` del elemento activo) y se limpian todos los formularios.

---

## 3. Especificación matemática del flick y la física

### 3.1 Layout del mundo (constantes iniciales, ajustables)
Vista **lateral 2D**: el tablero está a la derecha; el jugador lanza desde abajo-izquierda hacia arriba-derecha.

```
BALL_RADIUS        = 46      u
SPAWN_Y            = 1380    u
SPAWN_X_RANGE      = [200, 520] u   (primera pelota de cada ronda: x = 360)
FLOOR_Y            = 1540    u      (plano de piso visual)
RIM_Y              = 560     u      (plano del aro)
RIM_FRONT_TIP      = (702, 560)     punta izquierda del aro (círculo colisionador)
RIM_BACK_TIP       = (898, 560)     punta derecha del aro, unida al tablero
RIM_TIP_RADIUS     = 9       u
BOARD_AABB         = x ∈ [906, 924], y ∈ [340, 600]
NET_DEPTH          = 120     u      (red trapezoidal, ancho inferior = 0,6 × ancho superior)
GATE_B_Y           = RIM_Y + 70     u
```
Comprobación de diseño: abertura libre entre puntas = (898 − 9) − (702 + 9) = 178 u > diámetro de la pelota (92 u). Relación ≈ 1,9, realista.

### 3.2 Captura del swipe (FlickTracker, puro)
1. **Inicio válido**: el `touchstart` debe ocurrir dentro de `GRAB_RADIUS = 2.6 × BALL_RADIUS` alrededor de una pelota en estado `ready`. Si no, se ignora.
2. Mientras dura el toque, guarda muestras `{x, y, t}` en un ring buffer de 32 posiciones (coordenadas de mundo, `t` en ms).
3. En `touchend`, sea `pₑ` la última muestra y `pᵣ` la muestra **más antigua dentro de la ventana** `VELOCITY_WINDOW_MS = 80` previa a `tₑ` (si no hay ninguna, usa la muestra inicial):

```
Δx = pₑ.x − pᵣ.x                     [u]
Δy = pₑ.y − pᵣ.y                     [u]   (negativo = hacia arriba)
Δt = max((pₑ.t − pᵣ.t) / 1000, 0.016) [s]  (piso para evitar divisiones explosivas)

v_swipe = (Δx / Δt , Δy / Δt)        [u/s]
```
4. **Rechazos** (no lanza; la pelota vuelve a `ready` y aparece el hint "¡Desliza hacia el aro!"):
   - distancia total desde el inicio < `MIN_SWIPE_DIST = 60 u`
   - `Δy ≥ 0` (no fue hacia arriba)
   - `|v_swipe| < MIN_FLICK_SPEED = 600 u/s`
   - duración total del gesto > `MAX_GESTURE_MS = 1200`

### 3.3 Vector de lanzamiento
```
k        = settings.sensitivity          (slider admin, 0.50–1.80, por defecto 1.00)
GAIN     = 0.90                          (calibración base; constante)

v₀ = GAIN · k · v_swipe

// Clamp de magnitud
s  = |v₀|
v₀ = v₀ · clamp(s, V_MIN, V_MAX) / s     con V_MIN = 1400 u/s, V_MAX = 3400 u/s

// Clamp de ángulo (medido desde la horizontal, hacia arriba)
θ  = atan2(−v₀.y, v₀.x)
θ  = clamp(θ, 20°, 160°)
v₀ = s' · (cos θ, −sin θ)
```

**Asistencia de puntería** (slider admin `aimAssist` 0–0,40, por defecto 0,15). Corrige **solo la componente horizontal** hacia la ideal, conservando la altura que eligió el jugador:
```
// Tiempo hasta que la pelota, descendiendo, cruza RIM_Y (raíz mayor de y(t) = RIM_Y)
// y(t) = y₀ + v₀.y·t + ½·g·t²     ⇒   ½g t² + v₀.y t + (y₀ − RIM_Y) = 0
disc = v₀.y² − 2·g·(y₀ − RIM_Y)
si disc < 0  ⇒ no se aplica asistencia (el tiro no llega a la altura del aro)
t*   = (−v₀.y + √disc) / g
x_c  = (RIM_FRONT_TIP.x + RIM_BACK_TIP.x) / 2
vx*  = (x_c − x₀) / t*
v₀.x = lerp(v₀.x, vx*, aimAssist)
```
(La asistencia ignora el arrastre del aire; es intencional y suficiente.)

### 3.4 Integración
Euler semi-implícito a `FIXED_DT = 1/240 s`:
```
G       = 2600 u/s²    (gravedad, +y)
K_AIR   = 0.12 s⁻¹     (arrastre lineal)

v.y += G · dt
v   *= exp(−K_AIR · dt)        (precalcula el factor una sola vez)
p   += v · dt
```
Anti-tunneling: a `V_MAX` la pelota avanza 3400/240 ≈ 14 u por paso, menos que `RIM_TIP_RADIUS + BALL_RADIUS`. Agrega un test que lo verifique.

### 3.5 Colisiones y rebotes
Colisionadores estáticos (o cinemáticos si el aro móvil está activo, ver §3.7): las dos puntas del aro (círculos), el tablero (AABB) y el piso (plano `y = FLOOR_Y`). **Las pelotas no colisionan entre sí.** La red es solo visual.

Resolución genérica para un contacto con normal unitaria `n` (de colisionador a pelota) y penetración `pen > 0`:
```
p     += n · pen                           (corrección de posición)
v_rel  = v − v_collider                    (v_collider = 0 si es estático)
v_n    = v_rel · n
si v_n < 0:
    v_t   = v_rel − v_n·n
    v_rel = −e · v_n · n + (1 − μ) · v_t
    v     = v_rel + v_collider
```

| Superficie | restitución `e` | fricción tangencial `μ` |
|---|---|---|
| Puntas del aro | 0.55 | 0.12 |
| Tablero | 0.62 | 0.10 |
| Piso | 0.55 | 0.20 |

Detección:
- **Círculo–punta**: `d = p − c`; si `|d| < R + r_tip` ⇒ `n = d/|d|`, `pen = R + r_tip − |d|`. Si `|d| ≈ 0`, usa `n = (0, −1)`.
- **Círculo–AABB**: punto más cercano `q = clamp(p, min, max)`; si `|p − q| < R` ⇒ `n = (p − q)/|p − q|`. Si el centro quedó dentro del AABB, empuja por el eje de menor penetración.
- **Círculo–piso**: si `p.y + R > FLOOR_Y` ⇒ `n = (0, −1)`.
- Cada contacto con una punta o con el tablero marca `ball.touchedRim = true` / `ball.touchedBoard = true` (para el swish). Emite eventos `sfx:rim` / `sfx:board` con la intensidad `|v_n|` (con cooldown de 60 ms por pelota para no saturar el audio).
- Rotación visual: `ball.angle += (v.x / R) · dt` (solo cosmético).

### 3.6 Juez de tiro (ShotJudge, puro, por pelota)
Cada pelota lanzada tiene `shot = { launchedAt, gateA:false, gateATime, upwardThrough:false, resolved:false }`.

**Compuerta A — plano del aro** (`y = RIM_Y`), evaluada en cada paso con la posición anterior `p₀` y la actual `p₁`:
```
si p₀.y < RIM_Y ≤ p₁.y   y   v.y > 0:                 // cruce descendente
    λ  = (RIM_Y − p₀.y) / (p₁.y − p₀.y)
    xc = p₀.x + λ·(p₁.x − p₀.x)                       // x interpolada en el cruce
    si (RIM_FRONT_TIP.x + RIM_TIP_RADIUS) < xc < (RIM_BACK_TIP.x − RIM_TIP_RADIUS):
        si no upwardThrough:  gateA = true; gateATime = t
si p₀.y > RIM_Y ≥ p₁.y  y  v.y < 0  y  xc dentro de la abertura:
    upwardThrough = true                              // entró por debajo: nunca puntúa
```
**Compuerta B — confirmación** (`y = GATE_B_Y`): si `gateA` y la pelota cruza `GATE_B_Y` descendiendo con `x ∈ [RIM_FRONT_TIP.x, RIM_BACK_TIP.x]` dentro de los 600 ms posteriores a `gateATime` ⇒ **CANASTA**.
- `swish = !touchedRim && !touchedBoard` ⇒ **+3**; si no ⇒ **+2**.

**Fallo** (el primero que ocurra, si no hubo canasta):
- la pelota toca el piso
- sale del mundo: `x < −120` o `x > 1200`
- pasan `SHOT_TIMEOUT_MS = 4000` desde el lanzamiento

Una pelota resuelta queda en estado `dead`: sigue simulando y se desvanece en 600 ms, y luego vuelve al pool.

### 3.7 Ritmo de juego y dificultad
- `MAX_BALLS_IN_FLIGHT = 3`. Una pelota nueva aparece en estado `ready` `RESPAWN_DELAY_MS = 450` ms después de cada lanzamiento (con animación de "pop" al aparecer), en `x` aleatorio dentro de `SPAWN_X_RANGE`.
- **Aro móvil** (toggle admin `movingHoop`, apagado por defecto): en los últimos 10 s, aro + tablero + red oscilan en vertical, `offsetY(t) = 70 · sin(2π·t / 3.2)`. Sus colisionadores son cinemáticos (`v_collider = (0, d offsetY/dt)`) y las compuertas se mueven con ellos.
- **Buzzer beater**: al llegar a 0 se bloquean los lanzamientos nuevos, pero las pelotas en vuelo **siguen puntuando** hasta resolverse o hasta 2500 ms después. Recién entonces se pasa a `GAME_OVER`.

### 3.8 Puntaje y racha
- Canasta normal **+2**; swish **+3**.
- `streak` = canastas consecutivas (en el orden en que se resuelven; cualquier fallo lo vuelve a 0).
- **Racha de fuego canino**: con `streak ≥ 3` se entra en modo **"¡RACHA PERRUNA!"**: cada canasta suma **+1 extra**, la pelota deja una estela de llamas, el HUD muestra un medidor encendido y suena un ladrido procedural. Termina al primer fallo, con una animación de "apagado".
- Estadísticas de la ronda: `score, shots, baskets, swishes, bestStreak`.

---

## 4. Pantallas y UI/UX

### 4.1 Identidad visual
Tokens en `:root` (CSS) espejados en `theme.js` (canvas). **Son placeholders**: ajústalos al manual de Three Dogs en un solo lugar.
```
--c-navy:   #0F1B3D   (fondo principal)
--c-navy-2: #1C2D5E
--c-orange: #FF7A1A   (pelota / CTA)
--c-yellow: #FFC83D   (acentos, récord, premio)
--c-teal:   #19C2B5   (éxito / swish)
--c-red:    #FF4D4D   (tiempo crítico)
--c-white:  #FFFFFF
```
- Estilo: formas redondeadas y gruesas, contornos de 4–6 px, sombras duras desplazadas (estilo sticker), mucho contraste para que se lea desde 3 metros.
- Motivo canino: huellitas, huesitos, orejas en el logo, tablero con un cuadrado-objetivo con forma de huella.
- Botones táctiles de **mínimo 88 px** de alto; el CTA de la portada ocupa como mínimo el 70 % del ancho.
- Respeta `env(safe-area-inset-*)`.
- `prefers-reduced-motion` **no** aplica (kiosk público), pero ninguna animación debe parpadear a más de 3 Hz.

### 4.2 ATTRACT_MODE (portada)
- Fondo canvas: gradiente navy con un patrón de huellitas que deriva lentamente (además evita el burn-in) y luces de arena.
- **Demo automática**: `DemoPlayer` lanza una pelota cada ~2,2 s con la velocidad ideal de §3.3 (ruido aleatorio de ±6 %, así a veces erra); se usa el mismo motor de física y render.
- DOM superpuesto:
  - Título **"ThreeBall 2D"** enorme, con un rebote de escala continuo (CSS `@keyframes`) y la pelota de la "O" girando.
  - Subtítulo/logo **"Three Dogs by Districo"**.
  - Tarjeta **"RÉCORD DE HOY: 42"** (amarillo, pulso suave). Si no hay partidas: "¡Sé el primero en marcar récord!".
  - Mensaje de premio: "Supera **{prizeThreshold}** puntos y **¡gana un premio!**" (se oculta si se agotaron los premios del día).
  - Ticker rotativo con el **Top 5 de hoy** (cambia cada 4 s).
  - Botón central gigante **"¡TOCA AQUÍ PARA JUGAR!"** con animación de pulso (`scale 1→1.06`, 1,2 s) y anillo de onda expansiva.
- Primer toque en la portada: desbloquea el audio (`AudioContext.resume()`), pide el Wake Lock y, si está disponible, `requestFullscreen()`.

### 4.3 PLAYING
- **Cuenta regresiva**: "3", "2", "1", "¡YA!" (700 ms cada uno, escala de 1,6→1 con fade, beep procedural). Durante la cuenta, la pelota se ve pero los lanzamientos están bloqueados.
- **HUD** (DOM o canvas, a tu criterio, pero nítido):
  - arriba a la izquierda: **PUNTOS**, con animación "+2/+3" flotante y un bump de escala al sumar
  - arriba al centro: **cronómetro** en segundos grandes; en los últimos 5 s se pone rojo, pulsa y hace tic
  - arriba a la derecha: **logo** (que también es el disparador del admin, §5.1)
  - debajo del puntaje: medidor de racha (3 huellitas que se encienden; al llenarse aparece "¡RACHA PERRUNA!")
- **Feedback de juego**:
  - canasta: ráfaga de **partículas de huella** desde la red (12–18 partículas, color de marca), animación de la red (resorte simple en los vértices inferiores), texto "¡CANASTA!" o "¡SWISH!" (teal), y vibración `navigator.vibrate(30)` si existe
  - rebote en el aro: sonido metálico; en el tablero, sonido seco
  - fallo: sin castigo visual fuerte, solo un "¡Casi!" sutil cada tanto
  - pelota fuera de pantalla por arriba: flecha indicadora en el borde superior con su `x`
- Orden de capas del render: fondo → tablero → parte trasera del aro → **pelotas** → red → parte delantera del aro → partículas → HUD.
- **Hint de primera vez**: si en 3 s no hubo lanzamiento, aparece una mano animada en SVG que muestra el gesto de flick desde la pelota hacia el aro.

### 4.4 GAME_OVER y captura de leads
1. `buzzer`: "¡TIEMPO!" a pantalla completa (1,2 s) y sonido de bocina.
2. **La partida se guarda de inmediato** como registro anónimo (§6). Así cuenta para el ranking aunque el jugador se vaya.
3. `summary`:
   - Puntaje final con conteo animado (0→N en 900 ms).
   - Estadísticas: canastas/tiros, % de acierto, swishes y mejor racha.
   - Posición del día: "¡Quedaste **#3** de hoy!" (o "¡NUEVO RÉCORD DEL DÍA!" con confeti si corresponde).
   - Si `score ≥ prizeThreshold` y quedan premios del día (`maxPrizesPerDay`; 0 = ilimitados): cartel **"¡GANASTE PREMIO!"** (amarillo, confeti de huesitos y huellas) y un **código de premio** grande `TD-XXXX` (4 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), con el texto "Muéstrale este código al staff".
4. `lead_form` (en la misma pantalla, debajo del resumen; ultrarrápido):
   - Título: "¡Déjanos tus datos y participa del sorteo!"
   - **Nombre** (`maxlength=24`, `autocomplete="off"`, `autocapitalize="words"`, `enterkeyhint="next"`)
   - **Teléfono** (`type="tel"`, `inputmode="tel"`, `enterkeyhint="done"`), opcional
   - Checkbox de **consentimiento** (obligatorio solo si se cargó teléfono): "Acepto que Three Dogs / Districo me contacte por este evento y sus promociones." (Ley 18.331 de Uruguay sobre protección de datos personales)
   - Botones: **"GUARDAR Y JUGAR DE NUEVO"** (primario), **"GUARDAR"** y **"Saltar"** (secundario, discreto)
   - Validación de teléfono uruguayo, aceptando `09XXXXXXX`, `9XXXXXXX`, `+5989XXXXXXX` y `5989XXXXXXX`, con espacios o guiones. Se normaliza a E.164 `+5989XXXXXXX`. Si es inválido: mensaje inline, sin `alert()`.
   - El nombre pasa por un filtro básico de palabras ofensivas (lista editable en `constants.js`); si coincide, en el ranking se muestra "Jugador #N", pero en el CSV se guarda tal cual.
   - El teclado virtual no debe tapar el botón primario: usa `visualViewport` para subir el formulario.
5. `thanks`: "¡Gracias, {nombre}!" durante 2,5 s ⇒ `ATTRACT_MODE` (o directo a `PLAYING` si eligió "jugar de nuevo").
6. El idle de 35 s aplica en todas las subfases.

---

## 5. Panel de administración oculto (staff)

### 5.1 Disparador secreto
- Zona activa: el logo de la esquina superior derecha (mínimo 96 × 96 px), presente en **todas** las pantallas.
- Dos formas de activarlo, ambas válidas:
  - **mantener presionado 3000 ms** (se cancela si el dedo se mueve más de 20 px o se levanta antes)
  - **5 toques** dentro de una ventana de 2000 ms
- Sin feedback visible para el público. En `?debug=1` se dibuja un anillo de progreso.
- Durante `PLAYING`, tocar el logo **no** debe lanzar la pelota ni interferir con el flick.

### 5.2 PIN
- Modal con **teclado numérico propio** (botones 0–9, borrar y OK; no usa el teclado del sistema), puntos de enmascarado y entre 4 y 6 dígitos.
- PIN por defecto `1234`. Se guarda como `SHA-256(salt + pin)` en hex (`crypto.subtle.digest`; si no está disponible, un fallback FNV-1a de 64 bits). Documenta que esto disuade, no es seguridad real.
- 3 intentos fallidos ⇒ bloqueo de 30 s con cuenta regresiva.
- Si el PIN sigue siendo el de fábrica, el panel muestra un aviso: "Cambia el PIN por defecto".

### 5.3 Funciones del panel
Layout en secciones con scroll interno (el scroll se habilita **solo** dentro del contenedor del panel: `touch-action: pan-y` en ese contenedor).

**Configuración de la ronda** (se guarda al soltar el slider, con toast "Guardado"):
- Duración de ronda: control segmentado **30 s / 45 s / 60 s** (por defecto 45).
- Puntaje para premio: slider de 4 a 80, paso 1 (por defecto 24), con un indicador al lado: "Hoy ganaron X de Y jugadores (Z %)" para calibrar en vivo.
- Sensibilidad del tiro: slider de 0,50 a 1,80, paso 0,05 (por defecto 1,00).
- Asistencia de puntería: slider de 0 a 40 % (por defecto 15 %).
- Toggles: aro móvil en los últimos 10 s; sonido.
- Premios máximos por día (0 = ilimitados) y premios entregados hoy.
- Nombre del evento (texto, para el CSV) y etiqueta de la tablet (p. ej. "Tablet A").
- Botón **"Probar tiro"**: ronda de práctica de 20 s que **no se guarda**, para calibrar la sensibilidad.

**Leaderboard y leads**:
- Contadores de hoy: partidas, leads con teléfono, premios ganados y premios entregados. También los totales históricos.
- Tabla del **Top 20 de hoy** (posición, nombre, teléfono enmascarado `098 *** 456`, puntaje, hora y código de premio con un toggle "Entregado").
- **"Descargar CSV"**, con dos variantes: "Solo hoy" y "Todo el evento".
- **"Reiniciar ranking diario"**: confirmación en dos pasos. Pone `rankingResetAt = now`. **No borra leads ni partidas**: solo las saca del ranking y del récord visible.
- **Zona peligrosa**: "Borrar todos los datos". Exige escribir `BORRAR`, sugiere descargar el CSV antes y ofrece el botón de descarga en el mismo diálogo.

**Sistema**:
- Versión de la app, versión del cache del Service Worker y estado offline (cacheado sí/no).
- Si hay un SW nuevo esperando: botón "Actualizar app" (`skipWaiting` + recarga). **Nunca** recargar automáticamente.
- Uso de almacenamiento (bytes de las claves `tb2d.*`) y resultado de `navigator.storage.persist()`.
- Registro de los últimos 50 errores, con botón "Copiar".
- **Salir** ⇒ `ATTRACT_MODE`.

### 5.4 Exportación CSV (`csv.js`, pura y testeada)
- Codificación **UTF-8 con BOM** (`﻿`), separador **`;`** (Excel en configuración regional de Uruguay/español usa `;`) y saltos `\r\n`.
- Escape: todo campo que contenga `;`, `"`, `\r` o `\n` va entre comillas, duplicando las `"` internas.
- **Anti inyección de fórmulas**: si un campo de texto empieza con `=`, `+`, `-`, `@`, tab o CR, se le antepone `'`.
- El teléfono se exporta en formato local con espacios, `098 123 456` (así Excel lo mantiene como texto con el 0 inicial; no exportes `+598…` porque Excel lo interpreta como fórmula o número).
- Columnas, en este orden:
  `id;fecha;hora;evento;tablet;nombre;telefono;consentimiento;puntaje;canastas;tiros;precision_pct;swishes;mejor_racha;duracion_s;gano_premio;codigo_premio;premio_entregado`
- Fecha y hora en **hora local del dispositivo** (`DD/MM/AAAA`, `HH:mm:ss`).
- Nombre del archivo: `threeball2d_<evento-slug>_<tablet>_<AAAA-MM-DD_HHmm>.csv`.
- Descarga: `Blob` + `<a download>`. **Fallbacks** (los PWA standalone de iOS fallan con las descargas): si está disponible `navigator.canShare({ files })`, ofrece "Compartir archivo"; además, el botón "Copiar CSV" (Clipboard API) y un `<textarea>` de solo lectura con el contenido como último recurso.

---

## 6. Modelo de datos en `localStorage`

Prefijo de claves: `tb2d.v1.`. Toda escritura pasa por `Storage`, que valida, serializa y captura `QuotaExceededError` (en ese caso muestra un aviso persistente en el admin y nunca rompe el juego).

```jsonc
// tb2d.v1.meta
{
  "schemaVersion": 1,
  "deviceId": "K7Q2",                 // generado una vez, 4 caracteres
  "deviceLabel": "Tablet A",
  "playCounter": 128,                 // autoincremental para ids y "Jugador #N"
  "rankingResetAt": 1792720066020,    // epoch ms; 0 si nunca
  "createdAt": 1792700000000
}

// tb2d.v1.settings
{
  "roundDurationSec": 45,             // 30 | 45 | 60
  "prizeThreshold": 24,
  "sensitivity": 1.0,                 // 0.50–1.80
  "aimAssist": 0.15,                  // 0–0.40
  "movingHoop": false,
  "soundEnabled": true,
  "maxPrizesPerDay": 0,               // 0 = ilimitado
  "eventName": "Expo 2026",
  "pinHash": "<hex>",
  "pinSalt": "<hex 16 bytes>",
  "pinIsDefault": true
}

// tb2d.v1.plays   (array; append-only salvo los campos de lead y la entrega del premio)
[
  {
    "id": "K7Q2-000128",              // deviceId + contador
    "ts": 1792720066020,              // fin de la partida, epoch ms
    "dayKey": "2026-10-23",           // fecha LOCAL (no toISOString(), que es UTC)
    "score": 31, "shots": 22, "baskets": 13, "swishes": 4, "bestStreak": 6,
    "durationSec": 45,
    "prizeWon": true, "prizeCode": "TD-7HQK", "prizeDelivered": false,
    "name": null, "phone": null,      // phone en E.164 o null
    "consent": false,
    "leadAt": null                    // epoch ms cuando completó el formulario
  }
]

// tb2d.v1.errors  (ring buffer, máx. 50)
[ { "ts": 0, "state": "PLAYING", "msg": "...", "stack": "..." } ]
```

Reglas:
- **`dayKey`** se calcula con los componentes locales (`getFullYear`, `getMonth`, `getDate`). Agrega un test con una fecha a las 22:30 hora de Uruguay (UTC−3) que verifique que **no** salta al día siguiente.
- **Ranking del día** = `plays` con `dayKey === hoy` y `ts > rankingResetAt`, ordenado por `score` desc., luego `shots` asc. y luego `ts` asc. **Récord del día** = el primero de esa lista.
- **Premios del día** = `plays` de hoy con `prizeWon` (sin importar el reset del ranking, para no regalar el stock dos veces).
- `Storage.load()` aplica las **migraciones** según `schemaVersion` y repara los datos corruptos: si un JSON es inválido, lo respalda en `tb2d.v1.corrupt.<ts>`, reinicia esa clave y registra el error. **Jamás** lanza excepciones hacia la UI.
- Al iniciar: `navigator.storage?.persist?.()`.
- Capacidad estimada: unos 300 bytes por partida ⇒ más de 10 000 partidas en unos 3 MB. Si se superan los 4 MB, aviso en el admin: "Descarga el CSV y libera espacio".

---

## 7. Kiosk, PWA y offline

- `manifest.webmanifest`: `display: "fullscreen"` (con `display_override: ["fullscreen", "standalone"]`), `orientation: "any"`, `background_color` y `theme_color` navy, e íconos SVG (`any` y `maskable`) más los PNG generados con `tools/make-icons.html`. Incluye `apple-touch-icon` y `apple-mobile-web-app-capable`.
- `sw.js`: cache versionado `tb2d-v<APP_VERSION>`. Precachea **la lista explícita de todos los archivos** (genera esa lista a mano en `sw.js` y agrega un test que verifique que cada archivo de `/js`, `/css` e `/icons` está en la lista). Estrategia cache-first; elimina los caches viejos en `activate`. Sin `skipWaiting` automático (lo dispara el admin).
- `Kiosk.js`:
  - **Wake Lock** (`navigator.wakeLock.request('screen')`), readquirido en `visibilitychange`.
  - `requestFullscreen()` en el primer gesto, dentro de `try/catch`, sin bloquear la orientación.
  - Bloqueo de gestos (§1.3) y del botón "atrás" de Android: `history.pushState` + `popstate` para que no salga de la app.
- **README**, con secciones obligatorias:
  1. Correr en local (`npm run dev`).
  2. Deploy estático gratis (GitHub Pages o Netlify) **bajo HTTPS**, necesario para el Service Worker, Wake Lock y `crypto.subtle`.
  3. Instalar como PWA en Android (Chrome ⇒ "Instalar app") y en iPad (Safari ⇒ Compartir ⇒ "Añadir a pantalla de inicio").
  4. Bloquear la tablet: **Fijar pantalla** en Android y **Acceso Guiado** en iPadOS.
  5. Checklist para el día del evento: modo avión después de cargar, brillo al máximo, carga conectada, PIN cambiado y descarga del CSV al cierre de cada jornada.

---

## 8. Audio (Web Audio API, procedural, sin archivos)
`Sfx.js` genera todo con osciladores y ruido filtrado:
- **swish**: ruido blanco con pasa-banda de 2–4 kHz, envolvente de 180 ms
- **rim**: dos senoidales inarmónicas (~620 Hz y ~1480 Hz) con decaimiento rápido; ganancia según `|v_n|`
- **board**: ruido con pasa-bajos de 400 Hz y 80 ms
- **countdown/tic**: senoidal de 880 Hz, 60 ms; "¡YA!": 1320 Hz
- **buzzer**: diente de sierra de 180 Hz, 700 ms
- **ladrido de racha**: dos ráfagas de onda cuadrada con barrido de 500 a 250 Hz, con pasa-banda
- Volumen maestro 0,6; respeta `settings.soundEnabled`; máximo 8 voces simultáneas.

---

## 9. Debug y calibración (`?debug=1`)
- Overlay con FPS, cantidad de pasos de física por frame y pelotas activas.
- Dibuja los colisionadores (puntas, AABB, piso), las compuertas A/B y la abertura válida.
- Muestra el último `v_swipe`, `v₀` antes y después de los clamps y de la asistencia, y el ángulo θ.
- Dibuja la trayectoria predicha del último tiro (puntos cada 1/30 s).
- Anillo de progreso visible en el disparador del admin.
- Atajos de teclado: `R` reinicia la ronda, `A` abre el admin sin PIN (**solo en debug**).

---

## 10. Tests obligatorios (`node --test`)
- `FlickTracker`: ventana de velocidad, piso de Δt y rechazos (corto, hacia abajo, lento, largo).
- Vector de lanzamiento: clamps de magnitud y ángulo; la asistencia con `aimAssist = 1` produce un tiro que cruza `RIM_Y` en `x_c` (tolerancia ±2 u sin arrastre).
- Física: un tiro ideal entra (gate A y luego gate B ⇒ canasta); un tiro que pega en la punta delantera rebota con `|v'_n| ≈ e·|v_n|`; anti-tunneling a `V_MAX` contra la punta del aro.
- `ShotJudge`: swish vs. canasta con rebote, entrada por debajo (`upwardThrough`) sin puntaje, timeout y piso ⇒ fallo.
- `Round`: puntos +2/+3, racha ≥ 3 ⇒ +1 extra, reinicio de la racha al fallar y buzzer beater.
- `Storage`: migraciones, JSON corrupto, `dayKey` local a las 22:30 UTC−3, ranking con reset y conteo de premios del día.
- `csv.js`: BOM, `;`, escapes, anti-inyección y formato del teléfono.
- Validación del teléfono uruguayo: válidos e inválidos.
- `sw.js`: la lista de precache cubre todos los assets.

---

## 11. Requisitos no funcionales y criterios de aceptación
1. **60 fps estables** en una tablet Android de gama media (Chrome) y en un iPad 9.ª gen. Sin GC jank visible: pools para partículas (máx. 200) y pelotas (máx. 6).
2. **Soak test**: 8 horas en `ATTRACT_MODE` más 200 rondas simuladas sin crecimiento de memoria (documenta cómo lo verificaste con DevTools en `DECISIONS.md`).
3. Con el dispositivo en **modo avión**, después de la primera carga, la app abre y funciona completa, incluida la exportación CSV.
4. **Ningún gesto** (pinch, doble tap, pull-to-refresh, long-press de texto, swipe del borde dentro de la página) hace zoom, scroll, selecciona texto ni abre menús.
5. 35 s sin tocar en cualquier pantalla ⇒ vuelve a la portada, con aviso a los 30 s.
6. Long-press de 3 s **o** 5 toques en el logo ⇒ PIN ⇒ panel; el PIN `1234` funciona de fábrica y se puede cambiar.
7. Los cambios del admin persisten tras recargar; el CSV abre correctamente en Excel en español, con tildes y ñ bien y cada dato en su columna.
8. "Reiniciar ranking diario" vacía el ranking y el récord visible, pero el CSV sigue conteniendo todos los leads.
9. Una excepción forzada durante `PLAYING` no deja la pantalla en blanco: vuelve a la portada y queda registrada en el admin.
10. Lighthouse PWA: instalable, con Service Worker y funcionamiento offline.

---

## 12. Plan de entrega (trabaja por hitos; cada hito debe quedar ejecutable)
1. **H1 — Esqueleto**: estructura de archivos, `index.html`, CSS base con bloqueo de gestos, `Kiosk`, `InputManager`, `GameLoop`, `StateMachine` con los 4 estados vacíos y navegación entre ellos, e `IdleWatcher`.
2. **H2 — Física y flick**: `Vec2`, `collide`, `World`, `FlickTracker`, `Ball`, `Hoop`, `ShotJudge`, overlay de debug y sus tests.
3. **H3 — Ronda jugable**: `Round` (cuenta regresiva, timer, multi-pelota, puntaje, racha, buzzer), HUD, render procedural completo, partículas y audio.
4. **H4 — Pantallas**: portada con demo, game over, premio, formulario de leads y `Storage`.
5. **H5 — Admin**: disparador, PIN, panel completo y CSV con sus fallbacks.
6. **H6 — PWA y hardening**: Service Worker, manifest, íconos, manejo global de errores, README, `DECISIONS.md` y la pasada final por todos los criterios de §11.

Al terminar cada hito: corre `npm test`, revisa que no haya errores en consola y haz un commit con un mensaje descriptivo (`feat(physics): ...`). Al final entrega un resumen con:
- lo implementado
- cómo correrlo
- las constantes que conviene recalibrar en una tablet real (GAIN, sensibilidad, G, umbral de premio)
- cualquier desviación de esta especificación, con su justificación

**No dejes TODOs, stubs, `console.log` de depuración fuera de `DebugOverlay` ni funciones sin implementar.** Si una API del navegador no existe en el dispositivo (Wake Lock, Fullscreen, vibrate, share), degrada en silencio con detección de capacidades; jamás rompas el flujo.

---

## 13. Corrección temprana — cámara frontal / POV

Dirección visual aprobada por petición del usuario: mirar el tablero desde el
frente, inspirado en las referencias adjuntas. Se conserva el arte procedural
de marca, sin imágenes, WebGL ni dependencias de runtime.

- El mundo lógico de pantalla sigue siendo 1080 × 1600 u. La simulación añade
  una coordenada de profundidad `z` que aumenta al alejarse de la cámara.
  `x` es lateral; `y` sigue hacia abajo y conserva gravedad y piso.
- El primer spawn es `(x,y,z) = (540,1380,0)`; siguientes x entre 380 y 700 u.
  Radio físico de pelota 100 u, radio de agarre 260 u. El spawn lateral leve
  representa posiciones de tiro; el tablero siempre se ve centrado.
- Centro físico del aro `(540,820,1800)`, radio horizontal 210 u, radio del tubo
  12 u. Aro y compuertas se mueven juntos si se habilita la oscilación de H3/H5.
- Tablero frontal finito: x entre −30 y 1110 u; y entre 160 y 780 u;
  z entre 1900 y 1918 u. Es un panel ancho detrás del aro, no un poste lateral.
- Proyección: `scale(z) = 2200 / (2200 + max(-800,z))`,
  `screenX = 540 + (x-540)*scale`, `screenY = 260 + (y-260)*scale`.
  El radio visible también se multiplica por scale. La pelota se reduce al
  acercarse al aro y se agranda si rebota hacia la cámara.
- Se mantiene la captura de swipe de §3.2 y sus rechazos. Tras GAIN, sensibilidad
  y clamps de magnitud/ángulo: `power = -vy_clamped`; hasta 2700 u/s se
  conserva, y por encima se usa `effectivePower = 2700 + (power-2700)*0.25`.
  Luego `vx = vx_clamped`, `vy = -0.82 * effectivePower`,
  `vz = 0.55 * effectivePower`. Esta compresión del extremo fuerte permite
  tiros al tablero con gestos rápidos, manteniendo los tiros cortos y el control lateral.
  La asistencia interpola solo vx hacia el centro del aro usando la raíz
  descendente a y=820, sin corregir profundidad. La potencia importa: un tiro
  corto o pasado puede fallar aunque se alinee con el aro en pantalla.
- Euler semi-implícito fijo a 1/240 s: gravedad solo en y, arrastre lineal en
  vx/vy/vz. Las pelotas siguen sin colisionar entre sí; pool de seis.
- Aro: contacto esfera–tubo circular, buscando el punto más cercano del círculo
  horizontal x/z y resolviendo con la normal en tres dimensiones. Tablero:
  esfera–AABB tridimensional. Piso: plano y=1540. Se conservan restitución,
  fricción, cooldown, flags de swish y audio de §3.5.
- Juez: compuerta A en y=820, B en y=890. Se interpolan x **y z** al cruzar.
  A requiere distancia radial al centro en x/z menor que 210−12; B requiere
  distancia ≤210 y confirmación en ≤600 ms. Entrada por debajo no puntúa.
  Fallo por piso, timeout de 4 s, x fuera de límites o z fuera de [−800,2800].
- Render: tablero frontal, aro proyectado, red, pelotas ordenadas por profundidad,
  sombra en el piso, partículas proyectadas y HUD. Las pelotas que están delante
  del aro ocluyen la red; las que están completamente detrás del tablero se
  dibujan antes de este. El aro usa la misma proyección circular que el collider.
  Los contactos de tablero/aro muestran un destello breve. Tras confirmar una
  canasta física, la pelota cae por la red durante 450 ms y se desvanece hasta
  los 600 ms: es una animación posterior al resultado, sin nuevos contactos ni puntos.
  El debug muestra las compuertas proyectadas, trayectoria
  frontal y velocidad de profundidad.
- Se mantienen countdown, cronómetro, puntuación, racha, buzzer, audio, kiosk e
  inactividad de H3. Los módulos laterales puros de H2 quedan como harness y
  referencia de regresión; Round usa los módulos frontales.
