# 动漫杀 · Anime Kill Demo

一个面向二次元玩家的原创战术卡牌游戏原型。游戏保留身份推理、座次距离、手牌攻防与角色技能的核心乐趣，同时加入伏笔、能量和作品扩展包。

当前本地网页版：**v0.3.0《日轮与血月》**，尚未上传 GitHub 或生成新版安装包。新增鬼灭之刃十人扩展包，平衡和终局结果见[验收记录](docs/reports/v0.3.0-demon-slayer-acceptance.md)。[GitHub Releases](https://github.com/lujunyu829-svg/anime-kill-demo/releases) 中的旧安装包不包含本次更新。

## 当前内容

| 内容 | 说明 |
| --- | --- |
| 对战模式 | 经典军八（隐藏身份）、排位 2V2（公开阵营） |
| 作品扩展包 | 《火影忍者·忍界初阵》《海贼王·伟大航路》《鬼灭之刃·日轮与血月》 |
| 角色 | 36 名：三个扩展包各 10 名，另有跨作品基础角色 6 名 |
| 卡牌 | 6 种基础牌、19 种策略牌、12 种装备牌，共 37 种牌 |
| 牌堆 | 标准牌堆 144 张，2V2 精简牌堆 80 张 |
| 当前版本平台 | 浏览器；Windows/Android 封装仍停留在此前公开版本 |

## 玩法特色

- **角色技能联动**：角色的主动技、被动技和招牌技围绕作品招牌能力设计，并与牌堆、装备、弃牌堆和行动队列联动。
- **日轮与血月**：七名剑士通过呼吸态衔接攻防，三名鬼以爆血印、罗针与血印展开博弈；选将可按作品筛选并预览技能。
- **独立手牌上限**：角色的体力与手牌上限分开计算，残血不会直接导致资源崩盘，也为不同角色提供更明显的定位差异。
- **伏笔系统**：每名角色最多同时保留 2 张伏笔。同回合可以连续布置，但同名伏笔不能重复；敌方只看到牌背、设置者和目标。
- **原创策略牌**：暗置伏笔、能量交易、装备转移、行动时序和次元弹幕等牌，让对局不只依赖传统的拆牌或群伤模板。
- **完整信息查看**：对战中可以打开任意角色的状态与技能详情，也可以放大手牌查看完整规则。
- **适配移动端**：横屏布局、行动面板、结束回合按钮和本地存档均针对手机操作进行适配。

## 快速运行

需要 Node.js 18 或更新版本：

```powershell
npm install
npm start
```

然后打开 <http://localhost:4173>。

## 测试与构建

```powershell
# 规则与引擎测试
npm test

# 运行平衡复测
npm run balance:test

# 构建当前浏览器版本
npm run build
npm run app:build

# 安装封装层依赖并构建桌面 / Android 工程
npm run app:install
npm run desktop:dist
npm run android:prepare
```

可直接打开的网页入口为仓库根目录的 `index.html`（脚本位于 `dist/app.bundle.js`）；共享离线网页目录为 `www/`。桌面和 Android 封装说明见 [PACKAGING.md](./PACKAGING.md)，本轮未制作新版安装包。

## 下载应用

旧版公开安装包发布在 [GitHub Releases](https://github.com/lujunyu829-svg/anime-kill-demo/releases)，尚未包含 v0.3.0：

- Windows：安装版和便携版，适用于 Windows x64。
- Android：测试签名 APK，支持 Android 7/API 24 及以上，锁定横屏。
- 每个版本同时提供 SHA-256 校验文件。

Windows 首次运行可能出现 SmartScreen 提示，这是因为原型版本尚未购买商业代码签名证书。Android APK 为侧载测试包，不能直接提交应用商店。

## 项目结构

```text
src/                 游戏引擎、角色、卡牌与扩展包
src/packs/           作品扩展包逻辑
src/portraits/       角色立绘
src/cards/           卡牌插画
packaging/           Electron、Capacitor 与发布配置
test/                规则、AI、存档与界面回归测试
```

## 许可与素材声明

这是个人非商业玩法原型。项目中的动漫角色名称、形象和相关设定仅用于内部玩法验证；任何公开发布或商业化版本，都需要取得相应授权，或替换为原创角色、美术和名称。

