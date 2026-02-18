# V2.1 实例选择与管理规格文档

## 1. 目标

实现一个更清晰的实例管理流程：
1. 用户首先进入**实例选择页面**，选择要管理的实例
2. 选择后进入**实例管理页面**，包含服务器控制台、配置管理、路径管理
3. 优化实例配置数据结构，支持全局共享配置和实例特定配置

## 2. 当前实现回顾

### 2.1 当前数据结构

**servers-config.json**（当前）：
```json
{
  "workshopPath": "/path/to/workshop",
  "stopGraceTimeoutMs": 45000,
  "forceKillTimeoutMs": 10000,
  "servers": [
    {
      "id": "server-1",
      "name": "主服务器",
      "iniPath": "/path/to/server1.ini",
      "startCommand": "./start-server.sh",
      "stopCommands": ["save", "quit"]
    }
  ]
}
```

**存在的问题：**
- `startCommand` 是完整命令，需要手动指定启动脚本路径
- 缺少启动参数（如 `-servername <IniNameNoExt>`）的显式配置
- 前端所有功能堆叠在一个页面，没有实例选择流程

### 2.2 当前前端流程

- 打开页面直接显示实例管理（列表 + 控制面板 + 终端 + 配置管理）
- 没有实例选择的概念，默认选中第一个或需要手动选择

## 3. 新设计方案

### 3.1 数据结构变更

**servers-config.json**（新）：
```json
{
  "global": {
    "workshopPath": "/path/to/Steam/steamapps/workshop/content/108600",
    "startScriptPath": "/path/to/start-server.sh",
    "stopGraceTimeoutMs": 45000,
    "forceKillTimeoutMs": 10000
  },
  "servers": [
    {
      "id": "server-1",
      "name": "主服务器",
      "iniPath": "/path/to/Zomboid/Server/server1.ini",
      "startArgs": ["-servername", "server1"],
      "stopCommands": ["save", "quit"]
    }
  ]
}
```

**关键变更：**
- 新增 `global.startScriptPath`：全局共享的启动脚本路径
- 将 `startCommand` 改为 `startArgs`：实例特定的启动参数数组
- 启动时组合命令：`${global.startScriptPath} ${startArgs.join(' ')}`
- 默认 `startArgs` 为 `["-servername", "<ini文件名不含扩展名>"]`

### 3.2 类型定义更新

**src/types/server.ts：**
```typescript
export type ServerGlobalConfig = {
  workshopPath: string;
  startScriptPath: string;
  stopGraceTimeoutMs: number;
  forceKillTimeoutMs: number;
};

export type ServerInstance = {
  id: string;
  name: string;
  iniPath: string;
  startArgs: string[];
  stopCommands: string[];
};

export type ServersConfig = {
  global: ServerGlobalConfig;
  servers: ServerInstance[];
};
```

## 4. 前端页面设计

### 4.1 页面结构

```
/ (根路径)
├── 实例选择页 (instance-select.html)
└── 实例管理页 (index.html 或 dashboard.html)
    ├── 控制台标签 (服务器控制 + 终端)
    ├── 配置管理标签 (INI配置编辑)
    └── 全局设置标签 (全局路径设置)
```

### 4.2 实例选择页

**路径：** `/instance-select.html` 或根路径 `/`

**布局：**
- 顶部：标题 + 全局设置入口
- 主体：实例卡片网格/列表
- 底部：添加新实例按钮

**实例卡片内容：**
- 实例名称（大标题）
- INI文件路径
- 当前状态（从运行时API获取）
- 快捷操作按钮：进入管理、启动/停止（可选）

**交互：**
- 点击卡片进入该实例的管理页面
- 添加实例按钮打开创建对话框
- 全局设置入口打开全局配置对话框

### 4.3 实例管理页

**路径：** `/dashboard.html?serverId=<id>` 或 `/#server=<id>`

**布局：**
- 顶部：返回选择页按钮 + 当前实例名称 + 保存按钮
- Tab导航：控制台 | 配置管理 | 全局设置

**控制台标签：**
- 控制面板（启动/停止按钮、状态显示）
- 终端区域（日志输出 + 命令输入）

**配置管理标签：**
- 普通配置项（分组显示）
- WorkshopItems 列表
- Mods 列表
- Map 列表

**全局设置标签：**
- 实例特定设置（ini路径、启动参数）
- 全局共享设置（workshop路径、启动脚本路径、超时设置）
- 注意：非当前实例管理员不应修改其他实例的设置

## 5. API变更

### 5.1 新增/修改路由

```
GET  /api/servers-config
     返回新的 ServersConfig 结构（包含 global 和 servers）

PUT  /api/servers-config
     接受新的 ServersConfig 结构

GET  /api/servers/:id
     获取单个实例配置

PUT  /api/servers/:id
     更新单个实例配置

POST /api/servers
     创建新实例（自动生成id）

DELETE /api/servers/:id
     删除实例

GET  /api/global-config
     获取全局配置（旧 /api/paths 的替代）

PUT  /api/global-config
     更新全局配置
```

