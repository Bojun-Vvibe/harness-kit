# harness-kit

> Un kit de andamiaje pragmático para harnesses de agentes-de-código IA.
> Despliega un harness completo de 5 subsistemas — instrucciones, estado, retroalimentación, observabilidad, gobernanza — en cualquier repo nuevo o existente. Independiente del stack.

[![npm version](https://img.shields.io/npm/v/@bojunchai/harness-kit.svg)](https://www.npmjs.com/package/@bojunchai/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · **Español** · [Português](./README.pt.md) · [Français](./README.fr.md) · [Deutsch](./README.de.md)

---

## ¿Qué es esto?

`harness-kit` es la versión-herramienta de las ideas de [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering) ([sitio del curso](https://walkinglabs.github.io/learn-harness-engineering/)), un currículo derivado de OpenAI/Anthropic sobre lo que realmente hace falta para que los agentes de código (Claude Code, Codex, OpenCode, Cursor, Aider, …) sean fiables en bases de código reales.

El curso (y este kit) se apoya en tres fuentes primarias:

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

La tesis en una línea: **cambiar a un modelo más caro es la solución más costosa; arreglar el harness es la más barata.** Este kit te da el harness.

Con un solo comando — `harness init` — te llevas:

- `AGENTS.md` — punto de entrada con enrutamiento (≤ 200 líneas, jamás cajón de sastre)
- `CONSTRAINTS.md` — reglas duras innegociables
- `docs/` — arquitectura, registro de decisiones, estándares de prueba (separados, no apelmazados)
- `PROGRESS.md` — el diario entre sesiones para que los agentes no "pierdan el hilo"
- `features.json` — la columna vertebral del proyecto, con un comando de `verification` por ítem
- `QUALITY.md` — calificación por módulo para que la próxima sesión sepa por dónde empezar
- `Makefile` — targets canónicos `setup / test / lint / check` (tú rellenas los cuerpos)
- `scripts/exit-clean.sh` — el chequeo de cierre de sesión en 5 dimensiones
- `scripts/session-init.sh` — el briefing de inicio de sesión
- `scripts/e2e-check.sh` — verificador en tres capas (estática / comportamiento / sistema)
- `docs/templates/sprint-contract.md` + `rubric.md` — para trabajos de varios pasos
- `.github/workflows/harness.yml` — CI que ejecuta toda la barra
- archivos de puntero por agente (`CLAUDE.md`, `.codex/AGENTS.md`, …) que apuntan a `AGENTS.md`

Todo es texto plano. Sin demonios. Sin lock-in. **Independiente del stack** — Node, Python, Rust, Go, móvil, polyglot, lo que sea.
Borra el kit y los archivos siguen funcionando.

---

## Instalación / uso

El kit incluye un CLI llamado `harness`. El `Makefile` y los `scripts/` generados llaman a `harness ...` directamente, así que casi siempre vas a quererlo en tu PATH.

```bash
# Recomendado: instala una vez globalmente ─────────────────────────────
npm install -g @bojunchai/harness-kit
harness init                 # proyecto nuevo (interactivo)
harness inject               # proyecto existente (por defecto dry-run)
harness view                 # dashboard localhost del harness del proyecto

# O sin instalar, vía npx ──────────────────────────────────────────────
# Nota: npx solo expone `harness` durante esa única llamada. El Makefile
# / scripts generados llaman a `harness doctor`, así que tarde o
# temprano vas a querer la instalación global.
npx @bojunchai/harness-kit init
npx @bojunchai/harness-kit inject --apply
```

> ¿Por qué el scope `@bojunchai/`? El nombre sin scope `harness-kit` está tomado en npm por un paquete squat sin relación. El binario CLI sigue siendo `harness` — solo `npm install` / `npx` mencionan el scope.

Si usaste `npx` y al ejecutar `harness doctor` ves "command not found: harness", instálalo globalmente:

```bash
npm install -g @bojunchai/harness-kit
```

### Resolución de problemas: `EEXIST: file already exists` en `/bin/harness`

El CLI registra un binario llamado `harness`. Dos casos conocidos donde otro paquete ya ocupa ese nombre:

1. Ejecutaste `npm install -g .` desde un clon local del repo (caso de contribuidor temprano). Solución:

   ```bash
   npm uninstall -g harness-kit
   npm install -g @bojunchai/harness-kit
   ```

2. Tienes [`harness-cli`](https://www.npmjs.com/package/harness-cli) instalado (también declara `bin: harness`). Tres opciones:

   ```bash
   # A — Desinstalar el paquete en conflicto:
   npm uninstall -g harness-cli
   npm install -g @bojunchai/harness-kit

   # B — Mantener ambos, este kit usa el alias harness-kit (también registrado en package.json bin):
   npm install -g @bojunchai/harness-kit
   harness-kit init

   # C — Forzar sobreescritura:
   npm install -g @bojunchai/harness-kit --force
   ```

---

## Después de init: pásalo a tu agente

El andamiaje tiene marcadores TODO por todas partes. **No los rellenes a mano.**
Abre el proyecto en tu agente de código (Claude Code / Codex / OpenCode / Cursor / Aider) y pega este prompt:

```
Estás trabajando en un repo que acaba de inicializar harness-kit.
Tu trabajo es hacer este harness real para ESTE proyecto.

1. Lee cada archivo generado: AGENTS.md, CONSTRAINTS.md, PROGRESS.md, QUALITY.md,
   docs/architecture.md, docs/decisions.md, docs/testing-standards.md, Makefile,
   .harnessrc.json. Entiende la estructura.

2. Inspecciona el proyecto real: lee package.json / pyproject.toml / Cargo.toml /
   go.mod / árbol de src / README existente / configs de CI / lockfiles. Averigua qué
   es realmente este proyecto, qué stack usa, dónde están sus puntos de entrada y qué
   convenciones ya sigue.

3. Reemplaza cada marcador `> **TODO**:` en los documentos generados con contenido
   que sea VERDADERO para este proyecto. Sé específico — cita archivos y líneas
   reales. Si no puedes responder algo con alta confianza, deja
   `> **TODO(@me, YYYY-MM-DD): need answer for X**` en vez de adivinar.

4. Reemplaza los cuerpos placeholder del Makefile (setup / dev / test / lint /
   typecheck / build / clean) por los comandos reales del proyecto. Verifica cada
   uno ejecutando `make -n <target>` y luego `make <target>` una vez. Si un target
   no aplica, déjalo como `@true` con un comentario de una línea explicando por qué.

5. En CONSTRAINTS.md, reemplaza las secciones de ejemplo "Code constraints" y
   "Forbidden" por 5–15 reglas duras VERDADERAS para este proyecto. Derívalas de
   tests existentes, configs de lint, CI, manejadores de error y ADRs. Borra los
   ejemplos que no apliquen.

6. En features.json, NO añadas features tú mismo todavía. Espera a que el humano
   te diga qué construir. Cuando lo haga, sigue las reglas de FEATURES.md para
   añadir la entrada — ese archivo es el contrato para editar features.json
   (máquina de estados, WIP=1, verificación obligatoria, anti-patrones). Léelo
   una vez, luego actúa.

7. Cuando termines, verifica y sella:
   - ejecuta `make check` — debe salir 0
   - ejecuta `harness doctor` — la nota debe ser al menos 24/30
   - añade un bloque `## Session <timestamp ISO>` al final de PROGRESS.md
     describiendo lo que hiciste (bootstrap: andamiaje rellenado para <project name>)
   - ejecuta `bash scripts/exit-clean.sh` — debe salir 0

Reglas duras durante este bootstrap:
- WIP = 1. No empieces a programar nuevas features.
- No modifiques ningún archivo fuera del andamiaje listado en el paso 1.
- No declares "hecho" hasta que `harness doctor` y `make check` ambos pasen.
- Si algo es genuinamente indecidible desde el repo, pregunta al humano — no inventes.
```

Guárdalo como snippet para reusarlo en cada nuevo repo que andamies.

---

## Comandos

El CLI es deliberadamente diminuto: dos comandos de andamiaje y dos de
diagnóstico. Todo lo demás vive en el repo generado como markdown +
scripts que puedes leer, grepear y modificar.

| Comando | Qué hace |
|---|---|
| `harness init [dir]` | Andamia un harness desde cero (interactivo). Escribe ~18 archivos. Imprime el bootstrap prompt al final. |
| `harness inject [dir]` | Añade un harness a un repo existente. Por defecto dry-run; `--apply` escribe. Fusiona con seguridad `AGENTS.md` / `Makefile` existentes. |
| `harness doctor [dir]` | Puntúa los 5 subsistemas sobre 5 cada uno + test de arranque-frío (5 preguntas). |
| `harness clean [dir]` | Ejecuta el L12 exit-clean en 5 dimensiones (build / tests / progress / artefactos / startup). |

Después de init, normalmente no necesitas más el CLI `harness`. El día a día vive en:

| Acción | Dónde |
|---|---|
| Gestionar features (add / start / done / block) | Editar `features.json` siguiendo las reglas de `FEATURES.md` |
| Verificar que una feature está realmente hecha | `bash scripts/validate-feature.sh <id>` |
| Briefing de inicio de sesión | `bash scripts/session-init.sh` |
| Chequeo de fin de sesión | Añadir a `PROGRESS.md`, luego `bash scripts/exit-clean.sh` |
| Releer el bootstrap prompt | `cat .harness/bootstrap-prompt.txt` |

---

## Los 5 subsistemas (y la "lección" de la que viene cada uno)

| Subsistema | Archivos generados | Lección |
|---|---|---|
| **Instrucciones** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + punteros por agente | L02 / L04 |
| **Estado** | `PROGRESS.md`, `features.json`, `QUALITY.md` | L05 / L08 / L12 |
| **Retroalimentación** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **Observabilidad** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **Gobernanza** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## Tres cosas en las que este kit insiste (para que no tengas que discutir con el agente)

1. **WIP = 1.** `features.json` solo permite que una feature esté `active` a la vez. Esa regla está documentada en `FEATURES.md` y se hace cumplir por la disciplina del agente + la revisión del git diff. Esto mata el modo de fallo "hacer seis cosas a la vez, terminar cero" (L07).

2. **Verification es el único camino a `passing`.** Cada feature debe tener un comando `verification`. Una feature solo entra en `passing` después de que `bash scripts/validate-feature.sh <id>` salga 0. No "se ve bien" → done (L09).

3. **Salida limpia es parte de "done".** `scripts/exit-clean.sh` chequea cinco cosas al cerrar sesión (build / tests / frescura de PROGRESS / sin artefactos viejos / startup invocable). El CI ejecuta el mismo script (L12).

---

## Agentes soportados en v0.1.0

`claude-code`, `codex`, `opencode`, `cursor`, `aider`. Cada uno recibe el archivo esperado en el lugar esperado, todos apuntando de vuelta a `AGENTS.md` como fuente única de verdad.

---

## Comparado con spec-kitty

[spec-kitty](https://github.com/spec-kitty/spec-kitty) es un harness más pesado, dirigido por misiones. `harness-kit` es el kit mínimo y opinionado para el caso del 80%. Pueden coexistir — `harness-kit` corre *bajo* spec-kitty sin problema.

| | harness-kit | spec-kitty |
|---|---|---|
| Cantidad de conceptos | baja (5 subsistemas) | alta (mission/WP/charter/doctrine) |
| Tiempo a primer output útil | minutos | aproximadamente una hora |
| Opinión sobre el flujo | ninguna — trae el tuyo | fuerte — specify→plan→tasks→implement→review |
| Inyección a proyecto viejo | ciudadano de primera (`inject`) | posible pero no es el foco |
| Dependencias | solo Node ≥ 18 | Python + algunas más |

---

## Licencia

MIT © Bojun Chai. Ver [LICENSE](./LICENSE).

## Créditos y referencias

Este proyecto es un empaquetado de ideas que no son mías. Las referencias a lecciones (`L01`–`L12`) en los archivos generados apuntan a capítulos de:

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  — repo del curso / [sitio legible](https://walkinglabs.github.io/learn-harness-engineering/)

El curso, a su vez, destila los siguientes posts de ingeniería:

- OpenAI — [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Si este kit te ayudó, considera darle estrella también al repo del curso aguas arriba — es la fuente original del marco.
