# pzserver-config-panel 开发计划（从空目录到 V1 可用）

## 0. 目标与边界冻结
1. 通读 `spec.md`，提取 V1 范围（只做单文件配置读写与网页编辑）。
2. 明确不做项：服务启停、日志、多配置、鉴权、注释元数据解析。
3. 输出一份“需求检查清单”，作为后续每步验收依据。

完成标准：被明确写出并锁定。

完成情况（2026-02-10）：
- 开发范围与验收项已被明确写出并锁定。

---

## 1. 初始化工程骨架
1. 创建目录：`src/`、`src/routes/`、`src/config/`、`src/rules/`、`public/`。
2. 初始化 Node.js 工程：`package.json`。
3. 安装依赖（建议）：
   - 运行时：`express`（或同级别轻量 HTTP 框架）。
   - 开发时：`typescript`、`@types/node`、`@types/express`、`tsx`（开发运行）、`eslint`（可选）。
4. 配置 `tsconfig.json`，编译输出到 `dist/`。
5. 增加脚本：`dev`、`build`、`start`。

完成标准：`npm run build` 可生成 `dist/` 基础产物。

完成情况（2026-02-10）：
- 已创建目录：`src/`、`src/routes/`、`src/config/`、`src/rules/`、`public/`。
- 已初始化 `package.json`，并配置脚本：`dev`、`build`、`start`。
- 已安装依赖：`express`、`typescript`、`@types/node`、`@types/express`、`tsx`。
- 已完成 `tsconfig.json` 配置，编译输出目录为 `dist/`。
- 已执行 `npm run build`，成功生成 `dist/server.js`（含 source map）。

---

## 2. 启动入口与参数解析
1. 实现 `src/server.ts`：读取命令行参数。
2. 必填参数：`--config <path>`；可选：`--port <number>`。
3. 默认监听地址固定为 `127.0.0.1`（不可暴露到外网）。
4. 参数非法时返回明确错误并退出。

完成标准：可通过 `node dist/server.js --config <path> [--port <number>]` 启动。

完成情况（2026-02-10）：
- 已实现 `src/server.ts` 启动参数解析：必填 `--config <path>`，可选 `--port <number>`（默认 `3000`）。
- 服务监听地址已固定为 `127.0.0.1`。
- 参数异常（缺失、未知参数、非法端口）会输出明确错误与用法并以非 0 退出。

---

## 3. 数据模型与错误模型
1. 定义核心类型：
   - `ConfigItem`（`key`、`value`）。
   - `ConfigMeta`（`encoding`、`newline`）。
   - API DTO（`GET /api/config` 与 `PUT /api/config` 请求/响应）。
2. 定义统一错误码：`BAD_REQUEST`、`NOT_FOUND`、`FILE_LOCKED`、`IO_ERROR`、`ENCODING_UNSUPPORTED`。
3. 建立 HTTP 错误映射：400/404/409/500。

完成标准：所有模块使用统一类型和错误结构。

完成情况（2026-02-10）：
- 已新增 `src/types/config.ts`，统一定义 `ConfigItem`、`ConfigMeta` 及 `GET /api/config`、`PUT /api/config` DTO。
- 已新增 `src/errors/app-error.ts`，统一定义错误码、`400/404/409/500` 状态映射、`AppError` 与标准错误响应结构。
- 已执行 `npm run build`，类型模型与错误模型可被正常编译。

---

## 4. 内置规则表（中文名与解释）
1. 新建 `src/rules/pz-keys.zh-CN.ts`。
2. 将 SPEC 附录中的 `key-中文名-中文解释` 转为静态映射表。
3. 提供查询函数：输入 `key`，返回 `zhName`、`description` 或 `null`。

完成标准：已知 key 可查到中文信息，未知 key 返回空。

完成情况（2026-02-10）：
- 已新增 `src/rules/pz-keys.zh-CN.ts`，内置完整 `key -> { zhName, description }` 静态映射。
- 已实现 `getPzKeyZhInfo(key)` 查询函数：已知 key 返回中文名与解释，未知 key 返回 `null`。

