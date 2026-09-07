export const roles = {
  lord: { name: "界主", camp: "order", color: "gold", goal: "与守护者一同消灭所有破界者与独行者", reveal: "公开身份，体力上限、手牌上限与初始手牌+1" },
  loyal: { name: "守护者", camp: "order", color: "cyan", goal: "保护界主并消灭破界者与独行者", reveal: "摸2张牌，并令界主获得1点护盾" },
  rebel: { name: "破界者", camp: "chaos", color: "rose", goal: "击败界主", reveal: "摸1张牌并获得2点能量，本回合攻击距离无限" },
  lone: { name: "独行者", camp: "lone", color: "violet", goal: "成为唯一存活者，并最后击败界主", reveal: "摸2张牌并获得1点护盾" },
  azure: { name: "苍队", camp: "azure", color: "cyan", goal: "消灭绯队两名角色", reveal: "身份始终公开" },
  crimson: { name: "绯队", camp: "crimson", color: "rose", goal: "消灭苍队两名角色", reveal: "身份始终公开" }
};

export const modes = [
  { id: "classic8", name: "经典军八", label: "8人 · 隐藏身份", description: "界主、守护者、破界者与独行者在信息迷雾中博弈。", playerCount: 8, roles: ["lord", "loyal", "loyal", "rebel", "rebel", "rebel", "rebel", "lone"], publicRoles: ["lord"], deckProfile: "standard144", badge: "CLASSIC", accent: "gold" },
  { id: "ranked2v2", name: "排位 2V2", label: "4人 · 明阵营", description: "交错座次、身份公开。配合队友，率先击溃对方双人组。", playerCount: 4, roles: ["azure", "crimson", "azure", "crimson"], publicRoles: ["azure", "crimson"], deckProfile: "compact80", badge: "RANKED", accent: "cyan" }
];

const characterHandLimits = {
  shikamaru: 5, itachi: 5, hinata: 5, orochimaru: 5, chopper: 5, rukia: 5, armin: 5,
  gaara: 3
};

