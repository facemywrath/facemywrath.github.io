/* =========================
   Faceuro Games Hub - main.js
   - Featured carousel (drag/scroll + snap tween)
   - Tags filter + sorting
   - Grid render
   - Modal w/ Play + Favorite
   - Left menu: Search / Main / Favorites
   ========================= */

(() => {
  "use strict";

  // -------------------------
  // Config / endpoints
  // -------------------------
  // Assumptions:
  // 1) Each game folder has a cfg.json with:
  //    { name, desc, icon, tags: [], releaseDate, lastUpdate, totalPlays, totalFavorites, ... }
  // 2) Hub server provides a list of games at /api/games (or similar)
  // 3) Featured list is loaded from a cfg.json located next to server.js (ex: /api/featured)
  //
  // If your server endpoints differ, change these two constants.
  const ROOT_URL = "https://home.faceurogames.net";
  const API_GAMES = "/api/games";       // returns array of game objects (merged or with cfg fields)
  const API_FEATURED = "/api/featured"; // returns array of game ids/paths or full game objects

  // local storage keys
  const LS_FAVORITES = "hub_favorites_v1"; // stores array of game ids
  const LS_LAST_TAB = "hub_last_tab_v1";   // "main" | "search" | "favorites"

  // -------------------------
  // DOM
  // -------------------------
  const el = {
    refresh: document.getElementById("refresh-button"),

    navSearch: document.getElementById("nav-search"),
    navMain: document.getElementById("nav-main"),
    navFav: document.getElementById("nav-favorites"),
    
    featuredSection: document.getElementById("featured-section"),
    featuredTrack: document.getElementById("featured-track"),
    featuredNextIndicator: document.getElementById("featured-next-indicator"),
    back: document.getElementById("back-button"),
hubView: document.getElementById("hub-view"),
playerView: document.getElementById("player-view"),
gameFrame: document.getElementById("game-frame"),

    typeBtn: document.getElementById("type-dropdown-button"),
    typeLabel: document.getElementById("type-dropdown-label"),
    typeMenu: document.getElementById("type-dropdown-menu"),

    sortBtn: document.getElementById("sort-dropdown-button"),
    sortLabel: document.getElementById("sort-dropdown-label"),
    sortMenu: document.getElementById("sort-dropdown-menu"),

topTitle: document.getElementById("top-title"),
    topSearchWrap: document.getElementById("top-search"),
    topSearchInput: document.getElementById("top-search-input"),
    topSearchClear: document.getElementById("top-search-clear"),
    grid: document.getElementById("games-grid"),
searchSection: document.getElementById("search-section"),
    searchInput: document.getElementById("search-input"),
    searchClear: document.getElementById("search-clear"),
    modalOverlay: document.getElementById("modal-overlay"),
    modal: document.getElementById("modal"),
    modalClose: document.getElementById("modal-close"),
    modalIcon: document.getElementById("modal-icon"),
    modalTitle: document.getElementById("modal-title"),
    modalDesc: document.getElementById("modal-desc"),
    modalMeta: document.getElementById("modal-meta"),
    modalPlay: document.getElementById("modal-play"),
    modalFavorite: document.getElementById("modal-favorite"),
    modalFavoriteLabel: document.getElementById("modal-favorite-label")
  };

  // -------------------------
  // State
  // -------------------------
  let searchQuery = "";
  let allGames = [];         // full list from server
  let featuredGames = [];    // list for featured carousel (resolved to full objects)
  let activeTab = "main";    // main | search | favorites

  let selectedType = "All";  // tag
  let selectedSort = "ABC_ASC";

  let modalGame = null;      // currently open modal game

  // -------------------------
  // Sort options
  // -------------------------
  const SORTS = [
    { id: "ABC_ASC", label: "ABC: Ascending" },
    { id: "ABC_DESC", label: "ABC: Descending" },
    { id: "RELEASE_ASC", label: "Release Date: Asc" },
    { id: "RELEASE_DESC", label: "Release Date: Desc" },
    { id: "UPDATE_ASC", label: "Last Update: Asc" },
    { id: "UPDATE_DESC", label: "Last Update: Desc" },
    { id: "PLAYS_ASC", label: "Total Plays: Asc" },
    { id: "PLAYS_DESC", label: "Total Plays: Desc" },
    { id: "FAV_ASC", label: "Most Favorited: Asc" },
    { id: "FAV_DESC", label: "Most Favorited: Desc" }
  ];

  // -------------------------
  // Helpers
  // -------------------------
  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function toLowerStr(v) {
    return (v ?? "").toString().toLowerCase();
  }

  function parseDateToMs(v) {
    // Supports ISO string "2025-12-01" or ms. Unknown -> 0.
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (!v) return 0;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }

  function parseNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function getFavoritesSet() {
    try {
      const arr = JSON.parse(localStorage.getItem(LS_FAVORITES) || "[]");
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function setFavoritesSet(set) {
    localStorage.setItem(LS_FAVORITES, JSON.stringify(Array.from(set)));
  }

  function isFavorited(gameId) {
    return getFavoritesSet().has(gameId);
  }

  function toggleFavorite(gameId) {
    const favs = getFavoritesSet();
    if (favs.has(gameId)) favs.delete(gameId);
    else favs.add(gameId);
    setFavoritesSet(favs);
  }

  function closeAllDropdowns() {
    el.typeMenu.classList.add("hidden");
    el.sortMenu.classList.add("hidden");
    el.typeBtn.setAttribute("aria-expanded", "false");
    el.sortBtn.setAttribute("aria-expanded", "false");
  }

  function escapeHtml(s) {
    return (s ?? "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // -------------------------
  // Data fetching
  // -------------------------
  async function fetchJson(url) {
    const r = await fetch(ROOT_URL+url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return await r.json();
  }

  async function loadAll() {
    // Load games + featured list, then render.
    const [games, featured] = await Promise.all([
      fetchJson(API_GAMES),
      fetchJson(API_FEATURED)
    ]);

    allGames = normalizeGames(games);
    featuredGames = resolveFeatured(featured, allGames);

    // build dropdowns from tags
    renderTypeDropdown(buildUniqueTags(allGames));
    renderSortDropdown();

    // featured
    renderFeatured(featuredGames);
    setupFeaturedSnap(); // re-init after rendering

    // grid
    renderCurrentView();
  }

  function normalizeGames(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    // ensure each has id, name, desc, icon, tags
    return arr.map((g, idx) => {
      const id = (g.id ?? g.slug ?? g.path ?? g.gameId ?? `game_${idx}`).toString();
      console.log( `${ROOT_URL}${g.icon}`,)
      return {
        id,
        name: (g.name ?? "Untitled").toString(),
        desc: (g.desc ?? g.description ?? "").toString(),
        icon: `${ROOT_URL}${g.icon}`,
        tags: safeArray(g.tags).map(t => t.toString()),
        releaseDate: g.releaseDate ?? g.released ?? "",
        lastUpdate: g.lastUpdate ?? g.updated ?? "",
        totalPlays: parseNumber(g.totalPlays ?? g.plays),
        totalFavorites: parseNumber(g.totalFavorites ?? g.favorites),
        // optional: where to play (URL/route)
        playUrl: (g.playUrl ?? g.url ?? g.route ?? "").toString(),
        // keep extra fields (safe)
        _raw: g
      };
    });
  }

  function resolveFeatured(rawFeatured, gamesList) {
    // Featured cfg.json can be:
    // - array of ids/paths
    // - array of objects that include id
    // - object: { games: [...] }
    let list = rawFeatured;
    if (rawFeatured && !Array.isArray(rawFeatured) && typeof rawFeatured === "object") {
      if (Array.isArray(rawFeatured.games)) list = rawFeatured.games;
      else if (Array.isArray(rawFeatured.featured)) list = rawFeatured.featured;
    }
    if (!Array.isArray(list)) return [];

    const byId = new Map(gamesList.map(g => [g.id, g]));
    const byPathLike = new Map(
      gamesList.map(g => [toLowerStr(g.playUrl || g.id), g])
    );

    const out = [];
    for (const item of list) {
      if (typeof item === "string") {
        const key = item.toString();
        const g = byId.get(key) || byPathLike.get(toLowerStr(key));
        if (g) out.push(g);
      } else if (item && typeof item === "object") {
        const key = (item.id ?? item.slug ?? item.path ?? item.playUrl ?? "").toString();
        const g = byId.get(key) || byPathLike.get(toLowerStr(key));
        if (g) out.push(g);
        else {
          // if server already gave full object here
          const tmp = normalizeGames([item])[0];
          out.push(tmp);
        }
      }
    }
    return out;
  }

  function buildUniqueTags(games) {
    const set = new Set();
    for (const g of games) {
      for (const t of safeArray(g.tags)) {
        const tag = t.toString().trim();
        if (tag) set.add(tag);
      }
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }

  // -------------------------
  // Rendering: Featured
  // -------------------------
  function renderFeatured(list) {
    el.featuredTrack.innerHTML = "";

    for (const g of list) {
      const card = document.createElement("div");
      card.className = "featured-card";
      card.setAttribute("role", "listitem");
      card.dataset.gameId = g.id;

      const iconWrap = document.createElement("div");
      iconWrap.className = "featured-icon-wrap";

      const img = document.createElement("img");
      img.alt = g.name;
      img.src = g.icon || "";
      iconWrap.appendChild(img);

      const playOverlay = document.createElement("div");
      playOverlay.className = "featured-play-overlay";
      playOverlay.textContent = "Play";
      playOverlay.addEventListener("click", (e) => {
        e.stopPropagation();
        enterGame(g);
      });

      // put overlay inside icon area but absolutely positioned to the card,
      // so we add it to card, not iconWrap (matches CSS absolute rules).
      const info = document.createElement("div");
      info.className = "featured-info";
      info.innerHTML = `
        <div class="featured-title">${escapeHtml(g.name)}</div>
        <div class="featured-desc">${escapeHtml(g.desc)}</div>
        <div class="featured-meta-row">
          ${g.tags.slice(0, 3).map(t => `<div class="pill">${escapeHtml(t)}</div>`).join("")}
        </div>
      `;

      // Click card opens modal
      card.addEventListener("click", () => openModal(g));

      const iconCol = document.createElement("div");
iconCol.className = "featured-icon-column";

iconCol.appendChild(iconWrap);
iconCol.appendChild(playOverlay);

card.appendChild(iconCol);
card.appendChild(info);

      el.featuredTrack.appendChild(card);
    }

    updateFeaturedIndicator();
    el.featuredTrack.addEventListener("scroll", () => updateFeaturedIndicator(), { passive: true });
  }

  function updateFeaturedIndicator() {
    const track = el.featuredTrack;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const atEnd = track.scrollLeft >= maxScroll - 2;
    if (atEnd) el.featuredNextIndicator.classList.add("is-hidden");
    else el.featuredNextIndicator.classList.remove("is-hidden");
  }

  // Snap tween: when user stops scrolling/dragging, tween to nearest card so it aligns left.
  let snapTimer = null;
  let snapping = false;

  function setupFeaturedSnap() {
    const track = el.featuredTrack;
    if (!track) return;

    // clean previous handlers by assigning once per load (safe enough for this hub)
    track.addEventListener("pointerup", scheduleSnap, { passive: true });
    track.addEventListener("touchend", scheduleSnap, { passive: true });
    track.addEventListener("mouseup", scheduleSnap, { passive: true });
    track.addEventListener("scroll", () => {
      if (snapping) return;
      scheduleSnap();
    }, { passive: true });
  }

  function scheduleSnap() {
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(() => snapToNearestFeatured(), 120);
  }

  function snapToNearestFeatured() {
    const track = el.featuredTrack;
    if (!track) return;

    const cards = Array.from(track.querySelectorAll(".featured-card"));
    if (cards.length === 0) return;

    const left = track.scrollLeft;
    let best = { dist: Infinity, target: left };

    for (const c of cards) {
      const target = c.offsetLeft; // align to left of viewport
      const dist = Math.abs(target - left);
      if (dist < best.dist) best = { dist, target };
    }

    tweenScrollLeft(track, best.target, 240);
  }

  function tweenScrollLeft(scroller, to, durationMs) {
    const from = scroller.scrollLeft;
    const diff = to - from;
    if (Math.abs(diff) < 1) return;

    const start = performance.now();
    snapping = true;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function step(now) {
      const t = clamp((now - start) / durationMs, 0, 1);
      const eased = easeOutCubic(t);
      scroller.scrollLeft = from + diff * eased;
      if (t < 1) requestAnimationFrame(step);
      else {
        snapping = false;
        updateFeaturedIndicator();
      }
    }
    requestAnimationFrame(step);
  }

  // -------------------------
  // Rendering: Dropdowns
  // -------------------------
  function renderTypeDropdown(tags) {
    el.typeMenu.innerHTML = "";
    for (const tag of tags) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dropdown-item" + (tag === selectedType ? " is-active" : "");
      b.textContent = tag;
      b.addEventListener("click", () => {
        selectedType = tag;
        el.typeLabel.textContent = tag;
        closeAllDropdowns();
        renderCurrentView();
      });
      el.typeMenu.appendChild(b);
    }
  }

  function renderSortDropdown() {
    el.sortMenu.innerHTML = "";
    for (const s of SORTS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "dropdown-item" + (s.id === selectedSort ? " is-active" : "");
      b.textContent = s.label;
      b.addEventListener("click", () => {
        selectedSort = s.id;
        el.sortLabel.textContent = s.label;
        closeAllDropdowns();
        renderCurrentView();
      });
      el.sortMenu.appendChild(b);
    }
    const active = SORTS.find(x => x.id === selectedSort) || SORTS[0];
    el.sortLabel.textContent = active.label;
  }

  // -------------------------
  // Rendering: Grid / views
  // -------------------------
  function getFilteredSortedGames() {
    let list = allGames.slice();

    // tab filters
    if (activeTab === "favorites") {
      const favs = getFavoritesSet();
      list = list.filter(g => favs.has(g.id));
    }
    // search tab filter (name contains)
    if (activeTab === "search") {
      const q = toLowerStr(searchQuery).trim();
      if (q) list = list.filter(g => toLowerStr(g.name).includes(q));
    }

    // type filter
    if (selectedType && selectedType !== "All") {
      const want = selectedType.toLowerCase();
      list = list.filter(g => safeArray(g.tags).some(t => t.toLowerCase() === want));
    }

    // sort
    list.sort((a, b) => compareBySort(a, b, selectedSort));
    return list;
  }


  function compareBySort(a, b, sortId) {
    switch (sortId) {
      case "ABC_ASC":
        return a.name.localeCompare(b.name);
      case "ABC_DESC":
        return b.name.localeCompare(a.name);

      case "RELEASE_ASC":
        return parseDateToMs(a.releaseDate) - parseDateToMs(b.releaseDate) || a.name.localeCompare(b.name);
      case "RELEASE_DESC":
        return parseDateToMs(b.releaseDate) - parseDateToMs(a.releaseDate) || a.name.localeCompare(b.name);

      case "UPDATE_ASC":
        return parseDateToMs(a.lastUpdate) - parseDateToMs(b.lastUpdate) || a.name.localeCompare(b.name);
      case "UPDATE_DESC":
        return parseDateToMs(b.lastUpdate) - parseDateToMs(a.lastUpdate) || a.name.localeCompare(b.name);

      case "PLAYS_ASC":
        return parseNumber(a.totalPlays) - parseNumber(b.totalPlays) || a.name.localeCompare(b.name);
      case "PLAYS_DESC":
        return parseNumber(b.totalPlays) - parseNumber(a.totalPlays) || a.name.localeCompare(b.name);

      case "FAV_ASC":
        return parseNumber(a.totalFavorites) - parseNumber(b.totalFavorites) || a.name.localeCompare(b.name);
      case "FAV_DESC":
        return parseNumber(b.totalFavorites) - parseNumber(a.totalFavorites) || a.name.localeCompare(b.name);

      default:
        return a.name.localeCompare(b.name);
    }
  }

  function renderCurrentView() {
    // search tab could be added later (search box); for now it behaves like main.
    const list = getFilteredSortedGames();
    renderGrid(list);

    // also update dropdown active visuals
    markDropdownActives();
  }

  function markDropdownActives() {
    // type
    Array.from(el.typeMenu.querySelectorAll(".dropdown-item")).forEach(btn => {
      btn.classList.toggle("is-active", btn.textContent === selectedType);
    });
    // sort
    const activeLabel = (SORTS.find(s => s.id === selectedSort) || SORTS[0]).label;
    Array.from(el.sortMenu.querySelectorAll(".dropdown-item")).forEach(btn => {
      btn.classList.toggle("is-active", btn.textContent === activeLabel);
    });
  }

  function renderGrid(list) {
    el.grid.innerHTML = "";

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.style.color = "rgba(255,255,255,0.6)";
      empty.style.padding = "14px 6px";
      empty.textContent = activeTab === "favorites"
        ? "No favorites yet."
        : "No games match your filters.";
      el.grid.appendChild(empty);
      return;
    }

    for (const g of list) {
      const card = document.createElement("div");
      card.className = "game-card";
      card.dataset.gameId = g.id;

      const img = document.createElement("img");
      img.className = "game-card-icon";
      img.alt = g.name;
      img.src = g.icon || "";

      const footer = document.createElement("div");
      footer.className = "game-card-footer";

      const name = document.createElement("div");
      name.className = "game-card-name";
      name.textContent = g.name;

      const tag = document.createElement("div");
      tag.className = "game-card-tag";
      tag.textContent = (g.tags && g.tags.length) ? g.tags[0] : "";

      footer.appendChild(name);
      footer.appendChild(tag);

      card.appendChild(img);
      card.appendChild(footer);

      card.addEventListener("click", () => openModal(g));

      el.grid.appendChild(card);
    }
  }

  // -------------------------
  // Modal
  // -------------------------
  function openModal(game) {
    modalGame = game;

    el.modalIcon.src = game.icon || "";
    el.modalIcon.alt = game.name;

    el.modalTitle.textContent = game.name;
    el.modalDesc.textContent = game.desc || "";

    renderModalMeta(game);
    syncModalFavorite(game);

    el.modalOverlay.classList.remove("hidden");

    // close when clicking outside modal
    el.modalOverlay.addEventListener("click", onOverlayClick);
  }

  function onOverlayClick(e) {
    if (e.target === el.modalOverlay) closeModal();
  }

  function closeModal() {
    el.modalOverlay.classList.add("hidden");
    el.modalOverlay.removeEventListener("click", onOverlayClick);
    modalGame = null;
  }
  
  

// month names array
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
function formatDate(val){
  const date = new Date(Date.parse(val))
  const month = monthNames[date.getMonth()];
const day = date.getDate();
const year = date.getFullYear();
const formatted = `${month} ${day}, ${year}`;
return formatted
}
// get components


// format string


 // "December 25, 2025"

  function renderModalMeta(game) {
    const rows = [
      ["Tags", safeArray(game.tags).join(", ") || "—"],
      ["Release Date", game.releaseDate ? formatDate(game.releaseDate) : "—"],
      ["Last Update", game.lastUpdate ? formatDate(game.lastUpdate) : "—"],
      ["Total Plays", String(parseNumber(game.totalPlays))],
      ["Most Favorited", String(parseNumber(game.totalFavorites))]
    ];

    el.modalMeta.innerHTML = rows.map(([k, v]) => {
      return `
        <div class="meta-row">
          <div class="meta-key">${escapeHtml(k)}</div>
          <div class="meta-val">${escapeHtml(v)}</div>
        </div>
      `;
    }).join("");
  }

  function syncModalFavorite(game) {
    const fav = isFavorited(game.id);
    el.modalFavorite.classList.toggle("is-favorited", fav);
    el.modalFavorite.setAttribute("aria-pressed", fav ? "true" : "false");
    el.modalFavoriteLabel.textContent = fav ? "Favorited" : "Favorite";
  }

  // -------------------------
  // Play
  // -------------------------
   
    let isPlaying = false;

function buildGameUrl(game){
  if (game.playUrl) return game.playUrl;
  return `/${encodeURIComponent(game.id)}/`;
}

function enterGame(game){
  if (!game) return;

  isPlaying = true;
  closeAllDropdowns();
  closeModal();

  // swap views
  el.hubView?.classList.add("hidden");
  el.playerView?.classList.remove("hidden");

  // top bar buttons
  el.refresh?.classList.add("hidden");
  el.back?.classList.remove("hidden");

  // top bar title becomes the game name
  if (el.topSearchWrap) el.topSearchWrap.classList.add("hidden");
  if (el.topTitle){
    el.topTitle.classList.remove("hidden");
    el.topTitle.textContent = game.name || "Game";
  }

  // load iframe
  if (el.gameFrame){
    el.gameFrame.src = buildGameUrl(game);
    el.gameFrame.title = game.name || "Game";
  }
}

function exitGame(){
  isPlaying = false;

  // unload iframe (prevents audio continuing, frees memory)
  if (el.gameFrame) el.gameFrame.src = "about:blank";

  // swap views back
  el.playerView?.classList.add("hidden");
  el.hubView?.classList.remove("hidden");

  // top bar buttons
  el.back?.classList.add("hidden");
  el.refresh?.classList.remove("hidden");

  // restore top bar title/search based on active tab
  const showSearch = activeTab === "search";
  if (el.topTitle) el.topTitle.classList.toggle("hidden", showSearch);
  if (el.topSearchWrap) el.topSearchWrap.classList.toggle("hidden", !showSearch);

  if (!showSearch && el.topTitle) el.topTitle.textContent = "Faceuro Games";
  if (showSearch && el.topSearchInput) el.topSearchInput.value = searchQuery || "";

  renderCurrentView();
}
  

  // -------------------------
  // Tabs
  // -------------------------
  function setTab(tabId) {
    activeTab = tabId;
    if(activeTab != "main"){
      hideFeaturedSection()
    }else{
      showFeaturedSection();
    }

    el.navSearch.classList.toggle("is-active", tabId === "search");
    el.navMain.classList.toggle("is-active", tabId === "main");
    el.navFav.classList.toggle("is-active", tabId === "favorites");

    // Top-bar title vs search
    const showSearch = tabId === "search";

    if (el.topTitle) el.topTitle.classList.toggle("hidden", showSearch);
    if (el.topSearchWrap) el.topSearchWrap.classList.toggle("hidden", !showSearch);

    if (showSearch && el.topSearchInput) {
      // keep input in sync with current query
      el.topSearchInput.value = searchQuery || "";

      requestAnimationFrame(() => {
        el.topSearchInput.focus({ preventScroll: true });
        const v = el.topSearchInput.value || "";
        el.topSearchInput.setSelectionRange(v.length, v.length);
      });
    }

    localStorage.setItem(LS_LAST_TAB, tabId);
    renderCurrentView();
  }

function hideFeaturedSection(){
if(el.featuredSection){
  el.featuredSection.classList.add("hidden")
}
}
function showFeaturedSection(){
if(el.featuredSection){
  el.featuredSection.classList.remove("hidden")
}
}
  // -------------------------
  // Events
  // -------------------------
  function wireEvents() {
    // refresh
    el.refresh.addEventListener("click", () => {
      closeAllDropdowns();
      closeModal();
      // reload data
      loadAll().catch(err => console.error(err));
    });
    el.back?.addEventListener("click", () => exitGame());
    // search input
    if (el.searchInput) {
      el.searchInput.addEventListener("input", () => {
        
        searchQuery = el.searchInput.value || "";
        renderCurrentView();
      });
    }
    // top-bar search input
    if (el.topSearchInput) {
      el.topSearchInput.addEventListener("input", () => {
        searchQuery = el.topSearchInput.value || "";
        renderCurrentView();
      });
    }

    // top-bar clear
    if (el.topSearchClear) {
      el.topSearchClear.addEventListener("click", () => {
        searchQuery = "";
        if (el.topSearchInput) el.topSearchInput.value = "";
        renderCurrentView();
        el.topSearchInput?.focus({ preventScroll: true });
      });
    }

    // clear search
    if (el.searchClear) {
      el.searchClear.addEventListener("click", () => {
        searchQuery = "";
        if (el.searchInput) el.searchInput.value = "";
        renderCurrentView();
        el.searchInput?.focus({ preventScroll: true });
      });
    }

    // nav
    el.navSearch.addEventListener("click", () => setTab("search"));
    el.navMain.addEventListener("click", () => setTab("main"));
    el.navFav.addEventListener("click", () => setTab("favorites"));

    // dropdown toggles
    el.typeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !el.typeMenu.classList.contains("hidden");
      closeAllDropdowns();
      el.typeMenu.classList.toggle("hidden", isOpen);
      el.typeBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });

    el.sortBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !el.sortMenu.classList.contains("hidden");
      closeAllDropdowns();
      el.sortMenu.classList.toggle("hidden", isOpen);
      el.sortBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
    });

    // click outside closes dropdowns
    window.addEventListener("click", () => closeAllDropdowns());

    // modal close
    el.modalClose.addEventListener("click", closeModal);

    // modal play
    el.modalPlay.addEventListener("click", () => {
      if (!modalGame) return;
      enterGame(modalGame);
    });

    // modal favorite
    el.modalFavorite.addEventListener("click", () => {
      if (!modalGame) return;
      toggleFavorite(modalGame.id);
      syncModalFavorite(modalGame);
      // update grid if favorites tab active
      renderCurrentView();
    });

    // ESC closes modal / dropdowns
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllDropdowns();
        if (!el.modalOverlay.classList.contains("hidden")) closeModal();
      }
    });
  }

  // -------------------------
  // Boot
  // -------------------------
  function boot() {
    // default labels
    el.typeLabel.textContent = selectedType;
    el.sortLabel.textContent = (SORTS.find(s => s.id === selectedSort) || SORTS[0]).label;

    wireEvents();

    const savedTab = localStorage.getItem(LS_LAST_TAB);
    if (savedTab === "search" || savedTab === "favorites" || savedTab === "main") {
      setTab(savedTab);
    } else {
      setTab("main");
    }

    loadAll().catch(err => {
      console.error("Failed to load hub data:", err);
      // basic fallback
      el.grid.innerHTML = `<div style="color: rgba(255,255,255,0.6); padding: 14px 6px;">
        Couldn’t load games. Check your API endpoints in main.js.
      </div>`;
    });
  }

  boot();

})();