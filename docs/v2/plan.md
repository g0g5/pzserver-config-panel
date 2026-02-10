# PZ Server Config Panel V2 实现计划（从 V1 到 V2）

本文是一份可执行的迁移计划：以当前代码库状态（V1：仅 ini 配置文件读写 + 单页编辑）为起点，逐步实现 `docs/v2/spec.md` 的 V2 目标（ini + SandboxVars.lua + spawnregions.lua + 侧边栏四面板 + 一键全局保存）。

## 0. 基线盘点（V1 -> V2 差异清单）

### 0.1 当前 V1 已具备能力（代码现状）

- 启动参数：`node dist/server.js --config <path> [--port <number>]`（`src/server.ts`）
- API：
  - `GET /api/health`
  - `GET /api/config` / `PUT /api/config`（`src/routes/config.ts`）
- ini 读写链路：编码/换行探测与保持、锁、备份、`Mods`/`WorkshopItems` 规范化、按 key 排序（`src/config/*` + tests）
- 前端：单页三块区域（普通项 + Mods + WorkshopItems），保存调用 `PUT /api/config`（`public/*`）

### 0.2 V2 需要新增/改造的能力（来自 `docs/v2/spec.md`）

- 启动参数改造：必填 `--ini --sandbox --spawnregions`，可选 `--port`
- API 改造/新增：`/api/ini`、`/api/sandbox`、`/api/spawnregions`、`/api/saveAll`
- Lua 文件处理：
  - `SandboxVars.lua`：解析为“点路径 key 列表”，typed value；保存输出为规范化 Lua；`VERSION` 只读
  - `spawnregions.lua`：解析/保存 `SpawnRegions()` 返回数组（name/file），保持顺序
- 三类文件统一：lock/backup/encoding+newline 保持
- 前端重构：左侧边栏 + 4 面板；保存按钮调用 `PUT /api/saveAll`；失败提示必须标明 target（ini/sandbox/spawnregions）

完成标准：差异清单被覆盖到下面每个步骤的“完成标准/验收点”。

---

## 1. V2 类型与错误模型（先定接口，再改实现）

### 1.1 新增 V2 DTO 与领域类型

实现内容：

- 新建/调整类型文件（建议）：
  - `src/types/ini.ts`：`IniItem`、`GetIniResponseDto`、`PutIniRequestDto`、`PutIniResponseDto`
  - `src/types/sandbox.ts`：`SandboxItem`（含 `valueType/value`）、`GetSandboxResponseDto`、`PutSandboxRequestDto`
  - `src/types/spawnregions.ts`：`SpawnRegion`、`GetSpawnregionsResponseDto`、`PutSpawnregionsRequestDto`
  - `src/types/save-all.ts`：`PutSaveAllRequestDto`、`PutSaveAllResponseDto`
- 统一复用 `ConfigMeta`（encoding/newline）为通用 `FileMeta`

完成标准：

- TS 编译通过
- DTO 字段与 `docs/v2/spec.md` 对齐（字段名：`iniPath/sandboxPath/spawnregionsPath` 等）

### 1.2 扩展错误结构以支持 saveAll target

实现内容：

- 扩展 `src/errors/app-error.ts`：
  - `ErrorResponse.error.target?: "ini" | "sandbox" | "spawnregions"`（至少用于 `PUT /api/saveAll`）
  - `AppError` 支持可选 `target`
- 统一错误返回：优先走 `src/middleware/error-handler.ts`（避免路由内重复 try/catch）

完成标准：

- 任一端点在失败时返回 JSON：`{ error: { code, message, target? } }`
- `PUT /api/saveAll` 的错误必须带 `target`

---

## 2. 启动参数（V2 三路径必填）

实现内容：

- 修改 `src/server.ts`：
  - 新启动命令：`node dist/server.js --ini <path> --sandbox <path> --spawnregions <path> [--port <number>]`
  - 缺任一必填参数：输出 usage + 退出（非 0）
  - 保持仅监听 `127.0.0.1`