export const characters = [
  { id: "naruto", name: "漩涡鸣人", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "爆发", hp: 4, glyph: "忍", color: "#ff9b45", skills: [{ name: "分身掩护", text: "分身可作为防御；分身被消耗后获得1点能量，并令下一次攻击伤害+1。" }, { name: "羁绊回响", text: "拥有分身时攻击可无视距离；螺旋手里剑消耗分身后获得不可介入的强化。" }], signature: { name: "风遁·螺旋手里剑", cost: 4, target: "enemy", text: "发动一次需要2张防御的强袭；消耗分身后伤害+1且不能被强制介入。", effect: "rasenshuriken" } },
  { id: "gaara", name: "我爱罗", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "防御", hp: 4, glyph: "砂", color: "#c89567", skills: [{ name: "绝对防御", text: "每轮首次受到攻击时，可弃1张牌取消该攻击；发动后攻击者还须弃1张牌。" }, { name: "砂瀑追葬", text: "被砂缚的目标成为追葬目标；你下一次对其发动的攻击无视距离且伤害+1，随后移除标记。" }], signature: { name: "砂瀑大葬", cost: 4, target: "enemy", text: "目标弃2张牌，否则受到2点伤害并下回合少摸1张牌。", effect: "discardOrDamage" } },
  { id: "sakura", name: "春野樱", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "辅助", hp: 4, glyph: "樱", color: "#ef729e", skills: [{ name: "怪力回击", text: "主动解放基础百豪牌时回复1点体力，并令下一次攻击伤害+1。" }, { name: "医疗忍术", text: "主动解放策略百豪牌时净化伏笔或异常并摸1张牌；装备百豪牌可转化为2点护盾。连续解放不同类别仍获得能量。" }], signature: { name: "百豪之术", cost: 4, target: "self", text: "直到下回合开始，百豪保护范围改为全场，各类别首次解放后返回手牌，并使首次攻击伤害+1。", effect: "hundredHealings" } },
  { id: "shikamaru", name: "奈良鹿丸", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "控制", hp: 3, glyph: "影", color: "#8ca26a", skills: [{ name: "影缝", text: "为一名未行动角色落子；棋子角色本回合第一次使用攻击或策略牌时须弃牌，否则该牌被取消。" }, { name: "战术预读", text: "棋子出牌被取消、攻击被防御或你的伏笔被移除后，令其行动后移，并强化你下一次对其发动的攻击。" }], signature: { name: "将军", cost: 3, target: "marked", text: "将棋子身上一张自己的伏笔改为公开陷阱：取消其下一张非响应牌并结束出牌阶段；若没有伏笔则直接令棋子弃2张牌。", effect: "checkmate" } },
  { id: "itachi", name: "宇智波鼬", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "控制", hp: 3, glyph: "幻", color: "#c55367", skills: [{ name: "月读前兆", text: "虚假伏笔被反制时获得2点能量，并令下一次攻击伤害+1且忽略护甲；未被反制时，对幻象目标的攻击额外需要1张防御。" }, { name: "乌鸦替身", text: "每轮一次，成为突击目标时可消耗任一虚假伏笔，将突击转移给另一合法角色并摸1张牌；没有转移目标时取消该攻击。" }], signature: { name: "月读", cost: 4, target: "illusion", text: "消耗指向目标的虚假伏笔，封存其一张非响应手牌直到你的下回合，然后对其造成1点伤害。", effect: "tsukuyomi" } },
  { id: "sasuke", name: "宇智波佐助", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "爆发", hp: 4, glyph: "雷", color: "#6576d8", skills: [{ name: "写轮眼追猎", text: "天手力标记目标后，你对其发动的突击无视距离，并在命中前额外要求1张防御。" }, { name: "千鸟贯穿", text: "标记目标的突击忽略防护装甲；若目标成功防住，你仍可摸1张牌。" }], signature: { name: "麒麟", cost: 4, target: "swapMarked", text: "消耗天手力标记，对目标发动一次造成2点伤害、需要2张防御且忽略防护装甲的突击；命中后目标弃1张牌。", effect: "kirin" } },
  { id: "kakashi", name: "旗木卡卡西", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "爆发", hp: 3, glyph: "拷", color: "#8695ad", skills: [{ name: "查克拉回收", text: "每轮首次使用一张拷贝牌后，获得1点能量。" }, { name: "战术判断", text: "拷贝基础牌会强化下一次攻击；拷贝策略牌会令下一次目标选择无法被强制介入。" }], signature: { name: "神威雷切", cost: 4, target: "enemy", text: "消耗一张拷贝牌：基础牌化为双防强袭；策略牌抹除目标1张伏笔或装备并将其行动后移。", effect: "kamuiRaikiri" } },
  { id: "hinata", name: "日向雏田", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "控制", hp: 3, glyph: "瞳", color: "#9a91d8", skills: [{ name: "八卦领域", text: "你对白眼锁定目标的攻击无视距离与防护装甲。" }, { name: "柔拳封穴", text: "每轮首次对锁定目标使用策略牌后，令其无法获得能量直到回合结束；锁定目标的防御不能触发额外摸牌。" }], signature: { name: "八卦六十四掌", cost: 4, target: "scouted", text: "仅对白眼锁定目标：造成1点伤害，清空其能量，并封锁能量获取与招牌技直到其回合结束。", effect: "sixtyFourPalms" } },
  { id: "jiraiya", name: "自来也", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "爆发", hp: 4, glyph: "仙", color: "#b9554e", skills: [{ name: "蛤蟆协攻", text: "被束缚角色弃牌继续出牌时，你获得1点能量；其放弃弃牌导致出牌取消时，你摸1张牌。" }, { name: "仙术查克拉", text: "每轮首次造成伤害与首次受到伤害时各获得1枚仙术印。拥有仙术印时攻击距离+1，集齐2枚后下一次攻击伤害+1并忽略防具。" }], signature: { name: "仙法·五右卫门", cost: 4, target: "enemy", text: "最多选择两名距离2以内敌人，各需2张防御，否则受到2点伤害；仙术共鸣可强化其中一名目标，蛤蟆束缚目标额外需要1张防御。", effect: "goemon" } },
  { id: "orochimaru", name: "大蛇丸", series: "火影忍者", packId: "naruto_genesis", pack: "忍界初阵", role: "诡术", hp: 3, glyph: "蛇", color: "#9aa65b", skills: [{ name: "蛇蜕", text: "每轮首次受到伤害时，可消耗实验牌令伤害-1，并将该牌的类别记录为你的下一次研究方向。" }, { name: "禁术容器", text: "咒印夺取的牌可正常使用，也可在不尸转生中转化；使用同类别牌时额外获得1点能量。" }], signature: { name: "不尸转生", cost: 3, target: "self", text: "消耗一张实验牌：基础牌回复1体力并获护盾，策略牌净化伏笔与封锁，装备牌直接装备并获护盾。", effect: "immortality" } },
  { id: "luffy", name: "蒙奇·D·路飞", series: "海贼王", role: "爆发", hp: 4, glyph: "航", color: "#ef5b56", skills: [{ name: "见闻色", text: "每轮首次成为攻击目标时，有50%概率视为防御。" }], signature: { name: "五档", cost: 4, target: "self", text: "回复1点体力、摸2张牌，本回合攻击次数+1。", effect: "gearFive" } },
  { id: "chopper", name: "托尼托尼·乔巴", series: "海贼王", role: "辅助", hp: 3, glyph: "医", color: "#ef8fa7", skills: [{ name: "医术", text: "恢复牌可以对距离1以内的其他角色使用。" }, { name: "诊断", text: "每轮首次令其他角色回复体力后，你与其各摸1张牌。" }], signature: { name: "万能药", cost: 4, target: "ally", text: "一名友方回复1点体力并摸2张牌。", effect: "miracleCure" } },
  { id: "ichigo", name: "黑崎一护", series: "死神", role: "输出", hp: 4, glyph: "斩", color: "#e78b39", skills: [{ name: "斩月", text: "你的攻击距离+1。" }, { name: "战意", text: "每回合首次攻击被防御后摸1张牌。" }], signature: { name: "卍解", cost: 4, target: "self", text: "本回合攻击距离无限、攻击次数+1，并摸1张攻击牌。", effect: "bankai" } },
  { id: "rukia", name: "朽木露琪亚", series: "死神", role: "控制", hp: 3, glyph: "雪", color: "#9fb9e9", skills: [{ name: "初舞·月白", text: "攻击造成伤害后，目标下回合少摸1张牌。" }, { name: "袖白雪", text: "你使用单目标策略牌时无视距离。" }], signature: { name: "白霞罚", cost: 4, target: "enemy", text: "令目标下个出牌阶段无法使用攻击和策略牌。", effect: "freeze" } },
  { id: "tanjiro", name: "灶门炭治郎", series: "鬼灭之刃", role: "输出", hp: 4, glyph: "炭", color: "#55aa8a", skills: [{ name: "嗅觉", text: "回合开始额外观看牌堆顶牌；若为基础牌则获得。" }, { name: "水之呼吸", text: "每回合首次攻击被防御后，可弃1张牌再摸1张。" }], signature: { name: "火之神神乐", cost: 4, target: "enemy", text: "发动一次伤害+1的攻击。", effect: "powerAttack" } },
  { id: "shinobu", name: "胡蝶忍", series: "鬼灭之刃", role: "控制", hp: 3, glyph: "蝶", color: "#a678d3", skills: [{ name: "毒刃", text: "攻击造成伤害后附加毒；目标回合结束失去1点体力。" }, { name: "轻身", text: "没有防具时，其他角色计算与你的距离+1。" }], signature: { name: "蜈蚣之舞", cost: 4, target: "enemy", text: "无论是否被防御，目标都会获得剧毒。", effect: "venomStrike" } },
  { id: "gojo", name: "五条悟", series: "咒术回战", role: "防御", hp: 3, glyph: "∞", color: "#75bff2", skills: [{ name: "无下限", text: "每轮首次成为攻击目标时，攻击者须额外弃1张牌，否则攻击无效。" }], signature: { name: "虚式·茈", cost: 4, target: "enemy", text: "目标弃2张牌，否则受到1点伤害并失去装备。", effect: "hollowPurple" } },
  { id: "yuji", name: "虎杖悠仁", series: "咒术回战", role: "资源", hp: 4, glyph: "拳", color: "#e66b7c", skills: [{ name: "径庭拳", text: "每回合首次攻击命中后，目标弃1张牌。" }, { name: "不屈容器", text: "每轮首次体力降至2或以下时摸2张牌。" }], signature: { name: "黑闪", cost: 3, target: "enemy", text: "发动一次攻击；命中时伤害+1，被防御则返还2点能量。", effect: "blackFlash" } },
  { id: "mikasa", name: "三笠·阿克曼", series: "进击的巨人", role: "爆发", hp: 3, glyph: "翼", color: "#b8bac8", skills: [{ name: "阿克曼本能", text: "每轮首次需要防御时，可弃1张牌代替。" }, { name: "立体机动", text: "装备武器时攻击距离+1。" }], signature: { name: "雷枪", cost: 4, target: "enemy", text: "目标弃置所有装备，否则受到2点伤害。", effect: "thunderSpear" } },
  { id: "armin", name: "阿尔敏·亚鲁雷特", series: "进击的巨人", role: "辅助", hp: 3, glyph: "策", color: "#e2c58c", skills: [{ name: "战术掩护", text: "每轮首次有友方受伤后，令其摸1张牌。" }], signature: { name: "超大型巨人", cost: 4, target: "self", text: "失去1点体力；所有敌方弃1张牌，所有友方摸1张牌。", effect: "colossal" } }
].map(character => ({ ...character, handLimit: characterHandLimits[character.id] || 4 }));

