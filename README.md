# Project Zomboid 服务器配置管理面板 (V1)

用于在 Linux 游戏服务器上运行配置管理后端，通过 SSH Tunnel 提供本地网页面板访问。

## 功能

- 读取指定 `.ini` 配置文件
- 网页编辑配置项（含已知 key 的中文显示）
- Mods/WorkshopItems 列表控件（增删改、排序）
- 保存配置（含备份、锁、格式规范化）

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 运行

### 开发模式

```bash
npm run dev -- --config /path/to/server.ini
```

### 生产模式

```bash
npm start -- --config /path/to/server.ini [--port 3000]
```

### 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `--config` | 是 | 配置文件路径（如 `servertest.ini`） | - |
| `--port` | 否 | 监听端口号 | 3000 |

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
