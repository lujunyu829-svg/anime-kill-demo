# 《动漫杀》v0.3.0《日轮与血月》Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有网页版中加入完整的十人鬼灭扩展包、呼吸态与独立血鬼术状态；保留两种模式、37 种牌和既有存档行为，完成可复现的规则、AI、界面与模拟验收。

**Architecture:** `src/data.js` 登记角色，`src/packs/demon-slayer.js` 实现包内状态和技能，`src/engine.js` 只补必要的通用事件与可恢复的选择窗口。现有卡牌、距离、伤害和胜负结算仍是唯一规则源。UI 从引擎的观察者安全视图读取状态。封装启动器按存档版本选择冻结规则脚本，不用新版技能重放旧局。

**Tech Stack:** 原生 HTML/CSS/JavaScript、Node.js `node:test`、esbuild、Electron/Capacitor 共用的 Web 资源构建、WebP 立绘。

**Spec:** [设计规格](../specs/2026-10-08-demon-slayer-v030-design.md)

## File Responsibility Map

- `src/data.js`：十人的静态角色、主动技、包归属和准确文案；不在此实现技能行为。
- `src/packs/demon-slayer.js`：包内状态、合法目标、角色技能和事件响应；其公共导出与现有海贼包平行：`isDemonSlayerCharacter(value): boolean`、`initializeDemonSlayerState(player, character): player`、`getDemonSlayerActiveTargets(game, playerId, skill): string[]`、`useDemonSlayerActive(game, playerId, targetId, skill): { ok: boolean, reason?: string }`、`getDemonSlayerSignatureTargets(game, playerId, signature): string[]`、`useDemonSlayerSignature(game, playerId, targetId, signature): { ok: boolean, reason?: string }`、`handleDemonSlayerEvent(game, event): void`。
- `src/engine.js`：复用现有 `getActiveSkillTargets`／`useActiveSkill`、`getSignatureTargets`／`useSignature` 分派；现有 `emitOnePieceEvent(event)` 保留原行为并同时派发鬼灭包事件，避免大规模改名。只在事件缺失时补派发点，并提供 `getVisibleDemonSlayerState(viewerId, ownerId): object` 隔离私查数据。
- `src/app.js`、`index.html`、当前样式表：角色选择和状态展示，只读取前述观察者视图；不计算伤害或决定技能合法性。
- `packaging/legacy/v0.2.1`、`packaging/runtime/boot.js`：冻结旧规则与启动分流；`packaging/runtime/persistence.js` 只负责当前版本存档检查。
- `scripts/simulation.mjs`、`scripts/balance-simulation.mjs`：纯包/混合池、固定种子和报告；不自行实现游戏规则。

## Global Constraints

- 本阶段交付可试玩网页版；不制作安装包、不自动推送 GitHub。`npm run app:build` 只验证封装 Web 资源仍可构建。
- 保留已有 `tanjiro`、`shinobu` ID；加 8 人后总数 36、鬼灭包 10 人。两种模式、37 种卡牌及 144/80 张牌堆不得改变。
- schema 2 命令日志继续确定性重放；不往旧存档补写字段，不把 `0.2.1` 对局交给 `0.3.0` 规则恢复。
- 每一项技能先写失败测试，再作最小实现；可选技能必须能被玩家显式选择，AI 只能用可见信息。
- 仓库现有未跟踪草稿 `docs/superpowers/specs/2026-10-07-demon-slayer-pack-preparation.md` 属于用户，保持原样。每次提交只纳入本计划对应文件；生成产物按现有仓库跟踪策略处理。
- 数值失衡先核查机制和 AI，再按相同种子修改单一变量；不为了胜率重做已确认的技能定位。

## Review Focus

1. **攻防获态的伪阳性**：虚拟攻击、取消、护盾吸收、自动防护和不足额响应不得获得呼吸态；Task 2 的正反例覆盖。
2. **多段/转移事件重复结算**：援护、强制介入、两段乱裂、双目标肉鞭以及救援续接不得重复伤害、消费状态或悬空窗口；Task 4、6、7、9 覆盖。
3. **隐藏信息泄漏**：嗅觉私查只给炭治郎本人，军八 AI 不读真实阵营或敌方手牌；Task 3、8、9 覆盖。
4. **旧局被新版技能重放**：`0.2.1` 存档必须进入冻结脚本，加载失败或未知版本时不得删除存档；Task 1、10 覆盖。
5. **宣称稳定却缺少真实完成局**：纯包、混合池及军八固定种子样本需记录未完成数、步数和残留窗口；Task 11、12 覆盖。