export const characterPacks = [
  { id: "naruto_genesis", name: "忍界初阵", series: "火影忍者", description: "围绕特殊牌区、真假伏笔、装备换位、侦察锁定与行动时序展开的首个作品扩展包。", characterIds: ["naruto", "gaara", "sakura", "shikamaru", "itachi", "sasuke", "kakashi", "hinata", "jiraiya", "orochimaru"] }
];

export const activeSkills = {
  naruto: { name: "影分身", target: "self", cost: 1, costText: "1能量 · 存1张基础牌", effect: "shadowClone", text: "将1张非响应基础牌正面置为分身。分身区最多1张，每回合限一次。" },
  gaara: { name: "砂缚", target: "enemy", cost: 1, costText: "1能量", effect: "sandBind", text: "令距离2以内一名敌方弃1张牌并在下回合少摸1张；若其没有手牌，则改为受到1点伤害。" },
  sakura: { name: "百豪印", target: "self", costText: "蓄印或解放 · 每回合一次", effect: "byakugoStore", text: "选择蓄入1张不同类别手牌，或主动解放已有百豪牌；具体转化收益由角色技能决定。" },
  shikamaru: { name: "落子", target: "future", costText: "本轮未行动角色", effect: "chessMove", text: "在本轮尚未行动的一名角色身上放置棋子。场上只能有1枚你的棋子。" },
  itachi: { name: "幻象布置", target: "enemy", costText: "暗置1张非伏笔牌", effect: "illusionPlot", text: "将1张非伏笔手牌伪装成未知伏笔并指定其他角色，占用正常伏笔槽位。" },
  sasuke: { name: "天手力", target: "enemy", cost: 1, costText: "1能量 · 交换装备", effect: "amenotejikara", text: "与距离2以内一名敌方交换一个非空装备槽，并将其标记为追猎目标。" },
  kakashi: { name: "拷贝忍术", target: "self", cost: 1, costText: "1能量 · 复刻弃牌", effect: "copyNinjutsu", text: "从弃牌堆选择一张非响应基础牌或即时策略牌，生成一张仅持续到本回合结束的拷贝。" },
  hinata: { name: "白眼", target: "enemy", costText: "锁定距离2内敌方", effect: "byakugan", text: "锁定一名敌方直到你的下回合开始；你可在角色详情中查看其手牌名称与真实伏笔。" },
  jiraiya: { name: "通灵·蛤蟆口束缚", target: "enemy", cost: 1, costText: "1能量 · 距离2内 · 每回合一次", effect: "toadBind", text: "束缚一名敌人；其本回合首次使用攻击或策略牌时，须弃1张牌，否则该牌被取消。" },
  orochimaru: { name: "咒印实验", target: "enemy", costText: "弃1张牌作为样本", effect: "curseExperiment", text: "弃1张手牌并将其类别设为研究方向；目标在你下回合前首次尝试使用同类牌时，该牌被你夺取为实验牌。" },
  luffy: { name: "二档", target: "self", costText: "失去1体力", effect: "secondGear", text: "失去1点体力并摸2张牌，本回合攻击次数+1。" },
  chopper: { name: "医术", target: "ally", costText: "弃1基础牌", effect: "medicine", text: "弃1张基础牌，令一名受伤友方回复1点体力。" },
  ichigo: { name: "月牙天冲", target: "enemy", cost: 1, costText: "1能量", effect: "getsuga", text: "对距离2以内一名敌方发动一次虚拟攻击。" },
  rukia: { name: "初舞·月白", target: "enemy", cost: 1, costText: "1能量", effect: "firstDance", text: "令一名敌方下回合少摸1张牌。" },
  tanjiro: { name: "全集中呼吸", target: "self", costText: "弃1张牌", effect: "totalConcentration", text: "弃1张牌并摸2张，本回合攻击距离+1。" },
  shinobu: { name: "毒刃涂布", target: "self", cost: 1, costText: "1能量", effect: "poisonCoat", text: "本回合下一次攻击无论是否命中，都附加1层毒。" },
  gojo: { name: "六眼", target: "self", costText: "无消耗", effect: "sixEyes", text: "摸2张牌，然后弃1张牌。每回合限一次。" },
  yuji: { name: "径庭拳", target: "self", cost: 1, costText: "1能量", effect: "divergentPrep", text: "本回合下一次攻击命中时伤害+1。" },
  mikasa: { name: "立体机动", target: "self", costText: "弃1张牌", effect: "odmGear", text: "弃1张牌，本回合攻击次数与攻击距离各+1。" },
  armin: { name: "献策", target: "ally", costText: "交给1张牌", effect: "tacticalGift", text: "将1张手牌交给一名友方，令其再摸1张牌。" }
};

