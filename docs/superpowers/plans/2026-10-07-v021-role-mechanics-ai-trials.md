# v0.2.1 角色机制与 AI 单项试验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. These tasks share engine state and must be run sequentially; do not parallelize edits or combine their before/after comparisons.

**Goal:** 在不触碰角色数值和残局规则的前提下，验证并试行已确认的罗宾「百花缭乱」、鹿丸「落子」和大蛇丸咒印 AI 改动，留下可复现的单项对照和保留／回退结论。

**Architecture:** 仍由现有 `GameEngine` 完成出牌、目标、事件和结算。罗宾借既有 `cardDeclared` / `hiddenCardViewed` 事件实现真实且仅本人可见的手牌查看；鹿丸只扩充现有主动技目标合法性并复用 `chessTargetId`；大蛇丸只调整 AI 对现有合法目标的收益过滤。普通玩家操作、AI、schema 2 命令重放共用同一引擎逻辑，不新增持久化字段。

**Tech Stack:** JavaScript ES modules、Node.js `node:test`、现有 `GameEngine`、`scripts/balance-simulation.mjs`、PowerShell/npm。

**Spec:** `docs/v0.2.1-single-variable-proposals.md`（用户已确认方向）；v0.2.1 硬门槛见 `docs/superpowers/specs/2026-09-17-v0.2.1-balance-ai-stability-requirements.md`。

## Assumptions and boundaries

- 本计划是四阶段收尾工作的第一阶段：A 角色机制与 AI；B 双人生存残局节奏；C 逐角色数值候选；D 全量样本及发布验收。B、C 的具体改动需各自独立计划和前后对照；A 通过不代表 v0.2.1 全部验收通过。
- 罗宾在单目标策略**声明成功并确定目标后、目标反制前**查看一张随机手牌；牌后来被反制不撤销已经发生的查看。目标没有手牌则不发生查看，也不消耗该轮首次机会。每轮至多一次；策略完成与否仍遵循现有 `cardCancelled` / `cardResolved` 终态规则。
- 罗宾得到的牌名只在本机人类玩家的私有视图中显示为“当时看到”，不保证该牌后来仍在目标手中；不写入公共战斗日志、对手详情或 AI 可见决策输入。若现有 `eventHistory` 没有安全的观察者过滤接口，先补最窄的只读过滤接口并测试，不把完整事件对象传给 UI。
- 鹿丸优先选择本轮尚未行动的合法其他角色；仅在**没有其他未行动角色**时，增加已行动敌方角色为合法目标。`classic8` 人类可按现有隐藏身份规则选择其他角色，AI 不能通过真实身份识别敌人；其棋子应在下一轮目标第一次合规出牌时触发。
- 大蛇丸人类操作的合法目标不变；只有 AI 避免向当前零手牌目标支付样本牌。测试还需验证存在有牌目标时 AI 仍能用咒印，避免只靠“不发动”降低弃牌次数。
- 不修改牌堆、伤害、治疗、体力、技能费用、模式、存档 schema 或角色数量。所有生成报告标注源码哈希、版本、池、anchor 和种子；旧报告不得冒充改动后的结果。

## Review focus

1. 罗宾查看的是**目标当前手牌**而不是弃牌或装备；随机数来自 `game.random()`，恢复重放确定；目标反制前出现，但公共视图不泄漏。
2. 查看与「历史学者」摸牌／梦想只按实际看见的卡触发；一轮多张策略、空手牌目标、被取消策略都有正反例。
3. 鹿丸最后座次能落子，且已有棋子、回合切换、目标退场、玩家与 AI 的目标边界仍正确；军八 AI 不读取隐藏真实身份。
4. 大蛇丸 AI 过滤零手牌目标不影响人类合法性；非零手牌目标的有效夺牌和资源消耗需实测。
5. 三项各自先冻结同种子基线，再只改变对应行为并单独复测；任何项引发身份泄露、残留窗口、未完成对局或两池 >60% 应回退该项并记录原因。

---

### Task 1: 冻结罗宾当前固定种子基线并建立记录

**Files:**
- Create: `docs/reports/v0.2.1-role-trial-before-robin-{pure,mixed}.json`
- Create: `docs/v0.2.1-role-mechanics-ai-trials.md`

