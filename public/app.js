// ===== 全局状态 =====
let configData = null;
let normalItems = [];
let modsItems = [];
let workshopItemsItems = [];
let workshopItemsData = [];
let mapItems = [];
let groupedNormalItems = {};
let currentAddType = null;

// V2.1: 服务器管理
let serversConfig = null;
let runtimeSnapshot = null;
let currentServerId = null;
let currentServer = null;
let terminalEventSource = null;
let commandSuggestions = [];
let selectedSuggestionIndex = -1;
let autoScroll = true;

const ITEM_GROUPS = {
  basic: {
    name: "服务器基本设置",
    keys: ["Public", "PublicName", "PublicDescription", "MaxPlayers", "DefaultPort", "UDPPort", "RCONPort", "RCONPassword", "Password", "ServerWelcomeMessage", "ServerImageLoginScreen", "ServerImageLoadingScreen", "ServerImageIcon", "UPnP"]
  },
  pvp: {
    name: "PVP设置",
    keys: ["PVP", "PVPLogToolChat", "PVPLogToolFile", "SafetySystem", "ShowSafety", "SafetyToggleTimer", "SafetyCooldownTimer", "SafetyDisconnectDelay", "WarStartDelay", "WarDuration", "WarSafehouseHitPoints", "PVPMeleeWhileHitReaction", "PVPMeleeDamageModifier", "PVPFirearmDamageModifier"]
  },
  safehouse: {
    name: "安全屋设置",
    keys: ["PlayerSafehouse", "AdminSafehouse", "SafehouseAllowTrepass", "SafehouseAllowFire", "SafehouseAllowLoot", "SafehouseAllowRespawn", "SafehouseDaySurvivedToClaim", "SafeHouseRemovalTime", "SafehouseAllowNonResidential", "SafehouseDisableDisguises", "MaxSafezoneSize", "DisableSafehouseWhenPlayerConnected"]
  },
  chat: {
    name: "聊天设置",
    keys: ["GlobalChat", "ChatStreams", "DiscordEnable", "DiscordToken", "DiscordChannel", "DiscordChannelID", "WebhookAddress", "ChatMessageCharacterLimit", "ChatMessageSlowModeTime", "BadWordListFile", "GoodWordListFile", "BadWordPolicy", "BadWordReplacement"]
  },
  player: {
    name: "玩家设置",
    keys: ["Open", "AutoCreateUserInWhiteList", "DisplayUserName", "ShowFirstAndLastName", "UsernameDisguises", "HideDisguisedUserName", "SpawnPoint", "SpawnItems", "DropOffWhiteListAfterDeath", "AllowCoop", "SleepAllowed", "SleepNeeded", "KnockedDownAllowed", "SneakModeHideFromOtherPlayers", "PlayerRespawnWithSelf", "PlayerRespawnWithOther", "FastForwardMultiplier", "AllowNonAsciiUsername", "MouseOverToSeeDisplayName", "HidePlayersBehindYou", "MapRemotePlayerVisibility", "Faction", "FactionDaySurvivedToCreate", "FactionPlayersRequiredForTag"]
  },
  anticheat: {
    name: "反作弊设置",
    keys: ["AntiCheatSafety", "AntiCheatMovement", "AntiCheatHit", "AntiCheatPacket", "AntiCheatPermission", "AntiCheatXP", "AntiCheatFire", "AntiCheatSafeHouse", "AntiCheatRecipe", "AntiCheatPlayer", "AntiCheatChecksum", "AntiCheatItem", "AntiCheatServerCustomization", "DoLuaChecksum", "SteamVAC"]
  },
  performance: {
    name: "性能设置",
    keys: ["PauseEmpty", "SaveWorldEveryMinutes", "DenyLoginOnOverloadedServer", "LoginQueueEnabled", "LoginQueueConnectTimeout", "ItemNumbersLimitPerContainer", "BloodSplatLifespanDays", "BackupsCount", "BackupsOnStart", "BackupsOnVersionChange", "BackupsPeriod", "MultiplayerStatisticsPeriod", "RemovePlayerCorpsesOnCorpseRemoval"]
  }
};

// ===== URL 参数处理 =====
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

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