export const portraitPath = characterId => `./assets/portraits/${characterId}.webp`;
const illustratedCardIds = new Set([
  "attack", "guard", "heal", "focus", "overdrive", "adapt",
  "counter", "memory_exchange", "equipment_shift", "tactical_relay", "energy_auction", "intervene", "initiative_swap", "limit_contract",
  "causal_mark", "rhythm_break", "guardian_oath", "return_route", "delayed_cast", "echo_script",
  "dimensional_barrage", "rift_invasion", "will_duel", "mind_burn", "energy_collapse",
  "weapon", "piercer", "repeater", "impact_hammer",
  "armor", "reflector", "adaptive_armor", "limit_shield",
  "charm", "battery", "memory_core", "life_pendant"
]);
export const cardArtPath = cardId => illustratedCardIds.has(cardId) ? `./assets/cards/${cardId}.webp` : null;

export const tableSeatLayouts = {
  4: {
    1: { x: 13, y: 43 },
    2: { x: 50, y: 8 },
    3: { x: 87, y: 43 }
  },
  8: {
    1: { x: 10, y: 65 },
    2: { x: 11, y: 31 },
    3: { x: 27, y: 7 },
    4: { x: 50, y: 4 },
    5: { x: 73, y: 7 },
    6: { x: 89, y: 31 },
    7: { x: 90, y: 65 }
  }
};

