# pzserver-config-panel V2 开发计划（从 V1.5 到 V2）

> 目标：在保留现有配置编辑能力的前提下，落地 V2 的“实例配置多条目 + 运行态单活 + 启停控制 + 终端 + 命令补全”。

## 0. 范围冻结与实现策略确认

1. 以 `docs/v2/spec.md` 为唯一需求基线，锁定以下关键约束：
   - 多实例 = 可维护多个实例配置。
   - 单活运行 = 同时仅允许 1 个实例处于可控运行态。
2. 终端流协议在实现阶段统一选型（建议 SSE，降低复杂度）。
3. 保留 V1 `GET/PUT /api/config` 能力，改造成“按选中实例读写”。

完成标准：

- 团队对“单活模式”无歧义，后续所有 API/前端行为围绕该约束实现。

---

## 1. 配置模型升级与迁移（`paths-config` -> `servers-config`）

1. 新增配置模型：
   - 全局：`workshopPath`、`stopGraceTimeoutMs`、`forceKillTimeoutMs`。
   - 实例数组：`id`、`name`、`iniPath`、`startCommand`、`stopCommands`。
2. 新增配置读写模块（例如 `src/config/servers-config.ts`）：
   - 读取 `servers-config.json`。
   - 不存在时尝试从 `paths-config.json` 迁移。
3. 迁移规则：
   - 若旧配置存在 `iniFilePath`，自动生成默认实例。
   - `workshopPath` 直接沿用。
4. 配置校验：
   - `id` 唯一。
   - `iniPath` 必须绝对路径且 `.ini` 结尾。
   - `startCommand` 非空。

完成标准：

- 服务可稳定读取并保存 `servers-config.json`。
- 旧用户首次启动可自动迁移成功。

---

## 2. 类型与错误模型扩展

1. 扩展类型定义（建议新增 `src/types/server.ts` 或同类文件）：
   - `ServerInstance`、`ServersConfig`、`ServerRuntimeState`、`TerminalLine`。
2. 扩展错误码：
   - `SERVER_ALREADY_RUNNING`
   - `SERVER_NOT_RUNNING`
   - `ANOTHER_SERVER_RUNNING`
   - `TERMINAL_NOT_WRITABLE`
   - `PROCESS_SPAWN_FAILED`
   - `STOP_TIMEOUT`
3. 统一 HTTP 映射：
   - 状态冲突统一 `409`。

完成标准：

- 新增 API 与服务层都使用统一类型和错误结构。

---

## 3. 运行时管理器（单活核心）

1. 新建运行时管理模块（例如 `src/runtime/manager.ts`）：
   - 维护每实例运行态（`stopped/starting/running/stopping/error/unknown`）。
   - 维护 `activeServerId`（单活唯一标识）。
2. 启动前检查：
   - 目标实例不可为 `starting/running`。
   - 全局不可存在其他实例 `starting/running/stopping`。
3. 面板重启行为：
   - 不接管历史进程。
   - 运行态初始化为 `unknown`/`stopped`（按最终约定）。

完成标准：

- 单元测试可覆盖“同一时刻只能启动一个实例”的约束。

---

## 4. 启动/停止服务实现

1. 启动：
   - 使用子进程执行实例 `startCommand`。
   - 记录 `pid`、`startedAt`、退出码。
2. 停止（优雅 + 兜底）：
   - 按顺序写入 `stopCommands`（默认 `save`、`quit`）。
   - 超时后 `SIGTERM`，再次超时后 `SIGKILL`。
3. 状态流转：
   - `starting -> running -> stopping -> stopped/error`。

完成标准：

- 启停链路在异常和超时场景可预测，状态转换正确。

---

## 5. 运行控制 API 落地

1. 新增路由：
   - `GET /api/servers/runtime`
   - `POST /api/servers/:id/start`
   - `POST /api/servers/:id/stop`
2. 返回结构包含：
   - 实例状态、`pid`、`startedAt`、`lastExit`。
   - `activeServerId`（无则 `null`）。
3. 冲突语义：
   - A 在运行时启动 B 返回 `409 + ANOTHER_SERVER_RUNNING`。

完成标准：

- 运行控制 API 完整可用，且冲突语义与 SPEC 一致。

---

## 6. 终端日志流实现

1. 为每实例维护日志环形缓冲（建议最近 2000 行）。
2. 采集 stdout/stderr，标准化为：
   - `timestamp`
   - `stream` (`stdout|stderr|system`)
   - `text`
3. 实时推送（建议 SSE）：
   - 支持连接建立时回放最近日志。
   - 支持断线重连继续接收新日志。

完成标准：

- 浏览器可实时查看日志，刷新后可回看最近输出。

---

## 7. 终端命令发送实现（多行批量）

1. 实现 `POST /api/servers/:id/terminal/commands`。
2. 处理规则：
   - `text` 按行拆分。
   - 过滤纯空行。
   - 按顺序逐行写入 stdin（补 `\n`）。
3. 返回批次结果：
   - 成功行数。
   - 失败行与错误原因。
4. 非 `running` 或 stdin 不可写时返回 `409`。

完成标准：

- 多行命令按顺序可靠发送，错误定位到具体行。

---

## 8. 内置命令词库与补全 API

1. 将 `docs/v2/spec.md` 的命令表落地为静态词库（建议 `src/rules/admin-commands.zh-CN.ts`）。
2. 提供查询接口：
   - `GET /api/terminal/commands?prefix=<text>`