---

### Task 1: 冻结 v0.2.1 规则脚本

**Files:** Create `packaging/legacy/v0.2.1/app.bundle.js`, `packaging/legacy/v0.2.1/SHA256.txt`; modify `packaging/test/legacy-artifact.test.js`.

**Interfaces:** 产物供 Task 10 的 `packaging/build.mjs` 复制；SHA-256 针对冻结脚本内容，不能由未来 `0.3.0` 源码重新生成。

- [ ] **Write failing test**：测试 `v0.2.1` 冻结文件存在、SHA-256 匹配、脚本包含 `0.2.1` 与 schema 2 存档键。
- [ ] **Run red test**：`npm run app:test`，预期因 `v0.2.1` 冻结文件缺失失败。
- [ ] **Green**：在任何游戏源码改动前，从当前已提交的 `0.2.1` 构建结果提取封装脚本；若当前工作树包含非 `0.2.1` 修改，从明确的 `0.2.1` 提交隔离构建，并记录来源提交。生成 SHA 文件，不修改原有 `v0.2.0` 产物。
- [ ] **Verify**：`npm run app:test` 通过，手动检查版本字串和封装脚本大小。
- [ ] **Commit**：仅提交本 Task 文件。

### Task 2: 角色登记、基础状态和统一获态事件

**Files:** Modify `src/data.js`, `src/engine.js`, `build.mjs`, `scripts/simulation.mjs`; create `src/packs/demon-slayer.js`, `test/demon-slayer-core.test.js`; modify `test/build-bundle.test.js`, `test/simulation.test.js`.

**Interfaces:** 实现 File Responsibility Map 中的七个鬼灭包导出；`GameEngine.emitOnePieceEvent(event)` 同时调用 `handleOnePieceEvent` 与 `handleDemonSlayerEvent`。新增事件保持现有对象风格：`attackFullyDefended` 携带 `sourceId`、`targetId`、`origin`、`cardUid`、`paidGuards`；`damageApplied` 携带 `sourceId`、`targetId`、`origin`、`actualHpLoss`；回合/退场事件携带 `playerId`。保留现有卡牌终态事件与 `card.uid`。呼吸态公开值为 `breathReady: 0|1`，另记录本轮获态及到期时点，不改变能量字段。

- [ ] **Write failing test**：测试 10 个唯一鬼灭 ID、总角色 36、旧两人 ID 未变、所有角色体力/手牌上限与规格一致、两牌堆张数及卡牌种类不变；测试普通突击有效掉血和足额打牌防御可获态，取消、虚拟攻击、护盾全吸收、自动防护、部分防御不可获态；测试每轮至多一次、不刷新期限、消费及退场清理。
- [ ] **Run red test**：`node --test test/demon-slayer-core.test.js`，预期因缺少鬼灭包及获态事件失败。
- [ ] **Green**：登记角色/包、接入构建顺序及模拟角色池；只新增必要的通用事件，不改现有卡牌结算规则；实现 7 名剑士共用的获态、过期与消费状态机，以及 3 名鬼的互相独立的初始状态。
- [ ] **Verify**：`node --test test/demon-slayer-core.test.js test/build-bundle.test.js test/simulation.test.js test/one-piece.test.js` 全部通过。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 3: 炭治郎——私查、破绽和付牌回收

**Files:** Modify `src/packs/demon-slayer.js`, `src/engine.js`, `src/data.js`; create `test/demon-slayer-tanjiro.test.js`.

**Interfaces:** 嗅觉查看结果只通过观察者过滤接口返回给炭治郎；破绽是公开目标标记，至其下回合开始或消费时失效；回收按实体牌 ID 从弃牌堆取回，不恢复突击次数。

