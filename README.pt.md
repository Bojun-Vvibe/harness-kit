# harness-kit

> Um kit de andaimes pragmático para harnesses de agentes-de-código IA.
> Coloque um harness completo de 5 subsistemas — instruções, estado, feedback, observabilidade, governança — em qualquer repo novo ou existente. Independente de stack.

[![npm version](https://img.shields.io/npm/v/harness-kit.svg)](https://www.npmjs.com/package/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Español](./README.es.md) · **Português** · [Français](./README.fr.md) · [Deutsch](./README.de.md)

---

## O que é isto?

`harness-kit` é a versão-ferramenta das ideias de [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering) ([site do curso](https://walkinglabs.github.io/learn-harness-engineering/)), um currículo derivado de OpenAI/Anthropic sobre o que realmente é necessário para fazer agentes de código (Claude Code, Codex, OpenCode, Cursor, Aider, …) confiáveis em bases de código reais.

O curso (e este kit) se apoia em três fontes primárias:

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

A tese em uma linha: **trocar para um modelo mais caro é o conserto mais caro; consertar o harness é o mais barato.** Este kit te dá o harness.

Você obtém um único comando — `harness init` — e sai com:

- `AGENTS.md` — ponto de entrada com roteamento (≤ 200 linhas, nunca um catch-all)
- `CONSTRAINTS.md` — regras duras inegociáveis
- `docs/` — arquitetura, log de decisões, padrões de teste (separados, não amontoados)
- `PROGRESS.md` — o diário entre sessões para que agentes não "percam o fio"
- `features.json` — a coluna vertebral do projeto, com um comando de `verification` por item
- `QUALITY.md` — nota por módulo para a próxima sessão saber por onde começar
- `Makefile` — targets canônicos `setup / test / lint / check` (você preenche os corpos)
- `scripts/exit-clean.sh` — a checagem de fim-de-sessão em 5 dimensões
- `scripts/session-init.sh` — o briefing de início de sessão
- `scripts/e2e-check.sh` — verificador em três camadas (estática / comportamento / sistema)
- `docs/templates/sprint-contract.md` + `rubric.md` — para trabalhos multi-passos
- `.github/workflows/harness.yml` — CI que roda toda a barra
- arquivos de ponteiro por agente (`CLAUDE.md`, `.codex/AGENTS.md`, …) que apontam para `AGENTS.md`

Tudo é texto plano. Sem daemon. Sem lock-in. **Independente de stack** — Node, Python, Rust, Go, mobile, polyglot, qualquer coisa.
Apague o kit e os arquivos continuam funcionando.

---

## Instalação / uso

O kit inclui uma CLI chamada `harness`. O `Makefile` e os `scripts/` gerados chamam `harness ...` diretamente, então você quase sempre vai querer ele no PATH.

```bash
# Recomendado: instale uma vez globalmente ────────────────────────────
npm install -g harness-kit
harness init                 # projeto novo (interativo)
harness inject               # projeto existente (padrão dry-run)

# Ou sem instalar, via npx ────────────────────────────────────────────
# Nota: npx só expõe `harness` dentro daquela única chamada. O
# PROGRESS.md / Makefile / scripts gerados chamam `harness ...`,
# então cedo ou tarde você vai querer a instalação global.
npx harness-kit init
npx harness-kit inject --apply
```

Se você usou `npx` e ao rodar `harness doctor` ou `make session-start` aparece "command not found: harness", instale globalmente:

```bash
npm install -g harness-kit
```

---

## Depois do init: entregue ao seu agente

O andaime tem placeholders TODO por todo lado. **Não preencha à mão.**
Abra o projeto no seu agente de código (Claude Code / Codex / OpenCode / Cursor / Aider) e cole este prompt:

```
Você está trabalhando num repo que acabou de inicializar harness-kit.
Sua tarefa é tornar este harness real para ESTE projeto.

1. Leia cada arquivo gerado: AGENTS.md, CONSTRAINTS.md, PROGRESS.md, QUALITY.md,
   docs/architecture.md, docs/decisions.md, docs/testing-standards.md, Makefile,
   .harnessrc.json. Entenda a estrutura.

2. Inspecione o projeto real: leia package.json / pyproject.toml / Cargo.toml /
   go.mod / árvore de src / README existente / configs de CI / lockfiles.
   Descubra o que este projeto realmente é, qual stack usa, onde estão os pontos
   de entrada e quais convenções já segue.

3. Substitua cada marcador `> **TODO**:` nos docs gerados por conteúdo VERDADEIRO
   para este projeto. Seja específico — cite arquivos e linhas reais. Se você não
   pode responder algo com alta confiança, deixe
   `> **TODO(@me, YYYY-MM-DD): need answer for X**` em vez de chutar.

4. Substitua os corpos placeholder dos targets do Makefile (setup / dev / test /
   lint / typecheck / build / clean) pelos comandos reais deste projeto. Verifique
   cada um rodando `make -n <target>` e depois `make <target>` uma vez. Se um
   target não se aplica, deixe como `@true` com um comentário de uma linha
   explicando por quê.

5. Em CONSTRAINTS.md, substitua as seções de exemplo "Code constraints" e
   "Forbidden" por 5–15 regras duras VERDADEIRAS para este projeto. Derive-as de
   testes existentes, configs de lint, CI, manipuladores de erro e ADRs. Apague
   exemplos que não se aplicam.

6. Em features.json, NÃO adicione features você mesmo. Espere o humano dizer o
   que construir e então use `harness feature add` — nunca edite o JSON
   diretamente.

7. Quando terminar, verifique e carimbe:
   - rode `make check` — deve sair 0
   - rode `harness doctor` — a nota deve ser pelo menos 24/30
   - rode `harness session end "harness-kit bootstrap: andaime preenchido para <project name>"`

Regras duras durante este bootstrap:
- WIP = 1. Não comece a codar features novas.
- Não modifique nenhum arquivo fora do andaime listado no passo 1.
- Não declare "pronto" até `harness doctor` e `make check` ambos passarem.
- Se algo é genuinamente indecidível pelo repo, pergunte ao humano — não invente.
```

Salve como snippet para reutilizar a cada repo novo.

---

## Comandos

| Comando | O que faz |
|---|---|
| `harness init [dir]` | Andaima um harness do zero (interativo). Escreve ~17 arquivos. |
| `harness inject [dir]` | Adiciona um harness a um repo existente. Por padrão dry-run; `--apply` escreve. Faz merge seguro de `AGENTS.md` / `Makefile` existentes. |
| `harness doctor [dir]` | Pontua os 5 subsistemas em até 5 cada + teste de partida-fria (5 perguntas). |
| `harness clean [dir]` | Roda o L12 exit-clean em 5 dimensões (build / testes / progresso / artefatos / startup). |
| `harness feature add` | Adiciona uma feature com id + behavior + comando de verification. |
| `harness feature list` | Mostra todas as features e seus estados. |
| `harness feature start <id>` | Marca feature como ativa. **Impõe WIP=1.** |
| `harness feature done <id>` | Roda verification. Só marca passing se sair 0. |
| `harness feature block <id> <reason>` | Marca como blocked com um motivo. |
| `harness session start` | L06 init: lê estado, valida tooling, imprime briefing. |
| `harness session end ["summary"]` | L12 carimba PROGRESS + roda exit-clean. |

---

## Os 5 subsistemas (e a "lição" de onde vem cada um)

| Subsistema | Arquivos gerados | Lição |
|---|---|---|
| **Instruções** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + ponteiros por agente | L02 / L04 |
| **Estado** | `PROGRESS.md`, `features.json`, `QUALITY.md` | L05 / L08 / L12 |
| **Feedback** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **Observabilidade** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **Governança** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## Três coisas em que este kit insiste (para você não ter que discutir com o agente)

1. **WIP = 1.** `features.json` só permite uma feature `active` por vez. Chamar `harness feature start` enquanto outra está ativa é rejeitado. Isso mata o modo de falha "começar seis coisas, terminar zero" (L07).

2. **Verification é o único caminho para `done`.** Toda feature deve ter um comando `verification`. `harness feature done <id>` o executa e só marca `passing` com exit 0. Não "parece ok pra mim" → done (L09).

3. **Saída limpa é parte de "done".** `scripts/exit-clean.sh` checa cinco coisas no fim de sessão (build / testes / frescor de PROGRESS / sem artefatos antigos / startup invocável). O CI roda o mesmo script (L12).

---

## Agentes suportados na v0.1.0

`claude-code`, `codex`, `opencode`, `cursor`, `aider`. Cada um recebe o arquivo esperado no lugar esperado, todos apontando de volta para `AGENTS.md` como fonte única de verdade.

---

## Comparado com spec-kitty

[spec-kitty](https://github.com/spec-kitty/spec-kitty) é um harness mais pesado, orientado a missões. `harness-kit` é o kit mínimo e opinionado para o caso 80%. Eles podem coexistir — `harness-kit` roda *sob* spec-kitty sem problema.

| | harness-kit | spec-kitty |
|---|---|---|
| Quantidade de conceitos | baixa (5 subsistemas) | alta (mission/WP/charter/doctrine) |
| Tempo até primeiro output útil | minutos | aproximadamente uma hora |
| Opinião sobre workflow | nenhuma — traga o seu | forte — specify→plan→tasks→implement→review |
| Injeção em projeto antigo | cidadão de primeira (comando `inject`) | possível mas não é o foco |
| Dependências | só Node ≥ 18 | Python + algumas |

---

## Licença

MIT © Bojun Chai. Veja [LICENSE](./LICENSE).

## Créditos e referências

Este projeto é o empacotamento de ideias que não são minhas. As referências de lições (`L01`–`L12`) nos arquivos gerados apontam para capítulos de:

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  — repo do curso / [site legível](https://walkinglabs.github.io/learn-harness-engineering/)

O curso, por sua vez, destila os seguintes posts de engenharia:

- OpenAI — [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Se este kit te ajudou, considere dar estrela também no repo do curso a montante — é a fonte original do framework.
