/* ============================================================
   JAVADOCS ES — scripts.js v2.1
   Lógica principal: documentación + sistema de exámenes
   ============================================================ */

"use strict";

// ---- Estado global ----
let allSections = [];
let currentSection = null;
let currentMode = "docs"; // "docs" | "examen"
let currentExamen = null;

// ---- Referencias al DOM ----
const sidebar = document.getElementById("sidebar");
const sidebarNav = document.getElementById("sidebar-nav");
const sidebarFilter = document.getElementById("sidebar-filter");
const mainContent = document.getElementById("main-content");
const welcomeScreen = document.getElementById("welcome-screen");
const docSection = document.getElementById("doc-section");
const docContent = document.getElementById("doc-content");
const headerSearch = document.getElementById("header-search");
const searchOverlay = document.getElementById("search-overlay");
const searchPanel = document.getElementById("search-results-panel");
const menuToggle = document.getElementById("menu-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const statsCount = document.getElementById("stats-sections");

// ============================================================
// CARGA DE DATOS — Documentación
// ============================================================
async function loadData() {
  try {
    const res = await fetch("java.json");
    if (!res.ok) throw new Error("No se pudo cargar java.json");
    const data = await res.json();
    allSections = data.sections;
    if (statsCount) statsCount.textContent = allSections.length;
    buildSidebar(allSections);
    checkURLHash();
  } catch (err) {
    mainContent.innerHTML = `<div style="color:#f97316;padding:40px;text-align:center">
      <p style="font-size:2rem">⚠️</p>
      <p>No se pudo cargar <code>java.json</code></p>
      <p style="color:#8b949e;font-size:.85rem;margin-top:8px">${err.message}</p>
    </div>`;
  }
}

// ============================================================
// SIDEBAR — modo documentación
// ============================================================
function buildSidebar(sections) {
  sidebarNav.innerHTML = "";
  const categories = {};

  sections.forEach(sec => {
    if (!categories[sec.category]) categories[sec.category] = [];
    categories[sec.category].push(sec);
  });

  Object.entries(categories).forEach(([cat, items]) => {
    const catEl = document.createElement("div");
    catEl.className = "sidebar-category";
    catEl.textContent = cat;
    sidebarNav.appendChild(catEl);

    items.forEach(sec => {
      const item = document.createElement("div");
      item.className = "sidebar-item";
      item.dataset.id = sec.id;
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-label", sec.title);
      item.innerHTML = `<span class="item-icon">${sec.icon}</span>
                        <span class="item-label">${sec.title}</span>`;
      item.addEventListener("click", () => showSection(sec.id));
      item.addEventListener("keydown", e => { if (e.key === "Enter") showSection(sec.id); });
      sidebarNav.appendChild(item);
    });
  });
}

// ============================================================
// SIDEBAR — modo examen
// ============================================================
function buildExamenSidebar(examen) {
  sidebarNav.innerHTML = "";

  const header = document.createElement("div");
  header.className = "sidebar-category examen-sidebar-header";
  header.textContent = "📝 " + examen.meta.tema;
  sidebarNav.appendChild(header);

  const sub = document.createElement("div");
  sub.className = "sidebar-examen-sub";
  sub.textContent = examen.meta.title;
  sidebarNav.appendChild(sub);

  const sep = document.createElement("div");
  sep.className = "sidebar-category";
  sep.textContent = "Ejercicios";
  sidebarNav.appendChild(sep);

  examen.ejercicios.forEach(ej => {
    const item = document.createElement("div");
    item.className = "sidebar-item";
    item.dataset.ejId = ej.id;
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.innerHTML = `<span class="item-icon">📌</span>
                      <span class="item-label">Ej. ${ej.numero} — ${ej.titulo}</span>`;
    item.addEventListener("click", () => showEjercicio(ej.id));
    item.addEventListener("keydown", e => { if (e.key === "Enter") showEjercicio(ej.id); });
    sidebarNav.appendChild(item);
  });
}

// ============================================================
// MOSTRAR SECCIÓN DOCUMENTACIÓN
// ============================================================
function showSection(id) {
  const sec = allSections.find(s => s.id === id);
  if (!sec) return;

  currentSection = sec;
  window.location.hash = id;

  document.querySelectorAll(".sidebar-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
  });

  welcomeScreen.style.display = "none";
  docSection.style.display = "block";
  docContent.innerHTML = buildDocHTML(sec);
  buildNavButtons(sec);
  activateCopyButtons();
  applyHighlighting();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
  if (window.innerWidth <= 680) closeSidebar();
}