---

## 5. 编码与换行探测模块
1. 实现 `src/config/encoding.ts`：
   - 探测 UTF-8 BOM / UTF-8 无 BOM。
   - 探测换行风格 LF / CRLF。
2. 提供“读文件并返回文本 + meta”能力。
3. 提供“按原编码/换行写回”能力。
4. 对不可安全处理编码抛出可识别错误（后续映射 500）。

完成标准：读取后可准确得到 `meta.encoding` 与 `meta.newline`。

完成情况（2026-02-10）：
- 已新增 `src/config/encoding.ts`，支持读取配置文件时探测 `utf8/utf8-bom` 与 `lf/crlf`。
- 已实现 `readConfigText(filePath)`：返回文本内容与 `meta`（`encoding`、`newline`）。
- 已实现 `writeConfigText(filePath, text, meta)`：按原编码与换行风格写回文件。
- 对不可安全处理编码（如 UTF-16/UTF-32 BOM 或非法 UTF-8 字节）抛出 `ENCODING_UNSUPPORTED` 错误。

---

## 6. INI 解析模块
1. 实现 `src/config/ini-parser.ts`，只处理 `key=value` 行。
2. 忽略 `#` 注释行与空行。
3. 对不符合格式的行：忽略或记录警告，但不阻断整体读取。
4. 输出 `ConfigItem[]`（全部按字符串）。

完成标准：能从真实 `servertest.ini` 读出完整键值列表。

完成情况（2026-02-10）：
- 已实现 `src/config/ini-parser.ts`，支持解析 `key=value` 行。
- 已忽略 `#` 注释行与空行。
- 对不符合格式的行记录警告但不阻断整体读取。
- 输出 `ConfigItem[]` 数组。
- 已从真实 `servertest.ini` 成功解析出146个键值对。

---

## 7. 规范化序列化模块
1. 实现 `src/config/serializer.ts`。
2. 保存前按 key A-Z 排序。
3. 针对 `Mods`、`WorkshopItems`：
   - 以分号拼接。
   - 每项 `trim`。
   - 空项丢弃。
4. 生成标准行格式 `key=value`，并按原换行风格拼接文本。

完成标准：输出内容满足排序与字段规范。

完成情况（2026-02-10）：
- 已实现 `src/config/serializer.ts`，支持按 key A-Z 排序。
- 已针对 `Mods`、`WorkshopItems` 实现特殊处理：分号拼接、每项 trim、丢弃空项。
- 已按原换行风格生成 `key=value` 格式文本。
- 已编写 11 个测试用例并全部通过。

---

## 8. 锁机制实现
1. 实现 `src/config/lock.ts`，使用 `<config>.lock`。
2. 写入前尝试创建 lock；存在即报冲突。
3. 增加陈旧锁清理策略（基于修改时间超时）。
4. 保证异常时也能释放锁（`finally`）。

完成标准：并发保存时第二个请求稳定返回 409 与"文件被占用"。

完成情况（2026-02-10）：
- 已新增 `src/config/lock.ts`，使用 `<config>.lock` 作为锁文件。
- 写入前尝试创建锁，存在且未超时（1小时）时报 `FILE_LOCKED` 错误（状态码409）。
- 陈旧锁清理策略：超过1小时的锁自动释放。
- `withLock` 函数确保异常时也能释放锁（`finally`）。
- 已编写 7 个测试用例并全部通过。

---

## 9. 备份机制实现
1. 实现 `src/config/backup.ts`。
2. 每次保存前覆盖生成 `<config>.bak`。
3. 仅保留最近 1 份（覆盖写已天然满足）。

完成标准：每次成功进入保存流程都会刷新 `.bak`。

完成情况（2026-02-10）：
- 已新增 `src/config/backup.ts`，支持备份机制。
- 每次保存前覆盖生成 `<config>.bak`。
- 仅保留最近 1 份备份（覆盖写）。
- 已编写 6 个测试用例并全部通过。

---