- [ ] **Write failing test**：覆盖主动合法距离/费用、无手牌目标、私查不可见、破绽命中与取消不消费、水之呼吸正反触发与唯一实体牌回收、呼吸衔接二选一、招牌费用/双防/穿甲、不触发普通突击技能；存档重放不重复回收。
- [ ] **Run red test**：`node --test test/demon-slayer-tanjiro.test.js`，预期因新技能尚未实现失败。
- [ ] **Green**：实现四项技能及其选择窗口，复用攻击与弃牌操作；不把私查牌名放进其他玩家可见状态或战斗日志。
- [ ] **Verify**：`node --test test/demon-slayer-tanjiro.test.js test/engine.test.js test/persistence-multistep.test.js` 全部通过。
- [ ] **Commit**：仅提交本 Task 文件。

### Task 4: 义勇与猗窝座——防护、取消和罗针

**Files:** Modify `src/packs/demon-slayer.js`, `src/engine.js`, `src/data.js`; create `test/demon-slayer-giyu-akaza.test.js`.

**Interfaces:** 攻击专用的距离覆盖只适用于猗窝座与当前罗针目标双方，不修改通用座次距离；护形仅在未完全防住的普通突击命中时减 1，凪在成为目标时只取消该目标的一次效果。

- [ ] **Write failing test**：义勇覆盖护形不被完全防御消耗、实际减伤、静心获能、水面斩消费、凪对普通突击和强化后单体策略伤害取消；猗窝座覆盖罗针重设/到期/退场、双方攻击距离、额外防御、实际受伤获盾、完全防住记录与灭式增伤、招牌后清理。加介入/群体牌反例和恢复后无双重取消。
- [ ] **Run red test**：`node --test test/demon-slayer-giyu-akaza.test.js`，预期新技能断言失败。
- [ ] **Green**：实现两人技能；只在攻击目标合法性路径增加罗针距离判断，单目标取消沿用现有取消事件。
- [ ] **Verify**：`node --test test/demon-slayer-giyu-akaza.test.js test/engine.test.js test/persistence-multistep.test.js` 全部通过。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 5: 善逸、伊之助、胡蝶忍

**Files:** Modify `src/packs/demon-slayer.js`, `src/engine.js`, `src/data.js`; create `test/demon-slayer-slayers-a.test.js`.

**Interfaces:** 转化防御保留原实体牌去向；伊之助两段攻击使用现有效果队列串行结算；胡蝶忍催毒为失去体力而非造成伤害。

- [ ] **Write failing test**：善逸的蓄雷结束出牌阶段、每轮获态上限、危机听觉转化与招牌不可介入；伊之助的距离、伤害来源标记、虚拟攻击不获态、两段攻击间退场；胡蝶忍净化/催毒选项、0 实效反例、毒刃仅普通突击有效伤害、轻身与招牌防住仍施毒。
- [ ] **Run red test**：`node --test test/demon-slayer-slayers-a.test.js`，预期新技能断言失败。
- [ ] **Green**：逐项实现，若缺乏阶段结束或转化响应接口，只加最窄的可恢复选择描述。
- [ ] **Verify**：`node --test test/demon-slayer-slayers-a.test.js test/engine.test.js test/persistence-multistep.test.js` 全部通过。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 6: 炼狱与蜜璃——转移和协同

**Files:** Modify `src/packs/demon-slayer.js`, `src/engine.js`, `src/data.js`; create `test/demon-slayer-slayers-b.test.js`.

**Interfaces:** 每次攻击至多一次转移，已有强制介入或替身时守护保留；受赠牌按实体 ID 追踪，离开受赠者手牌即失效；协作者响应与蜜璃后半段攻击是同一可恢复结算序列。

- [ ] **Write failing test**：炼狱守护选择、介入冲突、承接存活获能、呼吸增伤、招牌结算后无论命中均失体力；蜜璃交牌与附加效果、赠牌移走清理、心意相通每轮上限、协作者放弃/无牌/中途退场、单人残局可用、协同两步恢复不重复攻击。
- [ ] **Run red test**：`node --test test/demon-slayer-slayers-b.test.js`，预期新技能断言失败。
- [ ] **Green**：实现两人技能及最小必要的协同选择窗口，不创建第二套攻击解析。
- [ ] **Verify**：`node --test test/demon-slayer-slayers-b.test.js test/engine.test.js test/persistence-multistep.test.js` 全部通过。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 7: 祢豆子与无惨——援护和血印