// ============================================================
// MOSTRAR EJERCICIO DE EXAMEN
// ============================================================
function showEjercicio(ejId) {
  if (!currentExamen) return;
  const ej = currentExamen.ejercicios.find(e => e.id === ejId);
  if (!ej) return;

  document.querySelectorAll(".sidebar-item").forEach(el => {
    el.classList.toggle("active", el.dataset.ejId === ejId);
  });

  welcomeScreen.style.display = "none";
  docSection.style.display = "block";
  docContent.innerHTML = buildEjercicioHTML(ej);
  document.getElementById("section-nav").innerHTML = buildExamenNavHTML(ej);
  activateCopyButtons();
  activateSolucionToggle();
  applyHighlighting();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
  if (window.innerWidth <= 680) closeSidebar();
}

// ============================================================
// HTML — sección de documentación
// ============================================================
function buildDocHTML(sec) {
  let html = `<div class="breadcrumb">
    <span>📚 Documentación</span><span>›</span>
    <span>${sec.category}</span><span>›</span>
    <span>${sec.title}</span>
  </div>`;

  html += `<div class="doc-header">
    <div class="doc-icon">${sec.icon}</div>
    <div class="doc-title">
      <h1>${sec.title}</h1>
      <p class="doc-intro">${sec.content}</p>
      <span class="category-badge">📁 ${sec.category}</span>
    </div>
  </div>`;

  if (sec.subsections && sec.subsections.length > 2) {
    html += `<div class="toc"><div class="toc-title">En esta sección</div><ul class="toc-list">`;
    sec.subsections.forEach((sub, i) => {
      html += `<li><a href="#sub-${sec.id}-${i}">${sub.title}</a></li>`;
    });
    html += `</ul></div>`;
  }

  if (sec.subsections) {
    sec.subsections.forEach((sub, i) => {
      html += `<div class="subsection" id="sub-${sec.id}-${i}">
        <div class="subsection-title">${sub.title}</div>`;
      if (sub.text) html += `<p class="subsection-text">${escapeHTML(sub.text)}</p>`;
      if (sub.explanation) html += `<p class="subsection-explanation">💡 ${escapeHTML(sub.explanation)}</p>`;
      if (sub.code) html += buildCodeBlock(sub.code);
      if (sub.list) {
        html += `<ul class="subsection-list">`;
        sub.list.forEach(item => { html += `<li>${escapeHTML(item)}</li>`; });
        html += `</ul>`;
      }
      html += `</div>`;
    });
  }
  return html;
}

// ============================================================
// HTML — ejercicio de examen
// ============================================================
function buildEjercicioHTML(ej) {
  let html = `<div class="breadcrumb examen-breadcrumb">
    <span>📝 Examen</span><span>›</span>
    <span>${escapeHTML(currentExamen.meta.tema)}</span><span>›</span>
    <span>Ejercicio ${ej.numero}</span>
  </div>`;

  html += `<div class="ej-header">
    <div class="ej-numero">Ejercicio ${ej.numero}</div>
    <div class="ej-titulo-wrap">
      <h1 class="ej-titulo">${escapeHTML(ej.titulo)}</h1>

    </div>
    <p class="ej-enunciado">${escapeHTML(ej.enunciado)}</p>
  </div>`;

  html += `<div class="ej-apartados">
    <div class="ej-block-title">📋 Qué tienes que implementar</div>
    <ol class="ej-lista">`;
  ej.apartados.forEach(ap => { html += `<li>${escapeHTML(ap)}</li>`; });
  html += `</ol></div>`;

  if (ej.pistas && ej.pistas.length) {
    html += `<div class="ej-pistas">
      <div class="ej-block-title">💡 Pistas</div>
      <ul class="ej-pistas-lista">`;
    ej.pistas.forEach(p => { html += `<li>${escapeHTML(p)}</li>`; });
    html += `</ul></div>`;
  }

  if (ej.solucion) {
    html += `<div class="ej-solucion-wrap">
      <button class="ej-solucion-toggle" data-open="false">👁 Ver solución</button>
      <div class="ej-solucion" style="display:none">
        <div class="ej-block-title">✅ Solución</div>
        <p class="subsection-explanation">💡 ${escapeHTML(ej.solucion.explicacion)}</p>
        ${buildCodeBlock(ej.solucion.codigo)}
      </div>
    </div>`;
  }

  return html;
}

