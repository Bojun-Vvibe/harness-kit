# harness-kit

> AI コーディングエージェント向けの実用的なハーネス・スキャフォールディングキット。
> 「指示・状態・フィードバック・観測性・ガバナンス」の 5 サブシステムを備えた完全なハーネスを、新規／既存のあらゆるリポジトリにワンコマンドで導入できます。スタック非依存。

[![npm version](https://img.shields.io/npm/v/@bojunchai/harness-kit.svg)](https://www.npmjs.com/package/@bojunchai/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> [English](./README.md) · [简体中文](./README.zh.md) · **日本語** · [한국어](./README.ko.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Français](./README.fr.md) · [Deutsch](./README.de.md)

---

## 何これ？

`harness-kit` は [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)（[コースサイト](https://walkinglabs.github.io/learn-harness-engineering/)）で展開されているアイデアのツール化版です。同コースは、コーディングエージェント（Claude Code、Codex、OpenCode、Cursor、Aider など）を実プロジェクトで実用的に動かすために何が必要かを、OpenAI と Anthropic のエンジニアリング記事から抽出して整理したものです。

このコース（およびこのキット）は、次の 3 本の一次情報に依拠しています：

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

要旨を一行で言えば：**「より高価なモデルへ乗り換える」のは最もコストが高い修正であり、「ハーネスを直す」のが最も安い修正である。** このキットはそのハーネスを提供します。

`harness init` というコマンド一つで、以下が手に入ります：

- `AGENTS.md` — ルーティング型エントリーポイント（200 行以下、何でも詰め込まない）
- `CONSTRAINTS.md` — 譲れないハードルール
- `docs/` — アーキテクチャ・意思決定ログ・テスト規約（テーマごとに分割）
- `PROGRESS.md` — エージェントが「話を見失わない」ためのセッション間の日記
- `features.json` — プロジェクトの背骨。各機能に検証コマンドを必須化
- `QUALITY.md` — モジュール別の品質グレード。次のセッションがどこから直すかを把握できる
- `Makefile` — `setup / test / lint / check` 等の標準ターゲット（中身はあなたが書く）
- `scripts/exit-clean.sh` — 5 次元のセッション終了チェック
- `scripts/session-init.sh` — セッション開始時のブリーフィング
- `scripts/e2e-check.sh` — 静的／挙動／システムの 3 層検証
- `docs/templates/sprint-contract.md` + `rubric.md` — 多段階作業のテンプレート
- `.github/workflows/harness.yml` — exit-clean を CI で実行
- 各エージェント用ポインタファイル（`CLAUDE.md`、`.codex/AGENTS.md` など）— すべて `AGENTS.md` を指す

すべてプレーンテキスト。常駐プロセスなし。ロックインなし。**スタック非依存** — Node、Python、Rust、Go、モバイル、混在、何でも対応。
キットを削除してもファイル群はそのまま動きます。

---

## インストール／使い方

このキットは `harness` という CLI を同梱しています。生成される `Makefile` や `scripts/` は `harness ...` を直接呼び出すので、ほぼ常に PATH に通しておきたいでしょう。

```bash
# 推奨：一度グローバルインストール ──────────────────────────────────────
npm install -g @bojunchai/harness-kit
harness init                 # 新規プロジェクト（対話モード）
harness inject               # 既存プロジェクト（既定はドライラン）
harness view                 # プロジェクト harness を可視化する localhost dashboard

# あるいはゼロインストールで npx ─────────────────────────────────────
# 注意：npx はその一回の呼び出しの中でだけ `harness` を露出します。
# 生成される Makefile / scripts はすべて `harness doctor` を呼び出すため、
# 結局はグローバルインストールが欲しくなります。
npx @bojunchai/harness-kit init
npx @bojunchai/harness-kit inject --apply
```

> なぜ `@bojunchai/` スコープ？スコープなしの `harness-kit` は npm 上で無関係の squat パッケージに取られています。CLI バイナリは `harness` のまま — `npm install` / `npx` のときだけスコープを書きます。

`npx` を使った後で `harness doctor` を実行して「command not found: harness」と出る場合は、グローバルにインストールしてください：

```bash
npm install -g @bojunchai/harness-kit
```

### トラブルシュート：`/bin/harness` で `EEXIST: file already exists`

CLI は `harness` という名前のバイナリを登録します。同じ名前を既に他のパッケージが占有している既知のケースが 2 つ：

1. 以前ローカルクローンから `npm install -g .` を実行した（初期コントリビューター）。修正：

   ```bash
   npm uninstall -g harness-kit
   npm install -g @bojunchai/harness-kit
   ```

2. 無関係の [`harness-cli`](https://www.npmjs.com/package/harness-cli) を入れている（同じく `bin: harness` を宣言）。3 択：

   ```bash
   # A 競合パッケージをアンインストール：
   npm uninstall -g harness-cli
   npm install -g @bojunchai/harness-kit

   # B 両方残し、このキットは harness-kit エイリアスで使う（package.json bin にも登録済み）：
   npm install -g @bojunchai/harness-kit
   harness-kit init

   # C 強制上書き：
   npm install -g @bojunchai/harness-kit --force
   ```

---

## init 後：エージェントに渡すプロンプト

スキャフォールディングには TODO プレースホルダが大量にあります。**手で埋めないでください**。お使いのコーディングエージェント（Claude Code / Codex / OpenCode / Cursor / Aider）でプロジェクトを開き、次のプロンプトをそのまま貼り付けてください：

```
あなたは harness-kit が初期化されたばかりのリポジトリで作業しています。
あなたの仕事は、このハーネスを「このプロジェクトにとって本物」にすることです。

1. 生成された全ファイルを読んでください：AGENTS.md、CONSTRAINTS.md、PROGRESS.md、
   QUALITY.md、docs/architecture.md、docs/decisions.md、docs/testing-standards.md、
   Makefile、.harnessrc.json。構造を理解します。

2. プロジェクト本体を調査してください：package.json / pyproject.toml / Cargo.toml /
   go.mod / src ツリー / 既存 README / CI 設定 / lockfile を読み、このプロジェクトが
   何で、どんなスタックで、どこがエントリーポイントで、どんな規約を既に遵守しているか
   を把握します。

3. 生成ドキュメント中の `> **TODO**:` マーカーを、このプロジェクトにとって真である
   内容で置き換えます。具体的に — 実在するファイル名と行番号を引用してください。
   高い確信を持って答えられない事項は、推測せずに
   `> **TODO(@me, YYYY-MM-DD): X についての回答が必要**` を残してください。

4. Makefile のプレースホルダ・ターゲット本体（setup / dev / test / lint / typecheck /
   build / clean）を、このプロジェクトの実コマンドで置き換えます。それぞれを
   `make -n <target>` 後に `make <target>` で一度実行して検証してください。
   このプロジェクトに該当しないターゲットは `@true` のままに、理由をコメントで残します。

5. CONSTRAINTS.md の例示「Code constraints」「Forbidden」セクションを、このプロジェクトに
   とって真であるハードルール 5〜15 個に置き換えます。既存テスト・lint 設定・CI・
   エラーハンドリング・ADR から導出してください。該当しない例は削除します。

6. features.json には、まだ自分で feature を追加しないでください。人間が
   「何を作るか」を告げるのを待ってください。追加する時は FEATURES.md の
   ルールに厳密に従ってください — そのファイルが features.json を編集する
   ための契約（状態マシン、WIP=1、verification ゲート、アンチパターン）です。
   一度読んでから手を動かしてください。

7. 完了したら検証して刻印：
   - `make check` を実行 — exit 0 必須
   - `harness doctor` を実行 — スコアは 24/30 以上必須
   - PROGRESS.md の末尾に `## Session <ISO タイムスタンプ>` ブロックを追加し、
     何をしたかを書く（bootstrap: <project name> のスキャフォールディングを実装）
   - `bash scripts/exit-clean.sh` を実行 — exit 0 必須

ブートストラップ中のハードルール：
- WIP = 1。新機能のコーディングを始めないでください。
- ステップ 1 に列挙したスキャフォールディングファイル以外は変更しないでください。
- `harness doctor` と `make check` の両方が通るまで「完了」と宣言しないでください。
- リポジトリから本当に判定不能な事項は人間に質問 — 推測しないでください。
```

スニペットとして保存しておけば、新しいリポを立ち上げるたびに使えます。

---

## コマンド

CLI は意図的にとても小さい：スキャフォールド系 2 つと診断系 2 つだけ。
日々の作業はすべて、生成されたリポジトリ内の markdown + スクリプトに
存在します — 読めて、grep でき、変更できる。

| コマンド | 何をするか |
|---|---|
| `harness init [dir]` | 新規ハーネスをスキャフォールド（対話モード）。約 18 ファイルを書き出し。最後に bootstrap prompt を自動表示 |
| `harness inject [dir]` | 既存リポにハーネスを追加。既定はドライラン；`--apply` で本適用。既存の `AGENTS.md` / `Makefile` は安全マージ |
| `harness doctor [dir]` | 5 サブシステムを各 5 点満点で採点 + コールドスタートテスト（5 問）|
| `harness clean [dir]` | L12 の 5 次元 exit-clean を実行（ビルド / テスト / 進捗 / アーティファクト / 起動経路）|

init 後は基本的に `harness` CLI は不要です。日々のワークフローは：

| 操作 | どこで |
|---|---|
| 機能管理（add / start / done / block）| `features.json` を直接編集（`FEATURES.md` のルールに従って）|
| 機能が本当に終わったか検証 | `bash scripts/validate-feature.sh <id>` |
| セッション開始のブリーフィング | `bash scripts/session-init.sh` |
| セッション終了のチェック | `PROGRESS.md` に追記し、`bash scripts/exit-clean.sh` |
| bootstrap prompt をもう一度読む | `cat .harness/bootstrap-prompt.txt` |

---

## 5 サブシステム（各々の出典「講」）

| サブシステム | 生成ファイル | 講 |
|---|---|---|
| **指示** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + 各エージェント用ポインタ | L02 / L04 |
| **状態** | `PROGRESS.md`, `features.json`, `QUALITY.md` | L05 / L08 / L12 |
| **フィードバック** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **観測性** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **ガバナンス** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## このキットが譲らない 3 点（エージェントと議論しなくて済むように）

1. **WIP = 1。** `features.json` は同時に 1 機能だけ `active` を許します。このルールは `FEATURES.md` に書かれていて、エージェントの自律性 + git diff レビューで強制されます。「6 件同時着手・0 件完了」の典型的失敗を根絶します（L07）。

2. **完了への唯一の経路は verification。** 全機能に `verification` シェルコマンド必須。`bash scripts/validate-feature.sh <id>` が exit 0 を返したときのみ `passing` にマーク可能。「見た目は OK」では done になりません（L09）。

3. **クリーンな退場が「完了」の一部。** `scripts/exit-clean.sh` がセッション終了時に 5 項目を確認（ビルド／テスト／PROGRESS の鮮度／古いアーティファクトなし／起動経路が呼べる）。CI も同じスクリプトを実行します（L12）。

---

## v0.1.0 でサポートされるエージェント

`claude-code` / `codex` / `opencode` / `cursor` / `aider`。各エージェントは期待される場所に期待されるファイルを得て、すべて `AGENTS.md` を唯一の真実の源として参照します。

---

## spec-kitty との比較

[spec-kitty](https://github.com/spec-kitty/spec-kitty) はより重厚な、ミッション駆動型のハーネスです。`harness-kit` は最小化された 80% ケース向けのキットです。両者は共存できます — `harness-kit` は spec-kitty の *下*でも動きます。

| | harness-kit | spec-kitty |
|---|---|---|
| 概念数 | 少ない（5 サブシステム）| 多い（mission/WP/charter/doctrine）|
| 最初の有用な出力までの時間 | 数分 | 1 時間程度 |
| ワークフローの主張 | なし — 各自で持ち込む | 強い — specify→plan→tasks→implement→review |
| 既存プロジェクトへの注入 | 一級市民（`inject` コマンド）| 可能だが主目的ではない |
| 依存 | Node ≥ 18 のみ | Python + 数個 |

---

## ライセンス

MIT © Bojun Chai。詳細は [LICENSE](./LICENSE)。

## クレジット & 出典

このプロジェクトは私が考えたわけではないアイデアのパッケージングです。生成ファイル中の `L01`–`L12` の講番号は以下を指します：

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  — コースリポ / [読みやすいサイト](https://walkinglabs.github.io/learn-harness-engineering/)

コース自体は次のエンジニアリング記事の蒸留です：

- OpenAI — [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

このキットが役立ったら、上流のコースリポにもスターを — それがこのフレームワークの源流です。
