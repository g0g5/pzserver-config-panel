let configData = null;
let normalItems = [];
let modsItems = [];
let workshopItemsItems = [];
let mapItems = [];

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
  mapItems = [];

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

  renderNormalItems();
  renderMods();
  renderWorkshopItems();
  renderMap();
}

function renderNormalItems() {
  const container = document.getElementById("normalItemsList");
  container.innerHTML = "";

  normalItems.forEach((item) => {
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

    const input = document.createElement("input");
    input.type = "text";
    input.className = "item-input";
    input.value = item.value;
    input.dataset.key = item.key;
    div.appendChild(input);

    container.appendChild(div);
  });
}

function renderMods() {
  renderListEditor("modsList", modsItems, "Mods");
}

function renderWorkshopItems() {
  renderListEditor("workshopItemsList", workshopItemsItems, "WorkshopItems");
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

document.addEventListener("DOMContentLoaded", () => {
  loadConfig();

  document.getElementById("saveButton").addEventListener("click", saveConfig);

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
});