- （可选迁移期）临时兼容：若传入 `--config`，映射到 `--ini` 并输出 deprecate 提示；V2 完成后再移除

完成标准：

- 仅用 V2 参数可启动并能加载页面
- 缺参时行为符合 spec（报错并退出）

---

## 3. INI：从 `/api/config` 迁移到 `/api/ini`

### 3.1 后端路由与服务重命名/兼容

实现内容：

- 新增路由：`src/routes/ini.ts`
  - `GET /api/ini`：原 `readConfig` 逻辑，字段名替换为 `iniPath`
  - `PUT /api/ini`：原 `saveConfig` 逻辑（排序、规范化、备份、锁、保持 encoding/newline）
- 迁移服务层：`src/config/service.ts` 拆为 `src/ini/service.ts`（或保留文件名但导出新函数名）
- （可选迁移期）保留 `/api/config` 作为 alias 到 `/api/ini`，直到前端切换完成

完成标准：

- `GET /api/ini` 响应字段符合 V2 spec（含 meta）
- `PUT /api/ini` 保存规则与 V1 一致
- 现有 V1 测试迁移后仍通过（或新增同等覆盖的 V2 测试）

---

## 4. 通用文件能力抽象（编码/换行/锁/备份复用到 3 类文件）

实现内容：

- 复用/增强现有模块：
  - `src/config/encoding.ts`：继续作为通用 `readTextWithMeta(path)` / `writeTextWithMeta(path, text, meta)`
  - `src/config/lock.ts`：支持任意路径 `<path>.lock`
  - `src/config/backup.ts`：支持任意路径 `<path>.bak`
- 清理 V1 重复逻辑：`src/config/service.ts` 当前有“手写备份”与 `createBackup` 并存，V2 迁移时统一为 `createBackup()`

完成标准：

- 三类文件（ini/sandbox/spawnregions）全部走相同的 lock/backup/meta 保持能力
- 单元测试覆盖：至少验证 lock/backup 对任意扩展名路径同样工作

---

## 5. SandboxVars.lua：解析、展平、保存（规范化 Lua 输出）

### 5.1 解析器（Lua 子集）

实现内容：

- 新增 sandbox 模块（建议目录）：`src/sandbox/*`
- 实现读取：
  - 从 `SandboxVars.lua` 解析出 `SandboxVars = { ... }` 的 table
  - 支持：
    - key-value：`Key = 1` / `Key = true` / `Key = "text"`
    - 嵌套 table：`Map = { AllowWorldMap = true }`
    - 数组/列表（如果出现）至少能读取，不阻断整体（可降级为 unknown 或 string 序列化）
- 将嵌套结构展平成点路径 items：
  - `Map.AllowWorldMap`、`ZombieLore.Speed`
  - 顶层非 table 值：key 不含点
- 生成 `group`：点路径第一段作为一级分组；无点则 `"(root)"`

建议实现路线（稳定优先）：

1) 先做一个“可覆盖 PZ 常见格式”的 Lua tokenizer + table parser（只支持该项目需要的语法子集）
2) 为 parser 加强健壮性：忽略注释、容忍尾逗号、容忍多余空白
3) 若自研 parser 成本过高，再评估引入第三方 Lua parser（作为计划 B）

完成标准：

- `GET /api/sandbox` 能返回扁平 items 且 key 规则正确
- meta（encoding/newline）能探测并返回

### 5.2 静态中文元数据与枚举

实现内容：

- 新增 `src/rules/sandboxvars.zh-CN.ts`：`key -> { zhName, description, enumOptions? }`
- 新增生成脚本（建议，可选）：
  - 输入：`test_configs/servertest_SandboxVars.lua`
  - 输出：静态 TS 表（机器翻译 + 从注释 `-- 1 = ...` 形态提取枚举）
