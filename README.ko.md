# harness-kit

> AI 코딩 에이전트용 실용적인 하니스 스캐폴딩 킷.
> 5 개 서브시스템(지시 / 상태 / 피드백 / 관측성 / 거버넌스)을 모두 갖춘 완전한 하니스를 새 프로젝트나 기존 프로젝트에 한 번의 명령으로 주입하세요. 스택 무관.

[![npm version](https://img.shields.io/npm/v/@bojunchai/harness-kit.svg)](https://www.npmjs.com/package/@bojunchai/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · **한국어** · [Español](./README.es.md) · [Português](./README.pt.md) · [Français](./README.fr.md) · [Deutsch](./README.de.md)

---

## 이게 뭔가요?

`harness-kit` 은 [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)([코스 사이트](https://walkinglabs.github.io/learn-harness-engineering/))에서 다루는 아이디어를 도구로 패키징한 것입니다. 해당 코스는 코딩 에이전트(Claude Code, Codex, OpenCode, Cursor, Aider 등)를 실제 코드베이스에서 안정적으로 동작하게 하려면 무엇이 필요한지 OpenAI 와 Anthropic 의 엔지니어링 자료에서 정제한 커리큘럼입니다.

코스(그리고 이 킷)는 다음 세 편의 1차 자료에 기반합니다:

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

핵심 명제 한 줄: **더 비싼 모델로 바꾸는 것은 가장 비싼 수정이고, 하니스를 고치는 것은 가장 싼 수정이다.** 이 킷은 그 하니스를 제공합니다.

`harness init` 명령 한 번으로 다음을 얻습니다:

- `AGENTS.md` — 라우팅용 진입점 (≤ 200 줄, 모든 걸 다 담지 않음)
- `CONSTRAINTS.md` — 양보 불가 강제 규칙
- `docs/` — 아키텍처, 결정 로그, 테스트 표준 (주제별로 분리)
- `PROGRESS.md` — 에이전트가 "맥락을 잃지" 않도록 하는 세션 간 일지
- `features.json` — 프로젝트의 등뼈. 항목마다 검증 명령 필수
- `QUALITY.md` — 모듈별 품질 등급. 다음 세션이 어디부터 손볼지 알게 함
- `Makefile` — `setup / test / lint / check` 등 표준 타겟 (본문은 직접 채움)
- `scripts/exit-clean.sh` — 5 차원 세션 종료 점검
- `scripts/session-init.sh` — 세션 시작 브리핑
- `scripts/e2e-check.sh` — 정적 / 행위 / 시스템 3 계층 검증
- `docs/templates/sprint-contract.md` + `rubric.md` — 다단계 작업용 템플릿
- `.github/workflows/harness.yml` — exit-clean 을 CI 에서 실행
- 각 에이전트용 포인터 파일(`CLAUDE.md`, `.codex/AGENTS.md` 등) — 모두 `AGENTS.md` 를 가리킴

전부 평문 텍스트. 데몬 없음. 락인 없음. **스택 무관** — Node, Python, Rust, Go, 모바일, 폴리글랏 무엇이든.
킷을 지워도 파일들은 그대로 동작합니다.

---

## 설치 / 사용

이 킷은 `harness` CLI 를 함께 배포합니다. 생성된 `Makefile` 과 `scripts/` 는 `harness ...` 를 직접 호출하므로, 거의 항상 PATH 에 두기를 권장합니다.

```bash
# 권장: 한 번 글로벌 설치 ────────────────────────────────────────
npm install -g @bojunchai/harness-kit
harness init                 # 새 프로젝트 (대화형)
harness inject               # 기존 프로젝트 (기본 dry-run)
harness view                 # 프로젝트 harness 를 보여주는 localhost dashboard

# 또는 설치 없이 npx ───────────────────────────────────────────
# 주의: npx 는 그 한 번의 호출에서만 `harness` 를 노출합니다.
# 생성된 Makefile / scripts 가 모두 `harness doctor` 를 호출하므로,
# 결국 글로벌 설치가 필요해질 것입니다.
npx @bojunchai/harness-kit init
npx @bojunchai/harness-kit inject --apply
```

> 왜 `@bojunchai/` 스코프? 스코프 없는 `harness-kit` 은 npm 에서 무관한 squat 패키지가 점유하고 있습니다. CLI 바이너리는 그대로 `harness` — `npm install` / `npx` 시에만 스코프를 씁니다.

`npx` 로 실행한 뒤 `harness doctor` 에서 "command not found: harness" 가 나오면 글로벌 설치하세요:

```bash
npm install -g @bojunchai/harness-kit
```

---

## init 후: 에이전트에게 넘길 프롬프트

스캐폴딩 곳곳에 TODO 자리표시자가 있습니다. **손으로 채우지 마세요**. 사용 중인 코딩 에이전트(Claude Code / Codex / OpenCode / Cursor / Aider)에서 프로젝트를 열고 아래 프롬프트를 통째로 붙여넣으세요:

```
당신은 harness-kit 가 방금 초기화된 저장소에서 작업 중입니다.
당신의 임무는 이 하니스를 「이 프로젝트에 맞게 진짜로」 만드는 것입니다.

1. 생성된 모든 파일을 읽으세요: AGENTS.md, CONSTRAINTS.md, PROGRESS.md,
   QUALITY.md, docs/architecture.md, docs/decisions.md,
   docs/testing-standards.md, Makefile, .harnessrc.json. 구조를 이해합니다.

2. 프로젝트 자체를 조사하세요: package.json / pyproject.toml / Cargo.toml /
   go.mod / src 트리 / 기존 README / CI 설정 / lockfile 을 읽고, 이 프로젝트가
   무엇이고 어떤 스택을 쓰며 진입점이 어디고 이미 어떤 관례를 따르는지 파악합니다.

3. 생성 문서의 모든 `> **TODO**:` 표시를 「이 프로젝트」 기준으로 참인 내용으로
   교체하세요. 구체적으로 — 실제 파일 이름과 라인 번호를 인용하세요. 높은 신뢰도로
   답할 수 없으면 추측하지 말고
   `> **TODO(@me, YYYY-MM-DD): X 에 대한 답이 필요함**` 을 남기세요.

4. Makefile 의 자리표시자 타겟 본문(setup / dev / test / lint / typecheck /
   build / clean)을 이 프로젝트의 실제 명령으로 교체하세요. 각 타겟을
   `make -n <target>` 후 `make <target>` 으로 한 번 검증하세요. 적용되지 않는
   타겟은 `@true` 로 두고 한 줄짜리 주석으로 사유를 남기세요.

5. CONSTRAINTS.md 의 예시 「Code constraints」 와 「Forbidden」 섹션을 이
   프로젝트에 참인 5–15 개의 강제 규칙으로 교체하세요. 기존 테스트, lint 설정,
   CI, 에러 처리, ADR 에서 도출하세요. 적용되지 않는 예시는 삭제하세요.

6. features.json 에 직접 feature 를 아직 추가하지 마세요. 사용자가 무엇을
   만들지 알려줄 때까지 기다리세요. 추가할 때는 FEATURES.md 의 규칙을
   엄격히 따르세요 — 그 파일이 features.json 편집의 계약(상태 머신, WIP=1,
   verification 게이트, 안티패턴)입니다. 한 번 읽고 행동하세요.

7. 모두 끝나면 검증하고 도장 찍기:
   - `make check` 실행 — exit 0 필수
   - `harness doctor` 실행 — 점수 24/30 이상 필수
   - PROGRESS.md 끝에 `## Session <ISO 타임스탬프>` 블록을 추가하고 무엇을
     했는지 적기 (bootstrap: <project name> 스캐폴딩 채움)
   - `bash scripts/exit-clean.sh` 실행 — exit 0 필수

부트스트랩 동안의 강제 규칙:
- WIP = 1. 새 기능 코딩을 시작하지 마세요.
- 1 단계에 나열된 스캐폴딩 파일 외에는 어떤 파일도 수정하지 마세요.
- `harness doctor` 와 `make check` 가 둘 다 통과하기 전에는 「완료」 선언 금지.
- 저장소만으로 정말 결정 불가인 사항은 사용자에게 물어보세요 — 추측 금지.
```

스니펫으로 저장해 두면 새 저장소를 세팅할 때마다 재사용할 수 있습니다.

---

## 명령

CLI 는 의도적으로 매우 작습니다: 스캐폴딩 2 개 + 진단 2 개. 일상 작업은
모두 생성된 저장소 안의 markdown + 스크립트에 살아 있어 — 읽고, grep 하고,
수정할 수 있습니다.

| 명령 | 하는 일 |
|---|---|
| `harness init [dir]` | 새 하니스를 스캐폴드 (대화형). 약 18 개 파일 작성. 끝에 bootstrap prompt 자동 출력 |
| `harness inject [dir]` | 기존 저장소에 하니스 추가. 기본은 dry-run; `--apply` 로 실제 작성. 기존 `AGENTS.md` / `Makefile` 안전 병합 |
| `harness doctor [dir]` | 5 서브시스템을 각 5 점 만점으로 채점 + 콜드 스타트 테스트 (5 문항) |
| `harness clean [dir]` | L12 5 차원 exit-clean 실행 (빌드 / 테스트 / 진행도 / 잔여물 / 시작 경로) |

init 후에는 `harness` CLI 가 거의 필요 없습니다. 일상 워크플로는:

| 동작 | 어디서 |
|---|---|
| feature 관리 (add / start / done / block) | `features.json` 직접 편집, `FEATURES.md` 의 규칙에 따름 |
| feature 가 정말 끝났는지 검증 | `bash scripts/validate-feature.sh <id>` |
| 세션 시작 브리핑 | `bash scripts/session-init.sh` |
| 세션 종료 점검 | `PROGRESS.md` 에 추가, `bash scripts/exit-clean.sh` |
| bootstrap prompt 다시 보기 | `cat .harness/bootstrap-prompt.txt` |

---

## 5 서브시스템 (각 「강의」 출처)

| 서브시스템 | 생성 파일 | 강의 |
|---|---|---|
| **지시** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + 에이전트별 포인터 | L02 / L04 |
| **상태** | `PROGRESS.md`, `features.json`, `QUALITY.md` | L05 / L08 / L12 |
| **피드백** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **관측성** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **거버넌스** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## 이 킷이 양보하지 않는 3 가지 (에이전트와 다툴 필요 없게)

1. **WIP = 1.** `features.json` 은 동시에 한 feature 만 `active` 가 가능합니다. 이 규칙은 `FEATURES.md` 에 적혀 있고, 에이전트의 자율 + git diff 리뷰로 강제됩니다. 「6 가지를 동시에 시작해서 0 가지를 끝내는」 실패 모드를 차단합니다 (L07).

2. **`passing` 으로 가는 유일한 길은 verification.** 모든 feature 는 `verification` 셸 명령이 필수. `bash scripts/validate-feature.sh <id>` 가 exit 0 일 때만 `passing` 으로 표시 가능. 「내 보기엔 괜찮아」 → done 안 됨 (L09).

3. **깨끗한 종료가 「완료」의 일부.** `scripts/exit-clean.sh` 가 세션 종료 시 5 가지를 점검합니다 (빌드 / 테스트 / PROGRESS 신선도 / 잔여 산출물 없음 / 시작 경로 호출 가능). CI 도 같은 스크립트를 실행합니다 (L12).

---

## v0.1.0 에서 지원하는 에이전트

`claude-code`, `codex`, `opencode`, `cursor`, `aider`. 각 에이전트는 기대되는 위치에 기대되는 파일을 받고, 모두 `AGENTS.md` 를 단일 진실의 원천으로 가리킵니다.

---

## spec-kitty 와의 비교

[spec-kitty](https://github.com/spec-kitty/spec-kitty) 는 더 무거운 미션 기반 하니스입니다. `harness-kit` 은 80% 케이스를 위한 최소 의견의 킷입니다. 둘은 공존할 수 있습니다 — `harness-kit` 은 spec-kitty *아래*에서도 잘 돌아갑니다.

| | harness-kit | spec-kitty |
|---|---|---|
| 개념 수 | 적음 (5 서브시스템) | 많음 (mission/WP/charter/doctrine) |
| 첫 유의미한 산출까지의 시간 | 몇 분 | 1 시간 가량 |
| 워크플로 의견 | 없음 — 각자 가져옴 | 강함 — specify→plan→tasks→implement→review |
| 기존 프로젝트 주입 | 1급 시민 (`inject` 명령) | 가능하지만 초점 아님 |
| 의존성 | Node ≥ 18 만 | Python + 몇 가지 |

---

## 라이선스

MIT © Bojun Chai. [LICENSE](./LICENSE) 참고.

## 크레딧 & 출처

이 프로젝트는 제 아이디어가 아닌 것들을 패키징한 것입니다. 생성 파일 안의 `L01`–`L12` 강의 번호는 모두 다음을 가리킵니다:

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  — 코스 저장소 / [읽기 좋은 사이트](https://walkinglabs.github.io/learn-harness-engineering/)

해당 코스 자체는 다음 엔지니어링 글의 정제입니다:

- OpenAI — [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

이 킷이 도움이 됐다면 상류 코스 저장소에도 스타를 — 그것이 이 프레임워크의 원천입니다.