// ===== 配置加载与渲染 =====
async function loadConfig() {
  try {
    if (!currentServerId) {
      showToast("未选择服务器实例", "error");
      return;
    }
    
    const response = await fetch(`/api/config?serverId=${encodeURIComponent(currentServerId)}`);
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    configData = await response.json();
    renderConfig();
  } catch (error) {
    showToast("配置加载失败: " + error.message, "error");
    console.error(error);
  }
}

function renderConfig() {
  if (!configData) return;

  normalItems = [];
  modsItems = [];
  workshopItemsItems = [];
  workshopItemsData = configData.workshopItems || [];
  mapItems = [];
  groupedNormalItems = {};

  configData.items.forEach((item) => {
    if (item.key === "Mods") {
      modsItems = item.value ? item.value.split(";").map((s) => s.trim()).filter((s) => s) : [];
    } else if (item.key === "WorkshopItems") {
      workshopItemsItems = item.value ? item.value.split(";").map((s) => s.trim()).filter((s) => s) : [];
    } else if (item.key === "Map") {
      mapItems = item.value ? item.value.split(";").map((s) => s.trim()).filter((s) => s) : [];
    } else {
      normalItems.push(item);
    }
  });

  Object.keys(ITEM_GROUPS).forEach(groupKey => {
    groupedNormalItems[groupKey] = [];
  });
  groupedNormalItems.other = [];

  normalItems.forEach(item => {
    let assigned = false;
    for (const groupKey in ITEM_GROUPS) {
      if (ITEM_GROUPS[groupKey].keys.includes(item.key)) {
        groupedNormalItems[groupKey].push(item);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      groupedNormalItems.other.push(item);
    }
  });

  renderNormalItems();
  renderMods();
  renderWorkshopItems();
  renderMap();
}

function renderNormalItems() {
  const container = document.getElementById("normalItemsList");
  container.innerHTML = "";

  Object.keys(ITEM_GROUPS).forEach(groupKey => {
    const groupItems = groupedNormalItems[groupKey];
    if (groupItems.length > 0) {
      renderItemGroup(container, groupKey, ITEM_GROUPS[groupKey].name, groupItems);
    }
  });

  const otherItems = groupedNormalItems.other;
  if (otherItems.length > 0) {
    renderItemGroup(container, "other", "其他设置", otherItems);
  }
}

function renderItemGroup(container, groupKey, groupName, items) {
  const groupDiv = document.createElement("div");
  groupDiv.className = "config-group";

  const groupHeader = document.createElement("div");
  groupHeader.className = "group-header";

  const groupTitle = document.createElement("h3");
  groupTitle.className = "group-title";
  groupTitle.textContent = groupName;
  groupHeader.appendChild(groupTitle);

  const collapseButton = document.createElement("button");
  collapseButton.className = "collapse-button";
  collapseButton.textContent = "▼";
  collapseButton.dataset.target = `group-${groupKey}-content`;
  collapseButton.addEventListener("click", () => toggleCollapse(collapseButton.dataset.target));
  groupHeader.appendChild(collapseButton);

  groupDiv.appendChild(groupHeader);

  const groupContent = document.createElement("div");
  groupContent.id = `group-${groupKey}-content`;
  groupContent.className = "group-content";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "config-item";

    const label = document.createElement("div");
    label.className = "item-label" + (item.isKnown ? "" : " unknown");
    label.textContent = item.isKnown ? `${item.zhName} (${item.key})` : item.key;
    div.appendChild(label);

    if (item.description) {
      const desc = document.createElement("div");
      desc.className = "item-description";
      desc.textContent = item.description;
      div.appendChild(desc);
    }

    const isBooleanValue = item.value === "true" || item.value === "false";

    if (isBooleanValue) {
      const toggleContainer = document.createElement("div");
      toggleContainer.className = "toggle-container";

      const toggle = document.createElement("label");
      toggle.className = "toggle";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = item.value === "true";
      input.dataset.key = item.key;
      toggle.appendChild(input);

      const span = document.createElement("span");
      span.className = "toggle-slider";
      toggle.appendChild(span);

      toggleContainer.appendChild(toggle);
      div.appendChild(toggleContainer);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "item-input";
      input.value = item.value;
      input.dataset.key = item.key;
      div.appendChild(input);
    }

    groupContent.appendChild(div);
  });

  groupDiv.appendChild(groupContent);
  container.appendChild(groupDiv);
}

