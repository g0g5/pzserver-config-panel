# PZ Server Config Panel V2 SPEC

## 1. 目标与范围

- 前端重构为"左侧边栏 + 4 面板"。
- 新增并支持两类 Lua 配置文件：
  - 沙盒选项：SandboxVars.lua
  - 出生点：spawnregions.lua
- 全局保存：一次点击保存 ini + sandbox + spawnregions；失败时明确指出失败文件类型。

## 2. 启动参数

- 启动命令：
  - `node dist/server.js --ini <path> --sandbox <path> --spawnregions <path> [--port <number>]`
- 参数规则：
  - `--ini`：必填，服务器 ini 配置路径
  - `--sandbox`：必填，SandboxVars.lua 路径
  - `--spawnregions`：必填，spawnregions.lua 路径
  - `--port`：可选，默认 3000
- 缺参行为：任一必填参数缺失 -> 启动报错并退出。

## 3. API 设计

### 3.1 `GET /api/ini`

- 用途：读取 ini 配置。
- 响应建议字段：
  - `iniPath`: string
  - `items`: array
    - `key`: string
    - `value`: string
    - `zhName`: string | null
    - `description`: string | null
    - `isKnown`: boolean
  - `meta`:
    - `encoding`: `utf8` | `utf8-bom`
    - `newline`: `lf` | `crlf`

### 3.2 `PUT /api/ini`

- 用途：保存 ini。
- 请求体：

```json
{
  "items": [
    { "key": "PVP", "value": "true" }
  ]
}
```

- 保存规则：延续 V1（排序、`Mods`/`WorkshopItems` 规范化、备份、锁、保持 encoding/newline）。

### 3.3 `GET /api/sandbox`

- 用途：读取 SandboxVars.lua，并展开为点路径 key 列表。
- key 规则：
  - 嵌套表使用点路径，例如 `Map.AllowWorldMap`、`ZombieLore.Speed`。
- 响应建议字段：
  - `sandboxPath`: string
  - `items`: array
    - `key`: string
    - `valueType`: `boolean` | `number` | `string`
    - `value`: boolean | number | string
    - `zhName`: string | null
    - `description`: string | null
    - `enumOptions`: `{ value: number, label: string }[] | null
    - `isKnown`: boolean
    - `group`: string (一级分组，例如 `Map`、`ZombieLore`、`(root)`)
  - `meta`: `{ encoding, newline }`

### 3.4 `PUT /api/sandbox`

- 用途：保存 SandboxVars.lua（允许重写为规范化输出，不保留注释/原排版）。
- 请求体（typed value）：

```json
{
  "items": [
    { "key": "Zombies", "valueType": "number", "value": 6 },
    { "key": "Map.AllowWorldMap", "valueType": "boolean", "value": true }
  ]
}
```

- 规则：
  - `VERSION` 只读：服务端拒绝改动（建议返回 400，提示只读）。
  - 未在静态元数据表中的 key 仍允许读/写；展示时按 key 显示。
  - 保存输出为规范化 Lua：固定 `SandboxVars = { ... }`，使用稳定缩进与序列化规则。

### 3.5 `GET /api/spawnregions`

- 用途：读取 spawnregions.lua，提取 `SpawnRegions()` 返回数组。
- 响应建议字段：
  - `spawnregionsPath`: string
  - `regions`: `{ name: string, file: string }[]`
  - `meta`: `{ encoding, newline }`

### 3.6 `PUT /api/spawnregions`

- 用途：保存 spawnregions.lua（允许重写为规范化输出）。
- 请求体：

```json
{
  "regions": [
    {
      "name": "Muldraugh, KY",
      "file": "media/maps/Muldraugh, KY/spawnpoints.lua"
    }
  ]
}
```

### 3.7 `PUT /api/saveAll`

- 用途：一次性保存 ini + sandbox + spawnregions；尽量保证原子性。
- 请求体建议：

```json
{
  "ini": {
    "items": [
      { "key": "PVP", "value": "true" }
    ]
  },
  "sandbox": {
    "items": [
      { "key": "Map.AllowWorldMap", "valueType": "boolean", "value": true }
    ]
  },
  "spawnregions": {
    "regions": [
      { "name": "Riverside, KY", "file": "media/maps/Riverside, KY/spawnpoints.lua" }
    ]
  }
}
```

- 原子性建议约束：
  - 获取三把锁（固定顺序：ini -> sandbox -> spawnregions，避免死锁）。
  - 三份备份均创建成功后才进入写入阶段。
  - 任一写入失败：返回错误并尽可能保证三者最终内容不发生改变。
- 错误响应建议包含失败目标：

```json
{
  "error": {
    "code": "PARSE_ERROR",
    "message": "SandboxVars.lua parse failed",
    "target": "sandbox"
  }
}
```

## 4. 锁、备份、编码/换行

- ini、SandboxVars.lua、spawnregions.lua 三类文件均采用：
  - lock：`<path>.lock`（冲突返回 409）
  - backup：`<path>.bak`（覆盖最近 1 份）
  - encoding/newline：读取时探测并在保存时保持

## 5. SandboxVars 静态中文元数据与枚举

- 新增静态表（建议）：`src/rules/sandboxvars.zh-CN.ts`。
- 生成策略：
  - 基于 `test_configs/servertest_SandboxVars.lua` 的英文注释机器翻译生成"key-中文名-中文解释"，并从 `-- 1 = ...` 这类注释提取枚举列表。
  - 运行时不解析注释；后端与前端只依赖静态表。
- 展示规则：
  - 已知 key：显示 `中文名 (key)`
  - 未记录项：显示 `key`

## 6. 前端页面规范（侧边栏 + 4 面板）

- 左侧侧边栏 4 个按钮：
  1) 普通配置项
  2) 模组和创意工坊内容
  3) 沙盒选项
  4) 出生点
- 顶部区域保留：路径/连接状态/保存按钮。
- 面板边界：
  - 普通配置项：仅 ini 中除 `Mods`、`WorkshopItems` 以外的项
  - 模组和创意工坊内容：集中编辑 `Mods` 与 `WorkshopItems`
  - 沙盒选项：按一级分组折叠；bool/number/string 控件；枚举用下拉；`VERSION` 只读
  - 出生点：编辑 `SpawnRegions()` 返回列表（name/file），支持增删改、排序
- 保存交互：
  - 点击"保存"调用 `PUT /api/saveAll`
  - 失败提示必须标明 `target`（ini/sandbox/spawnregions）

## 7. 验收标准

- 启动必须提供三个路径参数且能加载页面。
- 侧边栏四面板切换正常；普通配置项不混入 `Mods`、`WorkshopItems`。
- SandboxVars：点路径 key 正确；分组折叠可用；类型控件正确；枚举下拉可用；`VERSION` 只读；保存输出为规范化 Lua。
- spawnregions：能读取/编辑/保存 `name/file` 列表并保持顺序。
- 全局保存：失败时明确指出失败文件类型；不出现用户不可感知的部分成功。