3. 匹配规则：
   - `command` + `aliases` 前缀匹配。
   - 返回 `command`、`description`、`usage`。

完成标准：

- 输入前缀可返回稳定补全候选。

---

## 9. 现有配置编辑能力接入“实例上下文”

1. 适配 `/api/config`：
   - 增加实例选择机制（建议 query: `serverId`）。
   - 未传 `serverId` 时维持兼容策略（如默认首个实例）。
2. 保持现有配置编辑逻辑（解析、排序、备份、锁）不退化。
3. 与实例列表联动：
   - 前端切换实例后读写对应 `iniPath`。

完成标准：

- V1.5 的配置编辑能力在多实例场景仍可正常工作。

---

## 10. 前端 V2 交互实现

1. 页面结构调整：
   - 实例列表区。
   - 实例配置区（name/ini/start/stop）。
   - 终端区（日志、命令输入、补全）。
2. 单活交互约束：
   - 若已有运行实例，其它实例“启动”按钮禁用。
   - 清晰提示“当前为单实例运行模式”。
3. 启停反馈：
   - 进行中状态、成功/失败提示。
4. 终端交互：
   - 自动滚动开关。
   - 多行输入发送。
   - 补全下拉与键盘选择。

完成标准：

- 用户可在一个页面内完成“选实例 -> 启停 -> 看日志 -> 发命令”。

---

## 11. 测试计划（必须）

1. 单元测试：
   - 配置校验与迁移。
   - 运行时状态机。
   - 多行命令拆分/发送。
2. 集成测试：
   - 启停 API 正常路径与异常路径。
   - 单活冲突（A 运行时启动 B）。
   - 停止超时到 `SIGTERM/SIGKILL`。
3. 前端手测：
   - 日志实时性。
   - 补全可用性。
   - 实例切换与配置保存。
4. 回归测试：
   - `/api/config`、`Mods/WorkshopItems`、备份、锁、编码换行保持。

完成标准：

- `npm test` 通过，核心手测场景全部通过。

---

## 12. 文档与发布准备

1. 更新 `README.md`：
   - 新配置文件说明（`servers-config.json`）。
   - 单活运行限制说明。
   - 新 API 与终端能力说明。
2. 提供示例配置：
   - `servers-config.json.example`。
3. 增加迁移指南：
   - 从 `paths-config.json` 到 `servers-config.json`。

完成标准：

- 新用户可按文档完成部署；老用户可按迁移文档升级。

---

## 13. 里程碑与建议执行顺序（最小返工路径）

### M1：基础模型与后端骨架

执行：步骤 1、2、5（仅配置 API 部分）。

完成情况（2026-02-18）：

- 状态：已完成。
- 步骤 1（配置模型升级与迁移）已落地：新增 `src/config/servers-config.ts`，支持 `servers-config.json` 读写、从 `paths-config.json` 自动迁移、以及 `id/iniPath/startCommand` 等核心校验。
- 步骤 2（类型与错误模型扩展）已落地：新增 `src/types/server.ts` 中的服务实例与运行态类型，`src/errors/app-error.ts` 已扩展 V2 相关错误码并补齐 HTTP 映射。
- 步骤 5（仅配置 API 部分）已落地：新增 `GET/PUT /api/servers-config`，并将既有 `/api/config`、`/api/paths` 接入实例上下文与兼容逻辑。

### M2：运行时与单活控制

执行：步骤 3、4、5（运行控制 API）。

完成情况（2026-02-18）：

- 状态：已完成。
- 步骤 3（运行时管理器）已落地：新增 `src/runtime/manager.ts`，维护实例运行态与 `activeServerId`，并严格执行“同一时刻仅允许一个实例处于 starting/running/stopping”约束。
- 步骤 4（启动/停止服务）已落地：启动基于实例 `startCommand` 拉起子进程并记录 `pid/startedAt/lastExit`；停止按 `stopCommands -> stopGraceTimeoutMs -> SIGTERM -> forceKillTimeoutMs -> SIGKILL` 流程执行，异常超时返回 `STOP_TIMEOUT`。
- 步骤 5（运行控制 API）已落地：新增 `src/routes/servers-runtime.ts`，提供 `GET /api/servers/runtime`、`POST /api/servers/:id/start`、`POST /api/servers/:id/stop`，并接入统一冲突语义（`ANOTHER_SERVER_RUNNING`、`SERVER_ALREADY_RUNNING`、`SERVER_NOT_RUNNING`）。
- 测试已补齐：新增 `tests/runtime-manager.test.ts` 覆盖单活冲突、重复启动、停止未运行实例与启动失败场景。

### M3：终端能力

执行：步骤 6、7、8。

### M4：前端整合与回归发布

执行：步骤 9、10、11、12。

---

## 14. 风险与应对

1. 启动命令环境差异（shell/path/env）导致启动失败。
   - 应对：记录完整 spawn 错误与退出日志，文档给出脚本规范。
2. 停机不彻底（stdin 无响应）。
   - 应对：严格执行 `stopCommands -> SIGTERM -> SIGKILL`，并写明超时参数。
3. 日志流连接中断影响可观测性。
   - 应对：环形缓冲 + 重连后回放。
4. 多实例配置与旧 `/api/config` 兼容冲突。
   - 应对：先实现兼容默认策略，再逐步引导前端显式传 `serverId`。
