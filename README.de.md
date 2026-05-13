# harness-kit

> Ein pragmatisches Scaffolding-Kit für Harnesses von KI-Coding-Agenten.
> Setze einen kompletten 5-Subsystem-Harness — Anweisungen, Zustand, Feedback, Observability, Governance — in jedes neue oder bestehende Repo. Stack-unabhängig.

[![npm version](https://img.shields.io/npm/v/harness-kit.svg)](https://www.npmjs.com/package/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Français](./README.fr.md) · **Deutsch**

---

## Was ist das?

`harness-kit` ist die Tool-Version der Ideen aus [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering) ([Kurs-Site](https://walkinglabs.github.io/learn-harness-engineering/)), einem von OpenAI/Anthropic abgeleiteten Curriculum darüber, was es wirklich braucht, damit Coding-Agenten (Claude Code, Codex, OpenCode, Cursor, Aider, …) auf realen Codebasen zuverlässig arbeiten.

Der Kurs (und dieses Kit) baut auf drei Primärquellen auf:

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Die These in einem Satz: **Auf ein teureres Modell zu wechseln ist die teuerste Korrektur; den Harness zu reparieren ist die billigste.** Dieses Kit liefert dir den Harness.

Du bekommst einen einzigen CLI-Befehl — `harness init` — und gehst weg mit:

- `AGENTS.md` — geroutete Einstiegsdatei (≤ 200 Zeilen, niemals Mülleimer)
- `CONSTRAINTS.md` — nicht verhandelbare harte Regeln
- `docs/` — Architektur, Entscheidungslog, Teststandards (getrennt, nicht vollgestopft)
- `PROGRESS.md` — das sitzungsübergreifende Tagebuch, damit Agenten den Faden nicht verlieren
- `features.json` — die Wirbelsäule des Projekts, mit `verification`-Befehl pro Eintrag
- `QUALITY.md` — Qualitätsnote pro Modul, damit die nächste Sitzung weiß, wo angesetzt werden muss
- `Makefile` — kanonische `setup / test / lint / check`-Targets (Inhalte füllst du)
- `scripts/exit-clean.sh` — der 5-Dimensionen-Sitzungsabschluss-Check
- `scripts/session-init.sh` — das Sitzungsstart-Briefing
- `scripts/e2e-check.sh` — Drei-Schichten-Verifizierer (statisch / Verhalten / System)
- `docs/templates/sprint-contract.md` + `rubric.md` — für mehrstufige Arbeiten
- `.github/workflows/harness.yml` — CI, die die ganze Latte ausführt
- Pointer-Dateien pro Agent (`CLAUDE.md`, `.codex/AGENTS.md`, …), die auf `AGENTS.md` zeigen

Alles ist Plain-Text. Kein Daemon. Kein Lock-in. **Stack-unabhängig** — Node, Python, Rust, Go, Mobile, Polyglot, alles.
Lösche das Kit und die Dateien funktionieren weiter.

---

## Installation / Verwendung

Das Kit liefert eine CLI namens `harness` mit. Das generierte `Makefile` und die `scripts/` rufen `harness ...` direkt auf — du willst es also fast immer im PATH haben.

```bash
# Empfohlen: einmal global installieren ───────────────────────────────
npm install -g harness-kit
harness init                 # neues Projekt (interaktiv)
harness inject               # bestehendes Projekt (Standard: dry-run)

# Oder ohne Installation via npx ──────────────────────────────────────
# Hinweis: npx stellt `harness` nur innerhalb dieses einen Aufrufs
# bereit. Die generierten PROGRESS.md / Makefile / scripts rufen
# `harness ...` auf, also wirst du die globale Installation früher
# oder später wollen.
npx harness-kit init
npx harness-kit inject --apply
```

Wenn du `npx` benutzt hast und beim Ausführen von `harness doctor` oder `make session-start` die Meldung „command not found: harness" siehst, installiere es global:

```bash
npm install -g harness-kit
```

---

## Nach init: übergib es deinem Agenten

Das Scaffolding hat überall TODO-Platzhalter. **Fülle sie nicht von Hand aus.**
Öffne das Projekt in deinem Coding-Agenten (Claude Code / Codex / OpenCode / Cursor / Aider) und füge diesen Prompt ein:

```
Du arbeitest in einem Repo, in dem gerade harness-kit initialisiert wurde.
Deine Aufgabe ist es, diesen Harness für DIESES Projekt real zu machen.

1. Lies jede generierte Datei: AGENTS.md, CONSTRAINTS.md, PROGRESS.md, QUALITY.md,
   docs/architecture.md, docs/decisions.md, docs/testing-standards.md, Makefile,
   .harnessrc.json. Verstehe die Struktur.

2. Inspiziere das eigentliche Projekt: lies package.json / pyproject.toml /
   Cargo.toml / go.mod / src-Baum / vorhandenes README / CI-Configs / Lockfiles.
   Finde heraus, was dieses Projekt wirklich ist, welche Stack es nutzt, wo seine
   Einstiegspunkte sind und welche Konventionen es bereits einhält.

3. Ersetze jeden `> **TODO**:`-Marker in den generierten Docs durch Inhalt, der
   für DIESES Projekt WAHR ist. Sei spezifisch — zitiere reale Dateinamen und
   Zeilennummern. Wenn du etwas nicht mit hoher Sicherheit beantworten kannst,
   hinterlasse `> **TODO(@me, YYYY-MM-DD): need answer for X**` statt zu raten.

4. Ersetze die Platzhalter-Body-Inhalte der Makefile-Targets (setup / dev / test /
   lint / typecheck / build / clean) durch die echten Befehle dieses Projekts.
   Verifiziere jedes mit `make -n <target>` und dann einmal `make <target>`.
   Wenn ein Target nicht zutrifft, lass es als `@true` mit einem Einzeiler-
   Kommentar, der erklärt, warum.

5. In CONSTRAINTS.md ersetze die Beispiel-Sektionen „Code constraints" und
   „Forbidden" durch 5–15 harte Regeln, die für DIESES Projekt WAHR sind.
   Leite sie aus existierenden Tests, Lint-Configs, CI, Error-Handlern und ADRs
   ab. Lösche nicht zutreffende Beispiele.

6. In features.json füge KEINE Features selbst hinzu. Warte, bis der Mensch dir
   sagt, was zu bauen ist, und nutze dann `harness feature add` — bearbeite das
   JSON niemals direkt.

7. Wenn fertig, verifiziere und siegele:
   - führe `make check` aus — muss exit 0
   - führe `harness doctor` aus — Score muss mindestens 24/30 sein
   - führe `harness session end "harness-kit bootstrap: Scaffolding für <project name> ausgefüllt"` aus

Harte Regeln während dieses Bootstraps:
- WIP = 1. Beginne nicht mit dem Codieren neuer Features.
- Modifiziere keine Datei außerhalb des in Schritt 1 aufgelisteten Scaffoldings.
- Erkläre nicht „fertig", bevor `harness doctor` und `make check` beide bestehen.
- Wenn etwas wirklich nicht aus dem Repo entscheidbar ist, frage den Menschen
  — erfinde nicht.
```

Speichere als Snippet, um es bei jedem neuen Repo wiederzuverwenden.

---

## Befehle

| Befehl | Was er tut |
|---|---|
| `harness init [dir]` | Scaffold eines frischen Harness (interaktiv). Schreibt ~17 Dateien. |
| `harness inject [dir]` | Fügt einen Harness zu einem bestehenden Repo hinzu. Standard ist dry-run; `--apply` schreibt. Sicheres Mergen vorhandener `AGENTS.md` / `Makefile`. |
| `harness doctor [dir]` | Bewertet die 5 Subsysteme mit je 5 Punkten + Cold-Start-Test (5 Fragen). |
| `harness clean [dir]` | Führt den L12 5-Dimensionen-exit-clean aus (Build / Tests / Progress / Artefakte / Startup). |
| `harness feature add` | Fügt ein Feature mit id + Behavior + Verification-Befehl hinzu. |
| `harness feature list` | Zeigt alle Features und deren Zustände. |
| `harness feature start <id>` | Markiert Feature als aktiv. **Erzwingt WIP=1.** |
| `harness feature done <id>` | Führt Verification aus. Markiert nur bei Exit 0 als passing. |
| `harness feature block <id> <reason>` | Markiert als blocked mit Begründung. |
| `harness session start` | L06 Init: liest Zustand, prüft Tooling, druckt Briefing. |
| `harness session end ["summary"]` | L12 stempelt PROGRESS + führt exit-clean aus. |

---

## Die 5 Subsysteme (und woher die jeweilige „Lektion" stammt)

| Subsystem | Generierte Dateien | Lektion |
|---|---|---|
| **Anweisungen** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + Pointer pro Agent | L02 / L04 |
| **Zustand** | `PROGRESS.md`, `features.json`, `QUALITY.md` | L05 / L08 / L12 |
| **Feedback** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **Observability** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **Governance** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## Drei Dinge, auf denen dieses Kit besteht (damit du nicht mit dem Agenten streiten musst)

1. **WIP = 1.** `features.json` erlaubt nur ein Feature gleichzeitig im Zustand `active`. `harness feature start` während ein anderes aktiv ist, wird abgelehnt. Dies tötet den Fehlermodus „sechs Sachen gleichzeitig anfangen, null fertigmachen" (L07).

2. **Verification ist der einzige Weg zu `done`.** Jedes Feature muss einen `verification`-Shell-Befehl haben. `harness feature done <id>` führt ihn aus und markiert nur bei Exit 0 als `passing`. Kein „sieht okay aus" → done (L09).

3. **Sauberer Ausstieg ist Teil von „done".** `scripts/exit-clean.sh` prüft am Sitzungsende fünf Dinge (Build / Tests / PROGRESS-Aktualität / keine alten Artefakte / Startup aufrufbar). Die CI führt dasselbe Skript aus (L12).

---

## In v0.1.0 unterstützte Agenten

`claude-code`, `codex`, `opencode`, `cursor`, `aider`. Jeder erhält die erwartete Datei am erwarteten Ort, alle zeigen zurück auf `AGENTS.md` als einzige Quelle der Wahrheit.

---

## Vergleich mit spec-kitty

[spec-kitty](https://github.com/spec-kitty/spec-kitty) ist ein schwererer, missionsgetriebener Harness. `harness-kit` ist das minimale, meinungsstarke 80%-Fall-Kit. Sie können koexistieren — `harness-kit` läuft *unter* spec-kitty problemlos.

| | harness-kit | spec-kitty |
|---|---|---|
| Anzahl Konzepte | gering (5 Subsysteme) | hoch (mission/WP/charter/doctrine) |
| Zeit bis zum ersten nützlichen Output | Minuten | etwa eine Stunde |
| Workflow-Meinung | keine — bring deine eigene | stark — specify→plan→tasks→implement→review |
| Injection in altes Projekt | First-Class-Citizen (`inject`-Befehl) | möglich, aber nicht der Fokus |
| Abhängigkeiten | nur Node ≥ 18 | Python + ein paar |

---

## Lizenz

MIT © Bojun Chai. Siehe [LICENSE](./LICENSE).

## Credits & Referenzen

Dieses Projekt ist die Verpackung von Ideen, die nicht meine sind. Die Lektions-Referenzen (`L01`–`L12`) in den generierten Dateien zeigen auf Kapitel von:

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  — Kurs-Repo / [lesbare Site](https://walkinglabs.github.io/learn-harness-engineering/)

Der Kurs wiederum destilliert die folgenden Engineering-Posts:

- OpenAI — [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Wenn dieses Kit dir geholfen hat, vergib auch dem Upstream-Kurs-Repo einen Stern — es ist die Quelle des Frameworks.
