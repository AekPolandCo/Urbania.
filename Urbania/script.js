(() => {
  "use strict";

  const columns = 36;
  const rows = 28;
  const costs = {};
  const names = {};
  const catalog = [];
  const mechanics = {};

  const baseCatalog = [
    ["home", "homes", "Cozy home", 80, "neighbors", 4],
    ["apartment", "homes", "Apartment", 240, "neighbors", 8],
    ["shop", "shops", "Corner shop", 140, "income", 12],
    ["market", "shops", "Town market", 190, "income", 16],
    ["florist", "shops", "Flower shop", 160, "income", 14],
    ["park", "parks", "Little park", 100, "happiness", 8],
    ["garden", "parks", "Flower garden", 150, "happiness", 10],
    ["road", "roads", "Road", 20, "traffic", 1],
    ["cafe", "food", "Sunny café", 180, "income", 18],
    ["restaurant", "food", "Restaurant", 240, "income", 24],
    ["bakery", "food", "Neighborhood bakery", 210, "income", 20],
    ["center", "community", "Community center", 220, "happiness", 10],
    ["library", "community", "Little library", 200, "happiness", 12],
    ["school", "community", "Neighborhood school", 260, "happiness", 10],
    ["clinic", "community", "Community clinic", 280, "happiness", 12],
  ];

  const categoryNames = {
    homes: ["Cottage", "Townhouse", "Villa", "Loft", "Row house", "Mansion", "Garden home", "Family house"],
    roads: ["Avenue", "Boulevard", "Lane", "Street", "Crescent", "Promenade", "Route", "Way"],
    parks: ["Pocket park", "Botanical park", "Meadow", "Commons", "Playground", "Forest garden", "Riverside park", "Urban plaza"],
    food: ["Bistro", "Diner", "Tea house", "Pizzeria", "Pub", "Juice bar", "Noodle shop", "Ice cream parlor"],
    shops: ["Boutique", "Hardware store", "Bookshop", "Toy store", "Music shop", "Pet store", "Supermarket", "Sports shop"],
    community: ["Fire station", "Police station", "Museum", "Theater", "Town hall", "Stadium", "Hospital", "Transit station"],
  };

  for (let index = 0; index < baseCatalog.length; index += 1) {
    const [type, category, name, cost, mechanic, value] = baseCatalog[index];
    catalog.push({ type, category, name, cost, mechanic, value, textureSeed: index + 1 });
  }

  const categoryTargets = { homes: 31, parks: 31, food: 31, shops: 31, community: 41 };
  let generated = 0;
  for (const [category, target] of Object.entries(categoryTargets)) {
    for (let index = 1; index <= target; index += 1) {
      const pool = categoryNames[category];
      const name = `${pool[(index - 1) % pool.length]} ${index}`;
      const type = `${category.slice(0, -1)}-${String(index).padStart(3, "0")}`;
      let cost;
      let mechanic;
      let value;
      if (category === "homes") {
        cost = 90 + index * 18;
        mechanic = "neighbors";
        value = 4 + (index % 4) * 2;
      } else if (category === "parks") {
        cost = 110 + index * 12;
        mechanic = "happiness";
        value = 6 + (index % 5);
      } else if (category === "food") {
        cost = 170 + index * 13;
        mechanic = "income";
        value = 14 + (index % 8) * 2;
      } else if (category === "shops") {
        cost = 145 + index * 11;
        mechanic = "income";
        value = 10 + (index % 7) * 2;
      } else {
        cost = 210 + index * 15;
        mechanic = "happiness";
        value = 8 + (index % 6);
      }
      catalog.push({ type, category, name, cost, mechanic, value, textureSeed: 100 + catalog.length });
      generated += 1;
    }
  }

  for (let index = 1; index <= 20; index += 1) {
    const prefix = ["Maple", "Oak", "City", "Garden", "Grand", "Market", "Lake", "Sunset"][((index - 1) % 8)];
    catalog.push({
      type: `road-${String(index).padStart(2, "0")}`,
      category: "roads",
      name: `${prefix} ${categoryNames.roads[(index - 1) % categoryNames.roads.length]}`,
      cost: 20 + ((index - 1) % 5) * 5,
      mechanic: "traffic",
      value: 1 + (index % 4),
      textureSeed: 500 + index,
    });
  }

  for (const item of catalog) {
    costs[item.type] = item.cost;
    names[item.type] = item.name;
    mechanics[item.type] = { mechanic: item.mechanic, value: item.value, textureSeed: item.textureSeed };
  }
  const canvas = document.getElementById("city-canvas");
  const context = canvas.getContext("2d");
  const cells = new Map();
  const canvasBounds = { width: 0, height: 0 };
  const homeLocations = [[5, 5], [6, 5], [7, 5]];
  const roadLocations = [
    [4, 4], [5, 4], [6, 4], [7, 4], [8, 4],
    [4, 5], [8, 5], [4, 6], [8, 6],
    [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
    [4, 8], [8, 8], [4, 9], [8, 9],
    [5, 10], [6, 10], [7, 10], [6, 8], [6, 9],
    [5, 11], [6, 11], [7, 11], [6, 12],
  ];

  for (const [x, y] of roadLocations) cells.set(key(x, y), { type: "road" });
  for (const [x, y] of homeLocations) cells.set(key(x, y), { type: "home", residents: 4 });
  cells.set(key(3, 5), { type: "shop" });
  cells.set(key(6, 3), { type: "park" });

  let funds = 1200;
  let day = 1;
  let happiness = 82;
  let selectedTool = "select";
  let eraseMode = false;
  let zoom = 1;
  let isPainting = false;
  let lastPainted = "";
  let lastToastAt = 0;
  let toastTimer;
  let tickTimer;
  let gameSpeed = 1;
  let paused = false;
  let goalRewarded = false;
  let soundEnabled = false;
  let audioContext;
  let streetTime = 0;
  let researchPoints = 0;
  let researchLevel = 1;
  const completedResearch = new Set();
  const researchCatalog = [
    { id: "green-city", name: "Green districts", description: "+4 happiness", cost: 40 },
    { id: "tax-office", name: "Modern taxation", description: "+15% income", cost: 65 },
    { id: "smart-roads", name: "Smart roads", description: "Road upkeep reduced", cost: 90 },
    { id: "urban-planning", name: "Urban planning", description: "City tiles cost 10% less", cost: 120 },
    { id: "solar-grid", name: "Solar energy", description: "+25 daily funds", cost: 160 },
  ];

  const buildOptions = document.querySelector(".build-options");
  buildOptions.innerHTML = "";

  for (const item of catalog) {
    const button = document.createElement("button");
    button.className = "build-option";
    button.dataset.tool = item.type;
    button.dataset.category = item.category;
    button.setAttribute("aria-pressed", "false");
    const detail = item.mechanic === "neighbors"
      ? `+${item.value} neighbors`
      : item.mechanic === "income"
        ? `Earns $${item.value} / day`
        : item.mechanic === "happiness"
          ? `Boosts happiness +${item.value}%`
          : `Traffic bonus +${item.value}`;
    button.innerHTML = `<span class="option-art" aria-hidden="true">◆</span><span class="option-copy"><strong></strong><small></small></span><span class="option-cost">$${item.cost}</span>`;
    button.querySelector("strong").textContent = item.name;
    button.querySelector("small").textContent = detail;
    buildOptions.appendChild(button);
  }

  const inspectButton = document.createElement("button");
  inspectButton.className = "build-option selected";
  inspectButton.dataset.tool = "select";
  inspectButton.setAttribute("aria-pressed", "true");
  inspectButton.innerHTML = '<span class="option-art cursor-art" aria-hidden="true"><span>↖</span></span><span class="option-copy"><strong>Inspect</strong><small>Look around</small></span><span class="shortcut">Q</span>';
  buildOptions.prepend(inspectButton);

  const toolButtons = [...document.querySelectorAll(".build-option")];
  const categoryButtons = [...document.querySelectorAll(".build-category")];
  const toast = document.getElementById("toast");
  const mayorMessage = document.getElementById("mayor-message");
  const diaryList = document.getElementById("diary-list");
  const mapZoomLabel = document.querySelector(".map-zoom-label");
  let selectedCategory = "homes";

  function key(x, y) {
    return `${x},${y}`;
  }

  function getCounts() {
    const counts = { residents: 0 };
    for (const item of catalog) counts[item.type] = 0;
    counts.road = counts.road || 0;
    for (const cell of cells.values()) {
      counts[cell.type] = (counts[cell.type] || 0) + 1;
      if (cell.type === "home" || cell.type === "apartment" || mechanics[cell.type]?.mechanic === "neighbors") {
        counts.residents += cell.residents || mechanics[cell.type]?.value || 4;
      }
    }
    return counts;
  }

  function hasNearbyRoad(x, y) {
    return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
      .some(([nx, ny]) => {
        const type = cells.get(key(nx, ny))?.type;
        return type === "road" || type?.startsWith("road-");
      });
  }

  function dailyIncome(counts = getCounts()) {
    let income = counts.residents;
    for (const [position, cell] of cells) {
      const detail = mechanics[cell.type];
      if (detail?.mechanic === "income") {
        const [x, y] = position.split(",").map(Number);
        income += hasNearbyRoad(x, y) ? Math.round(detail.value * 1.15) : detail.value;
      }
      if (detail?.mechanic === "happiness" && detail.value >= 8) income -= Math.ceil(detail.value / 8);
    }
    let roadCount = 0;
    for (const cell of cells.values()) {
      if (cell.type === "road" || cell.type?.startsWith("road-")) roadCount += 1;
    }
    if (completedResearch.has("tax-office")) income = Math.round(income * 1.15);
    if (completedResearch.has("smart-roads")) income += 8;
    else income -= Math.floor(roadCount / 20);
    if (completedResearch.has("solar-grid")) income += 25;
    return income;
  }

  function calculateHappiness(counts = getCounts()) {
    let disconnectedHomes = 0;
    let bonus = 0;
    for (const [position, cell] of cells) {
      const detail = mechanics[cell.type];
      if (detail?.mechanic === "happiness") bonus += detail.value;
      if (detail?.mechanic !== "neighbors" && cell.type !== "home" && cell.type !== "apartment") continue;
      const [x, y] = position.split(",").map(Number);
      if (!hasNearbyRoad(x, y)) disconnectedHomes += 1;
    }
    if (completedResearch.has("green-city")) bonus += 4;
    return Math.max(12, Math.min(100, 72 + bonus - disconnectedHomes * 12));
  }

  function updateStats() {
    const counts = getCounts();
    happiness = calculateHappiness(counts);
    document.getElementById("money-value").textContent = `$${funds.toLocaleString()}`;
    document.getElementById("income-value").textContent = `${dailyIncome(counts) >= 0 ? "+" : "−"}$${Math.abs(dailyIncome(counts))} / day`;
    document.getElementById("income-value").classList.toggle("positive", dailyIncome(counts) >= 0);
    document.getElementById("population-value").textContent = counts.residents.toLocaleString();
    const homes = counts.home + counts.apartment;
    document.getElementById("homes-value").textContent = `${homes} ${homes === 1 ? "home" : "homes"}`;
    document.getElementById("happiness-value").textContent = `${happiness}%`;
    document.getElementById("happiness-meter").style.width = `${happiness}%`;
    document.getElementById("land-value").textContent = `${Math.round(cells.size / (columns * rows) * 100)}%`;
    document.getElementById("tiles-value").textContent = `${cells.size} / ${columns * rows} tiles`;
    document.getElementById("research-value").textContent = `${researchPoints} RP`;
    document.getElementById("research-level").textContent = `Tier ${researchLevel}`;
    document.getElementById("day-label").textContent = `Day ${day}`;
    const cyclePhase = day % 4;
    const phases = {
      1: ["Morning", "🌅"],
      2: ["Sunny", "☀"],
      3: ["Golden hour", "🌇"],
      0: ["Night", "☾"],
    };
    document.getElementById("phase-label").textContent = phases[cyclePhase][0];
    document.getElementById("weather-icon").textContent = phases[cyclePhase][1];
    document.querySelector(".map-frame").classList.toggle("night", cyclePhase === 0);

    const goalProgress = Math.min(counts.home / 5, 1);
    document.getElementById("goal-meter").style.width = `${goalProgress * 100}%`;
    document.getElementById("goal-count").textContent = `${Math.min(counts.home, 5)} of 5 homes`;
    if (counts.home >= 5 && !goalRewarded) {
      funds += 150;
      goalRewarded = true;
      addDiaryEntry("goal", "You made room for a new neighborhood! +$150", "Just now");
      showToast("Little goal complete! You earned $150.");
      updateStats();
      saveGame();
      return;
    }

    if (counts.home >= 5) {
      mayorMessage.textContent = "Five cozy homes! Maplewood is growing into a real little neighborhood.";
    } else if (counts.shop === 0) {
      mayorMessage.textContent = "Your neighbors could use a little corner shop to pick up their everyday bits and bobs.";
    } else if (counts.park === 0) {
      mayorMessage.textContent = "A little green space can make a big difference to a growing neighborhood.";
    } else {
      mayorMessage.textContent = "Your first little neighborhood is already taking shape. Let’s give those homes a road to call their own!";
    }
  }

  function addDiaryEntry(kind, message, when = "Just now") {
    const iconByKind = {
      home: ["⌂", "diary-home"], apartment: ["▥", "diary-home"], shop: ["▤", "diary-home"],
      market: ["▧", "diary-home"], florist: ["❀", "diary-flower"],
      park: ["✿", "diary-flower"], garden: ["✿", "diary-flower"], road: ["┄", "diary-home"],
      cafe: ["☕", "diary-home"], restaurant: ["♨", "diary-home"], bakery: ["♧", "diary-home"],
      center: ["★", "diary-flower"], library: ["▤", "diary-flower"], school: ["⌂", "diary-home"],
      clinic: ["✚", "diary-flower"], goal: ["✧", "diary-sun"], sun: ["☀", "diary-sun"],
    };
    const [icon, iconClass] = iconByKind[kind] || iconByKind.sun;
    const entry = document.createElement("div");
    entry.className = "diary-entry";
    entry.innerHTML = `<span class="diary-icon ${iconClass}" aria-hidden="true">${icon}</span><div><p></p><small>${when}</small></div>`;
    entry.querySelector("p").textContent = message;
    diaryList.prepend(entry);
    while (diaryList.children.length > 4) diaryList.lastElementChild.remove();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 1900);
  }

  function saveGame() {
    try {
      localStorage.setItem("urbania-save-v1", JSON.stringify({
        funds, day, happiness, goalRewarded,
        researchPoints, researchLevel, completedResearch: [...completedResearch],
        cells: [...cells].map(([position, cell]) => [position, cell]),
      }));
      document.querySelector(".autosave").innerHTML = '<span class="save-dot"></span> All changes saved';
    } catch (error) {
      console.warn("Urbania could not save this game in local storage.", error);
      document.querySelector(".autosave").textContent = "Could not save";
    }
  }

  function loadGame() {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem("urbania-save-v1"));
    } catch (error) {
      console.warn("Urbania found an unreadable saved game and started a new town.", error);
      return;
    }
    if (!saved || !Array.isArray(saved.cells)) return;
    const restored = new Map();
    for (const entry of saved.cells) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string") continue;
      const match = /^(\d+),(\d+)$/.exec(entry[0]);
      const cell = entry[1];
      if (!match || Number(match[1]) >= columns || Number(match[2]) >= rows) continue;
      if (!cell || !costs[cell.type]) continue;
      restored.set(entry[0], mechanics[cell.type]?.mechanic === "neighbors"
        ? { type: cell.type, residents: Number.isFinite(cell.residents)
          ? Math.max(mechanics[cell.type].value, Math.min(mechanics[cell.type].value * 2, cell.residents))
          : mechanics[cell.type].value }
        : { type: cell.type });
    }
    if (restored.size) {
      cells.clear();
      for (const [position, cell] of restored) cells.set(position, cell);
    }
    if (Number.isFinite(saved.funds)) funds = Math.max(0, Math.floor(saved.funds));
    if (Number.isFinite(saved.day)) day = Math.max(1, Math.floor(saved.day));
    if (Number.isFinite(saved.researchPoints)) researchPoints = Math.max(0, Math.floor(saved.researchPoints));
    if (Number.isFinite(saved.researchLevel)) researchLevel = Math.max(1, Math.floor(saved.researchLevel));
    if (Array.isArray(saved.completedResearch)) {
      completedResearch.clear();
      for (const id of saved.completedResearch) {
        if (researchCatalog.some((item) => item.id === id)) completedResearch.add(id);
      }
    }
    goalRewarded = Boolean(saved.goalRewarded);
  }

  function playBuildSound() {
    if (!soundEnabled) return;
    try {
      audioContext ||= new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(640, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.07);
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.11);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.12);
    } catch (error) {
      console.warn("Urbania could not play the placement sound.", error);
    }
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    canvasBounds.width = bounds.width;
    canvasBounds.height = bounds.height;
    canvas.width = Math.round(bounds.width * pixelRatio);
    canvas.height = Math.round(bounds.height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
  }

  function getTileSize() {
    return Math.min((canvasBounds.width - 30) / columns, (canvasBounds.height - 30) / rows) * zoom;
  }

  function getMapBounds() {
    const tile = getTileSize();
    return {
      tile,
      left: (canvasBounds.width - columns * tile) / 2,
      top: (canvasBounds.height - rows * tile) / 2,
    };
  }

  function roundedRect(x, y, width, height, radius) {
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(x, y, width, height, radius);
      return;
    }
    const corner = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.moveTo(x + corner, y);
    context.lineTo(x + width - corner, y);
    context.quadraticCurveTo(x + width, y, x + width, y + corner);
    context.lineTo(x + width, y + height - corner);
    context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
    context.lineTo(x + corner, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - corner);
    context.lineTo(x, y + corner);
    context.quadraticCurveTo(x, y, x + corner, y);
    context.closePath();
  }

  function drawTerrain(x, y, size) {
    const seed = (x * 73 + y * 137 + x * y * 19) % 17;
    const palette = ["#dcebd4", "#deecd5", "#daead2", "#e0edd7"];
    context.fillStyle = palette[seed % palette.length];
    roundedRect(x, y, size, size, 1);
    context.fill();
    if (seed % 5 === 0) {
      context.fillStyle = "rgba(255,255,255,.32)";
      context.beginPath();
      context.arc(x + size * (.2 + seed % 4 * .12), y + size * (.3 + seed % 3 * .13), size * .035, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.arc(x + size * .77, y + size * .72, size * .025, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = "rgba(115,151,108,.13)";
    context.lineWidth = .65;
    context.strokeRect(x, y, size, size);
  }

  function drawRoad(x, y, size, gx, gy, variant = "road") {
    context.fillStyle = "#d5d1c5";
    context.fillRect(x, y, size, size);
    const isRoad = (nx, ny) => {
      const type = cells.get(key(nx, ny))?.type;
      return type === "road" || type?.startsWith("road-");
    };
    const neighbors = {
      left: isRoad(gx - 1, gy),
      right: isRoad(gx + 1, gy),
      top: isRoad(gx, gy - 1),
      bottom: isRoad(gx, gy + 1),
    };
    const roadNumber = Number(variant.replace("road-", "")) || 0;
    context.fillStyle = ["#aaa99e", "#9da69c", "#b2a98f", "#9eaaa7", "#b4aaa0"][roadNumber % 5];
    context.fillRect(x + size * .12, y + size * .12, size * .76, size * .76);
    context.fillStyle = "#bbb9ae";
    const center = size * .39;
    const thickness = size * .22;
    if (neighbors.left || neighbors.right) context.fillRect(x, y + center, size, thickness);
    if (neighbors.top || neighbors.bottom) context.fillRect(x + center, y, thickness, size);
    if (!neighbors.left && !neighbors.right && !neighbors.top && !neighbors.bottom) {
      context.fillRect(x, y + center, size, thickness);
    }
    context.strokeStyle = "rgba(255,248,215,.82)";
    context.lineWidth = Math.max(1, size * .027);
    context.setLineDash([size * .105, size * .09]);
    context.beginPath();
    if (neighbors.left || neighbors.right || (!neighbors.top && !neighbors.bottom)) {
      context.moveTo(x + size * .1, y + size * .5);
      context.lineTo(x + size * .9, y + size * .5);
    }
    if (neighbors.top || neighbors.bottom) {
      context.moveTo(x + size * .5, y + size * .1);
      context.lineTo(x + size * .5, y + size * .9);
    }
    context.stroke();
    context.setLineDash([]);
  }

  function drawHome(x, y, size, residents = 4) {
    const unit = size / 50;
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .51, y + size * .8, size * .32, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f4e3bf";
    context.fillRect(x + size * .22, y + size * .47, size * .57, size * .32);
    context.fillStyle = "#c97551";
    context.beginPath();
    context.moveTo(x + size * .16, y + size * .5);
    context.lineTo(x + size * .48, y + size * .23);
    context.lineTo(x + size * .84, y + size * .5);
    context.closePath();
    context.fill();
    context.fillStyle = "#fff6e2";
    context.fillRect(x + size * .22, y + size * .48, size * .57, size * .045);
    context.fillStyle = "#88a8ae";
    roundedRect(x + size * .3, y + size * .54, size * .13, size * .12, size * .018);
    context.fill();
    roundedRect(x + size * .57, y + size * .54, size * .13, size * .12, size * .018);
    context.fill();
    context.fillStyle = "#a96c49";
    context.fillRect(x + size * .45, y + size * .64, size * .13, size * .15);
    context.fillStyle = "#e9c584";
    context.fillRect(x + size * .55, y + size * .7, size * .025, size * .025);
    if (residents > 4) {
      context.fillStyle = "#618974";
      context.beginPath();
      context.arc(x + size * .75, y + size * .41, size * .035, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawShop(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .51, y + size * .8, size * .33, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e8e2d3";
    context.fillRect(x + size * .17, y + size * .43, size * .67, size * .36);
    context.fillStyle = "#7188b9";
    context.fillRect(x + size * .15, y + size * .37, size * .7, size * .13);
    for (let stripe = 0; stripe < 5; stripe += 1) {
      context.fillStyle = stripe % 2 ? "#f8f2e7" : "#df9a72";
      context.fillRect(x + size * (.17 + stripe * .14), y + size * .37, size * .07, size * .13);
    }
    context.fillStyle = "#b1d0d0";
    context.fillRect(x + size * .24, y + size * .55, size * .2, size * .16);
    context.fillStyle = "#5d8193";
    context.fillRect(x + size * .49, y + size * .53, size * .26, size * .26);
    context.fillStyle = "#f5e1b5";
    context.fillRect(x + size * .55, y + size * .58, size * .14, size * .025);
    context.restore();
  }

  function drawPark(x, y, size) {
    context.save();
    context.fillStyle = "#b9d6a5";
    roundedRect(x + size * .1, y + size * .1, size * .8, size * .8, size * .13);
    context.fill();
    context.strokeStyle = "#f3edc9";
    context.lineWidth = size * .045;
    context.beginPath();
    context.moveTo(x + size * .2, y + size * .73);
    context.quadraticCurveTo(x + size * .48, y + size * .51, x + size * .79, y + size * .26);
    context.stroke();
    context.fillStyle = "#f6db87";
    context.beginPath();
    context.arc(x + size * .49, y + size * .36, size * .17, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#896342";
    context.fillRect(x + size * .47, y + size * .37, size * .045, size * .19);
    context.fillStyle = "#568460";
    context.beginPath();
    context.arc(x + size * .48, y + size * .29, size * .14, 0, Math.PI * 2);
    context.arc(x + size * .4, y + size * .35, size * .095, 0, Math.PI * 2);
    context.arc(x + size * .56, y + size * .36, size * .09, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff8e4";
    context.beginPath();
    context.arc(x + size * .73, y + size * .68, size * .035, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawCafe(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .51, y + size * .79, size * .34, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f1d7aa";
    context.fillRect(x + size * .18, y + size * .43, size * .64, size * .36);
    context.fillStyle = "#bd7454";
    context.fillRect(x + size * .16, y + size * .35, size * .68, size * .12);
    context.fillStyle = "#fff4dc";
    for (let i = 0; i < 4; i += 1) context.fillRect(x + size * (.18 + i * .16), y + size * .35, size * .08, size * .12);
    context.fillStyle = "#718f96";
    context.fillRect(x + size * .25, y + size * .53, size * .19, size * .18);
    context.fillRect(x + size * .57, y + size * .53, size * .17, size * .18);
    context.fillStyle = "#fff5cf";
    context.beginPath();
    context.arc(x + size * .68, y + size * .27, size * .055, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawApartment(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .5, y + size * .83, size * .35, size * .08, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e7d9ec";
    context.fillRect(x + size * .2, y + size * .2, size * .6, size * .62);
    context.fillStyle = "#9c7eb2";
    context.fillRect(x + size * .16, y + size * .16, size * .68, size * .1);
    context.fillStyle = "#8299a0";
    for (let floor = 0; floor < 3; floor += 1) {
      for (let window = 0; window < 2; window += 1) {
        context.fillRect(x + size * (.3 + window * .27), y + size * (.33 + floor * .14), size * .12, size * .08);
      }
    }
    context.fillStyle = "#886d89";
    context.fillRect(x + size * .45, y + size * .66, size * .13, size * .16);
    context.restore();
  }

  function drawRestaurant(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .51, y + size * .8, size * .34, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f0d7c3";
    context.fillRect(x + size * .18, y + size * .43, size * .64, size * .36);
    context.fillStyle = "#a85d4d";
    context.fillRect(x + size * .15, y + size * .34, size * .7, size * .14);
    context.fillStyle = "#f8edd9";
    for (let stripe = 0; stripe < 4; stripe += 1) {
      context.fillRect(x + size * (.2 + stripe * .18), y + size * .34, size * .08, size * .14);
    }
    context.fillStyle = "#789198";
    context.fillRect(x + size * .25, y + size * .54, size * .2, size * .17);
    context.fillStyle = "#9b6b49";
    context.fillRect(x + size * .57, y + size * .53, size * .16, size * .26);
    context.fillStyle = "#fff1c9";
    context.beginPath();
    context.arc(x + size * .7, y + size * .25, size * .055, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawMarket(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .51, y + size * .8, size * .33, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e5eee0";
    context.fillRect(x + size * .17, y + size * .42, size * .67, size * .37);
    context.fillStyle = "#5b9474";
    context.fillRect(x + size * .15, y + size * .35, size * .7, size * .13);
    context.fillStyle = "#d8ead8";
    context.fillRect(x + size * .2, y + size * .55, size * .22, size * .17);
    context.fillStyle = "#81a4a0";
    context.fillRect(x + size * .51, y + size * .54, size * .23, size * .25);
    context.fillStyle = "#f1d48b";
    context.fillRect(x + size * .55, y + size * .59, size * .15, size * .035);
    context.restore();
  }

  function drawLibrary(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .51, y + size * .82, size * .35, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d4bd86";
    context.beginPath();
    context.moveTo(x + size * .14, y + size * .43);
    context.lineTo(x + size * .5, y + size * .2);
    context.lineTo(x + size * .86, y + size * .43);
    context.closePath();
    context.fill();
    context.fillStyle = "#f1ead8";
    context.fillRect(x + size * .2, y + size * .43, size * .6, size * .36);
    context.fillStyle = "#778d7b";
    for (let column = 0; column < 3; column += 1) {
      context.fillRect(x + size * (.29 + column * .17), y + size * .48, size * .055, size * .25);
    }
    context.fillStyle = "#a9834e";
    context.fillRect(x + size * .44, y + size * .64, size * .13, size * .15);
    context.restore();
  }

  function drawBakery(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .5, y + size * .8, size * .34, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f3dfc5";
    context.fillRect(x + size * .18, y + size * .43, size * .64, size * .36);
    context.fillStyle = "#b88762";
    context.fillRect(x + size * .16, y + size * .35, size * .68, size * .13);
    context.fillStyle = "#fff1dc";
    for (let stripe = 0; stripe < 4; stripe += 1) {
      context.fillRect(x + size * (.2 + stripe * .17), y + size * .35, size * .08, size * .13);
    }
    context.fillStyle = "#d39e67";
    context.beginPath();
    context.arc(x + size * .35, y + size * .61, size * .075, 0, Math.PI * 2);
    context.arc(x + size * .65, y + size * .61, size * .075, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#788f92";
    context.fillRect(x + size * .51, y + size * .54, size * .21, size * .25);
    context.restore();
  }

  function drawFlorist(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .5, y + size * .8, size * .34, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f1e4dc";
    context.fillRect(x + size * .18, y + size * .43, size * .64, size * .36);
    context.fillStyle = "#a86e8b";
    context.fillRect(x + size * .16, y + size * .35, size * .68, size * .13);
    context.fillStyle = "#fff2e8";
    for (let stripe = 0; stripe < 4; stripe += 1) {
      context.fillRect(x + size * (.2 + stripe * .17), y + size * .35, size * .08, size * .13);
    }
    const flowerColors = ["#df8b9b", "#f0ca6c", "#9d8fc4"];
    for (let flower = 0; flower < flowerColors.length; flower += 1) {
      const fx = x + size * (.3 + flower * .2);
      context.fillStyle = "#568460";
      context.fillRect(fx, y + size * .59, size * .025, size * .12);
      context.fillStyle = flowerColors[flower];
      context.beginPath();
      context.arc(fx + size * .012, y + size * .56, size * .045, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#788f92";
    context.fillRect(x + size * .58, y + size * .53, size * .16, size * .26);
    context.restore();
  }

  function drawGarden(x, y, size) {
    context.save();
    context.fillStyle = "#afd09e";
    roundedRect(x + size * .08, y + size * .1, size * .84, size * .8, size * .12);
    context.fill();
    context.fillStyle = "#e9dcb6";
    context.fillRect(x + size * .14, y + size * .48, size * .72, size * .11);
    const flowerColors = ["#e8909b", "#f4d276", "#fff3e0", "#aa91c6"];
    for (let flower = 0; flower < flowerColors.length; flower += 1) {
      const fx = x + size * (.22 + (flower % 2) * .48);
      const fy = y + size * (.3 + Math.floor(flower / 2) * .38);
      context.fillStyle = "#54825d";
      context.fillRect(fx, fy, size * .025, size * .11);
      context.fillStyle = flowerColors[flower];
      context.beginPath();
      context.arc(fx + size * .012, fy, size * .07, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawSchool(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .5, y + size * .82, size * .35, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e6e9ed";
    context.fillRect(x + size * .17, y + size * .42, size * .66, size * .38);
    context.fillStyle = "#738bb5";
    context.beginPath();
    context.moveTo(x + size * .13, y + size * .44);
    context.lineTo(x + size * .5, y + size * .2);
    context.lineTo(x + size * .87, y + size * .44);
    context.closePath();
    context.fill();
    context.fillStyle = "#f1d586";
    context.fillRect(x + size * .45, y + size * .27, size * .1, size * .14);
    context.fillStyle = "#7e9ba0";
    for (let window = 0; window < 3; window += 1) {
      context.fillRect(x + size * (.24 + window * .2), y + size * .52, size * .12, size * .12);
    }
    context.fillStyle = "#956d51";
    context.fillRect(x + size * .44, y + size * .67, size * .13, size * .13);
    context.restore();
  }

  function drawClinic(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .5, y + size * .82, size * .35, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e5eee7";
    context.fillRect(x + size * .2, y + size * .3, size * .6, size * .5);
    context.fillStyle = "#6b9b89";
    context.fillRect(x + size * .16, y + size * .26, size * .68, size * .1);
    context.fillStyle = "#cf6d67";
    context.fillRect(x + size * .46, y + size * .4, size * .08, size * .25);
    context.fillRect(x + size * .375, y + size * .485, size * .25, size * .08);
    context.fillStyle = "#819c9d";
    context.fillRect(x + size * .25, y + size * .59, size * .13, size * .13);
    context.fillStyle = "#997653";
    context.fillRect(x + size * .6, y + size * .66, size * .12, size * .14);
    context.restore();
  }

  function drawCommunityCenter(x, y, size) {
    context.save();
    context.fillStyle = "rgba(74,94,63,.17)";
    context.beginPath();
    context.ellipse(x + size * .51, y + size * .82, size * .35, size * .09, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d7b96f";
    context.beginPath();
    context.moveTo(x + size * .16, y + size * .48);
    context.lineTo(x + size * .5, y + size * .22);
    context.lineTo(x + size * .84, y + size * .48);
    context.closePath();
    context.fill();
    context.fillStyle = "#eee7cf";
    context.fillRect(x + size * .22, y + size * .48, size * .56, size * .31);
    context.fillStyle = "#738d78";
    context.fillRect(x + size * .43, y + size * .58, size * .14, size * .21);
    context.fillStyle = "#f8dc87";
    context.beginPath();
    context.arc(x + size * .5, y + size * .38, size * .055, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawPerson(x, y, size, color, direction = 1) {
    context.save();
    context.fillStyle = "rgba(57,77,62,.16)";
    context.beginPath();
    context.ellipse(x, y + size * .075, size * .05, size * .018, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d9ad8d";
    context.beginPath();
    context.arc(x, y - size * .02, size * .025, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.fillRect(x - size * .025, y, size * .05, size * .07);
    context.strokeStyle = "#5d5147";
    context.lineWidth = Math.max(.5, size * .012);
    context.beginPath();
    context.moveTo(x - size * .012, y + size * .065);
    context.lineTo(x - size * (.012 + direction * .012), y + size * .095);
    context.moveTo(x + size * .012, y + size * .065);
    context.lineTo(x + size * (.012 + direction * .012), y + size * .095);
    context.stroke();
    context.restore();
  }

  function drawCar(x, y, size, color, direction = 1) {
    context.save();
    context.fillStyle = "rgba(50,62,55,.22)";
    roundedRect(x - size * .13, y + size * .055, size * .26, size * .05, size * .018);
    context.fill();
    context.fillStyle = color;
    roundedRect(x - size * .12, y - size * .035, size * .24, size * .09, size * .025);
    context.fill();
    context.fillStyle = "#9bb5b5";
    roundedRect(x - size * .055 * direction, y - size * .025, size * .11, size * .055, size * .012);
    context.fill();
    context.fillStyle = "#4d514d";
    context.beginPath();
    context.arc(x - size * .075, y + size * .055, size * .018, 0, Math.PI * 2);
    context.arc(x + size * .075, y + size * .055, size * .018, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawUniqueBuildingDetails(x, y, size, cell, gridX, gridY) {
    const detail = mechanics[cell.type];
    if (!detail || cell.type?.startsWith("road-")) return;
    const textureSeed = detail.textureSeed || 1;
    const seed = (textureSeed * 97 + gridX * 53 + gridY * 71) >>> 0;
    const trims = ["#c89472", "#7597a1", "#a485a8", "#7ba087", "#d1ad67", "#8f9baa"];
    const awnings = ["#c66e61", "#6f91bd", "#71a07d", "#a47da0", "#d0a457", "#658a86"];
    const trim = trims[seed % trims.length];
    const awning = awnings[(seed >>> 3) % awnings.length];
    context.save();

    context.fillStyle = trim;
    context.fillRect(x + size * .22, y + size * (seed % 5 === 0 ? .38 : .43), size * .56, size * .018);

    if (seed % 4 === 0) {
      context.fillStyle = awning;
      context.beginPath();
      context.moveTo(x + size * .26, y + size * .69);
      context.lineTo(x + size * .74, y + size * .69);
      context.lineTo(x + size * .68, y + size * .76);
      context.lineTo(x + size * .32, y + size * .76);
      context.closePath();
      context.fill();
    } else if (seed % 4 === 1) {
      context.fillStyle = awning;
      context.fillRect(x + size * .19, y + size * .32, size * .62, size * .06);
      context.fillStyle = "rgba(255,255,255,.58)";
      for (let stripe = 0; stripe < 5; stripe += 1) {
        context.fillRect(x + size * (.21 + stripe * .12), y + size * .32, size * .05, size * .06);
      }
    } else if (seed % 4 === 2) {
      context.fillStyle = trim;
      context.fillRect(x + size * .42, y + size * .17, size * .16, size * .055);
      context.fillStyle = "#d8d0a5";
      context.beginPath();
      context.arc(x + size * .5, y + size * .14, size * .035, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = awning;
      context.fillRect(x + size * .24, y + size * .76, size * .52, size * .025);
    }

    context.fillStyle = trims[(seed >>> 5) % trims.length];
    context.fillRect(x + size * (seed % 2 ? .27 : .68), y + size * .52, size * .035, size * .035);
    context.restore();
  }

  function drawBuilding(x, y, size, cell, gridX = 0, gridY = 0) {
    if (cell.type === "home") drawHome(x, y, size, cell.residents);
    if (cell.type === "apartment") drawApartment(x, y, size);
    if (cell.type === "shop") drawShop(x, y, size);
    if (cell.type === "market") drawMarket(x, y, size);
    if (cell.type === "florist") drawFlorist(x, y, size);
    if (cell.type === "park") drawPark(x, y, size);
    if (cell.type === "garden") drawGarden(x, y, size);
    if (cell.type === "cafe") drawCafe(x, y, size);
    if (cell.type === "restaurant") drawRestaurant(x, y, size);
    if (cell.type === "bakery") drawBakery(x, y, size);
    if (cell.type === "center") drawCommunityCenter(x, y, size);
    if (cell.type === "library") drawLibrary(x, y, size);
    if (cell.type === "school") drawSchool(x, y, size);
    if (cell.type === "clinic") drawClinic(x, y, size);
    if ([
      "home", "apartment", "shop", "market", "florist", "cafe", "restaurant",
      "bakery", "center", "library", "school", "clinic",
    ].includes(cell.type)) {
      drawUniqueBuildingDetails(x, y, size, cell, gridX, gridY);
    }
    if (![
      "home", "apartment", "shop", "market", "florist", "park", "garden", "cafe",
      "restaurant", "bakery", "center", "library", "school", "clinic",
    ].includes(cell.type) && !cell.type?.startsWith("road-")) {
      const detail = mechanics[cell.type];
      const seedText = cell.type || names[cell.type] || "";
      let seed = 0;
      seed = ((detail?.textureSeed || 1) * 97 + gridX * 53 + gridY * 71) >>> 0;
      for (let i = 0; i < seedText.length; i += 1) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
      const facadePalette = ["#cbb994", "#aebfba", "#c5a59a", "#b9b7ce", "#98b2a1", "#d1b98f"];
      const roofPalette = ["#6f7f73", "#8b6f63", "#687a91", "#7d7568", "#766c8c"];
      const paletteIndex = seed % facadePalette.length;
      const floors = 2 + (seed % 3);
      const buildingWidth = .48 + (seed % 4) * .045;
      const buildingLeft = x + (size - size * buildingWidth) / 2;
      context.save();
      context.fillStyle = "rgba(74,94,63,.17)";
      context.beginPath();
      context.ellipse(x + size * .5, y + size * .82, size * .35, size * .09, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = facadePalette[paletteIndex];
      roundedRect(buildingLeft, y + size * .24, size * buildingWidth, size * .56, size * .025);
      context.fill();
      context.fillStyle = roofPalette[(seed >>> 3) % roofPalette.length];
      if (seed % 3 === 0) {
        context.beginPath();
        context.moveTo(buildingLeft - size * .04, y + size * .27);
        context.lineTo(x + size * .5, y + size * .13);
        context.lineTo(buildingLeft + size * buildingWidth + size * .04, y + size * .27);
        context.closePath();
        context.fill();
      } else {
        context.fillRect(buildingLeft - size * .02, y + size * .21, size * (buildingWidth + .04), size * .07);
      }
      context.fillStyle = "#dce7dc";
      for (let floor = 0; floor < floors; floor += 1) {
        for (let column = 0; column < 2 + (seed % 2); column += 1) {
          const windowWidth = size * .075;
          const windowLeft = buildingLeft + size * (.08 + column * .13);
          const windowTop = y + size * (.34 + floor * .11);
          context.fillRect(windowLeft, windowTop, windowWidth, size * .065);
          context.fillStyle = (seed + floor + column) % 4 === 0 ? "#f3dfa7" : "#8ba0a2";
          context.fillRect(windowLeft + size * .008, windowTop + size * .008, windowWidth - size * .016, size * .049);
          context.fillStyle = "#dce7dc";
        }
      }
      context.fillStyle = "#735f52";
      context.fillRect(x + size * .455, y + size * .68, size * .09, size * .12);
      context.fillStyle = detail?.mechanic === "happiness" ? "#557d5c"
        : detail?.mechanic === "income" ? "#a66f4d"
        : detail?.mechanic === "neighbors" ? "#8a765f" : "#627d80";
      for (let i = 0; i < 3; i += 1) {
        const signX = buildingLeft + size * (.08 + i * .13);
        context.fillRect(signX, y + size * .66, size * .055, size * .018);
      }
      context.restore();
    }
  }

  function drawStreetLife(tile, left, top) {
    const colors = ["#667da8", "#bd765b", "#728f69", "#9b6f91", "#b59a62"];
    for (const [position, cell] of cells) {
      const [x, y] = position.split(",").map(Number);
      const px = left + x * tile;
      const py = top + y * tile;
      const roadLike = cell.type === "road" || cell.type?.startsWith("road-");
      if (roadLike) {
        const hash = (x * 31 + y * 47 + x * y * 13) >>> 0;
        if (hash % 5 === 0) {
          const horizontal = ((x + y) % 2 === 0);
          if (horizontal) {
            const direction = hash % 2 ? 1 : -1;
            const travel = ((streetTime * (.12 + (hash % 3) * .025) * direction + hash % 11) % 1 + 1) % 1;
            drawCar(px + travel * tile, py + tile * .5, tile, ["#6f93ad", "#b2675d", "#d2bd78", "#7e9072"][hash % 4], direction);
          }
        }
        continue;
      }
      if (hasNearbyRoad(x, y)) {
        const hash = (x * 67 + y * 101) >>> 0;
        if (hash % 7 === 0) {
          const personX = px + tile * (.08 + (hash % 5) * .035);
          const personY = py + tile * (.72 + (hash % 3) * .04);
          drawPerson(personX, personY, tile, colors[hash % colors.length], hash % 2 ? 1 : -1);
        }
      }
    }
  }

  function pointerTile(event) {
    const bounds = canvas.getBoundingClientRect();
    const { tile, left, top } = getMapBounds();
    const x = Math.floor((event.clientX - bounds.left - left) / tile);
    const y = Math.floor((event.clientY - bounds.top - top) / tile);
    if (x < 0 || y < 0 || x >= columns || y >= rows) return null;
    return { x, y };
  }

  function draw() {
    if (!canvasBounds.width || !canvasBounds.height) return;
    const { tile, left, top } = getMapBounds();
    context.clearRect(0, 0, canvasBounds.width, canvasBounds.height);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const px = left + x * tile;
        const py = top + y * tile;
        drawTerrain(px, py, tile);
        const cell = cells.get(key(x, y));
        if (cell?.type === "road" || cell?.type?.startsWith("road-")) drawRoad(px, py, tile, x, y, cell.type);
        else if (cell) drawBuilding(px, py, tile, cell, x, y);
      }
    }
    drawStreetLife(tile, left, top);
    const preview = pointerTileFromLastPosition;
    if (preview) drawPreview(preview.x, preview.y, tile, left, top);
    if (day % 4 === 0) {
      context.save();
      context.fillStyle = "rgba(26, 45, 76, .24)";
      context.fillRect(0, 0, canvasBounds.width, canvasBounds.height);
      context.fillStyle = "rgba(255, 244, 184, .72)";
      for (let i = 0; i < 18; i += 1) {
        const sx = ((i * 83 + day * 29) % Math.max(1, canvasBounds.width));
        const sy = ((i * 47 + day * 17) % Math.max(1, canvasBounds.height));
        context.beginPath();
        context.arc(sx, sy, i % 3 === 0 ? 1.3 : .7, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();
    }
  }

  let pointerTileFromLastPosition = null;

  function drawPreview(x, y, tile, left, top) {
    const px = left + x * tile;
    const py = top + y * tile;
    const occupied = cells.has(key(x, y));
    context.save();
    if (eraseMode) {
      if (occupied) {
        context.fillStyle = "rgba(197, 90, 75, .3)";
        context.fillRect(px + 1, py + 1, tile - 2, tile - 2);
        context.strokeStyle = "#c35e50";
        context.lineWidth = 2;
        context.strokeRect(px + 2, py + 2, tile - 4, tile - 4);
      }
    } else if (selectedTool !== "select") {
      const canPlace = !occupied && funds >= costs[selectedTool];
      context.fillStyle = canPlace ? "rgba(78, 145, 95, .18)" : "rgba(193, 91, 77, .18)";
      context.fillRect(px + 1, py + 1, tile - 2, tile - 2);
      context.strokeStyle = canPlace ? "rgba(58, 129, 76, .9)" : "rgba(183, 81, 70, .9)";
      context.lineWidth = 1.5;
      context.setLineDash([4, 3]);
      context.strokeRect(px + 2, py + 2, tile - 4, tile - 4);
      context.setLineDash([]);
      if (canPlace) {
        context.globalAlpha = .65;
        drawBuilding(px, py, tile, { type: selectedTool, residents: 4 });
      }
    }
    context.restore();
  }

  function placeAt(x, y) {
    const position = key(x, y);
    if (eraseMode) {
      const existing = cells.get(position);
      if (!existing) return;
      const refund = Math.floor((costs[existing.type] || 0) * .5);
      cells.delete(position);
      funds += refund;
      updateStats();
      draw();
      showToast(`${names[existing.type]} cleared${refund ? ` · +$${refund}` : ""}`);
      addDiaryEntry(existing.type, `${names[existing.type]} cleared from the neighborhood.`, "Just now");
      saveGame();
      return;
    }
    if (selectedTool === "select") {
      const cell = cells.get(position);
      if (cell) {
        const detail = mechanics[cell.type];
        const label = detail?.mechanic === "neighbors"
            ? `${names[cell.type]} — ${cell.residents || detail.value} neighbors.`
            : detail?.mechanic === "income"
              ? `${names[cell.type]} — earns $${detail.value} daily.`
              : detail?.mechanic === "happiness"
                ? `${names[cell.type]} — adds ${detail.value}% happiness.`
                : names[cell.type];
        showToast(label);
      }
      return;
    }
    if (cells.has(position)) {
      showToast("That tile is already taken.");
      return;
    }
    const cost = completedResearch.has("urban-planning")
      ? Math.ceil(costs[selectedTool] * .9)
      : costs[selectedTool];
    if (funds < cost) {
      showToast(`You need $${cost} to build a ${names[selectedTool].toLowerCase()}.`);
      return;
    }
    funds -= cost;
    const detail = mechanics[selectedTool];
    const newCell = detail?.mechanic === "neighbors"
      ? { type: selectedTool, residents: detail.value }
      : { type: selectedTool };
    cells.set(position, newCell);
    updateStats();
    draw();
    showToast(`${names[selectedTool]} built!`);
    addDiaryEntry(selectedTool, `${names[selectedTool]} added to Maplewood.`, "Just now");
    playBuildSound();
    saveGame();
  }

  function selectTool(tool) {
    const toolButton = toolButtons.find((button) => button.dataset.tool === tool);
    if (toolButton?.dataset.category && selectedCategory !== "all" && toolButton.dataset.category !== selectedCategory) {
      setBuildCategory(toolButton.dataset.category);
    }
    eraseMode = false;
    selectedTool = tool;
    document.getElementById("demolish-button").classList.remove("active");
    document.getElementById("demolish-button").setAttribute("aria-pressed", "false");
    for (const button of toolButtons) {
      const active = button.dataset.tool === tool;
      button.classList.toggle("selected", active);
      button.setAttribute("aria-pressed", String(active));
    }
    canvas.style.cursor = tool === "select" ? "default" : "crosshair";
    draw();
  }

  function setBuildCategory(category) {
    selectedCategory = category;
    for (const button of categoryButtons) {
      const active = button.dataset.category === category;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const button of toolButtons) {
      button.hidden = button.dataset.tool !== "select"
        && category !== "all"
        && button.dataset.category !== category;
    }
  }

  function renderResearch() {
    const list = document.getElementById("research-list");
    if (!list) return;
    list.innerHTML = "";
    for (const item of researchCatalog) {
      const completed = completedResearch.has(item.id);
      const row = document.createElement("div");
      row.className = `research-item${completed ? " completed" : ""}`;
      row.innerHTML = `<div><strong></strong><small></small></div><button class="research-buy"></button>`;
      row.querySelector("strong").textContent = item.name;
      row.querySelector("small").textContent = item.description;
      const button = row.querySelector("button");
      button.textContent = completed ? "Done" : `${item.cost} RP`;
      button.disabled = completed || researchPoints < item.cost;
      button.addEventListener("click", () => purchaseResearch(item.id));
      list.appendChild(row);
    }
    const remaining = researchCatalog.filter((item) => !completedResearch.has(item.id)).length;
    document.getElementById("research-summary").textContent =
      remaining ? `${remaining} breakthroughs available. Science grows every day.` : "All breakthroughs discovered.";
  }

  function purchaseResearch(id) {
    const item = researchCatalog.find((candidate) => candidate.id === id);
    if (!item || completedResearch.has(id) || researchPoints < item.cost) return;
    researchPoints -= item.cost;
    completedResearch.add(id);
    researchLevel = 1 + completedResearch.size;
    updateStats();
    renderResearch();
    addDiaryEntry("goal", `Research complete: ${item.name}.`, "Just now");
    showToast(`${item.name} unlocked!`);
    saveGame();
  }

  function setZoom(nextZoom) {
    zoom = Math.max(.72, Math.min(1.3, nextZoom));
    mapZoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    draw();
  }

  function finishDay() {
    if (paused) return;
    day += 1;
    funds = Math.max(0, funds + dailyIncome());
    researchPoints += 3 + Math.floor(getCounts().residents / 25);
    researchLevel = 1 + completedResearch.size;
    if (day % 3 === 0 && happiness >= 60) {
      for (const cell of cells.values()) {
        if (mechanics[cell.type]?.mechanic === "neighbors") {
          const limit = mechanics[cell.type].value * 2;
          if (!Number.isFinite(cell.residents) || cell.residents >= limit) continue;
          cell.residents += 1;
          addDiaryEntry("home", "A new neighbor moved into Maplewood!", `Day ${day}`);
          break;
        }
      }
    }
    updateStats();
    addDiaryEntry("sun", `Day ${day} dawns in Maplewood.`, "Just now");
    renderResearch();
    saveGame();
    draw();
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-theme", dark);
    const button = document.getElementById("theme-button");
    if (button) {
      button.textContent = dark ? "☀" : "☾";
      button.title = dark ? "Switch to light mode" : "Switch to dark mode";
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", String(dark));
    }
  }

  function loadTheme() {
    let theme = "light";
    try {
      theme = localStorage.getItem("urbania-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch (error) {
      theme = "light";
    }
    applyTheme(theme);
  }

  function resetClock() {
    clearInterval(tickTimer);
    if (!paused) tickTimer = setInterval(finishDay, 8000 / gameSpeed);
    document.getElementById("pause-button").textContent = paused ? "▶" : "Ⅱ";
    document.getElementById("pause-button").setAttribute("aria-label", paused ? "Resume time" : "Pause time");
  }

  for (const button of toolButtons) {
    button.addEventListener("click", () => selectTool(button.dataset.tool));
  }
  for (const button of categoryButtons) {
    button.addEventListener("click", () => {
      setBuildCategory(button.dataset.category);
      const selectedButton = toolButtons.find((toolButton) => toolButton.dataset.tool === selectedTool);
      if (selectedButton?.hidden) selectTool("select");
    });
  }
  document.getElementById("catalog-search").addEventListener("input", (event) => {
    const query = event.currentTarget.value.trim().toLowerCase();
    for (const button of toolButtons) {
      if (button.dataset.tool === "select") continue;
      const matchesCategory = !selectedCategory || button.dataset.category === selectedCategory;
      const name = (button.querySelector("strong")?.textContent || "").toLowerCase();
      button.hidden = query
        ? !name.includes(query)
        : !matchesCategory;
    }
  });

  document.getElementById("demolish-button").addEventListener("click", (event) => {
    eraseMode = !eraseMode;
    selectedTool = "select";
    for (const button of toolButtons) {
      button.classList.toggle("selected", button.dataset.tool === "select" && !eraseMode);
      button.setAttribute("aria-pressed", String(button.dataset.tool === "select" && !eraseMode));
    }
    event.currentTarget.classList.toggle("active", eraseMode);
    event.currentTarget.setAttribute("aria-pressed", String(eraseMode));
    canvas.style.cursor = eraseMode ? "not-allowed" : "default";
    draw();
  });

  canvas.addEventListener("pointermove", (event) => {
    const tile = pointerTile(event);
    pointerTileFromLastPosition = tile;
    document.getElementById("coordinates").textContent = tile ? `${tile.x + 1}, ${tile.y + 1}` : "—";
    draw();
    if (isPainting && tile) {
      const position = key(tile.x, tile.y);
      if (position !== lastPainted) {
        lastPainted = position;
        placeAt(tile.x, tile.y);
      }
    }
  });

  canvas.addEventListener("pointerdown", (event) => {
    const tile = pointerTile(event);
    if (!tile) return;
    isPainting = true;
    lastPainted = key(tile.x, tile.y);
    canvas.setPointerCapture(event.pointerId);
    placeAt(tile.x, tile.y);
  });
  canvas.addEventListener("pointerup", () => { isPainting = false; lastPainted = ""; });
  canvas.addEventListener("pointercancel", () => { isPainting = false; lastPainted = ""; });
  canvas.addEventListener("pointerleave", () => {
    if (!isPainting) {
      pointerTileFromLastPosition = null;
      document.getElementById("coordinates").textContent = "—";
      draw();
    }
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom + .1));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom - .1));
  document.getElementById("reset-view").addEventListener("click", () => setZoom(1));
  document.getElementById("pause-button").addEventListener("click", () => {
    paused = !paused;
    resetClock();
    showToast(paused ? "Town time paused." : "Town time is moving again.");
  });
  for (const button of document.querySelectorAll(".speed-button")) {
    button.addEventListener("click", () => {
      gameSpeed = Number(button.dataset.speed);
      for (const speedButton of document.querySelectorAll(".speed-button")) {
        const active = speedButton === button;
        speedButton.classList.toggle("active", active);
        speedButton.setAttribute("aria-pressed", String(active));
      }
      resetClock();
    });
  }
  document.getElementById("mayor-tip").addEventListener("click", () => {
    const counts = getCounts();
    if (counts.home < 5) {
      selectTool("home");
      showToast(`Build ${5 - counts.home} more ${counts.home === 4 ? "home" : "homes"} to earn $150.`);
    } else if (!counts.park) {
      selectTool("park");
      showToast("A little park makes neighbors happier.");
    } else {
      selectTool("shop");
      showToast("Corner shops bring in $12 every day.");
    }
  });
  document.querySelector(".edit-name").addEventListener("click", () => {
    const title = document.querySelector(".city-title h1");
    const currentName = title.firstChild.textContent.trim();
    const nextName = window.prompt("What would you like to call your town?", currentName);
    if (nextName?.trim()) {
      title.firstChild.textContent = nextName.trim();
      document.querySelector(".map-location").childNodes[2].textContent = ` ${nextName.trim().toUpperCase()}`;
      saveGame();
    }
  });
  document.getElementById("theme-button").addEventListener("click", (event) => {
    const dark = !document.body.classList.contains("dark-theme");
    applyTheme(dark ? "dark" : "light");
    try { localStorage.setItem("urbania-theme", dark ? "dark" : "light"); } catch (error) {
      console.warn("Urbania could not save the theme preference.", error);
    }
    showToast(dark ? "Dark mode on." : "Light mode on.");
  });
  document.getElementById("sound-button").addEventListener("click", (event) => {
    soundEnabled = !soundEnabled;
    event.currentTarget.classList.toggle("sound-on", soundEnabled);
    event.currentTarget.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
    showToast(soundEnabled ? "Build sounds on." : "Build sounds off.");
  });
  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    const toolForKey = {
      "1": "home", "2": "shop", "3": "park", "4": "road", "5": "cafe", "6": "center",
      "7": "apartment", "8": "restaurant", "9": "market", "0": "library", q: "select",
    };
    const tool = toolForKey[event.key.toLowerCase()];
    if (tool) selectTool(tool);
    if (event.key.toLowerCase() === "x") document.getElementById("demolish-button").click();
    if (event.key === "Escape") selectTool("select");
  });
  window.addEventListener("resize", resizeCanvas);

  let lastStreetFrame = 0;
  function animateStreet(timestamp) {
    if (timestamp - lastStreetFrame >= 50) {
      streetTime = timestamp / 1000;
      lastStreetFrame = timestamp;
      draw();
    }
    requestAnimationFrame(animateStreet);
  }

  loadTheme();
  loadGame();
  updateStats();
  setBuildCategory("homes");
  renderResearch();
  resizeCanvas();
  resetClock();
  saveGame();
  requestAnimationFrame(animateStreet);
})();