function renderMods() {
  renderListEditor("modsList", modsItems, "Mods");
}

function renderWorkshopItems() {
  const container = document.getElementById("workshopItemsList");
  container.innerHTML = "";

  workshopItemsItems.forEach((itemId, index) => {
    const workshopItem = workshopItemsData.find((wi) => wi.id === itemId) || { id: itemId, isDownloaded: false, subMods: [] };
    const div = document.createElement("div");
    div.className = "workshop-item";

    const headerDiv = document.createElement("div");
    headerDiv.className = "workshop-item-header";

    const indexSpan = document.createElement("span");
    indexSpan.className = "list-item-index";
    indexSpan.textContent = (index + 1);
    headerDiv.appendChild(indexSpan);

    const statusIndicator = document.createElement("span");
    statusIndicator.className = "workshop-status " + (workshopItem.isDownloaded ? "downloaded" : "not-downloaded");
    statusIndicator.textContent = workshopItem.isDownloaded ? "✓" : "✗";
    statusIndicator.title = workshopItem.isDownloaded ? "已下载" : "未下载";
    headerDiv.appendChild(statusIndicator);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "list-item-input";
    input.value = itemId;
    input.dataset.index = index;
    input.dataset.type = "WorkshopItems";
    headerDiv.appendChild(input);

    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "workshop-buttons";

    const upBtn = document.createElement("button");
    upBtn.className = "list-button";
    upBtn.textContent = "↑";
    upBtn.title = "上移";
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveListItem("WorkshopItems", index, -1);
    buttonsDiv.appendChild(upBtn);

    const downBtn = document.createElement("button");
    downBtn.className = "list-button";
    downBtn.textContent = "↓";
    downBtn.title = "下移";
    downBtn.disabled = index === workshopItemsItems.length - 1;
    downBtn.onclick = () => moveListItem("WorkshopItems", index, 1);
    buttonsDiv.appendChild(downBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "list-button delete";
    deleteBtn.textContent = "删除";
    deleteBtn.onclick = () => deleteListItem("WorkshopItems", index);
    buttonsDiv.appendChild(deleteBtn);

    headerDiv.appendChild(buttonsDiv);
    div.appendChild(headerDiv);

    if (workshopItem.isDownloaded && workshopItem.subMods.length > 0) {
      const subModsDiv = document.createElement("div");
      subModsDiv.className = "submods-container";

      workshopItem.subMods.forEach((subMod) => {
        const subModDiv = document.createElement("div");
        subModDiv.className = "submod-item";

        if (subMod.poster) {
          const posterImg = document.createElement("img");
          posterImg.className = "submod-poster";
          posterImg.src = "/api/workshop-poster?rel=" + encodeURIComponent(subMod.poster);
          posterImg.alt = subMod.name;
          posterImg.onerror = function() { this.style.display = "none"; };
          subModDiv.appendChild(posterImg);
        }

        const infoDiv = document.createElement("div");
        infoDiv.className = "submod-info";

        const nameDiv = document.createElement("div");
        nameDiv.className = "submod-name";
        nameDiv.textContent = subMod.name;
        infoDiv.appendChild(nameDiv);

        if (subMod.description) {
          const descDiv = document.createElement("div");
          descDiv.className = "submod-description";
          descDiv.textContent = subMod.description;
          infoDiv.appendChild(descDiv);
        }

        const idDiv = document.createElement("div");
        idDiv.className = "submod-id";
        idDiv.textContent = "ID: " + subMod.id;
        infoDiv.appendChild(idDiv);

        const toggleDiv = document.createElement("div");
        toggleDiv.className = "submod-toggle";
        
        const toggleLabel = document.createElement("label");
        toggleLabel.className = "toggle";
        
        const toggleInput = document.createElement("input");
        toggleInput.type = "checkbox";
        
        const isInMods = modsItems.some(modId => {
          const cleanModId = modId.startsWith("\\") ? modId.substring(1) : modId;
          return cleanModId === subMod.id;
        });
        toggleInput.checked = isInMods;
        toggleInput.dataset.submodId = subMod.id;
        toggleInput.onchange = function() {
          const isChecked = this.checked;
          const submodId = this.dataset.submodId;
          
          if (isChecked) {
            const exists = modsItems.some(modId => {
              const cleanModId = modId.startsWith("\\") ? modId.substring(1) : modId;
              return cleanModId === submodId;
            });
            
            if (!exists) {
              const hasBackslash = modsItems.some(modId => modId.startsWith("\\"));
              const modIdToAdd = hasBackslash ? "\\" + submodId : submodId;
              modsItems.push(modIdToAdd);
            }
          } else {
            const index = modsItems.findIndex(modId => {
              const cleanModId = modId.startsWith("\\") ? modId.substring(1) : modId;
              return cleanModId === submodId;
            });
            
            if (index !== -1) {
              modsItems.splice(index, 1);
            }
          }
          
          renderMods();
        };
        
        const toggleSpan = document.createElement("span");
        toggleSpan.className = "toggle-slider";
        
        toggleLabel.appendChild(toggleInput);
        toggleLabel.appendChild(toggleSpan);
        toggleDiv.appendChild(toggleLabel);
        infoDiv.appendChild(toggleDiv);

        subModDiv.appendChild(infoDiv);
        subModsDiv.appendChild(subModDiv);
      });

      div.appendChild(subModsDiv);
    }

    container.appendChild(div);
  });
}

function renderMap() {
  renderListEditor("mapList", mapItems, "Map");
}

function renderListEditor(containerId, items, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  items.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "list-item";

    const indexSpan = document.createElement("span");
    indexSpan.className = "list-item-index";
    indexSpan.textContent = (index + 1);
    div.appendChild(indexSpan);

    const input = document.createElement("input");
    input.type = "text";
    input.className = "list-item-input";
    input.value = item;
    input.dataset.index = index;
    input.dataset.type = type;
    div.appendChild(input);

    const upBtn = document.createElement("button");
    upBtn.className = "list-button";
    upBtn.textContent = "↑";
    upBtn.title = "上移";
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveListItem(type, index, -1);
    div.appendChild(upBtn);

    const downBtn = document.createElement("button");
    downBtn.className = "list-button";
    downBtn.textContent = "↓";
    downBtn.title = "下移";
    downBtn.disabled = index === items.length - 1;
    downBtn.onclick = () => moveListItem(type, index, 1);
    div.appendChild(downBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "list-button delete";
    deleteBtn.textContent = "删除";
    deleteBtn.onclick = () => deleteListItem(type, index);
    div.appendChild(deleteBtn);

    container.appendChild(div);
  });
}