**Files:** Modify `src/packs/demon-slayer.js`, `src/engine.js`, `src/data.js`; create `test/demon-slayer-demons.test.js`.

**Interfaces:** 祢豆子援护只提供一张实际弃置的基础牌防御，不在无需补防时支付；血印只观察目标下一张成功完成的非响应牌，并以实体牌 ID 防重复触发。

- [ ] **Write failing test**：祢豆子援护窗口、无需补防保留、完全防御获爆血、受伤获印、回合开始可选再生、爆血净化与护盾；无惨弃牌拒绝/无牌接受、取消牌不触发、目标出牌成功施毒、过期/退场、威压仅血印目标、肉鞭双目标逐一响应且不可反制。覆盖被介入、同时濒死及存档恢复。
- [ ] **Run red test**：`node --test test/demon-slayer-demons.test.js`，预期新技能断言失败。
- [ ] **Green**：实现援护与血印事件续接；肉鞭使用现有逐目标响应队列和策略伤害入口，不把招牌技伪装为策略牌。
- [ ] **Verify**：`node --test test/demon-slayer-demons.test.js test/engine.test.js test/persistence-multistep.test.js` 全部通过。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 8: 十人 AI 的合法选择和隐藏信息边界

**Files:** Modify `src/engine.js`, `src/packs/demon-slayer.js`; create `test/demon-slayer-ai.test.js`.

**Interfaces:** 角色包提供仅由公开局面及 AI 自己手牌计算的技能收益/目标评分；引擎仍决定 AI 行动次序。军八 AI 只使用可见身份判断，不能读目标真实阵营或隐藏手牌内容。

- [ ] **Write failing test**：每个角色至少一局能合法使用主动和招牌；至少一例无收益拒绝、危险/低体力目标选择、呼吸态/血鬼术资源预留；在仅改变隐藏身份或未知手牌的镜像局中决策保持一致。
- [ ] **Run red test**：`node --test test/demon-slayer-ai.test.js`，预期 AI 不会主动使用新技能。
- [ ] **Green**：接入现有 AI 技能入口，补局部评分，不重构公共 AI；嗅觉私查结果仅在该 AI 合法获得后使用。
- [ ] **Verify**：`node --test test/demon-slayer-ai.test.js test/simulation.test.js` 及既有身份知识边界测试通过；小规模固定种子对局无悬空窗口。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 9: 选将、对战状态、说明与八张立绘

**Files:** Modify `src/app.js`, `index.html`, `styles.css`, `assets/portraits/PROMPTS.md`; create `test/demon-slayer-ui.test.js`, `assets/portraits/{zenitsu,inosuke,giyu,rengoku,mitsuri,nezuko,akaza,muzan}.webp`.

**Interfaces:** UI 使用观察者安全视图读取公开状态、阶段剩余信息和炭治郎的私查结果；立绘走现有 `portraitPath`，缺图仍显示占位。角色选择按作品分组，不增加新模式入口。

- [ ] **Write failing test**：测试选将总数/鬼灭包筛选/十人技能预览、状态详情和公开标记、敌方看不到私查牌、窄屏可访问技能与结束回合。
- [ ] **Run red test**：`node --test test/demon-slayer-ui.test.js`，预期状态/筛选断言失败。
- [ ] **Green**：接入文本与状态徽记，按现有布局做最小样式增量；按已确认的原创二次元风格生成八张 640×960 WebP，记录完整提示词、来源及非商业原型说明，复用现有炭治郎/胡蝶忍立绘。
- [ ] **Verify**：`node --test test/demon-slayer-ui.test.js` 与 `npm run build` 通过；实际打开 1280×720 与常见安卓横屏尺寸检查无遮挡、八图加载正常，缺图占位可用。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 10: 版本、旧存档路由和新局中途恢复

**Files:** Modify `package.json`, `packaging/package.json`, `packaging/package-lock.json`, `packaging/build.mjs`, `packaging/runtime/boot.js`, `packaging/runtime/persistence.js`, `packaging/test/boot.test.js`, `packaging/test/legacy-artifact.test.js`, `packaging/test/persistence.test.js`, `test/persistence-multistep.test.js`; create `packaging/test/fixtures/v021-response.json` 及必要的同版本选择样本。