function activateSolucionToggle() {
  document.querySelectorAll(".ej-solucion-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const open = btn.dataset.open === "true";
      btn.nextElementSibling.style.display = open ? "none" : "block";
      btn.dataset.open = String(!open);
      btn.textContent = open ? "👁 Ver solución" : "🙈 Ocultar solución";
      if (!open) { applyHighlighting(); activateCopyButtons(); }
    });
  });
}

function buildExamenNavHTML(ej) {
  const idx = currentExamen.ejercicios.findIndex(e => e.id === ej.id);
  const prev = currentExamen.ejercicios[idx - 1];
  const next = currentExamen.ejercicios[idx + 1];
  let html = "";
  if (prev) html += `<button class="nav-btn prev" onclick="showEjercicio('${prev.id}')"><span class="nav-dir">← Anterior</span><span class="nav-title">📌 Ej. ${prev.numero} — ${prev.titulo}</span></button>`;
  else html += `<div></div>`;
  if (next) html += `<button class="nav-btn next" onclick="showEjercicio('${next.id}')"><span class="nav-dir">Siguiente →</span><span class="nav-title">📌 Ej. ${next.numero} — ${next.titulo}</span></button>`;
  return html;
}

// ============================================================
// CARGAR EXAMEN DESDE JSON
// ============================================================
async function loadExamen(path, tipo) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error("No se pudo cargar " + path);
    const data = await res.json();
    currentMode = "examen";

    document.querySelectorAll(".mode-tab").forEach(t => {
      t.classList.toggle("active", t.dataset.mode === "examen");
    });

    if (tipo === "chuleta") {
      currentExamen = null;
      buildChuletaSidebar(data);
      welcomeScreen.style.display = "flex";
      docSection.style.display = "none";
      welcomeScreen.innerHTML = buildChuletaWelcomeHTML(data);
    } else {
      currentExamen = data;
      buildExamenSidebar(data);
      welcomeScreen.style.display = "flex";
      docSection.style.display = "none";
      welcomeScreen.innerHTML = buildExamenWelcomeHTML(data);
    }
  } catch (err) {
    docContent.innerHTML = `<div style="color:#f97316;padding:40px">⚠️ ${escapeHTML(err.message)}</div>`;
  }
}

function buildExamenWelcomeHTML(data) {
  return `
    <div class="welcome-hero">📝</div>
    <h1 class="welcome-title">${escapeHTML(data.meta.tema)}</h1>
    <p class="welcome-sub">${escapeHTML(data.meta.title)}</p>
    <div class="welcome-stats">
      <div class="stat-card"><div class="stat-num">${data.ejercicios.length}</div><div class="stat-label">Ejercicios</div></div>
      <div class="stat-card"><div class="stat-num">${escapeHTML(data.meta.tipo)}</div><div class="stat-label">Tipo</div></div>
    </div>
    <div class="welcome-tips">
      <h3>📋 ${escapeHTML(data.meta.descripcion)}</h3>
      <div class="tip-item"><span class="tip-key">Sidebar</span><span>Navega por los ejercicios en el menú lateral</span></div>
      <div class="tip-item"><span class="tip-key">💡 Pistas</span><span>Cada ejercicio incluye pistas antes de la solución</span></div>
      <div class="tip-item"><span class="tip-key">👁 Solución</span><span>Revela la solución cuando estés listo</span></div>
    </div>`;
}

