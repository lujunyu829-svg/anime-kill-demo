# v0.2.0 存档版本化运行环境 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 v0.2.0 未完成对局在 v0.2.1 离线包中按旧规则继续，旧局结束或放弃后新开对局使用 v0.2.1。

**Architecture:** 封装页面先运行一个无游戏逻辑的启动脚本，根据本地 schema 2 存档的 `appVersion` 加载冻结的 v0.2.0 封装脚本或当前脚本。旧版脚本只负责旧局，导航桥接在离开旧局时清理存档并刷新到新版；当前存档检查拒绝不匹配版本。

**Tech Stack:** 原生浏览器 JavaScript、Node.js `node:test` / `node:vm`、esbuild、Electron/Capacitor 共用 `www`。

**Spec:** `docs/superpowers/specs/2026-09-30-v020-legacy-save-runtime-design.md`

## Global Constraints

- 维持 `anime-kill.saved-match.v2`、schema 2 和现有命令日志；不得迁移或改写旧存档。
- 旧脚本必须源自 Git 提交 `4390521` 的 v0.2.0 封装构建，并作为固定产物纳入仓库；后续 CI 不依赖 Git 历史生成它。
- 旧规则仅服务已有 v0.2.0 对局；所有新局使用 v0.2.1。
- 普通网页版脚本入口、角色数值、卡牌和 v0.3.0 不在本计划范围。
- 保留工作区已有未提交改动；已脏文件不得把原有改动混入本任务提交。能精确暂存本任务 hunk 才提交，否则保持未提交并在交付时说明。未真实验证的平台不得声称通过。

## Review Focus

1. 存档 JSON 含 `appVersion: "0.2.0"` 但内容损坏：启动旧脚本后应显示可清理错误，不得覆盖；Task 2/4 覆盖。
2. 未知未来 `appVersion`：当前脚本应拒绝恢复并保留删除入口；Task 3 覆盖。
3. 用户在旧版大厅取消放弃确认：存档和页面都不变化；Task 3 覆盖。
4. 旧局已终局但用户按“再来一局”：必须刷新进 v0.2.1，不能启动旧版新局；Task 3/4 覆盖。
5. 冻结脚本丢失或损坏：构建校验失败或页面显示错误，不能静默以新版规则重放；Task 1/2 覆盖。

---

### Task 1: 固定 v0.2.0 封装产物

**Files:**
- Create: `packaging/legacy/v0.2.0/app.bundle.js`
- Create: `packaging/legacy/v0.2.0/SHA256.txt`
- Create: `packaging/test/legacy-artifact.test.js`

**Interfaces:**
- Produces: 冻结脚本 `packaging/legacy/v0.2.0/app.bundle.js`，供 Task 2 构建复制；`SHA256.txt` 记录该文件的十六进制 SHA-256。

- [ ] **Step 1: 写失败测试**：`legacy-artifact.test.js` 断言文件存在、实际 SHA-256 等于 `SHA256.txt`、旧版字符串 `0.2.0` 与 schema 2 存档键存在；另检查旧脚本引用的 DOM ID 均在封装后的 HTML 中。
- [ ] **Step 2: 运行 `npm run app:test`**，确认因旧产物缺失而失败。
- [ ] **Step 3: 用托管隔离 worktree 从 `4390521` 构建 v0.2.0 `www/dist/app.bundle.js`**；检查旧包测试及构建结果，然后复制生成产物到指定目录，并记录 SHA-256。不得从当前 v0.2.1 源码构建旧脚本；该 worktree 留给 Task 4 生成样本。
- [ ] **Step 4: 运行 `npm run app:test`**，确认产物与校验测试通过；手动复核文件大小、旧版号及包内本地资源引用。
- [ ] **Step 5: 仅提交本 Task 的三个新文件**，不暂存其他已存在的改动。

### Task 2: 启动分流及封装构建

**Files:**
- Create: `packaging/runtime/boot.js`
- Create: `packaging/test/boot.test.js`
- Modify: `packaging/build.mjs`
- Modify: `packaging/transform-app.mjs`

**Interfaces:**
- Consumes: Task 1 的冻结脚本、现有 `SAVE_KEY` 常量值。
- Produces: `www/boot.js`、`www/legacy/v0.2.0/app.bundle.js`；封装 `www/index.html` 以 `<script src="./boot.js">` 启动，普通根 `index.html` 不变。
- `boot.js` 为经典脚本，无模块导出；测试通过 `node:vm` 模拟 `localStorage`、DOM 和动态脚本加载。

