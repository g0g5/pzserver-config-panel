// ===== 全局状态 =====
let serversConfig = null;
let runtimeSnapshot = null;

// ===== Toast 提示 =====
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  
  setTimeout(() => {
    if (toastContainer.contains(toast)) {
      toastContainer.removeChild(toast);
    }
  }, 3000);
}

// ===== Loading =====
function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (show) {
    overlay.classList.add("active");
  } else {
    overlay.classList.remove("active");
  }
}

// ===== API 调用 =====
async function fetchServersConfig() {
  const response = await fetch("/api/servers-config");
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`);
  }
  return response.json();
}

async function fetchRuntimeSnapshot() {
  const response = await fetch("/api/servers/runtime");
  if (!response.ok) {
    throw new Error(`Failed to load runtime: ${response.status}`);
  }
  return response.json();
}

async function createServer(serverData) {
  const response = await fetch("/api/servers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serverData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Failed to create server: ${response.status}`);
  }
  return response.json();
}

async function updateServer(serverId, serverData) {
  const response = await fetch(`/api/servers/${encodeURIComponent(serverId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(serverData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Failed to update server: ${response.status}`);
  }
  return response.json();
}

async function deleteServer(serverId) {
  const response = await fetch(`/api/servers/${encodeURIComponent(serverId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Failed to delete server: ${response.status}`);
  }
}

async function updateGlobalConfig(globalConfig) {
  const response = await fetch("/api/global-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(globalConfig),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Failed to update global config: ${response.status}`);
  }
  return response.json();
}

async function startServer(serverId) {
  const response = await fetch(`/api/servers/${encodeURIComponent(serverId)}/start`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Failed to start server: ${response.status}`);
  }
  return response.json();
}

async function stopServer(serverId) {
  const response = await fetch(`/api/servers/${encodeURIComponent(serverId)}/stop`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Failed to stop server: ${response.status}`);
  }
  return response.json();
}

// ===== 数据加载 =====
async function loadData() {
  try {
    showLoading(true);
    const [config, runtime] = await Promise.all([
      fetchServersConfig(),
      fetchRuntimeSnapshot(),
    ]);
    serversConfig = config;
    runtimeSnapshot = runtime;
    renderServers();
  } catch (error) {
    showToast("加载数据失败: " + error.message, "error");
    console.error(error);
  } finally {
    showLoading(false);
  }
}

// ===== 渲染服务器列表 =====
function getServerStatus(serverId) {
  if (!runtimeSnapshot) return "unknown";
  const serverState = runtimeSnapshot.servers.find((s) => s.serverId === serverId);
  return serverState?.status || "unknown";
}

function getStatusText(status) {
  const statusMap = {
    stopped: "已停止",
    running: "运行中",
    starting: "启动中",
    stopping: "停止中",
    error: "错误",
    unknown: "未知",
  };
  return statusMap[status] || status;
}