// ============================================================
// ÍNDICE DE EXÁMENES
// Para añadir un tema nuevo: { tema: "Tema X", icon: "📁", archivos: [{path, label}] }
// Para añadir un archivo a un tema existente: añade { path: "...", label: "..." } en su archivos[]
// ============================================================
const EXAMENES_INDEX = [
  {
    tema: "Tema 8 — Estructuras de Datos Complejas",
    icon: "📁",
    archivos: [
      { path: "examenes/tema8/simulacro-tema8.json", label: "Simulacro — Clínica PetCare", tipo: "simulacro" },
      { path: "examenes/tema8/chuleta-examen-tema8.json", label: "📋 Chuleta — Referencia rápida", tipo: "chuleta" }
    ]
  }
];

// ============================================================
// TABS DE MODO (📚 Docs / 📝 Exámenes)
// ============================================================
function buildModeTabs() {
  const wrap = document.createElement("div");
  wrap.className = "mode-tabs";
  wrap.innerHTML = `
    <button class="mode-tab active" data-mode="docs">📚 Docs</button>
    <button class="mode-tab"        data-mode="examen">📝 Exámenes</button>`;

  wrap.querySelector("[data-mode='docs']").addEventListener("click", switchToDocs);
  wrap.querySelector("[data-mode='examen']").addEventListener("click", switchToExamenes);

  sidebar.insertBefore(wrap, document.querySelector(".sidebar-search-wrap"));
}

function switchToDocs() {
  currentMode = "docs";
  currentExamen = null;
  document.querySelectorAll(".mode-tab").forEach(t => t.classList.toggle("active", t.dataset.mode === "docs"));
  welcomeScreen.innerHTML = originalWelcomeHTML;
  welcomeScreen.style.display = "flex";
  docSection.style.display = "none";
  buildSidebar(allSections);
  if (statsCount) statsCount.textContent = allSections.length;
  window.location.hash = "";
}

function switchToExamenes() {
  document.querySelectorAll(".mode-tab").forEach(t => t.classList.toggle("active", t.dataset.mode === "examen"));
  sidebarNav.innerHTML = "";

  // Construir sidebar con carpetas de tema expandibles
  EXAMENES_INDEX.forEach((temaObj, temaIdx) => {
    // Cabecera de tema — actúa como carpeta desplegable
    const catEl = document.createElement("div");
    catEl.className = "sidebar-category sidebar-tema-folder";
    catEl.dataset.temaIdx = temaIdx;
    catEl.innerHTML = `<span class="tema-folder-icon">${temaObj.icon}</span> ${temaObj.tema} <span class="tema-arrow">▾</span>`;
    sidebarNav.appendChild(catEl);

    // Contenedor de archivos del tema (visible por defecto)
    const filesWrap = document.createElement("div");
    filesWrap.className = "tema-files-wrap";
    filesWrap.dataset.temaIdx = temaIdx;

    temaObj.archivos.forEach(archivo => {
      const item = document.createElement("div");
      item.className = "sidebar-item sidebar-item-exam";
      item.innerHTML = `<span class="item-icon">📝</span><span class="item-label">${archivo.label}</span>`;
      item.addEventListener("click", () => loadExamen(archivo.path, archivo.tipo));
      filesWrap.appendChild(item);
    });

    sidebarNav.appendChild(filesWrap);

    // Toggle carpeta al hacer clic en el encabezado
    catEl.addEventListener("click", () => {
      const isOpen = filesWrap.style.display !== "none";
      filesWrap.style.display = isOpen ? "none" : "block";
      catEl.querySelector(".tema-arrow").textContent = isOpen ? "▸" : "▾";
    });
  });

  welcomeScreen.style.display = "flex";
  docSection.style.display = "none";
  welcomeScreen.innerHTML = `
    <div class="welcome-hero">📝</div>
    <h1 class="welcome-title">Exámenes</h1>
    <p class="welcome-sub">Selecciona un tema en el menú lateral y elige el ejercicio que quieres practicar.</p>
    <div class="welcome-tips">
      <h3>💡 Cómo usar los exámenes</h3>
      <div class="tip-item"><span class="tip-key">📁 Tema</span><span>Despliega la carpeta del tema en el menú lateral</span></div>
      <div class="tip-item"><span class="tip-key">💡 Pistas</span><span>Intenta resolverlo antes de ver la solución</span></div>
      <div class="tip-item"><span class="tip-key">👁 Solución</span><span>Revela la respuesta con un clic cuando estés listo</span></div>
    </div>`;
}


