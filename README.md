# Project Zomboid 服务器配置管理面板 (V2)

用于在 Linux 游戏服务器上运行配置管理后端，通过 SSH Tunnel 提供本地网页面板访问。V2 版本新增多实例管理、终端控制和单活运行模式。

## 功能

### V2 新增功能

- **多实例管理**：可配置多个服务器实例，每个实例独立配置
- **单活运行模式**：同时仅允许 1 个实例处于运行状态
- **终端控制**：实时查看服务器日志，发送管理命令
- **命令补全**：支持 PZ 管理命令的前缀补全
- **实例配置编辑**：每个实例独立配置（INI 路径、启动/停止命令）

### 保留的 V1.5 功能

- 读取指定 `.ini` 配置文件
- 网页编辑配置项（含已知 key 的中文显示）
- Mods/WorkshopItems 列表控件（增删改、排序）
- 保存配置（含备份、锁、格式规范化）
- 普通配置项按类别分组展示，支持折叠；`true/false` 自动渲染为开关
- WorkshopItems 自动解析：从 Workshop 文件夹读取 `mod.info`，展示子模组信息/海报，并可一键同步到 Mods

## V2 配置文件

V2 使用 `servers-config.json` 替代原有的 `paths-config.json`，支持多实例配置：

```json
{
  "workshopPath": "/path/to/steamapps/workshop/content/108600",
  "stopGraceTimeoutMs": 30000,
  "forceKillTimeoutMs": 10000,
  "servers": [
    {
      "id": "main-server",
      "name": "主服务器",
      "iniPath": "/path/to/server.ini",
      "startCommand": "/path/to/start-server.sh",
      "stopCommands": ["save", "quit"]
    },
    {
      "id": "test-server",
      "name": "测试服务器",
      "iniPath": "/path/to/test.ini",
      "startCommand": "/path/to/start-test.sh",
      "stopCommands": ["save", "quit"]
    }
  ]
}
```

### 配置项说明

| 配置项 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `workshopPath` | string | 是 | Steam Workshop 的 `108600` 目录完整路径 |
| `stopGraceTimeoutMs` | number | 否 | 优雅停止超时（默认 45000ms） |
| `forceKillTimeoutMs` | number | 否 | 强制终止超时（默认 10000ms） |
| `servers` | array | 是 | 服务器实例数组 |
| `servers[].id` | string | 是 | 实例唯一标识（英文、数字、连字符） |
| `servers[].name` | string | 是 | 实例显示名称 |
| `servers[].iniPath` | string | 是 | 服务器 `.ini` 配置文件绝对路径 |
| `servers[].startCommand` | string | 是 | 服务器启动命令 |
| `servers[].stopCommands` | string[] | 否 | 停止时按顺序发送的命令（默认 `["save", "quit"]`） |

## 从 V1.5 迁移

V2 会自动从 `paths-config.json` 迁移配置：

1. 首次启动时，若存在 `paths-config.json`，会自动生成 `servers-config.json`
2. `iniFilePath` 会转为第一个服务器实例的 `iniPath`
3. `workshopPath` 会保留
4. 自动生成默认的 `startCommand` 和 `stopCommands`

建议迁移后在 Web 界面中编辑实例，完善 `startCommand` 和 `stopCommands`。

## 安装

```bash
npm install
```

## 运行前准备

1. 复制示例配置文件：

```bash
cp servers-config.json.example servers-config.json
```

2. 编辑 `servers-config.json`，按实际环境填写配置

## 构建

```bash
npm run build
```

## 运行

### 开发模式

```bash
npm run dev -- [--config /path/to/server.ini]
```

### 生产模式

```bash
npm start -- [--config /path/to/server.ini] [--port 3000]
```

### 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--config` | 否 | 默认配置文件路径（用于迁移） | - |
| `--port` | 否 | 监听端口号 | 3000 |

## 使用指南

### 实例管理页

1. **实例列表**：左侧显示所有配置的服务器实例
2. **选择实例**：点击实例卡片选中，配置页会显示该实例的配置
3. **添加/编辑实例**：
   - 点击「添加实例」创建新实例
   - 双击实例卡片或点击编辑按钮修改配置
4. **启动/停止**：
   - 选中实例后点击「启动服务器」或「停止服务器」
   - 单活模式：如果其他实例正在运行，启动按钮会被禁用

### 终端功能

- **实时日志**：SSE 实时推送，连接断开会自动重连
- **历史回放**：连接时会发送最近 2000 行日志
- **命令发送**：
  - 支持多行命令（Shift+Enter 换行）
  - Enter 直接发送
  - Tab 选择补全建议
- **自动滚动**：可开关，默认开启

### 配置管理页

- 选中实例后，编辑该实例的 `.ini` 配置
- 所有 V1.5 功能保持可用

## 单活运行模式

V2 采用「单活运行」设计：

- 同时仅允许 1 个实例处于 `starting/running/stopping` 状态
- 这是为了简化运维复杂度，避免资源冲突
- 若需同时运行多个服务器，请使用多个面板实例

## 远程访问（SSH Tunnel）

服务仅监听 `127.0.0.1`，需要通过 SSH 隧道从本地访问：

```bash
ssh -L 3000:127.0.0.1:3000 user@your-server-ip
```

然后在本地浏览器访问 `http://localhost:3000`

## 安全边界

- **仅监听 127.0.0.1**：不直接暴露到公网
- **不含鉴权**：依赖 SSH Tunnel 保障访问安全
- **单用户编辑**：通过锁机制防止并发冲突
- **不应直接公网暴露**：请始终通过 SSH Tunnel 访问
- **本地文件读取接口**：为展示 Workshop poster 提供文件读取能力（`/api/workshop-poster`），务必保持仅本机可访问并通过 SSH Tunnel 使用

## 备份与锁

- 每次保存前生成 `.bak` 备份（覆盖，仅保留最近 1 份）
- 使用 `.lock` 文件防止并发写入冲突
- 陈旧锁（超过 1 小时）自动释放

## 编码与换行

- 自动探测并保持原编码（UTF-8 BOM / UTF-8）
- 自动探测并保持原换行风格（LF / CRLF）
- 无法识别的编码将拒绝保存并返回错误

## API 参考

### 运行时管理

- `GET /api/servers/runtime` - 获取所有实例运行状态
- `POST /api/servers/:id/start` - 启动指定实例
- `POST /api/servers/:id/stop` - 停止指定实例

### 终端

- `GET /api/servers/:id/terminal/stream` - SSE 终端日志流
- `POST /api/servers/:id/terminal/commands` - 发送命令

### 命令补全

- `GET /api/terminal/commands?prefix=<text>` - 获取命令补全建议

### 配置管理

- `GET /api/servers-config` - 获取服务器配置
- `PUT /api/servers-config` - 保存服务器配置
- `GET /api/config?serverId=<id>` - 获取指定实例的 INI 配置
- `PUT /api/config?serverId=<id>` - 保存指定实例的 INI 配置

## 依赖

- Node.js >= 18
- 运行时：express
- 开发时：typescript, tsx, vitest