## 10. 配置服务层（读）
1. 组合 encoding + parser + rules。
2. 实现读取服务：返回
   - `configPath`
   - `items`（含 `zhName`、`description`、`isKnown`）
   - `meta`（`encoding`、`newline`）
3. 文件不存在时抛出 404 对应错误。

完成标准：`GET /api/config` 所需数据一次性可得。

---

## 11. 配置服务层（写）
1. 实现保存服务，严格按顺序：
   1) 参数校验 → 2) 获取 lock → 3) 写 bak → 4) 规范化并写回 → 5) 释放 lock。
2. 校验 `PUT` 请求体结构：必须有 `items` 数组，每项包含字符串 `key`、`value`。
3. 写回使用原文件编码与换行风格。

完成标准：保存链路符合 SPEC 第 6.3 节流程。

完成情况（2026-02-10）：
- 已在 `src/config/service.ts` 实现 `saveConfig` 服务：参数校验 → 获取 lock → 写 bak → 规范化并写回 → 释放 lock。
- 已实现 `validatePutRequestDto` 校验 `PUT` 请求体结构（必须包含 `items` 数组，每项含字符串 `key`、`value`）。
- 已实现 `getOrCreateConfigMeta` 处理文件不存在时使用默认编码/换行。
- 已在 `src/server.ts` 添加 `PUT /api/config` 路由，统一错误处理返回正确的状态码（400/404/409/500）。
- 已编写 20 个测试用例并全部通过，覆盖参数校验、备份、锁机制、编码换行保持、并发冲突等场景。

---

## 12. API 路由实现
1. `src/routes/health.ts`：`GET /api/health` 返回 `{ "ok": true }`。
2. `src/routes/config.ts`：
   - `GET /api/config` 调用读取服务。
   - `PUT /api/config` 调用保存服务。
3. 统一错误处理中间件：返回规范错误 JSON：
   - `error.code`
   - `error.message`

完成标准：三条 API 均可访问且状态码语义正确。

完成情况（2026-02-10）：
- 已实现 `src/routes/health.ts`：`GET /api/health` 返回 `{ "ok": true }`。
- 已实现 `src/routes/config.ts`：`GET /api/config` 调用读取服务，`PUT /api/config` 调用保存服务。
- 已实现 `src/middleware/error-handler.ts`：统一错误处理中间件，返回规范错误 JSON（`error.code`、`error.message`）。
- 已更新 `src/server.ts` 使用模块化路由（`createHealthRouter`、`createConfigRouter`）。
- 编译通过，所有测试通过（44/44），API 端点可访问且状态码正确。

---

## 13. 静态前端页面骨架
1. 新建 `public/index.html`：顶部（路径/状态/保存按钮）、中部（普通项 + Mods + WorkshopItems）、底部提示。
2. 新建 `public/style.css`：可读、简洁、移动端适配。
3. 新建 `public/app.js`：初始化加载与事件绑定。

完成标准：页面可打开，结构满足 SPEC 8.1。

完成情况（2026-02-10）：
- 已新建 `public/index.html`：包含顶部（路径/状态/保存按钮）、中部（普通项 + Mods + WorkshopItems）、底部提示。
- 已新建 `public/style.css`：可读、简洁、移动端适配。
- 已新建 `public/app.js`：初始化加载与事件绑定。
- 已更新 `src/server.ts` 添加静态文件服务支持。

---

## 14. 前端数据加载与展示
1. 页面加载时请求 `GET /api/config`。
2. 普通项渲染为文本输入框。
3. 已知 key 显示 `中文名 (key)` + 中文解释。
4. 未知 key 仅显示 `key`，但同样可编辑。

完成标准：known/unknown 渲染规则与 SPEC 4.3 一致。

完成情况（2026-02-10）：
- 已在 `src/server.ts` 实现 `GET /api/config` 路由，调用 `readConfig` 服务。
- 页面加载时自动请求 `GET /api/config`。
- 普通项渲染为文本输入框。
- 已知 key 显示 `中文名 (key)` + 中文解释。
- 未知 key 仅显示 `key`，同样可编辑。
- 本地测试验证通过。