// ============================================================
// CHULETA — renderizado
// ============================================================
let currentChuleta = null;

function buildChuletaSidebar(data) {
  sidebarNav.innerHTML = "";
  currentChuleta = data;

  const header = document.createElement("div");
  header.className = "sidebar-category examen-sidebar-header";
  header.textContent = "📋 " + data.meta.tema;
  sidebarNav.appendChild(header);

  const sub = document.createElement("div");
  sub.className = "sidebar-examen-sub";
  sub.textContent = data.meta.title;
  sidebarNav.appendChild(sub);

  const sep = document.createElement("div");
  sep.className = "sidebar-category";
  sep.textContent = "Secciones";
  sidebarNav.appendChild(sep);

  data.secciones.forEach(sec => {
    const item = document.createElement("div");
    item.className = "sidebar-item";
    item.dataset.secId = sec.id;
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.innerHTML = `<span class="item-icon">📌</span><span class="item-label">${sec.titulo}</span>`;
    item.addEventListener("click", () => showChuletaSeccion(sec.id));
    item.addEventListener("keydown", e => { if (e.key === "Enter") showChuletaSeccion(sec.id); });
    sidebarNav.appendChild(item);
  });
}

function showChuletaSeccion(secId) {
  if (!currentChuleta) return;
  const sec = currentChuleta.secciones.find(s => s.id === secId);
  if (!sec) return;

  document.querySelectorAll(".sidebar-item").forEach(el => {
    el.classList.toggle("active", el.dataset.secId === secId);
  });

  welcomeScreen.style.display = "none";
  docSection.style.display = "block";
  docContent.innerHTML = buildChuletaSeccionHTML(sec);

  // Navegación prev/next
  const idx = currentChuleta.secciones.findIndex(s => s.id === secId);
  const prev = currentChuleta.secciones[idx - 1];
  const next = currentChuleta.secciones[idx + 1];
  let navHTML = "";
  if (prev) navHTML += `<button class="nav-btn prev" onclick="showChuletaSeccion('${prev.id}')"><span class="nav-dir">← Anterior</span><span class="nav-title">📌 ${escapeHTML(prev.titulo)}</span></button>`;
  else navHTML += `<div></div>`;
  if (next) navHTML += `<button class="nav-btn next" onclick="showChuletaSeccion('${next.id}')"><span class="nav-dir">Siguiente →</span><span class="nav-title">📌 ${escapeHTML(next.titulo)}</span></button>`;
  document.getElementById("section-nav").innerHTML = navHTML;

  activateCopyButtons();
  applyHighlighting();
  mainContent.scrollTo({ top: 0, behavior: "smooth" });
  if (window.innerWidth <= 680) closeSidebar();
}