function addListItem(type) {
  currentAddType = type;
  
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogLabel = document.getElementById("dialogLabel");
  const dialogInput = document.getElementById("dialogInput");
  
  if (type === "Mods") {
    dialogTitle.textContent = "添加模组 (Mods)";
    dialogLabel.textContent = "模组ID";
    dialogInput.placeholder = "请输入模组ID";
  } else if (type === "WorkshopItems") {
    dialogTitle.textContent = "添加创意工坊项目 (WorkshopItems)";
    dialogLabel.textContent = "创意工坊ID";
    dialogInput.placeholder = "请输入创意工坊ID";
  } else if (type === "Map") {
    dialogTitle.textContent = "添加地图 (Map)";
    dialogLabel.textContent = "地图名称";
    dialogInput.placeholder = "请输入地图名称";
  }
  
  dialogInput.value = "";
  
  const dialog = document.getElementById("addItemDialog");
  dialog.classList.add("active");
  
  setTimeout(() => {
    dialogInput.focus();
  }, 100);
}

function hideDialog() {
  const dialog = document.getElementById("addItemDialog");
  dialog.classList.remove("active");
  currentAddType = null;
}

function confirmAddItem() {
  const inputValue = document.getElementById("dialogInput").value.trim();
  
  if (!inputValue) {
    return;
  }
  
  if (currentAddType === "Mods") {
    modsItems.push(inputValue);
    renderMods();
  } else if (currentAddType === "WorkshopItems") {
    workshopItemsItems.push(inputValue);
    renderWorkshopItems();
  } else if (currentAddType === "Map") {
    mapItems.push(inputValue);
    renderMap();
  }
  
  hideDialog();
}

function deleteListItem(type, index) {
  if (type === "Mods") {
    modsItems.splice(index, 1);
    renderMods();
  } else if (type === "WorkshopItems") {
    workshopItemsItems.splice(index, 1);
    renderWorkshopItems();
  } else if (type === "Map") {
    mapItems.splice(index, 1);
    renderMap();
  }
}