function renderServers() {
  const grid = document.getElementById("serversGrid");
  
  if (!serversConfig || serversConfig.servers.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🎮</div>
        <h3>暂无服务器实例</h3>
        <p>点击下方的"添加新实例"按钮创建你的第一个服务器</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = serversConfig.servers.map((server) => {
    const status = getServerStatus(server.id);
    const isRunning = status === "running" || status === "starting";
    
    return `
      <div class="server-card ${status}" data-server-id="${server.id}">
        <div class="server-card-header">
          <h3 class="server-card-name">${escapeHtml(server.name)}</h3>
          <span class="server-card-status ${status}">
            <span class="status-dot"></span>
            ${getStatusText(status)}
          </span>
        </div>
        <div class="server-card-path">${escapeHtml(server.iniPath)}</div>
        <div class="server-card-actions">
          <button class="server-card-btn primary manage-btn" data-server-id="${server.id}">
            进入管理
          </button>
          <button class="server-card-btn secondary toggle-btn" data-server-id="${server.id}" ${isRunning ? '' : 'disabled'}>
            ${isRunning ? '停止' : '启动'}
          </button>
        </div>
      </div>
    `;
  }).join("");

  // 绑定事件
  grid.querySelectorAll(".server-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const serverId = card.dataset.serverId;
      manageServer(serverId);
    });
  });

  grid.querySelectorAll(".manage-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const serverId = btn.dataset.serverId;
      manageServer(serverId);
    });
  });

  grid.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const serverId = btn.dataset.serverId;
      const status = getServerStatus(serverId);
      
      if (status === "running") {
        stopServerHandler(serverId);
      } else if (status === "stopped") {
        startServerHandler(serverId);
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== 服务器操作 =====
function manageServer(serverId) {
  window.location.href = `/index.html?serverId=${encodeURIComponent(serverId)}`;
}

async function startServerHandler(serverId) {
  try {
    showLoading(true);
    await startServer(serverId);
    showToast("服务器启动成功", "success");
    await loadData();
  } catch (error) {
    showToast("启动失败: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

async function stopServerHandler(serverId) {
  try {
    showLoading(true);
    await stopServer(serverId);
    showToast("服务器停止成功", "success");
    await loadData();
  } catch (error) {
    showToast("停止失败: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// ===== 对话框管理 =====
let currentEditingServerId = null;

function openServerDialog(serverId = null) {
  const dialog = document.getElementById("serverDialog");
  const title = document.getElementById("serverDialogTitle");
  const deleteBtn = document.getElementById("deleteServerBtn");
  
  currentEditingServerId = serverId;
  
  if (serverId) {
    // 编辑模式
    const server = serversConfig.servers.find((s) => s.id === serverId);
    if (!server) return;
    
    title.textContent = "编辑服务器实例";
    document.getElementById("serverDialogId").value = server.id;
    document.getElementById("serverNameInput").value = server.name;
    document.getElementById("serverIniPathInput").value = server.iniPath;
    document.getElementById("serverStartArgsInput").value = server.startArgs.join("\n");
    document.getElementById("serverStopCmdsInput").value = server.stopCommands.join("\n");
    deleteBtn.style.display = "block";
  } else {
    // 创建模式
    title.textContent = "添加服务器实例";
    document.getElementById("serverDialogId").value = "";
    document.getElementById("serverNameInput").value = "";
    document.getElementById("serverIniPathInput").value = "";
    document.getElementById("serverStartArgsInput").value = "";
    document.getElementById("serverStopCmdsInput").value = "save\nquit";
    deleteBtn.style.display = "none";
  }
  
  dialog.classList.add("active");
}

function closeServerDialog() {
  document.getElementById("serverDialog").classList.remove("active");
  currentEditingServerId = null;
}

async function saveServer() {
  const name = document.getElementById("serverNameInput").value.trim();
  const iniPath = document.getElementById("serverIniPathInput").value.trim();
  const startArgsText = document.getElementById("serverStartArgsInput").value.trim();
  const stopCmdsText = document.getElementById("serverStopCmdsInput").value.trim();
  
  if (!name) {
    showToast("请输入实例名称", "error");
    return;
  }
  
  if (!iniPath) {
    showToast("请输入 INI 配置文件路径", "error");
    return;
  }
  
  if (!iniPath.endsWith(".ini")) {
    showToast("INI 路径必须以 .ini 结尾", "error");
    return;
  }
  
  const startArgs = startArgsText
    ? startArgsText.split("\n").map((line) => line.trim()).filter(Boolean)
    : undefined;
  
  const stopCommands = stopCmdsText
    ? stopCmdsText.split("\n").map((line) => line.trim()).filter(Boolean)
    : ["save", "quit"];
  
  const serverData = {
    name,
    iniPath,
    startArgs,
    stopCommands,
  };
  
  try {
    showLoading(true);
    
    if (currentEditingServerId) {
      await updateServer(currentEditingServerId, serverData);
      showToast("服务器实例更新成功", "success");
    } else {
      await createServer(serverData);
      showToast("服务器实例创建成功", "success");
    }
    
    closeServerDialog();
    await loadData();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    showLoading(false);
  }
}

async function deleteServerHandler() {
  if (!currentEditingServerId) return;
  
  if (!confirm("确定要删除此服务器实例吗？此操作不可恢复。")) {
    return;
  }
  
  try {
    showLoading(true);
    await deleteServer(currentEditingServerId);
    showToast("服务器实例已删除", "success");
    closeServerDialog();
    await loadData();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    showLoading(false);
  }
}

// ===== 全局设置对话框 =====
function openGlobalSettingsDialog() {
  if (!serversConfig) return;
  
  document.getElementById("globalWorkshopPath").value = serversConfig.global.workshopPath || "";
  document.getElementById("globalStartScriptPath").value = serversConfig.global.startScriptPath || "";
  document.getElementById("globalStopGraceTimeout").value = serversConfig.global.stopGraceTimeoutMs || 45000;
  document.getElementById("globalForceKillTimeout").value = serversConfig.global.forceKillTimeoutMs || 10000;
  
  document.getElementById("globalSettingsDialog").classList.add("active");
}

function closeGlobalSettingsDialog() {
  document.getElementById("globalSettingsDialog").classList.remove("active");
}

async function saveGlobalSettings() {
  const globalConfig = {
    workshopPath: document.getElementById("globalWorkshopPath").value.trim(),
    startScriptPath: document.getElementById("globalStartScriptPath").value.trim(),
    stopGraceTimeoutMs: parseInt(document.getElementById("globalStopGraceTimeout").value, 10) || 45000,
    forceKillTimeoutMs: parseInt(document.getElementById("globalForceKillTimeout").value, 10) || 10000,
  };
  
  if (!globalConfig.startScriptPath) {
    showToast("请输入启动脚本路径", "error");
    return;
  }
  
  try {
    showLoading(true);
    await updateGlobalConfig(globalConfig);
    showToast("全局设置保存成功", "success");
    closeGlobalSettingsDialog();
    await loadData();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    showLoading(false);
  }
}

// ===== 事件绑定 =====
document.addEventListener("DOMContentLoaded", () => {
  // 加载数据
  loadData();
  
  // 刷新数据每 5 秒
  setInterval(loadData, 5000);
  
  // 全局设置按钮
  document.getElementById("globalSettingsBtn").addEventListener("click", openGlobalSettingsDialog);
  
  // 添加服务器按钮
  document.getElementById("addServerBtn").addEventListener("click", () => openServerDialog());
  
  // 服务器对话框
  document.getElementById("closeServerDialog").addEventListener("click", closeServerDialog);
  document.getElementById("cancelServerDialog").addEventListener("click", closeServerDialog);
  document.getElementById("confirmServerDialog").addEventListener("click", saveServer);
  document.getElementById("deleteServerBtn").addEventListener("click", deleteServerHandler);
  
  // 全局设置对话框
  document.getElementById("closeGlobalSettingsDialog").addEventListener("click", closeGlobalSettingsDialog);
  document.getElementById("cancelGlobalSettingsDialog").addEventListener("click", closeGlobalSettingsDialog);
  document.getElementById("confirmGlobalSettingsDialog").addEventListener("click", saveGlobalSettings);
  
  // 点击遮罩关闭对话框
  document.getElementById("serverDialog").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeServerDialog();
  });
  
  document.getElementById("globalSettingsDialog").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeGlobalSettingsDialog();
  });
});
