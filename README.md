# Bowling Score Calculator

Aplicación web moderna para calcular puntuaciones oficiales de bowling en partidas de 10 frames. Está construida con Next.js App Router, TypeScript, React y Tailwind CSS. Funciona offline con `localStorage`, está preparada como PWA y desde V6 puede conectarse a Supabase para rankings online, perfiles, ligas y grupos de amigos.

## Funcionalidades

- Scoring oficial de bowling para 10 frames.
- Soporte completo para strikes, spares, décimo frame y partidas incompletas.
- Validación de tiradas imposibles antes de modificar la partida.
- Entrada por botones numéricos, sin teclado manual.
- Borrar última tirada y reiniciar con confirmación.
- Modo de 1 a 6 jugadores con nombres editables, turno activo y ranking final.
- Persistencia local de la partida en curso para no perder avances al cerrar la app.
- Registro e inicio de sesión online con Supabase.
- El username online se fija como jugador principal de la partida.
- Historial y estadísticas separados por perfil online o modo invitado/offline.
- Historial local de partidas completadas.
- Filtros de historial por jugador, puntuación mínima y partidas perfectas.
- Ranking local de amigos calculado desde las partidas guardadas.
- Comparativa de una partida guardada contra la mejor marca local.
- Compartir resultado con Web Share API o copia al portapapeles.
- Estadísticas: mejor puntuación, media, partidas, strikes, spares y porcentajes.
- Estadísticas avanzadas por jugador y forma reciente.
- Torneos locales todos contra todos con clasificación.
- Juego 3D con pista procedural, bola, pinos animados, tiro por drag/swipe y partida oficial de 10 frames.
- Club online con Supabase: perfiles, ranking de amigos, temporadas e invitaciones.
- Sincronización manual de partidas del juego 3D hacia el ranking online.
- Sección educativa “Cómo se puntúa”.
- PWA con `manifest.json`, iconos, theme color, Apple web app metadata, instalación guiada, modo offline y service worker versionado.

## Instalación

```bash
npm install
```