**Interfaces:** `npm run balance:test -- --pool=<pool> --characters=<id> --scenario=balance --games=250 --seed=20260917 --output=<file>`；`one_piece_grand_line` 对应罗宾纯包，`naruto_genesis` 对应鹿丸／大蛇丸纯包，三者混合池为 `mixed`。后续每个候选必须在**紧邻该候选的代码状态**重新生成自己的 `before`，不能跨候选复用旧源码哈希。

- [ ] **Step 1: 验证起点**：记录 `git status --short`、`git rev-parse HEAD`；运行 `npm test`、`npm run app:test`。仅在测试通过且明确保留已有改动时继续。
- [ ] **Step 2: 运行罗宾两池四 anchor 等量样本**：每个命令 `--games=250` 指每个 anchor 250 局，故每池 1000 局。核对两份 `before` JSON 的样本、四 anchor、`sourceHash`、未完成数及残留窗口。
- [ ] **Step 3: 从报告提取基线表**：在试验记录中列出罗宾的纯包／混合胜率、四 anchor、主动技有效次数、梦想进度与觉醒率、P99 和最长轮数。此时不调整任何代码。
- [ ] **Step 4: 提交基线报告与记录骨架**；不提交逐局 `.matches.jsonl`。

### Task 2: 罗宾「百花缭乱」单项机制试验

**Files:**
- Modify: `src/data.js`
- Modify: `src/packs/one-piece.js`
- Modify: `src/engine.js`（仅当需要安全的观察者过滤接口）
- Modify: `src/app.js`（仅显示本人实际看见的牌）
- Modify: `test/passive-boundaries.test.js`
- Modify: `test/one-piece.test.js`
- Modify: `test/persistence-multistep.test.js`（确定性恢复例）
- Create or modify: 对应 UI 可见性回归测试（选项目现有测试文件）
- Create: `docs/reports/v0.2.1-role-trial-after-robin-{pure,mixed}.json`

**Interfaces:** `handleOnePieceEvent(game, { type: "cardDeclared", sourceId, targetIds, card })`；实际查看通过既有 `hiddenCardViewed` 事件；UI 只消费明确属于当前 `viewerId` 的安全视图。

- [ ] **Step 1: 先写失败的引擎测试**：普通单目标策略查看一张目标手牌；第二张同轮不再看；下一轮恢复；空手牌不消耗次数；群体牌、自身目标、非策略、响应牌不触发；策略最终被反制仍可保留声明时已经获得的信息。断言历史学者与梦想按真实查看只推进一次。
- [ ] **Step 2: 先写隐私与恢复测试**：本人视图能看到目标和牌名，对手／公共日志／对手详情不能看到；随机选择在同一固定种子的 schema 2 命令恢复前后相同，不重复摸牌或梦想推进。观察 RED。
- [ ] **Step 3: 以最小改动实现**：更新角色文案与事件处理；仅增加需要的每轮 flag 和只读私有视图。沿用现有 `roundFlags` 生命周期，不新增保存字段，不改变百花搜查主动技。
- [ ] **Step 4: 运行定向测试至 GREEN，再运行 `npm test`、`npm run app:test`、`npm run build`**；检查手动 UI 查看与反制顺序。
- [ ] **Step 5: 使用 Task 1 同种子与样本运行罗宾纯包／混合 `after` 报告**；对照四 anchor、梦想率、个人与他人胜率、P99、未完成和残留。任一池 >60% 或隐私失败则只回退本项并记录；否则提交代码、测试、报告与保留结论。

### Task 3: 鹿丸「落子」末位可用性单项试验

**Files:**
- Modify: `src/data.js`
- Modify: `src/engine.js`
- Modify: `test/balance-regressions.test.js`
- Modify: `test/character-matrix.test.js`（若其旧目标假设需要更新）
- Modify: `test/persistence-multistep.test.js`（跨轮恢复例）
- Create: `docs/reports/v0.2.1-role-trial-before-shikamaru-{pure,mixed}.json`
- Create: `docs/reports/v0.2.1-role-trial-after-shikamaru-{pure,mixed}.json`

**Interfaces:** `getActiveSkillTargets(playerId)` 的 `future` 分支；`useActiveSkill` 仍写既有 `chessTargetId`；现有 `handleChessPressure` 在目标下轮首次出牌时结算。