function buildChuletaSeccionHTML(sec) {
  let html = `<div class="breadcrumb examen-breadcrumb">
    <span>📋 Chuleta</span><span>›</span>
    <span>${escapeHTML(currentChuleta.meta.tema)}</span><span>›</span>
    <span>${escapeHTML(sec.titulo)}</span>
  </div>`;

  html += `<div class="ej-header">
    <div class="ej-titulo-wrap"><h1 class="ej-titulo">${escapeHTML(sec.titulo)}</h1></div>
    <p class="ej-enunciado">${escapeHTML(sec.descripcion)}</p>
  </div>`;

  sec.bloques.forEach(bloque => {
    if (bloque.tipo === "codigo") {
      html += `<div class="subsection">
        <div class="subsection-title">${escapeHTML(bloque.titulo)}</div>
        ${buildCodeBlock(bloque.codigo)}
      </div>`;
    } else if (bloque.tipo === "lista") {
      html += `<div class="ej-apartados">
        <div class="ej-block-title">${escapeHTML(bloque.titulo)}</div>
        <ul class="ej-pistas-lista">`;
      bloque.items.forEach(item => { html += `<li>${escapeHTML(item)}</li>`; });
      html += `</ul></div>`;
    } else if (bloque.tipo === "tabla") {
      html += `<div class="ej-apartados">
        <div class="ej-block-title">${escapeHTML(bloque.titulo)}</div>
        <div class="chuleta-tabla-wrap"><table class="chuleta-tabla">`;
      bloque.filas.forEach((fila, i) => {
        html += i === 0 ? "<thead><tr>" : (i === 1 ? "</thead><tbody><tr>" : "<tr>");
        fila.forEach(celda => {
          html += i === 0 ? `<th>${escapeHTML(celda)}</th>` : `<td>${escapeHTML(celda)}</td>`;
        });
        html += "</tr>";
      });
      html += `</tbody></table></div></div>`;
    }
  });

  return html;
}

function buildChuletaWelcomeHTML(data) {
  return `
    <div class="welcome-hero">📋</div>
    <h1 class="welcome-title">Chuleta</h1>
    <p class="welcome-sub">${escapeHTML(data.meta.title)}</p>
    <div class="welcome-stats">
      <div class="stat-card"><div class="stat-num">${data.secciones.length}</div><div class="stat-label">Secciones</div></div>
      <div class="stat-card"><div class="stat-num">${data.secciones.reduce((n, s) => n + s.bloques.filter(b => b.tipo === "codigo").length, 0)}</div><div class="stat-label">Plantillas</div></div>
      <div class="stat-card"><div class="stat-num">📋</div><div class="stat-label">Tipo</div></div>
    </div>
    <div class="welcome-tips">
      <h3>💡 ${escapeHTML(data.meta.descripcion)}</h3>
      <div class="tip-item"><span class="tip-key">Sidebar</span><span>Navega por secciones en el menú lateral</span></div>
      <div class="tip-item"><span class="tip-key">📋 Copiar</span><span>Copia cualquier plantilla con un clic</span></div>
      <div class="tip-item"><span class="tip-key">🔥 Empieza</span><span>Por la sección "Supervivencia" si es tu primera vez</span></div>
    </div>`;
}