function moveListItem(type, index, direction) {
  if (type === "Mods") {
    const temp = modsItems[index];
    modsItems[index] = modsItems[index + direction];
    modsItems[index + direction] = temp;
    renderMods();
  } else if (type === "WorkshopItems") {
    const temp = workshopItemsItems[index];
    workshopItemsItems[index] = workshopItemsItems[index + direction];
    workshopItemsItems[index + direction] = temp;
    renderWorkshopItems();
  } else if (type === "Map") {
    const temp = mapItems[index];
    mapItems[index] = mapItems[index + direction];
    mapItems[index + direction] = temp;
    renderMap();
  }
}

function gatherConfigItems() {
  const items = [];

  const normalInputs = document.querySelectorAll("#normalItemsList .item-input");
  normalInputs.forEach((input) => {
    items.push({
      key: input.dataset.key,
      value: input.value,
    });
  });

  const toggleInputs = document.querySelectorAll("#normalItemsList .toggle input[type='checkbox']");
  toggleInputs.forEach((input) => {
    items.push({
      key: input.dataset.key,
      value: input.checked ? "true" : "false",
    });
  });

  items.push({
    key: "Mods",
    value: modsItems.filter((s) => s).join(";"),
  });

  items.push({
    key: "WorkshopItems",
    value: workshopItemsItems.filter((s) => s).join(";"),
  });

  items.push({
    key: "Map",
    value: mapItems.filter((s) => s).join(";"),
  });

  return items;
}

