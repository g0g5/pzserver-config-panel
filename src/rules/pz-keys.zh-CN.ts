export type PzKeyZhInfo = {
  zhName: string;
  description: string;
};

export const PZ_KEYS_ZH_CN: Readonly<Record<string, PzKeyZhInfo>> = {
  PVP: {
    zhName: "玩家互伤",
    description: "是否允许玩家之间互相造成伤害和击杀。",
  },
  PVPLogToolChat: {
    zhName: "PVP聊天日志",
    description: "是否将 PVP 事件写入管理员聊天频道。",
  },
  PVPLogToolFile: {
    zhName: "PVP文件日志",
    description: "是否将 PVP 事件写入日志文件。",
  },
  PauseEmpty: {
    zhName: "空服暂停时间",
    description: "无玩家在线时是否暂停游戏时间流逝。",
  },
  GlobalChat: {
    zhName: "全局聊天",
    description: "是否启用全局聊天频道。",
  },
  ChatStreams: {
    zhName: "聊天频道列表",
    description: "可用聊天流列表，使用逗号分隔。",
  },
  Open: {
    zhName: "开放加入",
    description: "是否允许未在白名单中的玩家直接加入。",
  },
  ServerWelcomeMessage: {
    zhName: "欢迎消息",
    description: "玩家登录后显示的欢迎文本，支持颜色和换行标记。",
  },
  ServerImageLoginScreen: {
    zhName: "登录页图片",
    description: "登录界面图片资源路径或链接。",
  },
  ServerImageLoadingScreen: {
    zhName: "加载页图片",
    description: "加载界面图片资源路径或链接。",
  },
  ServerImageIcon: {
    zhName: "服务器图标",
    description: "服务器图标资源路径或链接。",
  },
  AutoCreateUserInWhiteList: {
    zhName: "自动加白名单",
    description: "开放服务器模式下，玩家首次加入时自动加入白名单。",
  },
  DisplayUserName: {
    zhName: "显示用户名",
    description: "是否在角色头顶显示用户名。",
  },
  ShowFirstAndLastName: {
    zhName: "显示角色姓名",
    description: "是否在角色头顶显示名字和姓氏。",
  },
  UsernameDisguises: {
    zhName: "用户名伪装",
    description: "是否启用伪装状态下的用户名显示逻辑。",
  },
  HideDisguisedUserName: {
    zhName: "隐藏伪装名",
    description: "是否隐藏伪装玩家的用户名。",
  },
  SwitchZombiesOwnershipEachUpdate: {
    zhName: "僵尸所有权轮换",
    description: "每次更新时是否切换僵尸归属以平衡负载。",
  },
  SpawnPoint: {
    zhName: "固定出生点",
    description: "强制新玩家出生在指定坐标（0,0,0 表示忽略）。",
  },
  SafetySystem: {
    zhName: "安全系统",
    description: "是否启用个人 PVP 安全开关机制。",
  },
  ShowSafety: {
    zhName: "显示安全图标",
    description: "是否显示玩家 PVP 状态的头顶图标。",
  },
  SafetyToggleTimer: {
    zhName: "安全切换耗时",
    description: "玩家切换 PVP 安全状态所需时间（秒）。",
  },
  SafetyCooldownTimer: {
    zhName: "安全切换冷却",
    description: "玩家再次切换 PVP 安全状态前的冷却时间（秒）。",
  },
  SafetyDisconnectDelay: {
    zhName: "断线安全延迟",
    description: "玩家断线后的安全延迟时间（秒）。",
  },
  SpawnItems: {
    zhName: "出生物品",
    description: "新玩家初始物品类型列表（逗号分隔）。",
  },
  DefaultPort: {
    zhName: "默认端口",
    description: "玩家数据主端口。",
  },
  UDPPort: {
    zhName: "UDP端口",
    description: "服务器 UDP 通信端口。",
  },
  ResetID: {
    zhName: "重置ID",
    description: "软重置标识，用于判定角色是否需重建。",
  },
  Mods: {
    zhName: "模组加载ID列表",
    description: "服务器启用的 Mod 加载 ID 列表（分号分隔）。",
  },
  Map: {
    zhName: "地图列表",
    description: "服务器使用的地图名称/顺序。",
  },
  DoLuaChecksum: {
    zhName: "Lua校验",
    description: "文件不一致时是否踢出客户端。",
  },
  DenyLoginOnOverloadedServer: {
    zhName: "过载拒绝登录",
    description: "服务器过载时是否拒绝新玩家登录。",
  },
  Public: {
    zhName: "公开显示",
    description: "是否在游戏内服务器浏览器中公开显示。",
  },
  PublicName: {
    zhName: "公共名称",
    description: "对外显示的服务器名称。",
  },
  PublicDescription: {
    zhName: "公共描述",
    description: "对外显示的服务器描述文本。",
  },
  MaxPlayers: {
    zhName: "最大玩家数",
    description: "同时在线玩家上限（不含管理员）。",
  },
  PingLimit: {
    zhName: "延迟上限",
    description: "玩家被踢出的 Ping 阈值（毫秒，0 为禁用）。",
  },
  SafehousePreventsLootRespawn: {
    zhName: "安全屋禁刷新战利品",
    description: "安全屋内是否阻止物资刷新。",
  },
  DropOffWhiteListAfterDeath: {
    zhName: "死亡移出白名单",
    description: "玩家死亡后是否从白名单移除账号。",
  },
  NoFire: {
    zhName: "禁用火焰",
    description: "是否禁用火焰（通常不含营火）。",
  },
  AnnounceDeath: {
    zhName: "死亡公告",
    description: "玩家死亡时是否全局公告。",
  },
  SaveWorldEveryMinutes: {
    zhName: "世界定时保存",
    description: "按分钟周期自动保存已加载地图区块。",
  },
  PlayerSafehouse: {
    zhName: "玩家可创建安全屋",
    description: "是否允许普通玩家创建安全屋。",
  },
  AdminSafehouse: {
    zhName: "仅管理员安全屋",
    description: "是否只允许管理员创建安全屋。",
  },
  SafehouseAllowTrepass: {
    zhName: "安全屋允许闯入",
    description: "是否允许非成员进入安全屋。",
  },
  SafehouseAllowFire: {
    zhName: "安全屋可被火烧",
    description: "是否允许火焰破坏安全屋。",
  },
  SafehouseAllowLoot: {
    zhName: "安全屋允许拾取",
    description: "是否允许非成员拿取安全屋物品。",
  },
  SafehouseAllowRespawn: {
    zhName: "安全屋重生",
    description: "玩家死亡后是否可在所属安全屋重生。",
  },
  SafehouseDaySurvivedToClaim: {
    zhName: "可认领安全屋生存天数",
    description: "创建安全屋前需存活的游戏天数。",
  },
  SafeHouseRemovalTime: {
    zhName: "安全屋移除时间",
    description: "未访问安全屋达到该小时数后移出成员。",
  },
  SafehouseAllowNonResidential: {
    zhName: "允许非住宅安全屋",
    description: "是否允许认领非住宅建筑为安全屋。",
  },
  SafehouseDisableDisguises: {
    zhName: "安全屋禁伪装",
    description: "安全屋相关场景下是否禁用伪装。",
  },
  MaxSafezoneSize: {
    zhName: "最大安全区大小",
    description: "安全区可设置的最大尺寸。",
  },
  AllowDestructionBySledgehammer: {
    zhName: "允许大锤破坏",
    description: "是否允许玩家用大锤破坏世界物体。",
  },
  SledgehammerOnlyInSafehouse: {
    zhName: "大锤仅限安全屋",
    description: "是否仅允许在安全屋内使用大锤破坏。",
  },
  WarStartDelay: {
    zhName: "战争开始延迟",
    description: "战争模式开始前的等待时间（秒）。",
  },
  WarDuration: {
    zhName: "战争持续时间",
    description: "战争模式持续时间（秒）。",
  },
  WarSafehouseHitPoints: {
    zhName: "安全屋战争耐久",
    description: "战争模式下安全屋耐久上限。",
  },
  ServerPlayerID: {
    zhName: "服务器玩家ID",
    description: "角色来源校验 ID，与 ResetID 联动。",
  },
  RCONPort: {
    zhName: "RCON端口",
    description: "远程控制台端口。",
  },
  RCONPassword: {
    zhName: "RCON密码",
    description: "远程控制台访问密码。",
  },
  DiscordEnable: {
    zhName: "Discord联动",
    description: "是否启用与 Discord 频道的聊天联动。",
  },
  DiscordToken: {
    zhName: "Discord令牌",
    description: "Discord 机器人访问令牌。",
  },
  DiscordChannel: {
    zhName: "Discord频道名",
    description: "Discord 联动的频道名称。",
  },
  DiscordChannelID: {
    zhName: "Discord频道ID",
    description: "Discord 联动的频道 ID。",
  },
  WebhookAddress: {
    zhName: "Webhook地址",
    description: "Slack 等服务的传入 Webhook URL。",
  },
  Password: {
    zhName: "服务器密码",
    description: "玩家加入服务器所需密码。",
  },
  MaxAccountsPerUser: {
    zhName: "单Steam用户最大账号数",
    description: "单个 Steam 用户可创建账号数量上限。",
  },
  AllowCoop: {
    zhName: "允许合作/分屏",
    description: "是否允许合作和分屏玩家。",
  },
  SleepAllowed: {
    zhName: "允许睡眠",
    description: "玩家疲劳时是否允许睡觉。",
  },
  SleepNeeded: {
    zhName: "必须睡眠",
    description: "玩家是否必须通过睡眠恢复。",
  },
  KnockedDownAllowed: {
    zhName: "允许击倒",
    description: "是否启用击倒机制（可能导致位置不同步）。",
  },
  SneakModeHideFromOtherPlayers: {
    zhName: "潜行隐藏玩家",
    description: "潜行时是否对其他玩家隐藏。",
  },
  UltraSpeedDoesnotAffectToAnimals: {
    zhName: "加速不影响动物",
    description: "超高速时间流逝是否不影响动物。",
  },
  WorkshopItems: {
    zhName: "创意工坊ID列表",
    description: "服务器需要下载的 Workshop 物品 ID（分号分隔）。",
  },
  SteamScoreboard: {
    zhName: "Steam记分板信息",
    description: "玩家列表中是否显示 Steam 名称与头像。",
  },
  SteamVAC: {
    zhName: "Steam VAC",
    description: "是否启用 Steam VAC 反作弊。",
  },
  UPnP: {
    zhName: "自动端口映射",
    description: "是否尝试通过 UPnP 自动配置端口转发。",
  },
  VoiceEnable: {
    zhName: "语音启用",
    description: "是否启用 VOIP 语音。",
  },
  VoiceMinDistance: {
    zhName: "语音最小距离",
    description: "VOIP 可听见的最小格子距离。",
  },
  VoiceMaxDistance: {
    zhName: "语音最大距离",
    description: "VOIP 可听见的最大格子距离。",
  },
  Voice3D: {
    zhName: "语音方向音效",
    description: "是否启用 VOIP 方向性音频。",
  },
  SpeedLimit: {
    zhName: "车速上限",
    description: "车辆速度限制参数。",
  },
  LoginQueueEnabled: {
    zhName: "登录排队",
    description: "是否启用登录排队机制。",
  },
  LoginQueueConnectTimeout: {
    zhName: "排队连接超时",
    description: "登录队列连接超时时间（秒）。",
  },
  server_browser_announced_ip: {
    zhName: "广播IP",
    description: "服务器对外广播到浏览器的 IP 地址。",
  },
  PlayerRespawnWithSelf: {
    zhName: "原地重生",
    description: "是否允许在死亡坐标重生。",
  },
  PlayerRespawnWithOther: {
    zhName: "队友位置重生",
    description: "是否允许在分屏/远程队友位置重生。",
  },
  FastForwardMultiplier: {
    zhName: "睡眠快进倍率",
    description: "玩家睡眠时的时间流逝倍数。",
  },
  DisableSafehouseWhenPlayerConnected: {
    zhName: "在线时关闭安全屋保护",
    description: "成员在线时安全屋是否按普通房屋处理。",
  },
  Faction: {
    zhName: "派系系统",
    description: "是否允许玩家创建派系。",
  },
  FactionDaySurvivedToCreate: {
    zhName: "创建派系生存天数",
    description: "创建派系前需存活的游戏天数。",
  },
  FactionPlayersRequiredForTag: {
    zhName: "派系标签所需人数",
    description: "可创建派系标签前的最小成员数。",
  },
  DisableRadioStaff: {
    zhName: "禁用管理无线电",
    description: "是否禁用有权限玩家的无线电传输。",
  },
  DisableRadioAdmin: {
    zhName: "禁用Admin无线电",
    description: "是否禁用 admin 的无线电传输。",
  },
  DisableRadioGM: {
    zhName: "禁用GM无线电",
    description: "是否禁用 gm 的无线电传输。",
  },
  DisableRadioOverseer: {
    zhName: "禁用Overseer无线电",
    description: "是否禁用 overseer 的无线电传输。",
  },
  DisableRadioModerator: {
    zhName: "禁用Moderator无线电",
    description: "是否禁用 moderator 的无线电传输。",
  },
  DisableRadioInvisible: {
    zhName: "禁用隐身玩家无线电",
    description: "是否禁用隐身玩家的无线电传输。",
  },
  ClientCommandFilter: {
    zhName: "客户端命令日志过滤",
    description: "以分号分隔的命令过滤规则，控制 cmd.txt 写入。",
  },
  ClientActionLogs: {
    zhName: "客户端动作日志白名单",
    description: "写入 ClientActionLogs.txt 的动作列表。",
  },
  PerkLogs: {
    zhName: "技能日志",
    description: "是否记录玩家技能等级变化。",
  },
  ItemNumbersLimitPerContainer: {
    zhName: "容器物品数量上限",
    description: "单个容器可存放物品数量上限（0 为不限）。",
  },
  BloodSplatLifespanDays: {
    zhName: "血迹保留天数",
    description: "旧血迹在地图区块加载后被清理前的天数。",
  },
  AllowNonAsciiUsername: {
    zhName: "允许非ASCII用户名",
    description: "是否允许用户名使用非 ASCII 字符。",
  },
  BanKickGlobalSound: {
    zhName: "全局封禁踢出音效",
    description: "封禁/踢出时是否播放全局提示音效。",
  },
  RemovePlayerCorpsesOnCorpseRemoval: {
    zhName: "清理尸体时移除玩家尸体",
    description: "触发尸体清理时是否同时移除玩家尸体。",
  },
  TrashDeleteAll: {
    zhName: "垃圾桶一键删除",
    description: "是否允许玩家使用垃圾桶“全部删除”。",
  },
  PVPMeleeWhileHitReaction: {
    zhName: "受击可继续近战",
    description: "玩家被击中后是否仍可继续近战攻击。",
  },
  MouseOverToSeeDisplayName: {
    zhName: "鼠标悬停显示名",
    description: "是否必须鼠标悬停才显示玩家名。",
  },
  HidePlayersBehindYou: {
    zhName: "隐藏身后玩家",
    description: "是否自动隐藏视野外（身后）玩家。",
  },
  PVPMeleeDamageModifier: {
    zhName: "PVP近战伤害倍率",
    description: "PVP 近战攻击伤害倍率。",
  },
  PVPFirearmDamageModifier: {
    zhName: "PVP枪械伤害倍率",
    description: "PVP 远程枪械伤害倍率。",
  },
  CarEngineAttractionModifier: {
    zhName: "车辆引怪范围倍率",
    description: "调整车辆吸引僵尸的范围倍率。",
  },
  PlayerBumpPlayer: {
    zhName: "玩家碰撞击倒",
    description: "奔跑穿过其他玩家时是否发生碰撞/击倒。",
  },
  MapRemotePlayerVisibility: {
    zhName: "地图远端玩家可见性",
    description: "地图上远端玩家显示规则（1隐藏/2好友/3全部）。",
  },
  BackupsCount: {
    zhName: "备份数量",
    description: "自动备份保留数量上限。",
  },
  BackupsOnStart: {
    zhName: "启动时备份",
    description: "服务器启动时是否进行备份。",
  },
  BackupsOnVersionChange: {
    zhName: "版本变化时备份",
    description: "版本变化时是否自动备份。",
  },
  BackupsPeriod: {
    zhName: "备份周期",
    description: "自动备份周期。",
  },
  DisableVehicleTowing: {
    zhName: "禁用车辆牵引",
    description: "是否禁用车辆牵引功能。",
  },
  DisableTrailerTowing: {
    zhName: "禁用拖车牵引",
    description: "是否禁用拖车牵引功能。",
  },
  DisableBurntTowing: {
    zhName: "禁用烧毁车辆牵引",
    description: "是否禁用烧毁车辆的牵引。",
  },
  BadWordListFile: {
    zhName: "敏感词文件",
    description: "敏感词列表文件路径（每行一个词）。",
  },
  GoodWordListFile: {
    zhName: "例外词文件",
    description: "白名单词列表文件路径（每行一个词）。",
  },
  BadWordPolicy: {
    zhName: "敏感词处罚策略",
    description: "聊天命中敏感词时的处理策略（封禁/踢出/记录/禁言）。",
  },
  BadWordReplacement: {
    zhName: "敏感词替换文本",
    description: "敏感词被替换成的符号或文本。",
  },
  AntiCheatSafety: {
    zhName: "反作弊-安全系统",
    description: "安全系统相关反作弊等级。",
  },
  AntiCheatMovement: {
    zhName: "反作弊-移动",
    description: "移动相关反作弊等级。",
  },
  AntiCheatHit: {
    zhName: "反作弊-命中",
    description: "命中判定相关反作弊等级。",
  },
  AntiCheatPacket: {
    zhName: "反作弊-数据包",
    description: "网络数据包检查反作弊等级。",
  },
  AntiCheatPermission: {
    zhName: "反作弊-权限",
    description: "权限相关反作弊等级。",
  },
  AntiCheatXP: {
    zhName: "反作弊-经验",
    description: "经验值相关反作弊等级。",
  },
  AntiCheatFire: {
    zhName: "反作弊-火焰",
    description: "火焰相关反作弊等级。",
  },
  AntiCheatSafeHouse: {
    zhName: "反作弊-安全屋",
    description: "安全屋相关反作弊等级。",
  },
  AntiCheatRecipe: {
    zhName: "反作弊-配方",
    description: "配方相关反作弊等级。",
  },
  AntiCheatPlayer: {
    zhName: "反作弊-玩家",
    description: "玩家行为通用反作弊等级。",
  },
  AntiCheatChecksum: {
    zhName: "反作弊-校验和",
    description: "文件校验和相关反作弊等级。",
  },
  AntiCheatItem: {
    zhName: "反作弊-物品",
    description: "物品相关反作弊等级。",
  },
  AntiCheatServerCustomization: {
    zhName: "反作弊-服务器自定义",
    description: "服务器自定义内容相关反作弊等级。",
  },
  MultiplayerStatisticsPeriod: {
    zhName: "多人统计周期",
    description: "多人统计更新周期（秒，0 为禁用统计）。",
  },
  DisableScoreboard: {
    zhName: "禁用记分板",
    description: "是否禁用记分板显示。",
  },
  HideAdminsInPlayerList: {
    zhName: "玩家列表隐藏管理员",
    description: "是否在玩家列表中隐藏管理员。",
  },
  Seed: {
    zhName: "世界种子",
    description: "世界生成种子字符串。",
  },
  UsePhysicsHitReaction: {
    zhName: "物理受击反馈",
    description: "是否启用物理受击反馈。",
  },
  ChatMessageCharacterLimit: {
    zhName: "聊天消息长度上限",
    description: "单条聊天消息允许的最大字符数。",
  },
  ChatMessageSlowModeTime: {
    zhName: "聊天慢速模式间隔",
    description: "聊天慢速模式下每条消息间隔（秒）。",
  },
};

export function getPzKeyZhInfo(key: string): PzKeyZhInfo | null {
  return PZ_KEYS_ZH_CN[key] ?? null;
}