- 运行时不解析注释：后端与前端只查静态表

完成标准：

- 已知 key：`GET /api/sandbox` 返回 `zhName/description/enumOptions/isKnown=true`
- 未知 key：`zhName/description/enumOptions=null` 且 `isKnown=false`

### 5.3 保存（PUT /api/sandbox）

实现内容：

- 新增 `PUT /api/sandbox`：
  - 校验请求体：`items[]`、每项 `key/valueType/value`
  - 拒绝修改 `VERSION`（400，message 明确“只读”）
  - 将 items 写回嵌套结构（按点路径 set）
  - 规范化序列化输出：固定 `SandboxVars = { ... }`、稳定缩进、稳定 key 顺序（建议字母序）
- 保存时：lock + backup + meta 保持

完成标准：

- `VERSION` 修改会被拒绝
- 保存后的 `SandboxVars.lua` 为规范化输出（不要求保留注释/原排版）
- 允许 unknown key 读/写且能保存

---

## 6. spawnregions.lua：读取 SpawnRegions() 与保存规范化输出

### 6.1 解析

实现内容：

- 新增 spawnregions 模块（建议目录）：`src/spawnregions/*`
- 实现 `GET /api/spawnregions`：
  - 解析 `spawnregions.lua`，提取 `SpawnRegions()` 返回的 array
  - 每个元素提取 `{ name: string, file: string }`
  - 保持原顺序

完成标准：

- 正常返回 `regions[]`，顺序与文件一致
- meta（encoding/newline）能探测并返回

### 6.2 保存

实现内容：

- 实现 `PUT /api/spawnregions`：
  - 校验 `regions[]`，每项 name/file 必须是非空字符串
  - 规范化输出（允许重写整个文件）：稳定缩进、稳定格式（建议固定模板）
- 保存时：lock + backup + meta 保持

完成标准：

- 增删改/排序后保存可持久化
- 输出保持顺序与请求体一致

---

## 7. 全局保存 `PUT /api/saveAll`（三文件尽量原子）

实现内容：

- 新增 `PUT /api/saveAll`：一次请求同时保存 ini + sandbox + spawnregions
- 原子性实现策略（尽量不出现“用户不可感知的部分成功”）：
  1) 校验请求体（分三块）
  2) 依固定顺序获取三把锁：ini -> sandbox -> spawnregions（避免死锁）
  3) 读取三份原始内容与 meta（或至少读取 meta；建议同时缓存原始 bytes 以便回滚）
  4) 先创建三份备份（3 个 `.bak` 都成功才进入写入阶段）
  5) 分别生成三份“将要写入的文本”
  6) 写入阶段：优先写入临时文件并 rename 替换（每个文件内部尽量原子）
  7) 任一失败：
     - 返回错误结构必须包含 `target`
     - 尽力回滚（用内存原始 bytes 或 `.bak` 写回）
  8) finally：释放三把锁

完成标准：

- 成功：三个文件都更新
- 失败：响应包含 `error.target` 且最终磁盘内容不出现“只更新了一部分但返回失败”的不可控状态（至少通过回滚/原子替换将概率降到可接受）

---

## 8. 前端重构：左侧边栏 + 4 面板 + saveAll

### 8.1 页面结构与导航

实现内容：

- 改造 `public/index.html`：
  - 顶部保留：路径/连接状态/保存按钮
  - 主体改为：左侧侧边栏 4 个按钮 + 右侧内容区（4 面板）
- 改造 `public/style.css`：
  - 侧边栏与面板布局（桌面/移动端都可用）
  - 折叠分组样式（用于 sandbox）

完成标准：

- 四面板可切换，移动端不溢出

### 8.2 数据加载与状态模型

实现内容：

- 改造 `public/app.js`：
  - 页面初始化并行加载：`GET /api/ini` + `GET /api/sandbox` + `GET /api/spawnregions`
  - 前端维护三份编辑态：iniItems、sandboxItems、spawnRegions
  - 顶部路径显示：建议显示 3 个路径（或主路径 + 展开显示）