## Ejecución local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test
```

La lógica principal vive en [lib/bowling-score.ts](/Users/seryio/Desktop/Bowling/lib/bowling-score.ts) y está cubierta por tests unitarios en [tests/bowling-score.test.ts](/Users/seryio/Desktop/Bowling/tests/bowling-score.test.ts). La gestión de partida, reinicio, restauración local y multijugador vive en [lib/bowling-game.ts](/Users/seryio/Desktop/Bowling/lib/bowling-game.ts).

## Lint

```bash
npm run lint
```

## Build

```bash
npm run build
```

## Deploy en Vercel

1. Sube el proyecto a GitHub, GitLab o Bitbucket.
2. Importa el repositorio en Vercel.
3. Vercel detectará Next.js automáticamente.
4. Usa los defaults:
   - Build command: `npm run build`
   - Install command: `npm install`
   - Output: gestionado por Next.js
5. Si vas a activar Supabase online, añade las variables de entorno de `.env.example`.

## Supabase Online

La V6 usa Supabase como sistema principal de cuenta. Si no configuras Supabase, la app sigue funcionando en modo invitado/offline y el panel Club muestra instrucciones.

1. Crea un proyecto en Supabase.
2. Copia `.env.example` a `.env.local`.
3. Rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Ejecuta el SQL de [supabase/schema.sql](/Users/seryio/Desktop/Bowling/supabase/schema.sql) en el SQL editor de Supabase.
5. Reinicia `npm run dev`.

La capa online vive en:

- [components/OnlineClubPanel.tsx](/Users/seryio/Desktop/Bowling/components/OnlineClubPanel.tsx)
- [lib/online/supabase-client.ts](/Users/seryio/Desktop/Bowling/lib/online/supabase-client.ts)
- [lib/online/supabase-service.ts](/Users/seryio/Desktop/Bowling/lib/online/supabase-service.ts)
- [lib/online/online-utils.ts](/Users/seryio/Desktop/Bowling/lib/online/online-utils.ts)

## Juego 3D

La V8 monta el producto principal: un juego de bowling 3D desde la foul line. La escena vive en [components/BowlingGame3D.tsx](/Users/seryio/Desktop/Bowling/components/BowlingGame3D.tsx) y usa Three.js para renderizar la pista, la bola y los pinos.

La versión actual mantiene una sesión oficial de 10 frames, calcula el marcador acumulado en tiempo real, reinicia bola o rack según corresponda y guarda automáticamente la partida completada en el historial local como resultado `game3d`. La animación visual es determinista y estable: el render no decide la puntuación, solo presenta lo que la capa pura de juego ya resolvió. La lógica de la sesión vive en [lib/game/bowling-game-session.ts](/Users/seryio/Desktop/Bowling/lib/game/bowling-game-session.ts), con tests en [tests/bowling-game-session.test.ts](/Users/seryio/Desktop/Bowling/tests/bowling-game-session.test.ts).

La lógica pura de geometría del rack, lectura del gesto y resolución de pinos derribados vive en [lib/game/bowling-simulation.ts](/Users/seryio/Desktop/Bowling/lib/game/bowling-simulation.ts), con tests en [tests/bowling-simulation.test.ts](/Users/seryio/Desktop/Bowling/tests/bowling-simulation.test.ts). La calculadora manual queda como herramienta extra para partidas reales presenciales.

El ranking online se alimenta únicamente de partidas generadas por el juego 3D. Las partidas introducidas manualmente en la calculadora no suben al ranking del Club.

Modelo online:

- `profiles`: perfil público y username.
- `friend_groups`: clubes/grupos de amigos.
- `friend_group_members`: miembros del club.
- `invites`: códigos de invitación.
- `games`: partidas sincronizadas.
- `seasons`: temporadas/liga.

## Lógica de puntuación

La app usa una lista lineal de tiradas por jugador y deriva los 10 frames desde esa fuente. En frames 1 a 9, un strike ocupa una sola tirada y vale `10 + las dos tiradas siguientes`. Un spare ocupa dos tiradas y vale `10 + la siguiente tirada`. Un frame abierto vale la suma de sus dos tiradas.

En el décimo frame, una partida abierta termina con dos tiradas. Un spare habilita una bola extra y un strike habilita dos bolas extra. La validación impide valores negativos, tiradas mayores de 10, sumas imposibles dentro de un frame y tiradas extra cuando no corresponden.

## Analítica local

La V3 añade analítica sin backend en [lib/bowling-analytics.ts](/Users/seryio/Desktop/Bowling/lib/bowling-analytics.ts). Desde el historial local del perfil activo se calculan estadísticas por jugador, filtros de historial, comparativas entre partidas guardadas y texto listo para compartir. Todo sigue funcionando offline y sin enviar datos fuera del dispositivo salvo cuando sincronizas con Supabase.

## PWA y offline

La V4 mejora la app instalable. [components/PwaRegister.tsx](/Users/seryio/Desktop/Bowling/components/PwaRegister.tsx) registra el service worker en producción, muestra estado offline, guía la instalación en Android/iOS y avisa cuando hay una versión nueva lista para activar. [public/sw.js](/Users/seryio/Desktop/Bowling/public/sw.js) usa cachés versionadas para app shell, recursos estáticos y runtime, con fallback a [app/offline/page.tsx](/Users/seryio/Desktop/Bowling/app/offline/page.tsx).

En desarrollo, el service worker se desregistra automáticamente para evitar cachés obsoletas de CSS/JS.

## Cuenta online

La app ya no usa cuentas locales separadas. La identidad principal vive en Supabase desde [components/OnlineClubPanel.tsx](/Users/seryio/Desktop/Bowling/components/OnlineClubPanel.tsx). `localStorage` se mantiene para la partida en curso, historial offline, tema y torneos locales.

Cuando hay una sesión online iniciada, el primer jugador del marcador usa siempre el username del perfil Supabase. En modo invitado/offline, los nombres siguen siendo editables libremente. El historial visible incluye las partidas del perfil online activo y las partidas invitadas aún no asignadas.

## Estructura

```text
app/
components/
hooks/
lib/
public/
tests/
types/
```

## Mejoras futuras

- Exportar historial como CSV.
- Sincronización automática al guardar partida si hay sesión online.
- Página pública por perfil y por club.
- Invitaciones por URL `/invite/[code]`.
