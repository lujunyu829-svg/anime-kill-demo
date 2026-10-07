# v0.2.1 验收收尾：证据与根因 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变游戏规则和角色数值前，补齐 v0.2.1 被动技能证据，并为越线角色及 2V2 长局形成可复现的修正依据。

**Architecture:** 沿用现有 `GameEngine` 和固定种子模拟器；角色测试直接调用真实引擎，诊断报告从真实对局事件和已冻结样本生成，不解析日志文案。后续数值与节奏改动另成实施计划，避免先猜参数再找理由。

**Tech Stack:** Node.js `node:test`、现有 `GameEngine`、`scripts/simulation.mjs`、PowerShell/npm。

**Spec:** `docs/superpowers/specs/2026-09-17-v0.2.1-balance-ai-stability-requirements.md`；现状与阻断项见 `docs/v0.2.1-2026-09-29-review.md`。

## Global Constraints

- 不新增角色、卡牌、模式、立绘；保持 schema 2 和 v0.2.0 旧局版本化运行环境。
- 先验证机制，再修正 AI，最后每名角色每轮只调整一个主要强度来源；不得用快速样本直接定数值。
- 纯包与混合池分开判断，四个 anchor 等样本；同种子对照并记录版本、源码哈希、角色池和种子范围。
- 第 40 轮“裂隙收束”不得提前；2V2 发布目标为 P99 ≤30 轮，未完成和终局残留均为 0。
- 本计划只生成修正所需证据，不把旧报告的成功项冒充最终代码的发布验收。

## Review Focus

1. 源码发生变化而沿用旧平衡 JSON：报告必须显示对应源码哈希，结论只能针对匹配的构建。
2. 角色的“未触发”测试仅因测试没真正进入事件路径而通过：反例必须先证明事件实际发生，再断言技能不生效。
3. 2V2 残局有合法突击却无实际伤害：区分防御/护盾吸收、回复抵消、AI 不使用和牌堆缺攻击牌。
4. 只看整体 P99 掩盖长局对阵集中度：分别统计纯伟大航路和纯忍界的第 30 轮幸存组合及第 40 轮比例。
5. 只按角色总胜率调数值：每个越线角色同时列出纯包、混合池、四个 anchor、技能有效次数和对局时长。

---

### Task 1: 冻结当前验收基线

**Files:**
- Create: `docs/reports/v0.2.1-closeout-pressure-one-piece.json`
- Create: `docs/reports/v0.2.1-closeout-pressure-naruto.json`
- Create: `docs/v0.2.1-closeout-diagnostics.md`

**Interfaces:**
- Consumes: `scripts/balance-simulation.mjs` 的 `--scenario=pressure` 与 `scripts/simulation.mjs` 的 `summarizeMatches()`。
- Produces: 两组固定种子 10,000 局压力报告、当前提交 SHA 和长局组合摘要，供后续任务诊断。

- [ ] **Step 1: 核对工作树与基线**：运行 `git status --short`、`git rev-parse HEAD`、`npm test`、`npm run app:test`；测试全部通过才继续。
- [ ] **Step 2: 重新生成两组压力报告**：分别运行 `npm run balance:test -- --pool=one_piece_grand_line --scenario=pressure --games=10000 --seed=20260917 --output=docs/reports/v0.2.1-closeout-pressure-one-piece.json` 和对应 `naruto_genesis` 命令。要求每组 10,000 局、未完成 0、残留 0，并记录实际 P99，不预设其通过。
- [ ] **Step 3: 独立核对报告**：用 `runMatch` 的相同种子公式抽取至少两个第 30 轮后仍存活的对局，核对最终轮数与报告一致；在诊断文档记录最常见幸存组合、具体种子和报告的源码哈希。
- [ ] **Step 4: 提交基线报告与诊断文档**，不得提交逐局 `.matches.jsonl` 大文件。

### Task 2: 忍界初阵被动技能矩阵

**Files:**
- Create: `docs/v0.2.1-passive-coverage.md`
- Modify: `test/passive-boundaries.test.js`
- Modify: `test/engine.test.js`（仅当已有测试需补充明确断言）

**Interfaces:**
- Consumes: `src/data.js` 中忍界初阵十名角色的二十项常规技能；真实 `GameEngine` 结算。
- Produces: 对每项技能的“正向触发 / 反向不触发”测试引用，供最终发布审核。

- [ ] **Step 1: 建立覆盖表**：逐一列出鸣人、我爱罗、小樱、鹿丸、鼬、佐助、卡卡西、雏田、自来也、大蛇丸的两项技能；标出已有测试中实际验证行为的用例，不用只匹配角色名充数。
- [ ] **Step 2: 对缺失技能逐项先写失败测试**：每项至少一个可观察正例和一个事件已发生但不应触发的反例；测试使用真实引擎、固定手牌与状态，断言最终生效数值或状态。
- [ ] **Step 3: 运行新增测试观察 RED**：若测试暴露真实机制错误，先定位事件来源和目标，再以最小修复使其 GREEN；若测试立即通过，检查其是否真正保护了对应行为。
- [ ] **Step 4: 运行 `npm test` 与 `npm run app:test`**，覆盖表中的二十项均有正反例引用、所有测试通过后提交。

### Task 3: 伟大航路被动技能矩阵

**Files:**
- Modify: `docs/v0.2.1-passive-coverage.md`
- Modify: `test/passive-boundaries.test.js`
- Modify: `test/one-piece.test.js`（仅当已有测试需补充明确断言）

**Interfaces:**
- Consumes: Task 2 的覆盖表格式及伟大航路十名角色的二十项技能。
- Produces: 40/40 项常规技能的正反例映射及测试结果。

- [ ] **Step 1: 盘点路飞、索隆、娜美、乌索普、山治、乔巴、罗宾、弗兰奇、布鲁克、甚平两项技能的现有行为测试**；特别检查此前未单列的娜美、乌索普、山治、罗宾和甚平。
- [ ] **Step 2: 对缺失正反例执行 RED→GREEN**：先写真实结算测试并确认正确失败，只有发现机制错误时修改对应代码；不因覆盖任务改变技能设计。
- [ ] **Step 3: 运行 `npm test`、`npm run app:test`**；覆盖表逐项给出测试名和可观察结果，全部通过后提交。

### Task 4: 长局与越线角色根因结论

**Files:**
- Modify: `docs/v0.2.1-closeout-diagnostics.md`
- Create: `docs/v0.2.1-single-variable-proposals.md`

**Interfaces:**
- Consumes: Tasks 1–3 的固定种子报告与机制测试；已有纯包/混合池正式报告。
- Produces: 越线角色的机制/AI/数值分类、每个候选单变量及同种子复测命令；若 AI 修正不足以使 P99 达标，给出不提前第 40 轮收束的节奏方案。

- [ ] **Step 1: 针对第 30 轮以上样本逐轮对照实际用牌、伤害、回复和护盾**；至少包含 `20743976` 的娜美/弗兰奇残局与一场大蛇丸相关残局，明确长局并非悬空窗口。
- [ ] **Step 2: 汇总最新正式纯包与混合池中越过 40%–60% 硬线的角色**，逐人检查四个 anchor、技能有效使用与对阵差异；将可修正 AI 问题与需要数值提案的问题分开。
- [ ] **Step 3: 每个候选方案只列一个强度来源和可证伪假设**；写出同种子至少 1000 局及正式样本的复测命令、回退条件、其他角色越线监测。未得到具体方案批准前不修改这些数值。
- [ ] **Step 4: 提交诊断与提案**；本计划完成只表示修正依据齐备，不表示 v0.2.1 已通过发布验收。