async function saveConfig() {
  const saveButton = document.getElementById("saveButton");
  saveButton.disabled = true;
  showToast("保存中...", "info");

  try {
    const items = gatherConfigItems();
    const response = await fetch(`/api/config?serverId=${encodeURIComponent(currentServerId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("文件被占用");
      }
      throw new Error(data.error?.message || `保存失败: ${response.status}`);
    }

    showToast("保存成功", "success");
    await loadConfig();
  } catch (error) {
    showToast("保存失败: " + error.message, "error");
    console.error(error);
  } finally {
    saveButton.disabled = false;
  }
}

function toggleCollapse(targetId) {
  const content = document.getElementById(targetId);
  const button = document.querySelector(`.collapse-button[data-target="${targetId}"]`);
  if (content && button) {
    const isCollapsed = content.style.display === "none";
    content.style.display = isCollapsed ? "block" : "none";
    button.textContent = isCollapsed ? "▼" : "▶";
  }
}

// ===== V2.1: 服务器管理 =====

async function loadServersConfig() {
  try {
    const response = await fetch("/api/servers-config");
    if (!response.ok) throw new Error("加载服务器配置失败");
    serversConfig = await response.json();
    
    // 更新当前服务器
    if (currentServerId) {
      currentServer = serversConfig.servers.find(s => s.id === currentServerId);
      if (!currentServer) {
        showToast("未找到指定的服务器实例", "error");
        return false;
      }
      updateHeaderInfo();
      updateInstanceInfo();
      updateGlobalConfigUI();
    }
    
    return true;
  } catch (error) {
    showToast("加载服务器配置失败: " + error.message, "error");
    return false;
  }
}

async function loadRuntimeStatus() {
  try {
    const response = await fetch("/api/servers/runtime");
    if (!response.ok) throw new Error("加载运行状态失败");
    runtimeSnapshot = await response.json();
    updateControlPanel();
  } catch (error) {
    console.error("加载运行状态失败:", error);
  }
}

function updateHeaderInfo() {
  const headerName = document.getElementById("headerServerName");
  if (currentServer) {
    headerName.textContent = currentServer.name;
    document.title = `PZ Server Manager - ${currentServer.name}`;
  }
}

function updateInstanceInfo() {
  if (!currentServer) return;
  
  document.getElementById("instanceId").textContent = currentServer.id;
  document.getElementById("instanceName").textContent = currentServer.name;
  document.getElementById("instanceIniPath").textContent = currentServer.iniPath;
  document.getElementById("instanceStartArgs").textContent = currentServer.startArgs.join(" ");
  document.getElementById("instanceStopCommands").textContent = currentServer.stopCommands.join(", ");
}

function updateGlobalConfigUI() {
  if (!serversConfig || !serversConfig.global) return;
  
  const global = serversConfig.global;
  document.getElementById("workshopPath").value = global.workshopPath || "";
  document.getElementById("startScriptPath").value = global.startScriptPath || "";
  document.getElementById("stopGraceTimeout").value = global.stopGraceTimeoutMs || 45000;
  document.getElementById("forceKillTimeout").value = global.forceKillTimeoutMs || 10000;
}

function updateControlPanel() {
  const runtime = runtimeSnapshot?.servers?.find(s => s.serverId === currentServerId);
  
  const statusEl = document.getElementById("selectedServerStatus");
  const startBtn = document.getElementById("startServerBtn");
  const stopBtn = document.getElementById("stopServerBtn");
  const infoEl = document.getElementById("controlInfo");
  const pidEl = document.getElementById("serverPid");
  const startedAtEl = document.getElementById("serverStartedAt");
  const sendBtn = document.getElementById("sendCommandBtn");

  const status = runtime?.status || "unknown";
  statusEl.textContent = getStatusText(status);
  statusEl.className = "server-status-badge " + status;

  const isRunning = status === "running";
  const isAnotherRunning = runtimeSnapshot?.activeServerId && runtimeSnapshot.activeServerId !== currentServerId;
  const isStartingOrStopping = status === "starting" || status === "stopping";

  startBtn.disabled = isRunning || isAnotherRunning || isStartingOrStopping;
  stopBtn.disabled = !isRunning || isStartingOrStopping;
  sendBtn.disabled = !isRunning;

  if (isRunning && runtime) {
    infoEl.style.display = "flex";
    pidEl.textContent = runtime.pid || "--";
    startedAtEl.textContent = runtime.startedAt ? new Date(runtime.startedAt).toLocaleString() : "--";
  } else {
    infoEl.style.display = "none";
  }
}

async function startServer() {
  if (!currentServerId) return;
  
  const btn = document.getElementById("startServerBtn");
  btn.disabled = true;
  showToast("正在启动服务器...", "info");
  
  try {
    const response = await fetch(`/api/servers/${encodeURIComponent(currentServerId)}/start`, {
      method: "POST"
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "启动失败");
    }
    
    runtimeSnapshot = data;
    showToast("服务器启动成功", "success");
    updateControlPanel();
    reconnectTerminal();
  } catch (error) {
    showToast("启动失败: " + error.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function stopServer() {
  if (!currentServerId) return;
  
  const btn = document.getElementById("stopServerBtn");
  btn.disabled = true;
  showToast("正在停止服务器...", "info");
  
  try {
    const response = await fetch(`/api/servers/${encodeURIComponent(currentServerId)}/stop`, {
      method: "POST"
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "停止失败");
    }
    
    runtimeSnapshot = data;
    showToast("服务器停止成功", "success");
    updateControlPanel();
  } catch (error) {
    showToast("停止失败: " + error.message, "error");
  }
}

// ===== 终端功能 =====

function reconnectTerminal() {
  // 关闭现有连接
  if (terminalEventSource) {
    terminalEventSource.close();
    terminalEventSource = null;
  }
  
  // 清空终端
  const output = document.getElementById("terminalOutput");
  output.innerHTML = '';
  
  if (!currentServerId) return;
  
  const runtime = runtimeSnapshot?.servers?.find(s => s.serverId === currentServerId);
  if (!runtime || runtime.status !== "running") {
    addTerminalLine({ stream: "system", text: "服务器未运行，无法连接终端" });
    return;
  }
  
  // 建立 SSE 连接
  const es = new EventSource(`/api/servers/${encodeURIComponent(currentServerId)}/terminal/stream`);
  
  es.onmessage = (event) => {
    try {
      const line = JSON.parse(event.data);
      addTerminalLine(line);
    } catch (e) {
      console.error("解析终端消息失败:", e);
    }
  };
  
  es.onerror = () => {
    addTerminalLine({ stream: "system", text: "终端连接断开，正在重连..." });
    es.close();
    setTimeout(reconnectTerminal, 3000);
  };
  
  terminalEventSource = es;
}

function addTerminalLine(line) {
  const output = document.getElementById("terminalOutput");
  const div = document.createElement("div");
  div.className = "terminal-line " + line.stream;
  
  const timestamp = line.timestamp ? new Date(line.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  div.innerHTML = `<span class="timestamp">[${timestamp}]</span>${escapeHtml(line.text)}`;
  
  output.appendChild(div);
  
  if (autoScroll) {
    output.scrollTop = output.scrollHeight;
  }
  
  // 限制行数
  while (output.children.length > 2000) {
    output.removeChild(output.firstChild);
  }
}

function clearTerminal() {
  const output = document.getElementById("terminalOutput");
  output.innerHTML = '';
}

async function sendCommands() {
  const input = document.getElementById("terminalInput");
  const text = input.value.trim();
  
  if (!text || !currentServerId) return;
  
  const runtime = runtimeSnapshot?.servers?.find(s => s.serverId === currentServerId);
  if (!runtime || runtime.status !== "running") {
    showToast("服务器未运行，无法发送命令", "error");
    return;
  }
  
  try {
    const response = await fetch(`/api/servers/${encodeURIComponent(currentServerId)}/terminal/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "发送失败");
    }
    
    if (data.successCount > 0) {
      input.value = "";
      hideCommandSuggestions();
    }
    
    if (data.errors && data.errors.length > 0) {
      showToast(`发送完成，${data.successCount} 行成功，${data.errors.length} 行失败`, "info");
    }
  } catch (error) {
    showToast("发送命令失败: " + error.message, "error");
  }
}

