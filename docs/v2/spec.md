# Project Zomboid 服务器配置与控制面板（V2）SPEC

## 1. 背景与目标

V1/V1.5 已具备单实例配置编辑能力。V2 目标是在此基础上补齐“多实例运行控制”能力，让面板不仅能改配置，还能管理服务器运行态。

V2 重点目标：

- 支持多服务器实例管理（按多 `ini` 配置文件组织）。
- 支持实例启动/停止。
- 提供实例终端：实时输出、命令发送、内置命令补全。

关键澄清：

- 本 SPEC 的“多实例管理”指“可维护多个实例配置项”。
- 运行态为单活：同一时刻仅允许 1 个实例被启动并由面板管理。

## 2. 范围（V2）

### 2.1 包含

- 服务器实例清单管理（手动维护）。
- 多实例状态展示。
- 启动/停止控制。
- 终端输出实时展示（stdout/stderr）。
- 网页文本框命令发送（支持多行，按行顺序发送）。
- 内置命令补全（静态词库）。

### 2.2 不包含

- 权限系统/多用户鉴权。
- 跨主机集群管理。
- 自动发现 `ini`（本版不扫目录）。
- 运行中自动接管非本进程拉起的历史实例。
- 自动读取游戏内命令做动态补全。
- 同时启动和管理多个运行中的服务器实例。

## 3. 已确认产品决策

- 实例来源：手动维护列表，不自动扫描目录。
- 启动命令：每实例单独配置命令。
- 停止策略：优雅停机 + 超时兜底（SIGTERM/SIGKILL）。
- 运行接管：面板仅管理“本次面板进程启动后”拉起的子进程。
- 终端发命令：文本框支持多行，提交后按行顺序发送。
- 命令补全：内置静态词库。
- `Workshop` 路径：全局共享配置。
- 单活运行：每次仅运行和管理 1 个 `ini` 对应实例。

## 4. 术语与对象

- `ServerInstance`：一个可独立启停的 PZ 服务器实例。
- `iniPath`：实例对应的配置文件绝对路径。
- `startCommand`：该实例启动命令（字符串）。
- `stopCommands`：优雅停机时发送到控制台的命令列表（默认 `save`、`quit`）。
- `RuntimeProcess`：由面板当前进程托管的子进程运行态（内存态，不持久化）。
- `ActiveInstance`：当前唯一允许处于运行控制态的实例。

## 5. 配置模型与持久化

### 5.1 配置文件

建议新增（或替代）服务端配置文件：`./servers-config.json`。

示例结构：

```json
{
  "workshopPath": "/home/steam/Steam/steamapps/workshop/content/108600",
  "stopGraceTimeoutMs": 45000,
  "forceKillTimeoutMs": 10000,
  "servers": [
    {
      "id": "servertest",
      "name": "主服",
      "iniPath": "/home/steam/Zomboid/Server/servertest.ini",
      "startCommand": "/home/steam/pz/start-servertest.sh",
      "stopCommands": ["save", "quit"]
    }
  ]
}
```

### 5.2 约束

- `id` 全局唯一，建议使用稳定 slug。
- `iniPath` 必须为绝对路径，且后缀为 `.ini`。
- `startCommand` 不允许为空。
- `workshopPath` 为全局共享字段。
- 配置写入前应做基础校验，失败返回 `400`。

## 6. 功能详细设计

### 6.1 实例管理

能力：

- 新增实例。
- 编辑实例（名称、ini 路径、启动命令、停机命令）。
- 删除实例（仅允许在 stopped 状态删除）。
- 查看实例状态与基础信息。

状态定义：

- `stopped`：未运行。
- `starting`：启动中。
- `running`：运行中。
- `stopping`：停止中。
- `error`：最近一次启停失败。
- `unknown`：面板重启后无法接管旧进程时的状态（仅展示，不视为可控运行态）。

### 6.2 服务器启动

流程：

1. 校验实例存在且当前不在 `running/starting`。
2. 校验不存在其他实例处于 `starting/running/stopping`（单活约束）。
3. 以子进程方式执行该实例 `startCommand`。
4. 记录 `pid`、启动时间、日志缓冲。
5. 状态从 `starting` 转为 `running`（以进程存活判定）。
6. 若 spawn 失败或立即退出，标记 `error` 并返回错误。

约束：

- 同一实例不允许并发启动。
- 全局不允许多实例同时运行（单活）。
- 面板只保证控制自己启动的子进程。

### 6.3 服务器停止

流程：

1. 若实例非 `running`，返回 `409`（不可停机状态）。
2. 向 stdin 顺序写入 `stopCommands`（默认 `save` -> `quit`）。
3. 等待 `stopGraceTimeoutMs`。
4. 超时未退出则发送 `SIGTERM`，再等 `forceKillTimeoutMs`。
5. 仍未退出则发送 `SIGKILL`。
6. 最终状态置为 `stopped` 或 `error`。