// ============================================================
// BLOQUE DE CÓDIGO
// ============================================================
function buildCodeBlock(code) {
  const id = "cb-" + Math.random().toString(36).slice(2, 8);
  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">Java</span>
      <button class="copy-btn" data-target="${id}" aria-label="Copiar código">📋 Copiar</button>
    </div>
    <div class="code-body">
      <pre id="${id}">${escapeHTML(code)}</pre>
    </div>
  </div>`;
}

// ============================================================
// NAVEGACIÓN PREV/NEXT — documentación
// ============================================================
function buildNavButtons(sec) {
  const idx = allSections.findIndex(s => s.id === sec.id);
  const prev = allSections[idx - 1];
  const next = allSections[idx + 1];
  const navEl = document.getElementById("section-nav");
  if (!navEl) return;
  navEl.innerHTML = "";

  if (prev) {
    const btn = document.createElement("button");
    btn.className = "nav-btn prev";
    btn.innerHTML = `<span class="nav-dir">← Anterior</span><span class="nav-title">${prev.icon} ${prev.title}</span>`;
    btn.addEventListener("click", () => showSection(prev.id));
    navEl.appendChild(btn);
  } else {
    navEl.appendChild(document.createElement("div"));
  }

  if (next) {
    const btn = document.createElement("button");
    btn.className = "nav-btn next";
    btn.innerHTML = `<span class="nav-dir">Siguiente →</span><span class="nav-title">${next.icon} ${next.title}</span>`;
    btn.addEventListener("click", () => showSection(next.id));
    navEl.appendChild(btn);
  }
}

// ============================================================
// COPIAR CÓDIGO
// ============================================================
function activateCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pre = document.getElementById(btn.dataset.target);
      if (!pre) return;
      const text = pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "✓ Copiado"; btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "📋 Copiar"; btn.classList.remove("copied"); }, 1800);
      }).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
        btn.textContent = "✓ Copiado"; btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "📋 Copiar"; btn.classList.remove("copied"); }, 1800);
      });
    });
  });
}

// ============================================================
// RESALTADO DE SINTAXIS
// ============================================================
const KEYWORDS = /\b(public|private|protected|static|void|int|double|float|boolean|char|String|long|short|byte|final|class|interface|abstract|extends|implements|new|return|if|else|for|while|do|switch|case|default|break|continue|import|package|this|super|try|catch|finally|throw|throws|null|true|false|instanceof|enum|var)\b/g;
const STRINGS = /(\"(?:[^\"\\]|\\.)*\"|\'(?:[^\'\\]|\\.)*\')/g;
const COMMENTS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
const NUMBERS = /\b(\d+\.?\d*[LlFfDd]?)\b/g;
const CLASSES_R = /\b([A-Z][A-Za-z0-9_]*)\b/g;
const ANNOTATIONS = /(@[A-Za-z]+)\b/g;

function applyHighlighting() {
  document.querySelectorAll(".code-body pre").forEach(pre => {
    // Si ya fue procesado, no volver a hacerlo (evita doble-escape de spans)
    if (pre.dataset.highlighted === "1") return;
    pre.dataset.highlighted = "1";

    let code = pre.innerHTML;
    const cp = [], sp = [];
    code = code.replace(COMMENTS, m => { cp.push(m); return `__C_${cp.length - 1}__`; });
    code = code.replace(STRINGS, m => { sp.push(m); return `__S_${sp.length - 1}__`; });
    code = code.replace(ANNOTATIONS, '<span class="ann">$1</span>');
    code = code.replace(KEYWORDS, '<span class="kw">$1</span>');
    code = code.replace(NUMBERS, '<span class="num">$1</span>');
    code = code.replace(CLASSES_R, (m, p1) => `<span class="cls">${p1}</span>`);
    sp.forEach((s, i) => { code = code.replace(`__S_${i}__`, `<span class="st">${s}</span>`); });
    cp.forEach((c, i) => { code = code.replace(`__C_${i}__`, `<span class="cm">${c}</span>`); });
    pre.innerHTML = code;
  });
}

// ============================================================
// BÚSQUEDA GLOBAL
// ============================================================
let searchDebounce = null;

function performSearch(query) {
  query = query.trim().toLowerCase();
  if (!query || currentMode !== "docs") { closeSearch(); return; }

  searchOverlay.style.display = "block";
  const results = allSections.filter(sec => {
    const inTitle = sec.title.toLowerCase().includes(query);
    const inContent = sec.content.toLowerCase().includes(query);
    const inTags = sec.tags.some(t => t.toLowerCase().includes(query));
    const inSubs = sec.subsections && sec.subsections.some(sub =>
      sub.title.toLowerCase().includes(query) ||
      (sub.text && sub.text.toLowerCase().includes(query)) ||
      (sub.explanation && sub.explanation.toLowerCase().includes(query)) ||
      (sub.code && sub.code.toLowerCase().includes(query))
    );
    return inTitle || inContent || inTags || inSubs;
  });
  renderSearchResults(results, query);
}

function renderSearchResults(results, query) {
  let html = `<div class="search-results-header">
    <span>${results.length} resultado${results.length !== 1 ? "s" : ""} para "<strong>${escapeHTML(query)}</strong>"</span>
    <span style="cursor:pointer;color:var(--text-muted)" id="close-search-btn">✕ Cerrar</span>
  </div>`;

  if (!results.length) {
    html += `<div class="search-no-results">
      <p style="font-size:2rem">🔍</p>
      <p>No se encontró nada para "<strong>${escapeHTML(query)}</strong>"</p>
      <p style="font-size:.82rem;color:var(--text-muted);margin-top:8px">Intenta con: if, for, while, clase, método, array...</p>
    </div>`;
  } else {
    results.forEach(sec => {
      const snippet = getSnippet(sec, query);
      html += `<div class="search-result-item" data-id="${sec.id}">
        <div class="result-icon">${sec.icon}</div>
        <div class="result-info">
          <div class="result-title">${highlight(sec.title, query)}</div>
          <div class="result-category">📁 ${sec.category}</div>
          ${snippet ? `<div class="result-snippet">${snippet}</div>` : ""}
        </div>
      </div>`;
    });
  }

  searchPanel.innerHTML = html;
  searchPanel.querySelectorAll(".search-result-item").forEach(el => {
    el.addEventListener("click", () => { showSection(el.dataset.id); closeSearch(); headerSearch.value = ""; });
  });
  const closeBtn = document.getElementById("close-search-btn");
  if (closeBtn) closeBtn.addEventListener("click", () => { closeSearch(); headerSearch.value = ""; });
}

function getSnippet(sec, query) {
  if (!sec.subsections) return "";
  for (const sub of sec.subsections) {
    if (sub.title.toLowerCase().includes(query)) return `En: <em>${sub.title}</em>`;
    if (sub.text && sub.text.toLowerCase().includes(query)) {
      const idx = sub.text.toLowerCase().indexOf(query);
      return "..." + escapeHTML(sub.text.slice(Math.max(0, idx - 40), idx + 80)) + "...";
    }
  }
  return escapeHTML(sec.content.slice(0, 120)) + "...";
}

function highlight(text, query) {
  return escapeHTML(text).replace(new RegExp(`(${escapeRegex(query)})`, "gi"), "<mark>$1</mark>");
}

function closeSearch() { searchOverlay.style.display = "none"; searchPanel.innerHTML = ""; }

headerSearch.addEventListener("input", () => { clearTimeout(searchDebounce); searchDebounce = setTimeout(() => performSearch(headerSearch.value), 220); });
headerSearch.addEventListener("keydown", e => { if (e.key === "Escape") { closeSearch(); headerSearch.value = ""; } });
searchOverlay.addEventListener("click", e => { if (e.target === searchOverlay) { closeSearch(); headerSearch.value = ""; } });
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); headerSearch.focus(); headerSearch.select(); }
  if (e.key === "Escape") closeSearch();
});

// ============================================================
// FILTRO SIDEBAR
// ============================================================
sidebarFilter.addEventListener("input", () => {
  if (currentMode !== "docs") return;
  const q = sidebarFilter.value.trim().toLowerCase();
  const filtered = q ? allSections.filter(s =>
    s.title.toLowerCase().includes(q) || s.tags.some(t => t.includes(q)) || s.category.toLowerCase().includes(q)
  ) : allSections;
  buildSidebar(filtered);
  if (currentSection) {
    const el = sidebarNav.querySelector(`[data-id="${currentSection.id}"]`);
    if (el) el.classList.add("active");
  }
});

// ============================================================
// MENÚ MÓVIL
// ============================================================
menuToggle.addEventListener("click", toggleSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);
function toggleSidebar() { sidebar.classList.toggle("open"); sidebarOverlay.classList.toggle("show"); }
function closeSidebar() { sidebar.classList.remove("open"); sidebarOverlay.classList.remove("show"); }

// ============================================================
// HASH URL
// ============================================================
function checkURLHash() {
  const hash = window.location.hash.replace("#", "");
  if (hash && allSections.find(s => s.id === hash)) showSection(hash);
}
window.addEventListener("hashchange", () => {
  if (currentMode !== "docs") return;
  const hash = window.location.hash.replace("#", "");
  if (hash && allSections.find(s => s.id === hash)) showSection(hash);
});

// ============================================================
// UTILIDADES
// ============================================================
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// ============================================================
// INIT
// ============================================================
let originalWelcomeHTML = "";

document.addEventListener("DOMContentLoaded", async () => {
  originalWelcomeHTML = welcomeScreen.innerHTML;
  buildModeTabs();
  await loadData();
});