// ===== 命令补全 =====

async function fetchCommandSuggestions(prefix) {
  if (!prefix) {
    hideCommandSuggestions();
    return;
  }
  
  try {
    const response = await fetch(`/api/terminal/commands?prefix=${encodeURIComponent(prefix)}`);
    if (!response.ok) return;
    
    const suggestions = await response.json();
    showCommandSuggestions(suggestions);
  } catch (e) {
    hideCommandSuggestions();
  }
}

function showCommandSuggestions(suggestions) {
  const container = document.getElementById("commandSuggestions");
  
  if (!suggestions || suggestions.length === 0) {
    hideCommandSuggestions();
    return;
  }
  
  commandSuggestions = suggestions;
  selectedSuggestionIndex = -1;
  
  container.innerHTML = suggestions.map((cmd, index) => `
    <div class="command-suggestion-item" data-index="${index}">
      <span class="command-suggestion-name">${escapeHtml(cmd.command)}</span>
      <span class="command-suggestion-desc">${escapeHtml(cmd.description || "")}</span>
    </div>
  `).join("");
  
  container.classList.add("active");
  
  // 绑定点击事件
  container.querySelectorAll(".command-suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
      const idx = parseInt(item.dataset.index);
      selectSuggestion(idx);
    });
  });
}

function hideCommandSuggestions() {
  const container = document.getElementById("commandSuggestions");
  container.classList.remove("active");
  commandSuggestions = [];
  selectedSuggestionIndex = -1;
}

function selectSuggestion(index) {
  const suggestion = commandSuggestions[index];
  if (!suggestion) return;
  
  const input = document.getElementById("terminalInput");
  const lines = input.value.split("\n");
  const lastLine = lines[lines.length - 1];
  
  // 替换最后一行的前缀
  const words = lastLine.split(/\s+/);
  words[words.length - 1] = suggestion.command;
  lines[lines.length - 1] = words.join(" ");
  
  input.value = lines.join("\n");
  hideCommandSuggestions();
  input.focus();
}

function updateSuggestionSelection(delta) {
  const container = document.getElementById("commandSuggestions");
  if (!container.classList.contains("active")) return;
  
  const items = container.querySelectorAll(".command-suggestion-item");
  if (items.length === 0) return;
  
  selectedSuggestionIndex += delta;
  if (selectedSuggestionIndex < 0) selectedSuggestionIndex = items.length - 1;
  if (selectedSuggestionIndex >= items.length) selectedSuggestionIndex = 0;
  
  items.forEach((item, idx) => {
    item.classList.toggle("selected", idx === selectedSuggestionIndex);
  });
}

// ===== 全局设置 =====