### 6.4 终端输出

能力：

- 实时展示 stdout/stderr。
- 每条输出至少含：时间戳、流类型、文本内容。
- 前端断线后可重连并继续接收后续日志。

建议：

- 每实例维护内存环形缓冲（如最近 2000 行）供终端初始回放。
- 进程退出后保留最近日志，便于排障。

### 6.5 终端命令发送

交互规则：

- 文本框允许粘贴多行。
- 点击发送后按行拆分，去除纯空行。
- 按原顺序逐行写入 stdin（每行自动补 `\n`）。
- 批次发送结果需返回成功/失败与失败行信息。

限制：

- 仅 `running` 状态允许发命令。
- 实例无 stdin 通道时返回 `409`。

### 6.6 命令补全

实现范围：

- 内置静态命令词库（常用服务端控制命令）。
- 前缀匹配，支持命令描述展示。
- 不做运行时动态探测。

词条结构建议：

```json
{
  "command": "players",
  "description": "显示在线玩家",
  "usage": "players"
}
```

### 6.7 内置命令表（初版）

来源：PZwiki `Admin_commands`（https://pzwiki.net/wiki/Admin_commands，抓取时间 2026-02-18）。

说明：

- 该表作为前端命令补全的默认词库。
- 在游戏内聊天框使用时通常需加前缀 `/`；服务器控制台输入时不需要 `/`。
- 个别命令在不同版本可能存在名称/参数差异（如 `godmod/godmode`），以实际服务器版本为准。

| command | 中文说明 | 常用用法（示例） |
| --- | --- | --- |
| additem | 给玩家物品 | `additem "rj" Base.Axe 5` |
| adduser | 白名单服添加用户 | `adduser "username" "password"` |
| addvehicle | 生成载具 | `addvehicle "Base.VanAmbulance" "rj"` |
| addxp | 给玩家经验 | `addxp "rj" Woodwork=2` |
| alarm | 在当前位置触发建筑警报 | `alarm` |
| banid | 封禁 SteamID | `banid 7656xxxxxxxxxxxx` |
| banuser | 封禁用户（可附带 IP/原因） | `banuser "rj" -ip -r "reason"` |
| changeoption | 修改服务器选项 | `changeoption PVP "true"` |
| checkModsNeedUpdate | 检查 mod 是否更新 | `checkModsNeedUpdate` |
| chopper | 在随机玩家处触发直升机事件 | `chopper` |
| clear | 清空服务器控制台输出 | `clear` |
| createhorde | 在玩家附近刷尸群 | `createhorde 150 "rj"` |
| createhorde2 | 高级刷尸群（参数依版本） | `createhorde2 ...` |
| godmod | 无敌模式（部分版本写作 godmode） | `godmode "rj" -true` |
| gunshot | 在随机玩家处触发枪声事件 | `gunshot` |
| help | 查看命令帮助 | `help` / `help command` |
| invisible | 隐身（对僵尸不可见） | `invisible "rj" -true` |
| kick | 踢出用户（可附原因） | `kickuser "rj" -r "reason"` |
| lightning | 对目标触发闪电 | `lightning "rj"` |
| log | 设置日志级别 | `log "Network" "Debug"` |
| noclip | 穿墙开关 | `noclip "rj" -true` |
| players | 列出在线玩家 | `players` |
| quit | 保存并关闭服务器 | `quit` |
| releasesafehouse | 释放自己拥有的安全屋 | `releasesafehouse` |
| reloadlua | 重载 Lua 脚本 | `reloadlua "filename"` |
| reloadoptions | 重载 ServerOptions 并同步客户端 | `reloadoptions` |
| removeuserfromwhitelist | 从白名单移除用户 | `removeuserfromwhitelist "username"` |
| removezombies | 删除僵尸（参数依版本） | `removezombies ...` |
| replay | 录制/播放回放 | `replay "user1" -record file.bin` |
| save | 保存世界 | `save` |
| servermsg | 全服广播消息 | `servermsg "My Message"` |
| setaccesslevel | 设置玩家权限等级 | `setaccesslevel "rj" "moderator"` |
| showoptions | 显示当前服务器选项与值 | `showoptions` |
| startrain | 开始下雨 | `startrain 50` |
| startstorm | 开始风暴 | `startstorm 24` |
| stats | 输出/控制服务器统计 | `stats file 10` |
| stoprain | 停止下雨 | `stoprain` |
| stopweather | 停止天气效果 | `stopweather` |
| teleport | 玩家间传送/传到玩家 | `teleport "rj"` |
| teleportto | 传送到坐标 | `teleportto 10000,11000,0` |
| thunder | 对目标触发雷声 | `thunder "rj"` |
| unbanid | 解封 SteamID | `unbanid 7656xxxxxxxxxxxx` |
| unbanuser | 解封用户 | `unbanuser "username"` |
| voiceban | 禁用玩家语音 | `voiceban "rj" -true` |

