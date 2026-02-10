let configData = null;
let normalItems = [];
let modsItems = [];
let workshopItemsItems = [];
let workshopItemsData = [];
let mapItems = [];
let groupedNormalItems = {};

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

function setStatus(message, type = "") {
  const footer = document.getElementById("statusMessage");
  footer.textContent = message;
  footer.className = "status-message " + type;
}

function setConnectionStatus(connected) {
  const status = document.getElementById("connectionStatus");
  status.className = "status-indicator " + (connected ? "connected" : "disconnected");
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    configData = await response.json();
    setConnectionStatus(true);
    setStatus("配置加载成功", "success");
    renderConfig();
  } catch (error) {
    setConnectionStatus(false);
    setStatus("加载失败: " + error.message, "error");
    console.error(error);
  }
}

function renderConfig() {
  if (!configData) return;

  document.getElementById("configPath").textContent = configData.configPath;

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

  // 分组普通配置项
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

  // 渲染已定义分组
  Object.keys(ITEM_GROUPS).forEach(groupKey => {
    const groupItems = groupedNormalItems[groupKey];
    if (groupItems.length > 0) {
      renderItemGroup(container, groupKey, ITEM_GROUPS[groupKey].name, groupItems);
    }
  });

  // 渲染未分组的项目
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
          posterImg.src = "/api/workshop-poster?path=" + encodeURIComponent(subMod.poster);
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
        
        // 检查 mods 列表中是否存在该 submod id（忽略以 \ 开头的前缀）
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
            // 检查是否已存在（忽略以 \ 开头的前缀）
            const exists = modsItems.some(modId => {
              const cleanModId = modId.startsWith("\\") ? modId.substring(1) : modId;
              return cleanModId === submodId;
            });
            
            if (!exists) {
              // 自动添加，保持与现有格式一致
              const hasBackslash = modsItems.some(modId => modId.startsWith("\\"));
              const modIdToAdd = hasBackslash ? "\\" + submodId : submodId;
              modsItems.push(modIdToAdd);
            }
          } else {
            // 移除所有匹配的 id（包括带 \ 前缀的）
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
  if (type === "Mods") {
    modsItems.push("");
    renderMods();
  } else if (type === "WorkshopItems") {
    workshopItemsItems.push("");
    renderWorkshopItems();
  } else if (type === "Map") {
    mapItems.push("");
    renderMap();
  }
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
  setStatus("保存中...", "");

  try {
    const items = gatherConfigItems();
    const response = await fetch("/api/config", {
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

    setStatus("保存成功", "success");
    await loadConfig();
  } catch (error) {
    setStatus("保存失败: " + error.message, "error");
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

document.addEventListener("DOMContentLoaded", async () => {
  loadConfig();
  await loadPaths();

  document.getElementById("saveButton").addEventListener("click", saveConfig);
  document.getElementById("savePathsButton").addEventListener("click", savePaths);

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

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });
});

function switchTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-tab`).classList.add("active");
}

async function loadPaths() {
  try {
    const response = await fetch("/api/paths");
    if (response.ok) {
      const paths = await response.json();
      document.getElementById("workshopPath").value = paths.workshopPath || "";
      document.getElementById("iniFilePath").value = paths.iniFilePath || "";
    } else {
      // 如果API调用失败，尝试从本地存储加载
      const workshopPath = localStorage.getItem("workshopPath");
      const iniFilePath = localStorage.getItem("iniFilePath");

      if (workshopPath) {
        document.getElementById("workshopPath").value = workshopPath;
      }
      if (iniFilePath) {
        document.getElementById("iniFilePath").value = iniFilePath;
      }
    }
  } catch (error) {
    console.error("加载路径设置失败:", error);
    // 从本地存储加载作为后备
    const workshopPath = localStorage.getItem("workshopPath");
    const iniFilePath = localStorage.getItem("iniFilePath");

    if (workshopPath) {
      document.getElementById("workshopPath").value = workshopPath;
    }
    if (iniFilePath) {
      document.getElementById("iniFilePath").value = iniFilePath;
    }
  }
}

async function savePaths() {
  const saveButton = document.getElementById("savePathsButton");
  saveButton.disabled = true;
  setStatus("保存路径设置中...", "");

  try {
    const workshopPath = document.getElementById("workshopPath").value;
    const iniFilePath = document.getElementById("iniFilePath").value;

    // 保存到本地存储作为后备
    localStorage.setItem("workshopPath", workshopPath);
    localStorage.setItem("iniFilePath", iniFilePath);

    // 发送到后端API
    const response = await fetch("/api/paths", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workshopPath, iniFilePath }),
    });

    if (!response.ok) {
      throw new Error("保存到服务器失败");
    }

    setStatus("路径设置保存成功", "success");
  } catch (error) {
    setStatus("保存失败: " + error.message, "error");
    console.error(error);
  } finally {
    saveButton.disabled = false;
  }
}