---

## 15. Mods/WorkshopItems 列表编辑器
1. 将 `Mods` 与 `WorkshopItems` 从普通项中拆出为专用列表区域。
2. 支持：新增、删除、上移、下移、行内编辑。
3. 保存时回写为分号分隔字符串。

完成标准：两类列表交互完整，排序结果可持久化。

完成情况（2026-02-10）：
- 已在 `public/index.html` 中为 `Mods` 与 `WorkshopItems` 创建独立的列表编辑区域。
- 已在 `public/app.js` 实现完整的列表编辑功能：新增、删除、上移、下移、行内编辑。
- 保存时正确回写为分号分隔字符串：`modsItems.filter((s) => s).join(";")` 和 `workshopItemsItems.filter((s) => s).join(";")`。
- 构建成功，功能已验证。

---

## 16. 保存交互与错误反馈
1. 点击保存触发 `PUT /api/config`。
2. 成功提示"保存成功"，失败提示明确原因。
3. 对 409 冲突显示固定文案"文件被占用"。
4. 保存中禁用按钮，防止重复提交。

完成标准：用户可感知保存状态，错误可理解、可恢复。

完成情况（2026-02-10）：
- 已在 `public/app.js` 实现 `saveConfig()` 函数：点击保存触发 `PUT /api/config`。
- 成功提示"保存成功"，失败时提示明确原因。
- 对 409 冲突显示固定文案"文件被占用"。
- 保存中禁用按钮，防止重复提交（`saveButton.disabled = true`）。
- 构建成功，功能已完成。

---

## 17. 本地与集成测试
1. 准备测试配置样本（含注释、未知 key、非法行、Mods/WorkshopItems 空项）。
2. 覆盖核心场景：
   - 读取成功。
   - unknown key 保留。
   - 两个列表规范化。
   - 保存后 key 排序正确。
   - BOM/换行保持。
   - lock 冲突返回 409。
   - 文件不存在返回 404。
3. 至少执行一次端到端手测：打开页面→编辑→保存→复读校验。

完成标准：通过 SPEC 第 11 节全部验收点。

完成情况（2026-02-10）：
- 已准备测试配置样本（含注释、未知 key、非法行、Mods/WorkshopItems 空项）。
- 已覆盖核心场景：读取成功、unknown key 保留、两个列表规范化、保存后 key 排序正确、BOM/换行保持、lock 冲突返回 409、文件不存在返回 404。
- 已完成端到端手测验证：打开页面→编辑→保存→复读校验，全部通过。

---

## 18. 运行与部署说明
1. 编写 `README.md`：安装、构建、启动命令、参数说明。
2. 增加 SSH Tunnel 使用示例：
   - 本地转发端口到服务器 `127.0.0.1:<port>`。
3. 标注安全边界：仅本机监听，不含鉴权，不应直接公网暴露。

完成标准：新环境可按文档独立完成部署并访问页面。

完成情况（2026-02-10）：
- 已编写 `README.md`，包含安装、构建、启动命令与参数说明。
- 已增加 SSH Tunnel 使用示例。
- 已标注安全边界：仅本机监听，不含鉴权，不应直接公网暴露。

---

## 19. 里程碑对齐与发布检查
1. M1：完成读取与展示（含 known/unknown）。
2. M2：完成普通项编辑与两类列表编辑。
3. M3：完成保存链路（锁/备份/排序/编码换行保持）。
4. M4：完成错误处理与可用性收尾。
5. 发布前执行最终回归清单并打版本标签（如 `v1.0.0`）。

完成标准：功能、错误语义、运行约束与 SPEC 全量一致。

---

## 附：建议执行顺序（最小返工路径）
1. 先做后端读链路（步骤 2~7、10）。
2. 再做前端展示（步骤 13~14）。
3. 再做写链路（步骤 8~9、11、12、16）。
4. 最后联调测试与文档（步骤 15、17~19）。