### 5.2 向后兼容

- 启动时自动迁移旧的配置文件格式
- 旧的 `startCommand` 字段在新版本中自动转换为 `startArgs`

## 6. 实现步骤

### 阶段1：后端数据结构更新
1. 更新 `src/types/server.ts` 类型定义
2. 修改 `src/config/servers-config.ts` 加载/保存逻辑
3. 添加配置文件迁移逻辑（从旧格式到新格式）
4. 更新 `src/routes/servers-config.ts` API路由
5. 修改 `src/runtime/manager.ts` 组合启动命令逻辑

### 阶段2：前端实例选择页
1. 创建 `public/instance-select.html`
2. 创建 `public/instance-select.js`
3. 实现实例卡片展示和状态获取
4. 实现添加实例对话框
5. 实现全局设置对话框

### 阶段3：前端实例管理页重构
1. 重构 `public/index.html` 为管理页面
2. 移除实例列表侧边栏（已在选择页实现）
3. 添加返回选择页按钮
4. 修改 `public/app.js` 支持从URL参数获取 serverId
5. 更新全局设置标签页内容

### 阶段4：整合与测试
1. 更新路由中间件支持新页面
2. 确保所有API正常工作
3. 测试配置文件迁移
4. 测试多实例场景

## 7. 配置示例

### 7.1 全新安装示例

```json
{
  "global": {
    "workshopPath": "/home/steam/Steam/steamapps/workshop/content/108600",
    "startScriptPath": "/home/steam/pzserver/start-server.sh",
    "stopGraceTimeoutMs": 45000,
    "forceKillTimeoutMs": 10000
  },
  "servers": [
    {
      "id": "main-server",
      "name": "主服务器",
      "iniPath": "/home/steam/Zomboid/Server/main.ini",
      "startArgs": ["-servername", "main"],
      "stopCommands": ["save", "quit"]
    },
    {
      "id": "test-server",
      "name": "测试服务器",
      "iniPath": "/home/steam/Zomboid/Server/test.ini",
      "startArgs": ["-servername", "test", "-debug"],
      "stopCommands": ["save", "quit"]
    }
  ]
}
```

### 7.2 从旧版本迁移

旧配置：
```json
{
  "workshopPath": "/home/steam/workshop",
  "iniFilePath": "/home/steam/Zomboid/Server/myserver.ini"
}
```

迁移后：
```json
{
  "global": {
    "workshopPath": "/home/steam/workshop",
    "startScriptPath": "./start-server.sh",
    "stopGraceTimeoutMs": 45000,
    "forceKillTimeoutMs": 10000
  },
  "servers": [
    {
      "id": "myserver",
      "name": "myserver",
      "iniPath": "/home/steam/Zomboid/Server/myserver.ini",
      "startArgs": ["-servername", "myserver"],
      "stopCommands": ["save", "quit"]
    }
  ]
}
```

## 8. 界面草图

### 8.1 实例选择页

```
┌─────────────────────────────────────────────────────────────┐
│  PZ Server Manager                              [全局设置] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐                      │
│  │  主服务器     │  │  测试服务器   │                      │
│  │               │  │               │                      │
│  │  /path/to/    │  │  /path/to/    │                      │
│  │  main.ini     │  │  test.ini     │                      │
│  │               │  │               │                      │
│  │  [运行中]     │  │  [已停止]     │                      │
│  │               │  │               │                      │
│  │ [进入管理]    │  │ [进入管理]    │                      │
│  └───────────────┘  └───────────────┘                      │
│                                                             │
│            [+ 添加新实例]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 实例管理页

```
┌─────────────────────────────────────────────────────────────┐
│  [← 返回]  主服务器                         [保存配置]     │
├─────────────────────────────────────────────────────────────┤
│  [控制台]  [配置管理]  [全局设置]                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  控制面板                                           │   │
│  │  状态: 运行中  PID: 12345  运行时间: 2小时30分      │   │
│  │  [启动服务器] [停止服务器]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  终端                                               │   │
│  │  [日志输出区域...]                                  │   │
│  │  [命令输入                                        ] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 9. 注意事项

1. **启动命令组合**：实际执行的命令为 `spawn(global.startScriptPath + ' ' + startArgs.join(' '), {shell: true})`
2. **单实例限制**：同一时间只能有一个服务器实例运行（现有逻辑保留）
3. **INI文件名提取**：`startArgs` 中的 `-servername` 参数默认值从 `iniPath` 的文件名（不含扩展名）自动提取
4. **向后兼容**：首次启动时自动将旧格式配置迁移到新格式
5. **路径验证**：`global.startScriptPath` 和 `server.iniPath` 都必须是绝对路径
