# Project Zomboid 服务器配置管理面板 (V1.5)

用于在 Linux 游戏服务器上运行配置管理后端，通过 SSH Tunnel 提供本地网页面板访问。

## 功能

- 读取指定 `.ini` 配置文件
- 网页编辑配置项（含已知 key 的中文显示）
- Mods/WorkshopItems 列表控件（增删改、排序）
- 保存配置（含备份、锁、格式规范化）
- 普通配置项按类别分组展示，支持折叠；`true/false` 自动渲染为开关
- WorkshopItems 自动解析：从 Workshop 文件夹读取 `mod.info`，展示子模组信息/海报，并可一键同步到 Mods
- 路径设置页：在面板内配置并持久化 `INI` 文件路径与 `Workshop` 文件夹路径（服务端保存到 `paths-config.json`）

## V1.5 更新要点

- 新增“配置管理/路径设置”双 Tab；支持在网页端设置 `INI` 路径和 Workshop 路径，并持久化
- WorkshopItems 增强：显示是否已下载、解析子模组（`mod.info`）、展示 poster（通过后端接口读取本地文件）
- 子模组快速开关：在 WorkshopItems 卡片内直接勾选/取消，将对应 submod id 自动加入/移出 `Mods`
- 普通配置项体验：分组 + 折叠；布尔值改为 Toggle；保存/加载使用 Toast 提示与连接状态指示
- 列表编辑体验：Mods/WorkshopItems/Map 支持序号、上下移动、对话框添加

## 安装

```bash
npm install
```

## 运行前：准备路径配置文件

建议先配置路径文件，再启动服务。

1. 复制示例文件并创建服务端实际读取的配置文件：

```bash
cp paths-config.json.example paths-config.json
```

2. 编辑 `paths-config.json`，按你的服务器实际目录填写：

- `iniFilePath`：服务器 `.ini` 配置文件完整路径
- `workshopPath`：Steam Workshop 的 `108600` 目录完整路径

> 说明：示例文件名为 `paths-config.json.example`，服务端实际读取的是 `paths-config.json`。

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
| `--config` | 否 | 配置文件路径（如 `servertest.ini`）。未提供时需在“路径设置”页保存 `INI` 文件路径，或服务端已存在 `paths-config.json` | - |
| `--port` | 否 | 监听端口号 | 3000 |

### 路径设置（V1.5）

- `INI 文件路径`：服务器配置文件的完整路径（用于读写 `/api/config`）
- `Workshop 文件夹路径`：Steam Workshop 的 `108600` 目录（用于解析 WorkshopItems）
- 路径配置会写入服务端根目录的 `paths-config.json`；浏览器端也会写入 localStorage 作为后备

### 测试

```bash
npm test
```

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

## 依赖

- Node.js >= 18
- 运行时：express
- 开发时：typescript, tsx, vitest
