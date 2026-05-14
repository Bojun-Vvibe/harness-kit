# harness-kit

> 一个面向 AI 编码 agent 的工程脚手架。一条命令，给任何新老项目装上完整的「指令 / 状态 / 反馈 / 可观测 / 治理」五子系统 harness。技术栈无关。

[![npm version](https://img.shields.io/npm/v/@bojunchai/harness-kit.svg)](https://www.npmjs.com/package/@bojunchai/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [English](./README.md) · **简体中文** · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Français](./README.fr.md) · [Deutsch](./README.de.md)

---

## 这是什么

`harness-kit` 是 [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)（[课程站点](https://walkinglabs.github.io/learn-harness-engineering/)）这门课讲的那套 harness 思想的工具化实现。课程提炼自 OpenAI 和 Anthropic 公开的工程实践。

课程（以及这个工具）建立在三篇原始文章之上：

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

核心论点：**换更贵的模型是最贵的修法，修 harness 是最便宜的。** 这个工具直接把 harness 给你装上。

一条 `harness init`，你的项目里就会出现：

- `AGENTS.md` — 路由式入口（≤ 200 行，不是百科全书）
- `CONSTRAINTS.md` — 不可违反的硬约束
- `docs/` — 架构、决策日志、测试标准（按主题拆分）
- `PROGRESS.md` — 跨会话日记本，agent 不再"断片"
- `features.json` — 项目脊梁骨，每个功能项必须带 `verification` 命令
- `QUALITY.md` — 模块质量评分，告诉下个 agent 该先修哪
- `Makefile` — `setup / test / lint / check` 等标准 target（命令体由你填）
- `scripts/exit-clean.sh` — L12 五维度退场检查
- `scripts/session-init.sh` — 入场简报
- `scripts/e2e-check.sh` — 三层（静态 / 行为 / 系统）校验
- `docs/templates/sprint-contract.md` + `rubric.md` — 多步骤工作模板
- `.github/workflows/harness.yml` — 把 exit-clean 跑进 CI
- 各家 agent 配置文件（`CLAUDE.md`、`.codex/AGENTS.md` 等），全部指回 `AGENTS.md`

全部纯文本。没有后台进程。没有锁定。**技术栈无关**——Node、Python、Rust、Go、移动端、混合栈都行。删掉脚手架文件还能用。

---

## 安装 / 使用

工具自带一个 `harness` CLI。生成出来的 `Makefile` 和 `scripts/` 都直接调 `harness ...`，所以基本都要把它装到 PATH 里。

```bash
# 推荐：全局装一次 ────────────────────────────────────────────────
npm install -g @bojunchai/harness-kit
harness init                 # 新项目（交互式）
harness inject               # 老项目（默认 dry-run）
harness view                 # 启 localhost dashboard 看项目 harness

# 或者零安装用 npx ───────────────────────────────────────────────
# 注意：npx 只在那一次调用里暴露 `harness` 命令。
# 生成的 Makefile / scripts 都引用 `harness doctor`，
# 所以你最终还是会想全局装一次。
npx @bojunchai/harness-kit init
npx @bojunchai/harness-kit inject --apply
```

> 为什么是 `@bojunchai/` scope？因为 `harness-kit` 这个无 scope 名被一个无关 squat 包占了。CLI 命令名仍然是 `harness`——只有 `npm install` / `npx` 时要写 scope。

如果你用了 `npx`，然后跑 `harness doctor` 报 "command not found: harness"，全局装一次就好：

```bash
npm install -g @bojunchai/harness-kit
```

---

## init 完之后：把这段 prompt 丢给你的 agent

脚手架里到处是 TODO 占位。**别手动填**。

**`harness init` 跑完会自动把这段 prompt 直接打印到终端**，并存一份到 `.harness/bootstrap-prompt.txt`。随时再看：

```bash
cat .harness/bootstrap-prompt.txt   # init 时打印的那份原文
```

想 init 时直接出指定语言的 prompt，传 `--lang`：

```bash
harness init --lang zh   # en | zh | ja | ko | es | pt | fr | de
```

下面是中文版 prompt，方便参考——在你的 coding agent（Claude Code / Codex / OpenCode / Cursor / Aider）里打开项目，把它整段粘进去：

```
你现在在一个刚被 harness-kit 初始化过的仓库里工作。
你的任务是：把这套 harness 在 THIS 项目里落实成真。

1. 通读所有生成出来的脚手架文件：AGENTS.md、CONSTRAINTS.md、PROGRESS.md、
   QUALITY.md、docs/architecture.md、docs/decisions.md、
   docs/testing-standards.md、Makefile、.harnessrc.json。先理解结构。

2. 检查项目本身：读 package.json / pyproject.toml / Cargo.toml / go.mod /
   src 目录树 / 现有 README / CI 配置 / lockfile。搞清楚这个项目到底是什么、
   用的什么栈、入口在哪、已经在遵守什么约定。

3. 把所有生成文档里的 `> **TODO**:` 占位替换成对 THIS 项目为真的内容。
   要具体——引用真实的文件名和行号。如果某条信息你不能高置信度回答，
   就留 `> **TODO(@me, YYYY-MM-DD): need answer for X**`，不要瞎编。

4. 把 Makefile 里的占位 target body（setup / dev / test / lint / typecheck /
   build / clean）替换成项目真实的命令。每条都验证：先 `make -n <target>`，
   再 `make <target>` 跑一次。如果某个 target 在这个项目不适用，留成 `@true`
   并加一行注释说明为什么不适用。

5. 在 CONSTRAINTS.md 里，把示例的 "Code constraints" 和 "Forbidden" 两节
   换成 5–15 条对 THIS 项目为真的硬约束。从已有测试、lint 配置、CI、错误
   处理代码、ADR 里推导出来。不适用的示例直接删。

6. features.json 暂时不要自己加 feature。等用户告诉你要做什么。要加的时候，
   严格按 FEATURES.md 里的规则来——那是编辑 features.json 的契约（状态机、
   WIP=1、verification 门控、反模式）。先读一遍，再动手。

7. 全部完成后验证并盖章：
   - 跑 `make check` —— 必须 exit 0
   - 跑 `harness doctor` —— 分数必须 ≥ 24/30
   - 在 PROGRESS.md 末尾追加一段 `## Session <ISO 时间戳>`，写清楚做了什么
     （bootstrap：为 <项目名> 填好脚手架）
   - 跑 `bash scripts/exit-clean.sh` —— 必须 exit 0

bootstrap 期间的硬规则：
- WIP = 1。不要开始写新功能。
- 除了第 1 步列出的脚手架文件之外，不要修改任何文件。
- 在 `harness doctor` 和 `make check` 都通过之前，不能宣布完成。
- 仓库里实在推导不出来的事情，问用户——不要瞎编。
```

把它存成 snippet，每次新搭项目就用它。

---

## 命令

CLI 故意做得极小：2 个脚手架命令 + 2 个诊断命令 + 1 个 viewer。其余日常工作都在生成出来的仓库里——markdown + 脚本，可读、可 grep、可改。

| 命令 | 干什么 |
|---|---|
| `harness init [dir]` | 全新项目装 harness（交互式），写入约 18 个文件。结束时自动打印 bootstrap prompt |
| `harness inject [dir]` | 给老项目注入。默认 dry-run；`--apply` 真正写入。已有 `AGENTS.md` / `Makefile` 安全合并 |
| `harness doctor [dir]` | 给五子系统每项打分（满分 5），加冷启动测试（5 个问题）。和 `view` 用同一套标签 |
| `harness view [dir]` | 启一个 localhost dashboard（默认端口 3737），按 **指令 / 工具 / 环境 / 状态 / 反馈** 5 个子系统可视化当前项目的 harness |
| `harness clean [dir]` | 跑 L12 五维度 exit-clean（构建/测试/进度/工件/启动路径）|

init 之后基本不再需要 `harness` CLI。日常工作流都在：

| 操作 | 在哪做 |
|---|---|
| 管理 feature（add / start / done / block）| 直接编辑 `features.json`，按 `FEATURES.md` 里的规则 |
| 验证 feature 真的做完了 | `bash scripts/validate-feature.sh <id>` |
| Session 开始的简报 | `bash scripts/session-init.sh` |
| Session 结束的检查 | 在 `PROGRESS.md` 加一段，再 `bash scripts/exit-clean.sh` |
| 再看一遍 bootstrap prompt | `cat .harness/bootstrap-prompt.txt` |

---

## 五子系统对应表（每条对应一讲）

| 子系统 | 生成文件 | 讲义 |
|---|---|---|
| **指令** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + 各 agent 路由文件 | L02 / L04 |
| **状态** | `PROGRESS.md`, `features.json`, `FEATURES.md`, `QUALITY.md` | L05 / L08 / L12 |
| **反馈** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **可观测** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **治理** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## 三个不容讨价还价的强约束

1. **WIP = 1**：`features.json` 同时只能有一个 feature 处于 `active`。这条规则写在 `FEATURES.md` 里，靠 agent 自律 + git diff review 执行。彻底干掉「同时启动六件事，零件做完」的失败模式（L07）。

2. **完成的唯一路径是 verification**：每个 feature 必须有 verification 命令。只有 `bash scripts/validate-feature.sh <id>` 退出码 0 才能标 passing。「我看着没问题」≠ done（L09）。

3. **干净退场是「完成」的一部分**：`scripts/exit-clean.sh` 五维度检查（构建/测试/PROGRESS 是否最近更新/无残留临时文件/启动路径可调）。CI 里跑同一个脚本（L12）。

---

## 支持的 agent

`claude-code` / `codex` / `opencode` / `cursor` / `aider`。每家在它期望的位置写一个文件，全部指回 `AGENTS.md` 作为唯一真相源。

---

## 跟 spec-kitty 的区别

[spec-kitty](https://github.com/spec-kitty/spec-kitty) 是更重的、mission 驱动的 harness。`harness-kit` 是最小化、覆盖 80% 场景的精简版。两个可以并存——`harness-kit` 跑在 spec-kitty 下面没问题。

| | harness-kit | spec-kitty |
|---|---|---|
| 概念数量 | 少（5 个子系统）| 多（mission / WP / charter / doctrine）|
| 出第一个有用产出 | 几分钟 | 一小时上下 |
| 工作流意见 | 无——你自己定 | 强——必须 specify→plan→tasks→implement→review |
| 老项目注入 | 一等公民（`inject` 命令） | 可以但不是重点 |
| 依赖 | 仅 Node ≥ 18 | Python + 几个 |

---

## License

MIT © Bojun Chai。详见 [LICENSE](./LICENSE)。

## 致谢与出处

这个项目只是别人想法的工程化封装。生成文件里的 `L01`–`L12` 讲义编号都对应：

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  —— 课程 GitHub 仓库 / [可读站点](https://walkinglabs.github.io/learn-harness-engineering/)

课程本身则是对以下三篇工程文章的提炼：

- OpenAI —— [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic —— [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic —— [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

如果这个工具帮到你，也请去给 walkinglabs 的课程仓库点个 star——它是这套框架的源头。