async function saveGlobalConfig() {
  const saveButton = document.getElementById("saveGlobalConfigBtn");
  saveButton.disabled = true;
  showToast("保存全局设置中...", "info");

  try {
    const globalConfig = {
      workshopPath: document.getElementById("workshopPath").value.trim(),
      startScriptPath: document.getElementById("startScriptPath").value.trim(),
      stopGraceTimeoutMs: parseInt(document.getElementById("stopGraceTimeout").value, 10) || 45000,
      forceKillTimeoutMs: parseInt(document.getElementById("forceKillTimeout").value, 10) || 10000,
    };

    const response = await fetch("/api/global-config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(globalConfig),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "保存失败");
    }

    // 更新本地配置
    serversConfig.global = await response.json();
    showToast("全局设置保存成功", "success");
  } catch (error) {
    showToast("保存失败: " + error.message, "error");
    console.error(error);
  } finally {
    saveButton.disabled = false;
  }
}

// ===== 工具函数 =====

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getStatusText(status) {
  const map = {
    stopped: "已停止",
    starting: "启动中",
    running: "运行中",
    stopping: "停止中",
    error: "错误",
    unknown: "未知"
  };
  return map[status] || status;
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-tab`).classList.add("active");
  
  if (tabName === "config") {
    loadConfig();
  }
}

function goBack() {
  window.location.href = "/instance-select.html";
}

// ===== 事件绑定 =====

document.addEventListener("DOMContentLoaded", async () => {
  // 从 URL 参数获取 serverId
  currentServerId = getUrlParam("serverId");
  
  if (!currentServerId) {
    showToast("未指定服务器实例，正在返回选择页面...", "error");
    setTimeout(goBack, 2000);
    return;
  }
  
  // 初始化
  const loaded = await loadServersConfig();
  if (!loaded) {
    setTimeout(goBack, 2000);
    return;
  }
  
  await loadRuntimeStatus();
  
  // 定期刷新状态
  setInterval(loadRuntimeStatus, 2000);
  
  // 返回按钮
  document.getElementById("backButton").addEventListener("click", goBack);
  
  // Tab 切换
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });
  
  // 保存配置
  document.getElementById("saveButton").addEventListener("click", saveConfig);
  
  // 服务器控制
  document.getElementById("startServerBtn").addEventListener("click", startServer);
  document.getElementById("stopServerBtn").addEventListener("click", stopServer);
  
  // 终端控制
  document.getElementById("autoScrollToggle").addEventListener("change", (e) => {
    autoScroll = e.target.checked;
  });
  document.getElementById("clearTerminalBtn").addEventListener("click", clearTerminal);
  document.getElementById("reconnectTerminalBtn").addEventListener("click", reconnectTerminal);
  document.getElementById("sendCommandBtn").addEventListener("click", sendCommands);
  
  // 终端输入
  const terminalInput = document.getElementById("terminalInput");
  terminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCommands();
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        selectSuggestion(selectedSuggestionIndex);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      updateSuggestionSelection(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateSuggestionSelection(-1);
    } else if (e.key === "Escape") {
      hideCommandSuggestions();
    }
  });
  
  terminalInput.addEventListener("input", (e) => {
    const lines = e.target.value.split("\n");
    const lastLine = lines[lines.length - 1];
    const words = lastLine.split(/\s+/);
    const lastWord = words[words.length - 1];
    
    // 延迟获取补全建议
    clearTimeout(window.suggestionTimeout);
    window.suggestionTimeout = setTimeout(() => {
      fetchCommandSuggestions(lastWord);
    }, 200);
  });
  
  // 全局设置
  document.getElementById("saveGlobalConfigBtn").addEventListener("click", saveGlobalConfig);
  
  // 配置管理
  document.querySelectorAll(".add-button").forEach((button) => {
    button.addEventListener("click", () => {
      addListItem(button.dataset.type);
    });
  });

  document.querySelectorAll(".collapse-button").forEach((button) => {
    button.addEventListener("click", () => {
      toggleCollapse(button.dataset.target);
    });
  });

  // 添加项目对话框
  document.getElementById("closeDialog").addEventListener("click", hideDialog);
  document.getElementById("cancelDialog").addEventListener("click", hideDialog);
  document.getElementById("confirmDialog").addEventListener("click", confirmAddItem);
  
  document.getElementById("addItemDialog").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      hideDialog();
    }
  });
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideDialog();
      hideCommandSuggestions();
    }
  });
  
  document.getElementById("dialogInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      confirmAddItem();
    }
  });
});
