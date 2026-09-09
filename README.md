# 动漫杀 · Anime Kill Demo

一个面向二次元玩家的原创战术卡牌游戏原型。游戏保留身份推理、座次距离、手牌攻防与角色技能的核心乐趣，同时加入伏笔、能量、扩展包和灵体支援等适合动漫角色表现的机制。

当前版本：**v0.2.0**  ·  [下载 Windows / Android 版本](https://github.com/lujunyu829-svg/anime-kill-demo/releases/tag/v0.2.0)

## 当前内容

| 内容 | 说明 |
| --- | --- |
| 对战模式 | 经典军八、身份对战、排位 2V2、1V2 |
| 作品扩展包 | 《火影忍者·忍界初阵》《海贼王·伟大航路》 |
| 角色 | 20 名动漫角色，按作品分类选择与预览技能 |
| 卡牌 | 6 种基础牌、19 种策略牌、12 种装备牌，共 37 种牌 |
| 牌堆 | 标准牌堆 144 张，2V2 精简牌堆 80 张 |
| 平台 | 浏览器、Windows x64、Android 7/API 24+ |

## 玩法特色

- **角色技能联动**：角色的主动技、被动技和招牌技围绕作品招牌能力设计，并与牌堆、装备、弃牌堆和行动队列联动。
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

# 构建浏览器版本
npm run app:build

# 安装封装层依赖并构建桌面 / Android 工程
npm run app:install
npm run desktop:dist
npm run android:prepare
```

浏览器发布目录为 `packaging/www/`，桌面和 Android 封装说明见 [PACKAGING.md](./PACKAGING.md)。

## 下载应用

公开安装包统一发布在 [GitHub Releases](https://github.com/lujunyu829-svg/anime-kill-demo/releases)：

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