export function tableSeatPosition(playerCount, seat) {
  return tableSeatLayouts[playerCount]?.[seat] || { x: 50, y: 10 };
}

export const cardDefinitions = {
  attack: { id: "attack", name: "突击", type: "basic", effect: "attack", targetMode: "enemy", icon: "斩", description: "对攻击范围内一名角色使用，造成1点伤害。", color: "red" },
  guard: { id: "guard", name: "防御", type: "basic", effect: "guard", icon: "盾", description: "响应突击，抵消此次伤害。", color: "blue", responseOnly: true },
  heal: { id: "heal", name: "恢复", type: "basic", effect: "heal", targetMode: "self", icon: "愈", description: "回复1点体力；重伤救援时可对重伤角色使用。", color: "green" },
  focus: { id: "focus", name: "蓄能", type: "basic", effect: "focus", targetMode: "self", icon: "能", description: "获得1点能量并摸1张牌。", color: "gold" },
  overdrive: { id: "overdrive", name: "超载", type: "basic", effect: "overdrive", targetMode: "self", icon: "爆", description: "每回合限1次，令下一次突击伤害+1；自己重伤时改为回复1点体力。", color: "red" },
  adapt: { id: "adapt", name: "应变", type: "basic", effect: "adapt", targetMode: "choice", icon: "变", description: "当作除应变外的任意基础牌使用，须遵守对应使用条件。", color: "cyan" },

  counter: { id: "counter", name: "反制", type: "strategy", effect: "counter", strategyKind: "response", icon: "逆", description: "抵消一张正在以自己为目标或对自己布置的策略牌。", fullDescription: "在一张策略牌即将以你为目标，或有未知伏笔即将对你布置时使用：抵消该策略牌。反制不能再被反制，每个事件最多消耗一张反制。", color: "cyan", responseOnly: true },
  memory_exchange: { id: "memory_exchange", name: "记忆交换", type: "strategy", effect: "memoryExchange", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "other", icon: "忆", description: "你与一名有手牌的角色各秘密选1张手牌，同时展示并交换。", fullDescription: "选择一名有手牌的其他角色。你与其各自秘密选择一张手牌，然后同时展示并交换；目标可在秘密选牌前使用反制。此牌可以被强制介入转移目标。", color: "violet" },
  equipment_shift: { id: "equipment_shift", name: "装备转移", type: "strategy", effect: "equipmentShift", strategyKind: "instant", counterable: true, targetMode: "twoPlayers", icon: "转", description: "选择两名角色和一个装备槽，交换该槽装备，允许一方为空。", fullDescription: "选择两名角色和武器、防具或饰品中的一个槽位，交换双方该槽装备，允许一方为空。受影响角色依次获得反制机会，任意一人反制即取消整张牌；装备移动不会触发从手牌装备时的效果。", color: "violet" },
  tactical_relay: { id: "tactical_relay", name: "战术接力", type: "strategy", effect: "tacticalRelay", strategyKind: "instant", targetMode: "other", icon: "接", description: "将1张基础牌交给其他角色；其可立即使用，成功后双方各获1能量。", fullDescription: "将一张基础牌交给一名其他角色。其可以立即按照正常目标规则使用；若成功使用，你与其各获得1点能量，否则其保留该牌。", color: "gold" },
  energy_auction: { id: "energy_auction", name: "能量竞逐", type: "strategy", effect: "energyAuction", strategyKind: "instant", targetMode: "self", icon: "竞", description: "全员秘密投0–2能量；唯一最高者摸3弃1，并列最高者各摸1。", fullDescription: "所有存活角色秘密投入0至2点能量并同时公开。唯一最高者摸3张牌后弃1张；最高值并列者各摸1张；所有人都投入0时，使用者摸1张。投入的能量不会返还。", color: "gold" },
  intervene: { id: "intervene", name: "强制介入", type: "strategy", effect: "intervene", strategyKind: "response", icon: "介", description: "代替其他角色成为单目标突击或可转移即时策略的目标，结算后摸1。", fullDescription: "当其他角色成为单目标突击或标记为可转移的即时策略目标时使用：将目标改为你。该事件结算结束且你仍存活时摸1张牌；每个事件最多发生一次强制介入。", color: "cyan", responseOnly: true },
  initiative_swap: { id: "initiative_swap", name: "时序改写", type: "strategy", effect: "initiativeSwap", strategyKind: "instant", counterable: true, targetMode: "futureTwo", icon: "序", description: "交换本轮尚未行动的两名角色的行动顺序，不改变座次与距离。", fullDescription: "选择本轮尚未行动的两名角色，交换其在本轮剩余行动队列中的顺序。双方依次获得反制机会；此效果不改变永久座次、距离或下一轮的正常顺序。", color: "violet" },
  limit_contract: { id: "limit_contract", name: "极限契约", type: "strategy", effect: "limitContract", strategyKind: "instant", targetMode: "other", icon: "契", description: "目标选择爆发（获2能量、你摸1，其下回合末失1体力）或封存（其摸2、你获1能量，其招牌技锁定至下回合末）。", fullDescription: "目标选择一项：爆发——目标获得2点能量，你摸1张牌，目标下回合结束时失去1点体力；封存——目标摸2张牌，你获得1点能量，目标的招牌技锁定至其下回合结束。", color: "red" },

  dimensional_barrage: { id: "dimensional_barrage", name: "次元弹幕", type: "strategy", effect: "dimensionalBarrage", strategyKind: "instant", counterable: true, targetMode: "allOther", responsePattern: "guard", icon: "幕", description: "所有其他角色依座次打出防御或应变，否则受到1点策略伤害。", fullDescription: "对所有其他存活角色使用，从你的下家开始依座次逐个结算。每名目标可打出防御或应变，否则受到你造成的1点策略伤害；其也可使用反制，仅免除对自己的效果。", color: "red" },
  rift_invasion: { id: "rift_invasion", name: "裂隙侵袭", type: "strategy", effect: "riftInvasion", strategyKind: "instant", counterable: true, targetMode: "allOther", responsePattern: "attack", icon: "袭", description: "所有其他角色依座次打出突击或应变，否则受到1点策略伤害。", fullDescription: "对所有其他存活角色使用，从你的下家开始依座次逐个结算。每名目标可打出突击或应变，否则受到你造成的1点策略伤害；其也可使用反制，仅免除对自己的效果。", color: "red" },
  will_duel: { id: "will_duel", name: "意志对决", type: "strategy", effect: "willDuel", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "other", responsePattern: "duel", icon: "决", description: "目标先开始，双方交替打出突击或应变，首先停止的一方受到1点策略伤害。", fullDescription: "选择一名其他角色，由目标开始，双方交替打出突击或应变。首先无法或选择不打出牌的一方，受到对方造成的1点策略伤害。响应牌不计入回合突击次数，也不触发突击专属效果。", color: "red" },
  mind_burn: { id: "mind_burn", name: "精神灼烧", type: "strategy", effect: "mindBurn", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "handOther", icon: "灼", description: "目标展示1张手牌；你可弃置1张相同类别手牌，对其造成1点策略伤害。", fullDescription: "选择一名有手牌的其他角色。目标先展示一张手牌，你可以弃置一张与展示牌同类别的其他手牌；若弃置，对目标造成1点策略伤害。被反制时不会展示手牌，展示牌结算后仍留在目标手中。", color: "violet" },
  energy_collapse: { id: "energy_collapse", name: "能量崩解", type: "strategy", effect: "energyCollapse", strategyKind: "instant", counterable: true, redirectable: true, targetMode: "other", icon: "崩", description: "目标消耗2点能量，否则受到1点策略伤害；能量不足时只能受到伤害。", fullDescription: "选择一名其他角色。目标选择消耗2点能量，或受到你造成的1点策略伤害；能量不足2点时只能受到伤害。被消耗的能量直接移除，不会转移给使用者。", color: "gold" },

  causal_mark: { id: "causal_mark", name: "因果标记", type: "strategy", effect: "causalMark", strategyKind: "plot", hidden: true, counterable: true, targetMode: "other", icon: "因", description: "伏笔：目标首次造成伤害时你摸2并获1能量；未触发到期时目标摸1。", fullDescription: "暗置并指定一名其他角色。其在你下回合开始前首次实际造成伤害时触发：你摸2张牌并获得1点能量；若到期前始终没有触发，该目标摸1张牌。", color: "violet" },
  rhythm_break: { id: "rhythm_break", name: "节奏断点", type: "strategy", effect: "rhythmBreak", strategyKind: "plot", hidden: true, counterable: true, targetMode: "other", icon: "断", description: "伏笔：目标尝试使用第3张非响应牌时，须弃另1张手牌，否则取消该牌并结束出牌。", fullDescription: "暗置并指定一名其他角色。其在一个出牌阶段尝试使用第3张非响应牌时触发：其弃置另一张手牌使当前牌继续，或取消当前牌并立即结束出牌阶段。", color: "red" },
  guardian_oath: { id: "guardian_oath", name: "守护誓约", type: "strategy", effect: "guardianOath", strategyKind: "plot", hidden: true, counterable: true, targetMode: "any", icon: "誓", description: "伏笔：目标在你下回合前首次将受到的伤害-1。", fullDescription: "暗置并指定一名存活角色。其在你下回合开始前首次将受到伤害时触发，令该次伤害减少1点；多个不同设置者的守护誓约可以分别触发。", color: "blue" },
  return_route: { id: "return_route", name: "回击轨迹", type: "strategy", effect: "returnRoute", strategyKind: "plot", hidden: true, counterable: true, targetMode: "any", icon: "返", description: "伏笔：目标成为单目标突击的目标后，结算完可无视距离反击。", fullDescription: "暗置并指定一名存活角色。其成为单目标突击的目标时触发；原突击结算完毕后，其可以对攻击者打出一张不计次数且无视距离的突击。", color: "red" },
  delayed_cast: { id: "delayed_cast", name: "延迟咏唱", type: "strategy", effect: "delayedCast", strategyKind: "plot", hidden: true, targetMode: "self", icon: "咏", description: "伏笔：下回合开始选择摸2或获2能量；若期间未受伤则两项都获得。", fullDescription: "对自己暗置。你下回合开始时选择摸2张牌或获得2点能量；若布置后没有实际受到过伤害，则两项效果都获得。", color: "gold" },
  echo_script: { id: "echo_script", name: "招式残响", type: "strategy", effect: "echoScript", strategyKind: "plot", hidden: true, targetMode: "self", icon: "响", description: "伏笔：下回合第1张基础牌结算后，将其从弃牌堆返回手牌。", fullDescription: "对自己暗置。你下回合出牌阶段使用的第1张基础牌结算后，将该实体牌从弃牌堆返回手牌，然后移除此伏笔；若该回合没有触发，回合结束时移除。", color: "cyan" },

  weapon: { id: "weapon", name: "增幅武装", type: "equipment", effect: "range", slot: "weapon", rangeBonus: 1, icon: "刃", description: "攻击距离+1。", color: "orange" },
  piercer: { id: "piercer", name: "破界刃", type: "equipment", effect: "pierceArmor", slot: "weapon", rangeBonus: 1, icon: "破", description: "攻击距离+1；突击忽略目标的防具牌效果。", color: "red" },
  repeater: { id: "repeater", name: "连射装置", type: "equipment", effect: "extraAttack", slot: "weapon", rangeBonus: 0, icon: "连", description: "每回合突击次数上限+1。", color: "orange" },
  impact_hammer: { id: "impact_hammer", name: "震荡重锤", type: "equipment", effect: "impact", slot: "weapon", rangeBonus: 2, icon: "震", description: "攻击距离+2；每回合首次以突击造成伤害后，目标弃1张手牌。", color: "orange" },
  armor: { id: "armor", name: "防护装甲", type: "equipment", effect: "roundReduction", slot: "armor", icon: "甲", description: "每轮首次受到的突击伤害-1。", color: "blue" },
  reflector: { id: "reflector", name: "反射屏障", type: "equipment", effect: "guardDraw", slot: "armor", icon: "反", description: "每轮首次以防御完全抵消突击后摸1。", color: "cyan" },
  adaptive_armor: { id: "adaptive_armor", name: "自适应外衣", type: "equipment", effect: "basicAsGuard", slot: "armor", icon: "适", description: "每轮一次，可将一张非防御、非应变基础牌当防御。", color: "blue" },
  limit_shield: { id: "limit_shield", name: "限界护盾", type: "equipment", effect: "capDamage", slot: "armor", icon: "限", description: "受到至少2点伤害时改为1点，然后弃置此装备。", color: "blue" },
  charm: { id: "charm", name: "能量核心", type: "equipment", effect: "turnEnergy", slot: "charm", icon: "核", description: "回合开始额外获得1点能量。", color: "gold" },
  battery: { id: "battery", name: "备用电池", type: "equipment", effect: "energyCap", slot: "charm", icon: "电", description: "能量上限+1，从手牌装备时获1点能量。", color: "gold" },
  memory_core: { id: "memory_core", name: "记忆晶体", type: "equipment", effect: "handLimit", slot: "charm", icon: "忆", description: "手牌上限+2。", color: "violet" },
  life_pendant: { id: "life_pendant", name: "生命吊坠", type: "equipment", effect: "autoRescue", slot: "charm", icon: "生", description: "进入重伤时自动弃置，并回复至1点体力。", color: "green" }
};