- [ ] **Step 1: 写失败测试**：无存档、v0.2.1、未知版本、损坏 JSON、存储异常均请求 `./dist/app.bundle.js`；仅 schema 2 + `0.2.0` 请求 `./legacy/v0.2.0/app.bundle.js`；脚本加载错误显示可读重试入口且存档未删；封装 HTML 使用 boot 脚本且构建目录含旧脚本。
- [ ] **Step 2: 运行 `npm run app:test`**，确认启动分流测试先失败。
- [ ] **Step 3: 最小实现 `boot.js` 版本选择和同源脚本加载**，在 `transformIndexHtml` 替换封装页面的脚本标签，`packaging/build.mjs` 复制启动脚本和冻结产物并核验其哈希；保持当前 CSP。
- [ ] **Step 4: 运行 `npm run app:test`、`npm run app:build`**，确认测试通过及生成的 `www` 路径正确，根网页版入口未变化。
- [ ] **Step 5: 仅提交可单独暂存的本 Task 改动**；对已有脏文件避免夹带原有 diff，构建产物按项目既有跟踪策略处理。

### Task 3: 旧局退出桥接与版本拒绝

**Files:**
- Modify: `packaging/runtime/boot.js`
- Modify: `packaging/runtime/persistence.js`
- Modify: `packaging/test/boot.test.js`
- Modify: `packaging/test/persistence.test.js`

**Interfaces:**
- Consumes: Task 2 已选定的 `legacy` 分支。
- Produces: 只在旧版运行时拦截 `startButton`、`discardSaveButton`、`resultLobby`、`rematchButton` 四个按钮；当前 `inspectSavedMatch(storage)` 对 `appVersion !== "0.2.1"` 返回 `{ exists: true, valid: false, reason }`。

- [ ] **Step 1: 写失败测试**：旧版大厅取消新开/放弃不删除存档；确认则删除并刷新；结果界面的两个按钮均刷新到新版；正常战斗返回大厅仍保留旧存档；旧版提示可见。另验证当前存档检查拒绝 `0.2.0` 和未知版本，但不删数据。
- [ ] **Step 2: 运行 `npm run app:test`**，确认新增测试失败。
- [ ] **Step 3: 仅在旧脚本加载时安装捕获阶段的导航桥接**，阻止旧监听器启动新局；结果界面只在旧会话已经清除存档后刷新。给旧版显示轻量提示；在当前 `inspectSavedMatch` 加精确版本检查。
- [ ] **Step 4: 运行 `npm run app:test`**，确认选择操作不被桥接影响且上述分支通过。
- [ ] **Step 5: 仅提交可单独暂存的本 Task 改动**；对已有脏文件避免夹带原有 diff。

### Task 4: 旧存档实际恢复与平台回归

**Files:**
- Create: `packaging/test/fixtures/v020-response.json`
- Create: `packaging/test/fixtures/v020-discard.json`
- Create: `packaging/test/fixtures/v020-choice.json`
- Create: `packaging/test/fixtures/v020-ai-turn.json`
- Create: `packaging/test/fixtures/v020-nami.json`
- Create: `docs/v0.2.1-legacy-save-verification.md`
- Modify: `packaging/test/legacy-artifact.test.js`
- Modify: `packaging/test/boot.test.js`
- Modify: `PACKAGING.md`（只补充旧局兼容及切换说明）

**Interfaces:**
- Consumes: Task 1–3 的旧脚本、启动分流与版本检查。
- Produces: 可重复使用的响应、弃牌、多步选择、AI 回合和旧版娜美费用存档样本；平台验收记录。

- [ ] **Step 1: 写失败测试**：要求五个固定种子样本存在，校验其 `appVersion/schemaVersion/stateDigest`，并证实 v0.2.1 引擎不能将旧版娜美窗口误判为兼容。
- [ ] **Step 2: 运行相关 `node --test`**，确认在缺少样本或错误路由时测试失败。
- [ ] **Step 3: 在隔离的 v0.2.0 运行环境生成五个固定种子样本，再通过封装页面实际恢复**；对比恢复前后状态摘要，继续到终局并验证无悬空窗口；只保留验收成功的最小样本和文档说明。
- [ ] **Step 4: 运行 `npm test`、`npm run build`、`npm run app:test`、`npm run app:build`**；可用时再运行 Windows/Android 打包并离线检查旧局恢复与新局启动。没有可用真机/模拟器时在验收记录中明确标为未验证，不将 v0.2.1 整体标记为发布通过。
- [ ] **Step 5: 在验收记录写明命令结果、样本种子和平台例外；归档 Task 1 的临时 worktree**。仅提交可单独暂存的本 Task 改动，不夹带工作区原有 diff。
