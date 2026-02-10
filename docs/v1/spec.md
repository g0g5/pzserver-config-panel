# Project Zomboid 服务器配置远程管理面板（V1）SPEC

## 1. 背景与目标

本项目用于在游戏服务器上运行一个最简配置管理后端，并通过 SSH Tunnel 提供本地网页面板访问能力。

目标是对单个 Project Zomboid 服务器配置文件（如 `servertest.ini`）进行读取、编辑、保存。

## 2. 范围（V1）

### 2.1 包含

- 读取指定配置文件。
- 在网页中编辑配置项。
- 对 `Mods` 与 `WorkshopItems` 提供列表控件（增删改、排序）。
- 保存配置文件（含备份、锁、格式规范化）。
- 中英混合显示：`中文名 (key)`，value 保持英文文本输入。

### 2.2 不包含

- 服务器启动/停止/重启。
- 日志查看。
- 多配置文件管理。
- 用户鉴权与权限控制。
- 运行时解析注释作为配置元数据。

## 3. 技术与运行约束

- 后端：Node.js + TypeScript。
- 前端：纯 HTML/CSS/Vanilla JS（无框架）。
- 部署平台：Linux。
- 网络监听：仅 `127.0.0.1`。
- 访问方式：SSH Tunnel。
- 启动命令：`node dist/server.js --config <path> [--port <number>]`。

## 4. 配置文件处理规则

### 4.1 输入文件

- 通过启动参数 `--config` 指定单个 `.ini` 文件路径。
- 配置读写只关心 `key=value` 行。
- 注释行（`#` 开头）仅忽略，不参与业务逻辑。

### 4.2 解析规则

- 解析 `key=value` 为字符串键值对。
- 未识别格式行可忽略或记录为警告，不阻断整体读取。
- 未知 key 必须保留并可编辑。

### 4.3 展示规则

- 已知 key：显示 `中文名 (key)`。
- 未知 key：显示 `key`。
- 每个已知 key 显示中文解释。
- 规则来源为内置静态表（见本文件附录），不依赖注释读取。

### 4.4 保存规则

- 输出规范化内容：`key=value`。
- 按 key 名字母排序（A-Z）。
- `Mods` 与 `WorkshopItems`：
  - 使用分号 `;` 分隔。
  - 每项自动 `trim`。
  - 空项忽略。
- 不做 `Mods` 与 `WorkshopItems` 的数量/对应关系校验。

### 4.5 编码与换行

- 自动探测并保持原样：
  - UTF-8 BOM / UTF-8 无 BOM。
  - LF / CRLF。
- 若编码无法识别为可安全处理类型，返回错误并拒绝保存。

## 5. 备份与锁

### 5.1 备份

- 每次保存前生成（覆盖）备份文件：`<config>.bak`。
- 只保留最近 1 份备份。

### 5.2 锁机制

- 使用 lock 文件：`<config>.lock`。
- 写入前尝试创建 lock；若 lock 已存在，立即报错。
- 报错语义：`文件被占用`（HTTP 409）。
- 支持锁超时清理（处理进程异常退出导致的陈旧锁）。

## 6. API 设计（V1）

### 6.1 `GET /api/health`

- 用途：健康检查。
- 响应示例：

```json
{ "ok": true }
```

### 6.2 `GET /api/config`

- 用途：读取并返回当前配置。
- 响应字段建议：
  - `configPath`: string
  - `items`: array
    - `key`: string
    - `value`: string
    - `zhName`: string | null
    - `description`: string | null
    - `isKnown`: boolean
  - `meta`:
    - `encoding`: `utf8` | `utf8-bom`
    - `newline`: `lf` | `crlf`

### 6.3 `PUT /api/config`

- 用途：保存完整配置。
- 请求体建议：

```json
{
  "items": [
    { "key": "PVP", "value": "true" }
  ]
}
```

- 服务端流程：
  1. 参数校验。
  2. 获取 lock。
  3. 写入 `<config>.bak`。
  4. 规范化排序并写回原文件（保持编码/换行）。
  5. 释放 lock。

## 7. 错误处理

- `400 Bad Request`：请求结构错误、参数非法。
- `404 Not Found`：配置文件不存在。
- `409 Conflict`：lock 冲突（文件被占用）。
- `500 Internal Server Error`：读写失败、编码处理失败、系统异常。

返回建议包含：