词库落地要求：

- 后端提供静态词库 JSON（建议路径：`src/rules/admin-commands.zh-CN.ts`）。
- 每个词条至少包含：`command`、`description`、`usage`、`aliases?`。
- 前端补全按 `command` 与 `aliases` 做前缀匹配。

## 7. API 设计（V2 草案）

### 7.1 实例配置

- `GET /api/servers-config`
  - 返回全局配置 + 实例列表（不含敏感运行时句柄）。
- `PUT /api/servers-config`
  - 全量更新配置（含 `workshopPath` 与 `servers`）。

### 7.2 运行控制

- `GET /api/servers/runtime`
  - 返回每实例运行态：`status`、`pid`、`startedAt`、`lastExit`。
  - 建议额外返回 `activeServerId`（无则为 `null`）。
- `POST /api/servers/:id/start`
  - 启动指定实例。
- `POST /api/servers/:id/stop`
  - 停止指定实例。

### 7.3 终端

- `GET /api/servers/:id/terminal/stream`
  - 实时日志流（建议 WebSocket 或 SSE，二选一，落地时统一）。
- `POST /api/servers/:id/terminal/commands`
  - 请求体：`{ "text": "多行命令文本" }`。
  - 服务端按行拆分并顺序发送。

### 7.4 补全

- `GET /api/terminal/commands?prefix=<text>`
  - 返回匹配词条列表。

## 8. 前端交互规范

页面建议拆分为三块：

- 实例列表区：实例名、ini 路径、状态徽标、启动/停止按钮。
- 实例配置区：编辑当前实例配置（含启动命令、停机命令）。
- 终端区：日志输出窗口 + 多行命令输入 + 补全下拉。

交互要求：

- 按状态禁用非法操作按钮（如 stopped 时禁用“停止”）。
- 若已有实例运行，其他实例“启动”按钮统一禁用，并提示“当前为单实例运行模式”。
- 启停操作有进行中态与明确错误提示。
- 终端支持“自动滚动到底部”开关。
- 多行发送前在 UI 上保留原始输入，发送后清空（可配置）。

## 9. 错误处理

### 9.1 HTTP 状态语义

- `400 Bad Request`：配置结构非法、字段缺失、命令为空等。
- `404 Not Found`：实例不存在。
- `409 Conflict`：状态冲突（重复启动、停止未运行实例、终端不可写）。
- `500 Internal Server Error`：进程启动失败、I/O 异常、未知错误。

### 9.2 错误码建议

- `BAD_REQUEST`
- `NOT_FOUND`
- `SERVER_ALREADY_RUNNING`
- `SERVER_NOT_RUNNING`
- `ANOTHER_SERVER_RUNNING`
- `TERMINAL_NOT_WRITABLE`
- `PROCESS_SPAWN_FAILED`
- `STOP_TIMEOUT`
- `IO_ERROR`

返回结构保持现有规范：

```json
{
  "error": {
    "code": "SERVER_ALREADY_RUNNING",
    "message": "服务器已在运行中"
  }
}
```

## 10. 安全与运行边界

- 服务继续仅监听 `127.0.0.1`。
- 访问依赖 SSH Tunnel。
- 不引入账号体系；默认单运维用户场景。
- `startCommand` 属高风险输入，必须在文档中明确仅可信管理员可配置。

## 11. 迁移策略（V1.5 -> V2）

- 兼容读取旧 `paths-config.json`：
  - 若存在 `iniFilePath`，可自动生成一个默认实例。
  - `workshopPath` 迁移到新配置的同名字段。
- 首次迁移后写入 `servers-config.json`。
- V1 配置编辑 API (`/api/config`) 可继续保留，读取当前选中实例 `iniPath`。

## 12. 验收标准（V2）

- 可手动维护至少 3 个实例并持久化。
- 同一时刻仅允许 1 个实例处于运行态；当 A 运行时，启动 B 会返回冲突错误。
- 可在停止 A 后启动 B，并正常切换管理目标实例。
- 停机流程按“优雅停机 -> SIGTERM -> SIGKILL”执行并可观测。
- 终端可实时看到运行输出，并可发送多行命令且按行顺序执行。
- 命令输入支持前缀补全并展示基础说明。
- 面板重启后不会错误地把历史进程当作可控运行态。

## 13. 里程碑建议

- M1：配置模型升级（多实例配置、迁移逻辑、实例管理 API）。
- M2：实例启停与运行态管理。
- M3：终端流与多行命令发送。
- M4：命令补全、错误语义完善、端到端回归。
