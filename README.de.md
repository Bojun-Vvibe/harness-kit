# harness-kit

> Ein pragmatisches Scaffolding-Kit für Harnesses von KI-Coding-Agenten.
> Setze einen kompletten 5-Subsystem-Harness — Anweisungen, Zustand, Feedback, Observability, Governance — in jedes neue oder bestehende Repo. Stack-unabhängig.

[![npm version](https://img.shields.io/npm/v/@bojunchai/harness-kit.svg)](https://www.npmjs.com/package/@bojunchai/harness-kit)
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
npm install -g @bojunchai/harness-kit
harness init                 # neues Projekt (interaktiv)
harness inject               # bestehendes Projekt (Standard: dry-run)
harness view                 # localhost-Dashboard für den Harness des Projekts

# Oder ohne Installation via npx ──────────────────────────────────────
# Hinweis: npx stellt `harness` nur innerhalb dieses einen Aufrufs
# bereit. Die generierten Makefile / scripts rufen `harness doctor`
# auf, also wirst du die globale Installation früher oder später wollen.
npx @bojunchai/harness-kit init
npx @bojunchai/harness-kit inject --apply
```

> Warum der `@bojunchai/`-Scope? Der unscoped Name `harness-kit` ist auf npm von einem unverwandten Squat-Paket belegt. Die CLI-Binary bleibt `harness` — nur `npm install` / `npx` erwähnen den Scope.

Wenn du `npx` benutzt hast und beim Ausführen von `harness doctor` die Meldung „command not found: harness" siehst, installiere es global:

```bash
npm install -g @bojunchai/harness-kit
```

### Troubleshooting: `EEXIST: file already exists` auf `/bin/harness`

Die CLI registriert eine Binary namens `harness`. Zwei bekannte Fälle, in denen ein anderes Paket diesen Namen bereits belegt:

1. Du hast `npm install -g .` aus einem lokalen Klon des Repos ausgeführt (Early-Contributor-Fall). Lösung:

   ```bash
   npm uninstall -g harness-kit
   npm install -g @bojunchai/harness-kit
   ```

2. Du hast [`harness-cli`](https://www.npmjs.com/package/harness-cli) installiert (deklariert ebenfalls `bin: harness`). Drei Optionen:

   ```bash
   # A — Konfliktpaket deinstallieren:
   npm uninstall -g harness-cli
   npm install -g @bojunchai/harness-kit

   # B — Beide behalten, dieses Kit nutzt den Alias harness-kit (auch in package.json bin registriert):
   npm install -g @bojunchai/harness-kit
   harness-kit init

   # C — Überschreiben erzwingen:
   npm install -g @bojunchai/harness-kit --force
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

6. In features.json füge KEINE Features selbst hinzu, noch nicht. Warte, bis
   der Mensch dir sagt, was zu bauen ist. Wenn es soweit ist, folge strikt den
   Regeln in FEATURES.md, um den Eintrag hinzuzufügen — diese Datei ist der
   Vertrag für das Editieren von features.json (Zustandsmaschine, WIP=1,
   Verifikations-Gate, Anti-Patterns). Lies sie einmal, dann handle.

7. Wenn fertig, verifiziere und siegele:
   - führe `make check` aus — muss exit 0
   - führe `harness doctor` aus — Score muss mindestens 24/30 sein
   - füge am Ende von PROGRESS.md einen `## Session <ISO-Zeitstempel>`-Block
     hinzu und beschreibe, was du getan hast
     (bootstrap: Scaffolding für <project name> ausgefüllt)
   - führe `bash scripts/exit-clean.sh` aus — muss exit 0

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

Die CLI ist absichtlich winzig: zwei Scaffolding-Befehle und zwei
Diagnose-Befehle. Alles andere lebt im generierten Repo als Markdown +
Skripte, die du lesen, greppen und ändern kannst.

| Befehl | Was er tut |
|---|---|
| `harness init [dir]` | Scaffold eines frischen Harness (interaktiv). Schreibt ~18 Dateien. Druckt am Ende den Bootstrap-Prompt. |
| `harness inject [dir]` | Fügt einen Harness zu einem bestehenden Repo hinzu. Standard ist dry-run; `--apply` schreibt. Sicheres Mergen vorhandener `AGENTS.md` / `Makefile`. |
| `harness doctor [dir]` | Bewertet die 5 Subsysteme mit je 5 Punkten + Cold-Start-Test (5 Fragen). |
| `harness clean [dir]` | Führt den L12 5-Dimensionen-exit-clean aus (Build / Tests / Progress / Artefakte / Startup). |

Nach init brauchst du die `harness`-CLI normalerweise nicht mehr. Die tägliche Arbeit lebt in:

| Aktion | Wo |
|---|---|
| Features verwalten (add / start / done / block) | `features.json` direkt nach den Regeln in `FEATURES.md` editieren |
| Verifizieren, dass ein Feature wirklich fertig ist | `bash scripts/validate-feature.sh <id>` |
| Session-Start-Briefing | `bash scripts/session-init.sh` |
| Session-Ende-Check | An `PROGRESS.md` anhängen, dann `bash scripts/exit-clean.sh` |
| Bootstrap-Prompt erneut lesen | `cat .harness/bootstrap-prompt.txt` |

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

1. **WIP = 1.** `features.json` erlaubt nur ein Feature gleichzeitig im Zustand `active`. Diese Regel ist in `FEATURES.md` dokumentiert und wird durch Agenten-Disziplin + git-diff-Review durchgesetzt. Dies tötet den Fehlermodus „sechs Sachen gleichzeitig anfangen, null fertigmachen" (L07).

2. **Verification ist der einzige Weg zu `passing`.** Jedes Feature muss einen `verification`-Shell-Befehl haben. Ein Feature kommt nur in `passing`, nachdem `bash scripts/validate-feature.sh <id>` mit Exit 0 beendet wurde. Kein „sieht okay aus" → done (L09).

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