```json
{
  "error": {
    "code": "FILE_LOCKED",
    "message": "文件被占用"
  }
}
```

## 8. 前端页面规范

### 8.1 页面结构

- 顶部：配置路径、连接状态、保存按钮。
- 中部：
  - 普通配置项列表（文本框）。
  - `Mods` 列表编辑区（新增/删除/上移/下移）。
  - `WorkshopItems` 列表编辑区（新增/删除/上移/下移）。
- 底部：操作结果提示（成功/失败）。

### 8.2 交互原则

- 保存失败时明确错误原因（尤其 lock 冲突）。
- unknown key 正常显示与保存。
- 不做自动类型推断（全部按字符串编辑）。

## 9. 建议目录结构

```text
src/
  server.ts
  routes/
    health.ts
    config.ts
  config/
    ini-parser.ts
    serializer.ts
    encoding.ts
    lock.ts
    backup.ts
  rules/
    pz-keys.zh-CN.ts
public/
  index.html
  app.js
  style.css
```

## 10. 里程碑

- M1：读取配置 + 页面展示 + known/unknown key 显示规则。
- M2：普通项编辑 + `Mods`/`WorkshopItems` 列表编辑。
- M3：保存链路（锁、备份、排序、编码/换行保持）。
- M4：错误处理与基础可用性打磨。

## 11. 验收标准（V1）

- 能通过 `--config` 指定文件并成功加载。
- 页面可编辑任意 key 的 value。
- `Mods`、`WorkshopItems` 支持列表增删改排序，保存后按分号规范输出。
- 保存后文件按 key 字母排序。
- 保存前正确覆盖写入 `<config>.bak`。
- lock 冲突时立即失败并返回“文件被占用”。
- 原文件 BOM 与换行风格在保存后保持一致。

## 12. 附录：基于 `servertest.ini` 的 `key-中文名-中文解释` 表

> 说明：该表作为内置静态映射。运行时不解析注释。