- [ ] **Step 1: 在现有代码状态冻结鹿丸基线**：按 Task 1 的命令分别生成纯忍界／混合 `before` 报告并记录当前 `sourceHash`，然后才修改鹿丸代码。
- [ ] **Step 2: 先写失败测试**：未行动目标存在时保留原目标集；没有未行动者时可以选择已行动敌人；空手牌、不合法、阵亡和同轮已使用等原限制不退化；末位放置后下轮首次合规出牌恰好触发一次，非合规牌不触发。
- [ ] **Step 3: 写隐藏身份与 AI 反例**：军八人类选择沿用现有公开目标合法性；军八 AI 即使知道真实身份字段也不能据此过滤或固定命中隐藏敌人。末位 AI 在有可获益目标时确实发动。
- [ ] **Step 4: 写跨轮 schema 2 重放例并观察 RED**：落子后在目标尚未行动前保存、恢复、结算，标记和结算次数与未恢复局一致。
- [ ] **Step 5: 最小实现并更新角色文案**；不改变棋子上限、将军费用和原有出牌干扰效果。运行定向测试、`npm test`、`npm run app:test`、`npm run build`。
- [ ] **Step 6: 用本任务相同种子与样本运行鹿丸两池 `after` 报告**；核对 anchor 1 有效主动次数提升到同数量级，四 anchor 与两池胜率无 >60%、无残留和未完成。保留或只回退本项，写结论并提交。

### Task 4: 大蛇丸咒印 AI 零收益目标过滤

**Files:**
- Modify: `src/engine.js`
- Modify: `test/balance-regressions.test.js`（AI 决策例）
- Create: `docs/reports/v0.2.1-role-trial-before-orochimaru-{pure,mixed}.json`
- Create: `docs/reports/v0.2.1-role-trial-after-orochimaru-{pure,mixed}.json`

**Interfaces:** `aiActiveUseful(player, skill, targetId)` 对 `curseExperiment` 的分支；`getActiveSkillTargets` 的人类合法目标集保持不变。

- [ ] **Step 1: 在现有代码状态冻结大蛇丸基线**：按 Task 1 的命令分别生成纯忍界／混合 `before` 报告并记录当前 `sourceHash`，然后才修改 AI。
- [ ] **Step 2: 先写失败测试**：AI 遇零手牌目标不弃样本牌；有手牌且无咒印的合法目标仍可施放；同时存在零手牌和有手牌目标时选择后者；人类仍可在合法目标上按原规则操作。
- [ ] **Step 3: 观察 RED 后只增加目标有手牌的收益判断**；不改技能费用、实验牌类别、目标距离、招牌技或蛇蜕。定向测试、`npm test`、`npm run app:test`、`npm run build` 均通过。
- [ ] **Step 4: 用本任务相同种子与样本运行大蛇丸两池 `after` 报告**；比较无收益主动次数、有效夺牌、弃牌、伤害、四 anchor 胜率及 P99。若有效率和胜率均无改善，或造成明显退化，回退该项并记录，不直接补体力。
- [ ] **Step 5: 单独提交本项代码、测试、报告及保留／回退结论**。

### Task 5: 阶段集成核验与下一阶段移交

**Files:**
- Modify: `docs/v0.2.1-role-mechanics-ai-trials.md`
- Modify: `docs/v0.2.1-2026-10-07-acceptance-record.md`（只更新已被新证据支持的条目）

- [ ] **Step 1: 在三项各自结论之后运行全量 `npm test`、`npm run build`、`npm run app:test`、`npm run balance:test -- --games=100`**；写下准确通过数、实际源码哈希和失败项，不复用历史结果。
- [ ] **Step 2: 核对本阶段未引入 schema 变化、AI 隐藏信息读取、公共日志泄露、未完成对局和残留窗口**；把三项 before/after 与保留／回退原因列为可追溯表。
- [ ] **Step 3: 明确尚未通过的发布门槛**：纯包／混合池正式样本、两组 10,000 局压力 P99≤30、弗兰奇／乔巴专项、经典军八、基础角色越线、数值候选等仍待 B–D 阶段，不宣称 v0.2.1 已完成验收。
- [ ] **Step 4: 为 B 阶段另写残局规则实施计划供审阅**；本计划中不顺手实现残局或数值候选。
