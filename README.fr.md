# harness-kit

> Une boîte à outils d'échafaudage pragmatique pour harnais d'agents-de-code IA.
> Déployez un harnais complet à 5 sous-systèmes — instructions, état, retour, observabilité, gouvernance — dans n'importe quel dépôt neuf ou existant. Indépendant de la stack.

[![npm version](https://img.shields.io/npm/v/harness-kit.svg)](https://www.npmjs.com/package/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Español](./README.es.md) · [Português](./README.pt.md) · **Français** · [Deutsch](./README.de.md)

---

## C'est quoi ?

`harness-kit` est la version-outil des idées de [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering) ([site du cours](https://walkinglabs.github.io/learn-harness-engineering/)), un cursus dérivé d'OpenAI/Anthropic sur ce qu'il faut vraiment pour rendre les agents de code (Claude Code, Codex, OpenCode, Cursor, Aider, …) fiables sur des bases de code réelles.

Le cours (et cette boîte à outils) s'appuie sur trois sources primaires :

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

La thèse en une ligne : **changer pour un modèle plus cher est la solution la plus chère ; réparer le harnais est la moins chère.** Cette boîte à outils vous donne le harnais.

Une seule commande — `harness init` — et vous repartez avec :

- `AGENTS.md` — point d'entrée routé (≤ 200 lignes, jamais fourre-tout)
- `CONSTRAINTS.md` — règles dures non négociables
- `docs/` — architecture, journal de décisions, normes de test (séparés, pas empilés)
- `PROGRESS.md` — le journal entre sessions pour que les agents ne « perdent pas le fil »
- `features.json` — la colonne vertébrale du projet, avec une commande `verification` par item
- `QUALITY.md` — note par module pour que la prochaine session sache où concentrer l'effort
- `Makefile` — cibles canoniques `setup / test / lint / check` (vous remplissez les corps)
- `scripts/exit-clean.sh` — la vérification de fin de session en 5 dimensions
- `scripts/session-init.sh` — le briefing de début de session
- `scripts/e2e-check.sh` — vérificateur trois couches (statique / comportement / système)
- `docs/templates/sprint-contract.md` + `rubric.md` — pour les travaux multi-étapes
- `.github/workflows/harness.yml` — CI qui exécute toute la barre
- fichiers pointeurs par agent (`CLAUDE.md`, `.codex/AGENTS.md`, …) qui pointent vers `AGENTS.md`

Tout est texte brut. Pas de démon. Pas de verrouillage. **Indépendant de la stack** — Node, Python, Rust, Go, mobile, polyglot, n'importe quoi.
Supprimez la boîte à outils et les fichiers continuent de fonctionner.

---

## Installation / utilisation

La boîte à outils embarque une CLI nommée `harness`. Le `Makefile` et les `scripts/` générés appellent `harness ...` directement, vous allez donc presque toujours vouloir l'avoir dans votre PATH.

```bash
# Recommandé : installation globale unique ────────────────────────────
npm install -g harness-kit
harness init                 # nouveau projet (interactif)
harness inject               # projet existant (dry-run par défaut)

# Ou sans installation, via npx ───────────────────────────────────────
# Note : npx n'expose `harness` que dans cet appel unique. Le
# PROGRESS.md / Makefile / scripts générés appellent `harness ...`,
# donc tôt ou tard vous voudrez l'installation globale.
npx harness-kit init
npx harness-kit inject --apply
```

Si vous avez utilisé `npx` et que `harness doctor` renvoie « command not found: harness », installez-le globalement :

```bash
npm install -g harness-kit
```

---

## Après init : confiez-le à votre agent

L'échafaudage contient des marqueurs TODO partout. **Ne les remplissez pas à la main.**
Ouvrez le projet dans votre agent de code (Claude Code / Codex / OpenCode / Cursor / Aider) et collez ce prompt :

```
Tu travailles dans un dépôt qui vient d'être initialisé avec harness-kit.
Ta mission est de rendre ce harnais réel pour CE projet.

1. Lis chaque fichier généré : AGENTS.md, CONSTRAINTS.md, PROGRESS.md, QUALITY.md,
   docs/architecture.md, docs/decisions.md, docs/testing-standards.md, Makefile,
   .harnessrc.json. Comprends la structure.

2. Inspecte le projet réel : lis package.json / pyproject.toml / Cargo.toml /
   go.mod / arborescence src / README existant / configs CI / lockfiles. Découvre
   ce qu'est vraiment ce projet, quelle stack il utilise, où sont ses points
   d'entrée et quelles conventions il suit déjà.

3. Remplace chaque marqueur `> **TODO**:` dans les docs générés par du contenu
   VRAI pour ce projet. Sois précis — cite des fichiers et lignes réels. Si tu
   ne peux pas répondre avec haute confiance, laisse
   `> **TODO(@me, YYYY-MM-DD): need answer for X**` au lieu de deviner.

4. Remplace les corps placeholder des cibles Makefile (setup / dev / test / lint /
   typecheck / build / clean) par les vraies commandes du projet. Vérifie chacune
   en lançant `make -n <target>` puis `make <target>` une fois. Si une cible ne
   s'applique pas, laisse-la en `@true` avec un commentaire d'une ligne expliquant
   pourquoi.

5. Dans CONSTRAINTS.md, remplace les sections d'exemple « Code constraints » et
   « Forbidden » par 5–15 règles dures VRAIES pour ce projet. Dérive-les des
   tests existants, configs lint, CI, gestionnaires d'erreur et ADRs. Supprime
   les exemples qui ne s'appliquent pas.

6. Dans features.json, n'ajoute PAS encore de features toi-même. Attends que
   l'humain te dise quoi construire. Quand il le dira, suis strictement les
   règles de FEATURES.md pour ajouter l'entrée — ce fichier est le contrat
   pour éditer features.json (machine d'état, WIP=1, vérification obligatoire,
   anti-patterns). Lis-le une fois, puis agis.

7. Une fois fini, vérifie et tamponne :
   - lance `make check` — doit sortir 0
   - lance `harness doctor` — la note doit être au moins 24/30
   - ajoute un bloc `## Session <timestamp ISO>` à la fin de PROGRESS.md
     décrivant ce que tu as fait (bootstrap : échafaudage rempli pour <project name>)
   - lance `bash scripts/exit-clean.sh` — doit sortir 0

Règles dures pendant ce bootstrap :
- WIP = 1. Ne commence pas à coder de nouvelles features.
- Ne modifie aucun fichier en dehors de l'échafaudage listé à l'étape 1.
- Ne déclare pas « terminé » avant que `harness doctor` ET `make check` passent.
- Si quelque chose est vraiment indécidable depuis le dépôt, demande à l'humain
  — n'invente pas.
```

Sauvegarde-le comme snippet pour le réutiliser à chaque nouveau dépôt.

---

## Commandes

La CLI est délibérément minuscule : deux commandes d'échafaudage et deux
de diagnostic. Tout le reste vit dans le dépôt généré sous forme de
markdown + scripts que vous pouvez lire, grepper et modifier.

| Commande | Ce qu'elle fait |
|---|---|
| `harness init [dir]` | Échafaude un harnais frais (interactif). Écrit ~18 fichiers. Imprime le bootstrap prompt à la fin. |
| `harness inject [dir]` | Ajoute un harnais à un dépôt existant. Dry-run par défaut ; `--apply` écrit. Fusion sécurisée d'`AGENTS.md` / `Makefile` existants. |
| `harness doctor [dir]` | Note les 5 sous-systèmes sur 5 chacun + test démarrage à froid (5 questions). |
| `harness clean [dir]` | Lance le L12 exit-clean en 5 dimensions (build / tests / progrès / artefacts / startup). |

Après init, vous n'avez généralement plus besoin de la CLI `harness`. Le quotidien vit dans :

| Action | Où |
|---|---|
| Gérer les features (add / start / done / block) | Éditer `features.json` selon les règles dans `FEATURES.md` |
| Vérifier qu'une feature est vraiment terminée | `bash scripts/validate-feature.sh <id>` |
| Briefing de début de session | `bash scripts/session-init.sh` |
| Vérification de fin de session | Ajouter à `PROGRESS.md`, puis `bash scripts/exit-clean.sh` |
| Relire le bootstrap prompt | `cat .harness/bootstrap-prompt.txt` |

---

## Les 5 sous-systèmes (et la « leçon » d'origine de chacun)

| Sous-système | Fichiers générés | Leçon |
|---|---|---|
| **Instructions** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + pointeurs par agent | L02 / L04 |
| **État** | `PROGRESS.md`, `features.json`, `QUALITY.md` | L05 / L08 / L12 |
| **Retour** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **Observabilité** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **Gouvernance** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## Trois choses sur lesquelles cette boîte à outils ne transige pas (pour vous éviter de discuter avec l'agent)

1. **WIP = 1.** `features.json` n'autorise qu'une seule feature `active` à la fois. Cette règle est documentée dans `FEATURES.md` et appliquée par la discipline de l'agent + la revue du git diff. Cela tue le mode d'échec « commencer six choses, finir zéro » (L07).

2. **Verification est le seul chemin vers `passing`.** Chaque feature doit avoir une commande `verification`. Une feature n'entre dans `passing` qu'après que `bash scripts/validate-feature.sh <id>` soit sorti à 0. Pas de « ça a l'air ok » → done (L09).

3. **Sortie propre fait partie de « done ».** `scripts/exit-clean.sh` vérifie cinq choses en fin de session (build / tests / fraîcheur de PROGRESS / pas d'artefacts périmés / startup invocable). La CI lance le même script (L12).

---

## Agents pris en charge en v0.1.0

`claude-code`, `codex`, `opencode`, `cursor`, `aider`. Chacun reçoit le fichier attendu au bon endroit, tous pointant vers `AGENTS.md` comme source unique de vérité.

---

## Comparé à spec-kitty

[spec-kitty](https://github.com/spec-kitty/spec-kitty) est un harnais plus lourd, dirigé par missions. `harness-kit` est la boîte à outils minimale et opinionée pour le cas à 80%. Les deux peuvent coexister — `harness-kit` tourne *sous* spec-kitty sans problème.

| | harness-kit | spec-kitty |
|---|---|---|
| Nombre de concepts | bas (5 sous-systèmes) | élevé (mission/WP/charter/doctrine) |
| Délai pour première sortie utile | minutes | environ une heure |
| Opinion sur le workflow | aucune — apportez la vôtre | forte — specify→plan→tasks→implement→review |
| Injection dans vieux projet | citoyen de première classe (commande `inject`) | possible mais pas l'objectif |
| Dépendances | Node ≥ 18 uniquement | Python + quelques autres |

---

## Licence

MIT © Bojun Chai. Voir [LICENSE](./LICENSE).

## Crédits & références

Ce projet est l'empaquetage d'idées qui ne sont pas les miennes. Les références de leçons (`L01`–`L12`) dans les fichiers générés pointent vers les chapitres de :

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  — dépôt du cours / [site lisible](https://walkinglabs.github.io/learn-harness-engineering/)

Le cours, à son tour, distille les posts d'ingénierie suivants :

- OpenAI — [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Si cette boîte à outils vous a aidé, pensez à mettre une étoile au dépôt du cours en amont aussi — c'est la source du framework.