完成标准：

- 任一接口失败：连接状态与提示明确
- 成功加载：四面板都有内容

### 8.3 四面板实现细则

实现内容：

- 面板 1：普通配置项（ini 中除 `Mods`、`WorkshopItems` 以外）
  - 继续沿用 V1 文案规则：已知 key 显示 `中文名 (key)`
- 面板 2：模组和创意工坊内容
  - 复用 V1 list editor（增删改、排序），仅编辑 `Mods` 与 `WorkshopItems`
- 面板 3：沙盒选项
  - 按 `group` 折叠
  - 控件：boolean（checkbox）、number（number input）、string（text input）
  - 枚举：下拉（`enumOptions`）
  - `VERSION`：只读（disabled + 明确标识）
- 面板 4：出生点
  - 列表编辑：`name/file` 两列
  - 支持：新增、删除、上移、下移（或拖拽排序，二选一）

完成标准：

- 普通配置项不混入 `Mods`、`WorkshopItems`
- sandbox 的点路径 key 与折叠分组可用
- spawnregions 可编辑并保持顺序

### 8.4 保存交互（只走 saveAll）

实现内容：

- 点击“保存”调用 `PUT /api/saveAll`
- 错误提示必须包含 target：
  - `ini` / `sandbox` / `spawnregions`
- 保存中禁用按钮，防止重复提交

完成标准：

- 保存成功后重新加载三份数据并刷新 UI
- 保存失败时用户能明确知道失败文件类型

---

## 9. 测试与夹具（V2 新增覆盖）

实现内容：

- 新增 fixtures（建议目录）：`test-fixtures/v2/*` 或 `test_configs/*`
  - `SandboxVars.lua` 样本：含嵌套、bool/number/string、枚举值、注释、尾逗号
  - `spawnregions.lua` 样本：多个 region、含逗号/空格的 name/file
  - 编码/换行覆盖：至少覆盖 LF 与 CRLF（BOM 可选）
- 新增单元测试：
  - sandbox parser/flatten/serializer
  - spawnregions parser/serializer
- 新增服务测试：
  - `saveAll`：三锁顺序、三备份先于写入、失败时返回 target、失败时回滚（可用“故意让第二个写入失败”的方式验证）

完成标准：

- `npm test` 全绿
- 新增测试覆盖 V2 spec 的关键验收点（第 7 节）

---

## 10. 文档与回归验收

实现内容：

- 更新 `README.md`：V2 启动命令、三路径参数说明、saveAll 行为说明
- 保留 `docs/v1/*`，新增/更新 `docs/v2/*`：
  - 确保 `docs/v2/spec.md` 与实现一致
  - 本计划 `docs/v2/plan.md` 标注完成情况（可选）
- 回归手测（最短路径）：启动 -> 四面板切换 -> 修改各面板 -> 保存 -> 复读校验

完成标准（对齐 `docs/v2/spec.md` 验收标准）：

- 启动必须提供三个路径参数且能加载页面
- 侧边栏四面板切换正常；普通配置项不混入 `Mods`、`WorkshopItems`
- SandboxVars：点路径 key 正确；分组折叠可用；类型控件正确；枚举下拉可用；`VERSION` 只读；保存输出为规范化 Lua
- spawnregions：能读取/编辑/保存 `name/file` 列表并保持顺序
- 全局保存：失败时明确指出失败文件类型；不出现用户不可感知的部分成功

---

## 附：建议执行顺序（最小返工路径）

1) 先做后端接口与类型（步骤 1~4）
2) 再做 sandbox 与 spawnregions 的 parser/serializer + API（步骤 5~6）
3) 再做 saveAll 原子保存（步骤 7）
4) 最后做前端四面板重构与联调（步骤 8）
5) 补齐测试与文档回归（步骤 9~10）
