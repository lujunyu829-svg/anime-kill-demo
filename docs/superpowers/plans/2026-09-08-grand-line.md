# 伟大航路网页版实现计划

## 实施范围

先完成网页版本：角色数据、独立扩展模块、引擎事件接入、战场/详情显示、8张原创角色立绘、规则说明和回归测试。Windows 与 Android 封装保持现状，待网页版验证后再同步。

## 已完成接口

`src/packs/one-piece.js` 集中管理梦想状态初始化、主动技目标和结算、招牌技目标和结算，以及 turnStart、cardResolved、beforeDamage、afterDamage、afterHeal、equipmentChanged、hiddenCardViewed、shieldGranted、beforeDying 等事件。`GameEngine` 通过 `emitOnePieceEvent` 统一分发，不让角色逻辑散落到通用牌结算中。

## 验收

- 28名角色均有可加载的项目内立绘，海贼王筛选可直接选择10名角色。
- 梦想每轮最多推进一次，3点立即觉醒；索隆觉醒后的阿修罗动态消耗为3能量。
- 路飞、索隆、乌索普、罗宾、弗兰奇、布鲁克、甚平的状态不会泄露给错误观察者。
- 2V2与军八 AI 对局均能在限制步数内结束，伏笔不会因同名牌让 AI 卡在当前回合。
- 全部现有规则、移动端界面与存档测试保持通过。

## 后续

补充更多梦想事件的边界测试、牌堆耗尽测试和详情截图；网页版稳定后再把同一资源目录同步到 Electron/Capacitor 构建。