| key | 中文名 | 中文解释 |
| --- | --- | --- |
| PVP | 玩家互伤 | 是否允许玩家之间互相造成伤害和击杀。 |
| PVPLogToolChat | PVP聊天日志 | 是否将 PVP 事件写入管理员聊天频道。 |
| PVPLogToolFile | PVP文件日志 | 是否将 PVP 事件写入日志文件。 |
| PauseEmpty | 空服暂停时间 | 无玩家在线时是否暂停游戏时间流逝。 |
| GlobalChat | 全局聊天 | 是否启用全局聊天频道。 |
| ChatStreams | 聊天频道列表 | 可用聊天流列表，使用逗号分隔。 |
| Open | 开放加入 | 是否允许未在白名单中的玩家直接加入。 |
| ServerWelcomeMessage | 欢迎消息 | 玩家登录后显示的欢迎文本，支持颜色和换行标记。 |
| ServerImageLoginScreen | 登录页图片 | 登录界面图片资源路径或链接。 |
| ServerImageLoadingScreen | 加载页图片 | 加载界面图片资源路径或链接。 |
| ServerImageIcon | 服务器图标 | 服务器图标资源路径或链接。 |
| AutoCreateUserInWhiteList | 自动加白名单 | 开放服务器模式下，玩家首次加入时自动加入白名单。 |
| DisplayUserName | 显示用户名 | 是否在角色头顶显示用户名。 |
| ShowFirstAndLastName | 显示角色姓名 | 是否在角色头顶显示名字和姓氏。 |
| UsernameDisguises | 用户名伪装 | 是否启用伪装状态下的用户名显示逻辑。 |
| HideDisguisedUserName | 隐藏伪装名 | 是否隐藏伪装玩家的用户名。 |
| SwitchZombiesOwnershipEachUpdate | 僵尸所有权轮换 | 每次更新时是否切换僵尸归属以平衡负载。 |
| SpawnPoint | 固定出生点 | 强制新玩家出生在指定坐标（0,0,0 表示忽略）。 |
| SafetySystem | 安全系统 | 是否启用个人 PVP 安全开关机制。 |
| ShowSafety | 显示安全图标 | 是否显示玩家 PVP 状态的头顶图标。 |
| SafetyToggleTimer | 安全切换耗时 | 玩家切换 PVP 安全状态所需时间（秒）。 |
| SafetyCooldownTimer | 安全切换冷却 | 玩家再次切换 PVP 安全状态前的冷却时间（秒）。 |
| SafetyDisconnectDelay | 断线安全延迟 | 玩家断线后的安全延迟时间（秒）。 |
| SpawnItems | 出生物品 | 新玩家初始物品类型列表（逗号分隔）。 |
| DefaultPort | 默认端口 | 玩家数据主端口。 |
| UDPPort | UDP端口 | 服务器 UDP 通信端口。 |
| ResetID | 重置ID | 软重置标识，用于判定角色是否需重建。 |
| Mods | 模组加载ID列表 | 服务器启用的 Mod 加载 ID 列表（分号分隔）。 |
| Map | 地图列表 | 服务器使用的地图名称/顺序。 |
| DoLuaChecksum | Lua校验 | 文件不一致时是否踢出客户端。 |
| DenyLoginOnOverloadedServer | 过载拒绝登录 | 服务器过载时是否拒绝新玩家登录。 |
| Public | 公开显示 | 是否在游戏内服务器浏览器中公开显示。 |
| PublicName | 公共名称 | 对外显示的服务器名称。 |
| PublicDescription | 公共描述 | 对外显示的服务器描述文本。 |
| MaxPlayers | 最大玩家数 | 同时在线玩家上限（不含管理员）。 |
| PingLimit | 延迟上限 | 玩家被踢出的 Ping 阈值（毫秒，0 为禁用）。 |
| SafehousePreventsLootRespawn | 安全屋禁刷新战利品 | 安全屋内是否阻止物资刷新。 |
| DropOffWhiteListAfterDeath | 死亡移出白名单 | 玩家死亡后是否从白名单移除账号。 |
| NoFire | 禁用火焰 | 是否禁用火焰（通常不含营火）。 |
| AnnounceDeath | 死亡公告 | 玩家死亡时是否全局公告。 |
| SaveWorldEveryMinutes | 世界定时保存 | 按分钟周期自动保存已加载地图区块。 |
| PlayerSafehouse | 玩家可创建安全屋 | 是否允许普通玩家创建安全屋。 |
| AdminSafehouse | 仅管理员安全屋 | 是否只允许管理员创建安全屋。 |
| SafehouseAllowTrepass | 安全屋允许闯入 | 是否允许非成员进入安全屋。 |
| SafehouseAllowFire | 安全屋可被火烧 | 是否允许火焰破坏安全屋。 |
| SafehouseAllowLoot | 安全屋允许拾取 | 是否允许非成员拿取安全屋物品。 |
| SafehouseAllowRespawn | 安全屋重生 | 玩家死亡后是否可在所属安全屋重生。 |
| SafehouseDaySurvivedToClaim | 可认领安全屋生存天数 | 创建安全屋前需存活的游戏天数。 |
| SafeHouseRemovalTime | 安全屋移除时间 | 未访问安全屋达到该小时数后移出成员。 |
| SafehouseAllowNonResidential | 允许非住宅安全屋 | 是否允许认领非住宅建筑为安全屋。 |
| SafehouseDisableDisguises | 安全屋禁伪装 | 安全屋相关场景下是否禁用伪装。 |
| MaxSafezoneSize | 最大安全区大小 | 安全区可设置的最大尺寸。 |
| AllowDestructionBySledgehammer | 允许大锤破坏 | 是否允许玩家用大锤破坏世界物体。 |
| SledgehammerOnlyInSafehouse | 大锤仅限安全屋 | 是否仅允许在安全屋内使用大锤破坏。 |
| WarStartDelay | 战争开始延迟 | 战争模式开始前的等待时间（秒）。 |
| WarDuration | 战争持续时间 | 战争模式持续时间（秒）。 |
| WarSafehouseHitPoints | 安全屋战争耐久 | 战争模式下安全屋耐久上限。 |
| ServerPlayerID | 服务器玩家ID | 角色来源校验 ID，与 ResetID 联动。 |
| RCONPort | RCON端口 | 远程控制台端口。 |
| RCONPassword | RCON密码 | 远程控制台访问密码。 |
| DiscordEnable | Discord联动 | 是否启用与 Discord 频道的聊天联动。 |
| DiscordToken | Discord令牌 | Discord 机器人访问令牌。 |
| DiscordChannel | Discord频道名 | Discord 联动的频道名称。 |
| DiscordChannelID | Discord频道ID | Discord 联动的频道 ID。 |
| WebhookAddress | Webhook地址 | Slack 等服务的传入 Webhook URL。 |
| Password | 服务器密码 | 玩家加入服务器所需密码。 |
| MaxAccountsPerUser | 单Steam用户最大账号数 | 单个 Steam 用户可创建账号数量上限。 |
| AllowCoop | 允许合作/分屏 | 是否允许合作和分屏玩家。 |
| SleepAllowed | 允许睡眠 | 玩家疲劳时是否允许睡觉。 |
| SleepNeeded | 必须睡眠 | 玩家是否必须通过睡眠恢复。 |
| KnockedDownAllowed | 允许击倒 | 是否启用击倒机制（可能导致位置不同步）。 |
| SneakModeHideFromOtherPlayers | 潜行隐藏玩家 | 潜行时是否对其他玩家隐藏。 |
| UltraSpeedDoesnotAffectToAnimals | 加速不影响动物 | 超高速时间流逝是否不影响动物。 |
| WorkshopItems | 创意工坊ID列表 | 服务器需要下载的 Workshop 物品 ID（分号分隔）。 |
| SteamScoreboard | Steam记分板信息 | 玩家列表中是否显示 Steam 名称与头像。 |
| SteamVAC | Steam VAC | 是否启用 Steam VAC 反作弊。 |
| UPnP | 自动端口映射 | 是否尝试通过 UPnP 自动配置端口转发。 |
| VoiceEnable | 语音启用 | 是否启用 VOIP 语音。 |
| VoiceMinDistance | 语音最小距离 | VOIP 可听见的最小格子距离。 |
| VoiceMaxDistance | 语音最大距离 | VOIP 可听见的最大格子距离。 |
| Voice3D | 语音方向音效 | 是否启用 VOIP 方向性音频。 |
| SpeedLimit | 车速上限 | 车辆速度限制参数。 |
| LoginQueueEnabled | 登录排队 | 是否启用登录排队机制。 |
| LoginQueueConnectTimeout | 排队连接超时 | 登录队列连接超时时间（秒）。 |
| server_browser_announced_ip | 广播IP | 服务器对外广播到浏览器的 IP 地址。 |
| PlayerRespawnWithSelf | 原地重生 | 是否允许在死亡坐标重生。 |
| PlayerRespawnWithOther | 队友位置重生 | 是否允许在分屏/远程队友位置重生。 |
| FastForwardMultiplier | 睡眠快进倍率 | 玩家睡眠时的时间流逝倍数。 |
| DisableSafehouseWhenPlayerConnected | 在线时关闭安全屋保护 | 成员在线时安全屋是否按普通房屋处理。 |
| Faction | 派系系统 | 是否允许玩家创建派系。 |
| FactionDaySurvivedToCreate | 创建派系生存天数 | 创建派系前需存活的游戏天数。 |
| FactionPlayersRequiredForTag | 派系标签所需人数 | 可创建派系标签前的最小成员数。 |
| DisableRadioStaff | 禁用管理无线电 | 是否禁用有权限玩家的无线电传输。 |
| DisableRadioAdmin | 禁用Admin无线电 | 是否禁用 admin 的无线电传输。 |
| DisableRadioGM | 禁用GM无线电 | 是否禁用 gm 的无线电传输。 |
| DisableRadioOverseer | 禁用Overseer无线电 | 是否禁用 overseer 的无线电传输。 |
| DisableRadioModerator | 禁用Moderator无线电 | 是否禁用 moderator 的无线电传输。 |
| DisableRadioInvisible | 禁用隐身玩家无线电 | 是否禁用隐身玩家的无线电传输。 |
| ClientCommandFilter | 客户端命令日志过滤 | 以分号分隔的命令过滤规则，控制 cmd.txt 写入。 |
| ClientActionLogs | 客户端动作日志白名单 | 写入 ClientActionLogs.txt 的动作列表。 |
| PerkLogs | 技能日志 | 是否记录玩家技能等级变化。 |
| ItemNumbersLimitPerContainer | 容器物品数量上限 | 单个容器可存放物品数量上限（0 为不限）。 |
| BloodSplatLifespanDays | 血迹保留天数 | 旧血迹在地图区块加载后被清理前的天数。 |
| AllowNonAsciiUsername | 允许非ASCII用户名 | 是否允许用户名使用非 ASCII 字符。 |
| BanKickGlobalSound | 全局封禁踢出音效 | 封禁/踢出时是否播放全局提示音效。 |
| RemovePlayerCorpsesOnCorpseRemoval | 清理尸体时移除玩家尸体 | 触发尸体清理时是否同时移除玩家尸体。 |
| TrashDeleteAll | 垃圾桶一键删除 | 是否允许玩家使用垃圾桶“全部删除”。 |
| PVPMeleeWhileHitReaction | 受击可继续近战 | 玩家被击中后是否仍可继续近战攻击。 |
| MouseOverToSeeDisplayName | 鼠标悬停显示名 | 是否必须鼠标悬停才显示玩家名。 |
| HidePlayersBehindYou | 隐藏身后玩家 | 是否自动隐藏视野外（身后）玩家。 |
| PVPMeleeDamageModifier | PVP近战伤害倍率 | PVP 近战攻击伤害倍率。 |
| PVPFirearmDamageModifier | PVP枪械伤害倍率 | PVP 远程枪械伤害倍率。 |
| CarEngineAttractionModifier | 车辆引怪范围倍率 | 调整车辆吸引僵尸的范围倍率。 |
| PlayerBumpPlayer | 玩家碰撞击倒 | 奔跑穿过其他玩家时是否发生碰撞/击倒。 |
| MapRemotePlayerVisibility | 地图远端玩家可见性 | 地图上远端玩家显示规则（1隐藏/2好友/3全部）。 |
| BackupsCount | 备份数量 | 自动备份保留数量上限。 |
| BackupsOnStart | 启动时备份 | 服务器启动时是否进行备份。 |
| BackupsOnVersionChange | 版本变化时备份 | 版本变化时是否自动备份。 |
| BackupsPeriod | 备份周期 | 自动备份周期。 |
| DisableVehicleTowing | 禁用车辆牵引 | 是否禁用车辆牵引功能。 |
| DisableTrailerTowing | 禁用拖车牵引 | 是否禁用拖车牵引功能。 |
| DisableBurntTowing | 禁用烧毁车辆牵引 | 是否禁用烧毁车辆的牵引。 |
| BadWordListFile | 敏感词文件 | 敏感词列表文件路径（每行一个词）。 |
| GoodWordListFile | 例外词文件 | 白名单词列表文件路径（每行一个词）。 |
| BadWordPolicy | 敏感词处罚策略 | 聊天命中敏感词时的处理策略（封禁/踢出/记录/禁言）。 |
| BadWordReplacement | 敏感词替换文本 | 敏感词被替换成的符号或文本。 |
| AntiCheatSafety | 反作弊-安全系统 | 安全系统相关反作弊等级。 |
| AntiCheatMovement | 反作弊-移动 | 移动相关反作弊等级。 |
| AntiCheatHit | 反作弊-命中 | 命中判定相关反作弊等级。 |
| AntiCheatPacket | 反作弊-数据包 | 网络数据包检查反作弊等级。 |
| AntiCheatPermission | 反作弊-权限 | 权限相关反作弊等级。 |
| AntiCheatXP | 反作弊-经验 | 经验值相关反作弊等级。 |
| AntiCheatFire | 反作弊-火焰 | 火焰相关反作弊等级。 |
| AntiCheatSafeHouse | 反作弊-安全屋 | 安全屋相关反作弊等级。 |
| AntiCheatRecipe | 反作弊-配方 | 配方相关反作弊等级。 |
| AntiCheatPlayer | 反作弊-玩家 | 玩家行为通用反作弊等级。 |
| AntiCheatChecksum | 反作弊-校验和 | 文件校验和相关反作弊等级。 |
| AntiCheatItem | 反作弊-物品 | 物品相关反作弊等级。 |
| AntiCheatServerCustomization | 反作弊-服务器自定义 | 服务器自定义内容相关反作弊等级。 |
| MultiplayerStatisticsPeriod | 多人统计周期 | 多人统计更新周期（秒，0 为禁用统计）。 |
| DisableScoreboard | 禁用记分板 | 是否禁用记分板显示。 |
| HideAdminsInPlayerList | 玩家列表隐藏管理员 | 是否在玩家列表中隐藏管理员。 |
| Seed | 世界种子 | 世界生成种子字符串。 |
| UsePhysicsHitReaction | 物理受击反馈 | 是否启用物理受击反馈。 |
| ChatMessageCharacterLimit | 聊天消息长度上限 | 单条聊天消息允许的最大字符数。 |
| ChatMessageSlowModeTime | 聊天慢速模式间隔 | 聊天慢速模式下每条消息间隔（秒）。 |