**Interfaces:** `APP_VERSION = "0.3.0"`，schema 2 键不变；boot 对 `0.2.0` 和 `0.2.1` 分别加载对应冻结脚本，对 `0.3.0` 用当前脚本；未知/损坏/缺文件不删除原存档。

- [ ] **Write failing test**：测试四种启动分流、冻结脚本 hash 校验、旧局结束后返回新版、加载失败保留存档；新局在普通响应、援护、防御、血液烙印选择、蜜璃协同及乱裂两段中保存/恢复，断言最终体力、手牌、状态、轮次、队列一致且无重复结算。
- [ ] **Run red test**：`npm run app:test`，预期旧版分流和新增选择恢复断言失败。
- [ ] **Green**：版本号更新、构建复制冻结脚本并校验哈希；复用现有旧局退出桥接；只补新决策的命令描述/重放能力，不改 schema 号或旧存档数据。
- [ ] **Verify**：`npm run app:test`、`npm run app:build` 与目标恢复测试通过，检查 `www/legacy/v0.2.0`、`www/legacy/v0.2.1` 和当前脚本共存。
- [ ] **Commit**：仅提交本 Task 改动。

### Task 11: 可复现模拟与单变量平衡闭环

**Files:** Modify `scripts/simulation.mjs`, `scripts/balance-simulation.mjs`, `test/simulation.test.js`; create `docs/reports/v0.3.0-demon-slayer-baseline.json`, `docs/reports/v0.3.0-demon-slayer-acceptance.md`，必要时新增同种子对照报告。

**Interfaces:** 模拟支持 `demon-slayer` 纯包与 36 人混合池，记录版本、种子范围、角色池、座次 `anchor`、胜率、轮数、步数、未完成及残留窗口；源码 hash 包含 `src/packs/demon-slayer.js`。

- [ ] **Write failing test**：测试角色池组成、四个 anchor 样本均分、固定种子同结果、报告字段和源码 hash 变化。
- [ ] **Run red test**：`node --test test/simulation.test.js`，预期新角色池/报告断言失败。
- [ ] **Green**：最小扩展脚本及报告输出，不改变战斗引擎统计定义。运行每角每座次至少 100 局的纯包与混合池 2V2 冒烟，以及至少 1000 局经典军八兼容回归；异常角色每角合计至少 1000 局复核。
- [ ] **Analyze**：未完成/残留窗口必须为 0，2V2≤4000 步、军八≤8000 步、>80 轮为 0。40%／60% 外先排机制/AI，必要时仅改一项数值并用相同种子复测；记录保留或回退理由。
- [ ] **Verify**：报告含命令、规模、种子、例外与实际结果；`node --test test/simulation.test.js` 通过。
- [ ] **Commit**：仅提交本 Task 改动及最终数值复测记录。

### Task 12: 全量回归、文档与网页版交付

**Files:** Modify `README.md`, `CHANGELOG.md`（若项目使用其他版本说明文件则沿用）, `index.html` 规则说明，以及因验收失败必须改动的本计划范围内文件；更新 `dist/app.bundle.js`（仅当仓库跟踪该产物）。

**Interfaces:** README、图鉴/玩法说明、角色详情和引擎使用同一最终数值；只交付网页版试玩入口及本地构建，不制作安装包或推送。

- [ ] **Red**：增加/核对测试，确保 36 人、十人包、两模式、37 牌、144/80 牌堆、旧存档安全路由与最新版号一致。
- [ ] **Green**：补齐最终文案及变更日志，清楚注明非商业原型和角色素材授权边界；修复验收暴露的本包问题，不借机改不相关系统。
- [ ] **Verify**：顺序运行 `npm test`、`npm run build`、`npm run app:test`、`npm run app:build`，记录命令和通过数量；打开可试玩网页版检查选将、至少一局 2V2 与一局军八、角色状态及立绘。最后 `git diff --check`、检查仅预期文件改动；交付报告注明未在真实 Windows/Android 设备验证的项目。
- [ ] **Commit**：仅提交本 Task 的文档、测试及经验证构建产物；汇总各 Task 提交与网页试玩方式，等待用户试玩反馈。