export const deckProfiles = {
  standard144: {
    attack: 31, guard: 20, heal: 11, focus: 6, overdrive: 5, adapt: 3,
    counter: 5, memory_exchange: 3, equipment_shift: 2, tactical_relay: 3, energy_auction: 1, intervene: 3, initiative_swap: 1, limit_contract: 3,
    dimensional_barrage: 2, rift_invasion: 2, will_duel: 2, mind_burn: 2, energy_collapse: 2,
    causal_mark: 3, rhythm_break: 3, guardian_oath: 3, return_route: 2, delayed_cast: 3, echo_script: 3,
    weapon: 2, piercer: 2, repeater: 2, impact_hammer: 1, armor: 2, reflector: 2, adaptive_armor: 1, limit_shield: 1, charm: 2, battery: 2, memory_core: 2, life_pendant: 1
  },
  compact80: {
    attack: 17, guard: 11, heal: 6, focus: 3, overdrive: 3, adapt: 2,
    counter: 3, memory_exchange: 2, equipment_shift: 1, tactical_relay: 2, energy_auction: 1, intervene: 2, initiative_swap: 1, limit_contract: 1,
    dimensional_barrage: 1, rift_invasion: 1, will_duel: 1, mind_burn: 1, energy_collapse: 1,
    causal_mark: 2, rhythm_break: 1, guardian_oath: 2, return_route: 1, delayed_cast: 1, echo_script: 1,
    weapon: 1, piercer: 1, repeater: 1, impact_hammer: 1, armor: 1, reflector: 1, adaptive_armor: 1, limit_shield: 1, charm: 1, battery: 1, memory_core: 1, life_pendant: 1
  }
};

// 保留默认导出，便于旧的图鉴和外部调试代码平滑过渡。
export const deckRecipe = deckProfiles.standard144;

export function getCharacter(id) { return characters.find(character => character.id === id); }
export function getMode(id) { return modes.find(mode => mode.id === id); }
