/* ================================================================
   MINI SISTEMA AGRÍCOLA — MÓDULOS DINÁMICOS CON DETALLES + LOADER
================================================================ */

const moduloBtns = document.querySelectorAll(".menu-item");
const empresaSelect = document.getElementById("empresaSelect");
const haciendaSelect = document.getElementById("haciendaSelect");
const tablaBody = document.getElementById("tablaBody");
const theadTabla = document.getElementById("theadTabla");
const tituloTabla = document.getElementById("titulo-tabla");
const tituloPrincipal = document.getElementById("titulo");
const tabsContainer = document.querySelector(".tabs");
const kpisContainer = document.querySelector(".kpis");
const tablaDetalle = document.getElementById("tablaDetalle");
const loader = document.getElementById("loader");

let currentModule = "Producción";
let dataModules = {};
let headersModules = {};
let datosFiltrados = [];
let chart = null;
let tipoGrafico = null;
let dataDetalles = null;

/* ===================== HECTÁREAS ===================== */

const HECTAREAS = {
  "PORVENIR": 94,
  "ESPERANZA": 36,
  "EL CISNE": 13,
  "VAQUERIA": 61.4,
  "ESTRELLITA": 66.65,
  "PRIMAVERA": 67,
  "LA MARIA": 252.16,
  "AGRO&SOL": 381.5
};

/* ===================== LOADER CONTROL CORREGIDO ===================== */

let moduloCargado = {
  "Producción": false,
  "Gastos": false,
  "Liquidaciones": false
};

function showLoader(modulo) {
  if (moduloCargado[modulo]) return;  
  loader.style.display = "flex";
  requestAnimationFrame(() => {
    loader.style.opacity = "1";
  });
}

function hideLoader(modulo) {
  if (moduloCargado[modulo]) return;
  
  loader.style.opacity = "0";
  setTimeout(() => {
    loader.style.display = "none";
    // Marcamos como cargado solo después de ocultarlo
    moduloCargado[modulo] = true;
  }, 350);
}



/* ================= URLs ================= */

const sheetURLs = {
  "Producción": "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWUa0XHVhUxy79IY5bv2vppEWhA50Mye4loI4wCErMtGjSM7uP1MHWcCSb8ciUwi6YT2XO7iQhKhFq/pub?gid=0&single=true&output=csv",
  "Gastos": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGqKfSKtI7fdrgu6Ssz43ZFgXrrTf4B8fzWdKt6PAUJiRibhzE75cW9YNAN10T6cU3ORoqst4OTZiD/pub?gid=0&single=true&output=csv",
  "Liquidaciones": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSme-Xj4jhGJVEG8QwV-plPbjvhvpEhLRY4gII1Uf85wmRBeVXa-adOqMkUl8EpQMBKvZdUg504-Zd2/pub?gid=0&single=true&output=csv"
};

const detallesURLs = {
  "Producción": "https://docs.google.com/spreadsheets/d/e/2PACX-1vQITw3POfXAnKjpDthFO7nX3S6-hz-KtZbwI3C0LZMdu-XcGMggDEY3SmbSCxAMzdCsagvVtoDudINJ/pub?gid=0&single=true&output=csv",
  "Gastos": "https://docs.google.com/spreadsheets/d/e/2PACX-1vS3yzCzfky5TeiKNaNOcIdNeGAvotBE-RincIpCt4kOIEnV8-rLLWk4tG0xaNG6Xt2jT2FsTVqr6iC1/pub?gid=0&single=true&output=csv"
};

/* ================= UTILIDADES ================= */

const num = v => +((v || "0").toString().replace(/[$,%\s]/g, "")) || 0;

/* ================= CARGA DE MÓDULO ================= */

async function cargarDatosModulo(modulo) {
  showLoader(modulo);

  if (!sheetURLs[modulo]) { 
    hideLoader(modulo);
    return; 
  }

  if (dataModules[modulo]) {
    actualizarUI();
    hideLoader(modulo);
    return;
  }

  const res = await fetch(sheetURLs[modulo]);
  const csv = await res.text();
  const parsed = Papa.parse(csv.trim(), { skipEmptyLines: true });
  const lines = parsed.data;
  if (!lines.length) return;

  const headers = lines[0];
  headersModules[modulo] = headers;

  const data = {};
  for (const row of lines.slice(1)) {
    const empresa = row[1], hacienda = row[2];
    if (!empresa || !hacienda) continue;

    data[empresa] ??= {};
    data[empresa][hacienda] ??= [];

    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] ?? "");
    data[empresa][hacienda].push(obj);
  }

  dataModules[modulo] = data;

  await cargarDetalles(modulo);
  actualizarUI();

  hideLoader(modulo);
}

/* ================= CARGA DETALLES ================= */

async function cargarDetalles(modulo) {
  const url = detallesURLs[modulo];
  if (!url) return;

  const res = await fetch(url);
  const csv = await res.text();
  const parsed = Papa.parse(csv.trim(), { skipEmptyLines: true });
  const lines = parsed.data;
  if (!lines.length) return;

  const headers = lines[0].map(h => h.trim());
  const rows = lines.slice(1);

  const data = {};
  for (const row of rows) {
    const empresa = (row[1] ?? "").trim();
    const hacienda = (row[2] ?? "").trim();
    if (!empresa || !hacienda) continue;

    data[empresa] ??= {};
    data[empresa][hacienda] ??= [];

    const obj = {};
    headers.forEach((h, i) => obj[h] = (row[i] ?? "").replace(/\n/g, " ").trim());
    data[empresa][hacienda].push(obj);
  }

  dataDetalles = { data, headers };
}

/* ================= SELECTORES ================= */

function actualizarUI() {
  cargarEmpresas();
  empresaSelect.value = "GLOBAL";
  cargarHaciendas();
  haciendaSelect.value = "GLOBAL";
  tipoGrafico = null;

  actualizarKPIs();
  renderTabla();
  renderGrafico();
  tablaDetalle.innerHTML = "";
}

function cargarEmpresas() {
  const data = dataModules[currentModule] || {};
  const empresas = new Set(["GLOBAL", ...Object.keys(data)]);
  empresaSelect.innerHTML = [...empresas].map(e => `<option>${e}</option>`).join("");
}

function cargarHaciendas() {
  const e = empresaSelect.value;
  const data = dataModules[currentModule] || {};
  const haciendas = new Set(["GLOBAL", ...(data[e] ? Object.keys(data[e]) : [])]);
  haciendaSelect.innerHTML = [...haciendas].map(h => `<option>${h}</option>`).join("");
}

/* ================= KPIs ================= */

function actualizarKPIs() {
  const data = dataModules[currentModule] || {};
  const headers = headersModules[currentModule] || [];
  const e = empresaSelect.value, h = haciendaSelect.value;

  const filaKPI = (data[e]?.[h] || []).find(x => x[headers[0]] == "0");

  kpisContainer.innerHTML = "";
  headers.slice(3).forEach(head => {
    const value = filaKPI ? (filaKPI[head] ?? "0") : "0";
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<h4>${head}</h4><span>${value}</span>`;
    kpisContainer.appendChild(div);
  });
}

/* ================= TABLA ================= */

function renderTabla() {
  const data = dataModules[currentModule] || {};
  const headers = headersModules[currentModule] || [];
  const e = empresaSelect.value, h = haciendaSelect.value;

  datosFiltrados = (data[e]?.[h] || []).filter(r => r[headers[0]] != "0");

  const headersTabla = headers.filter((_, idx) => idx !== 1 && idx !== 2);
  theadTabla.innerHTML = headersTabla.map(hd => `<th>${hd}</th>`).join("");

  let colClickeable = -1;

  if (currentModule === "Producción")
    colClickeable = headersTabla.findIndex(h => h.toLowerCase().includes("rechazado"));

  if (currentModule === "Gastos")
    colClickeable = headersTabla.findIndex(h => h.toLowerCase() === "riego");

  tablaBody.innerHTML = datosFiltrados.map(row =>
    `<tr>${headersTabla.map((hd, colIndex) => {
      let valor = row[hd] ?? "";
      if (colIndex === colClickeable) {
        valor = `<span class="detalle-clic" data-semana="${row[headers[0]]}" data-col="${hd}">${valor}</span>`;
      }
      return `<td>${valor}</td>`;
    }).join("")}</tr>`
  ).join("");

  document.querySelectorAll(".detalle-clic").forEach(el => {
    el.addEventListener("click", () =>
      renderDetalles(el.dataset.semana, el.dataset.col)
    );
  });

  const hect =
    HECTAREAS[h.trim().toUpperCase()] ?
    ` (${HECTAREAS[h.trim().toUpperCase()]} has)` :
    "";

  tituloTabla.innerText = `${currentModule} - ${e} / ${h}${hect}`;
}

/* ================= DETALLES ================= */

function renderDetalles() {
  tablaDetalle.innerHTML = `
    <tr>
      <td colspan="3" style="padding: 60px 0;">
        <div style="
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        ">
          <span style="font-size:20px; color:#ba027d;">🚧 Módulo en mantenimiento 🚧</span>
        </div>
      </td>
    </tr>
  `;
}

/* ================= GRÁFICO ================= */

function renderGrafico(tipo = tipoGrafico) {
  const headers = headersModules[currentModule] || [];

  if (!datosFiltrados.length || headers.length < 4) {
    tabsContainer.innerHTML = "";
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets = [];
      chart.update();
    }
    return;
  }

  if (!tipo) {
    tipo = headers[3];
    tipoGrafico = tipo;
  }

  const labels = datosFiltrados.map(x => `Sem ${x[headers[0]]}`);
  const valores = datosFiltrados.map(x => num(x[tipo]));

  const pointLabelsPlugin = {
    id: "pointLabels",
    beforeDatasetsDraw(chartInstance) {
      const { ctx } = chartInstance;
      chartInstance.data.datasets.forEach((dataset, i) => {
        const meta = chartInstance.getDatasetMeta(i);
        meta.data.forEach((point, index) => {
          const value = dataset.data[index];
          const formattedValue = new Intl.NumberFormat('es-EC').format(value);

          ctx.save();
          ctx.fillStyle = "#484848ff";
          ctx.font = "11px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(formattedValue, point.x, point.y - 8);
          ctx.restore();
        });
      });
    }
  };

  const ctx = document.getElementById("grafico");

  const maxValor = Math.max(...valores);
  const margenSuperior = maxValor * 0.1;

  if (!chart) {
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: tipo,
          data: valores,
          tension: 0.4,
          borderColor: "rgba(186,2,125,0.3)",
          backgroundColor: "rgba(186,2,125,0.25)",
          fill: true,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        elements: { line: { borderWidth: 2 } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "#e5e7eb" }, suggestedMax: maxValor + margenSuperior }
        }
      },
      plugins: [pointLabelsPlugin]
    });
  } else {
    chart.data.labels = labels;
    chart.data.datasets[0].label = tipo;
    chart.data.datasets[0].data = valores;
    chart.options.scales.y.suggestedMax = maxValor + margenSuperior;
    chart.update({ duration: 800, easing: 'easeOutQuart' });
  }

  tabsContainer.innerHTML = "";
  headers.slice(3).forEach(head => {
    const btn = document.createElement("button");
    btn.className = "tab" + (head === tipo ? " active" : "");
    btn.textContent = head;
    btn.onclick = () => { tipoGrafico = head; renderGrafico(head); };
    tabsContainer.appendChild(btn);
  });
}


/* ================= CAMBIO DE MÓDULO ================= */

moduloBtns.forEach(btn => {
  btn.addEventListener("click", () => {

    // Quita la clase active de todos y ponla en el seleccionado
    moduloBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Determina módulo actual
    currentModule =
      btn.dataset.modulo === "produccion" ? "Producción" :
      btn.dataset.modulo === "gastos" ? "Gastos" :
      btn.dataset.modulo === "liquidaciones" ? "Liquidaciones" :
      btn.dataset.modulo === "inventarios" ? "Inventarios" :
      btn.dataset.modulo === "resumen" ? "Resumen" :
      btn.dataset.modulo === "financiero" ? "Financiero" :
      currentModule;

    // Actualiza título principal
    tituloPrincipal.innerText = currentModule;
    tablaDetalle.innerHTML = "";

    const resumenSection = document.getElementById("modulo-resumen");
    const inventariosSection = document.getElementById("modulo-inventarios");
    const financieroSection = document.getElementById("modulo-financiero");
    const otherSections = document.querySelectorAll('[data-vista]');

    // 🔴 OCULTAR INVENTARIOS SIEMPRE AL CAMBIAR
    if (inventariosSection) inventariosSection.style.display = "none";

    /* ========== RESUMEN ========== */
    if (currentModule === "Resumen") {

      resumenSection.style.display = "flex";

      const selectores = document.querySelectorAll('.selectores');
      selectores.forEach(s => s.style.display = 'none');

      kpisContainer.style.display = "none";
      tabsContainer.innerHTML = "";

      otherSections.forEach(sec => {
        if (sec.dataset.vista !== "resumen") sec.style.display = "none";
      });

      cargarResumen();
      return;
    }

    /* ========== INVENTARIOS ========== */
    if (currentModule === "Inventarios") {

      otherSections.forEach(sec => sec.style.display = "none");
      resumenSection.style.display = "none";

      const selectores = document.querySelectorAll('.selectores');
      selectores.forEach(s => s.style.display = 'none');
      kpisContainer.style.display = "none";
      tabsContainer.innerHTML = "";

      inventariosSection.style.display = "block";
      return;
    }

    /* ========== FINANCIERO ========== */
    if (currentModule === "Financiero") {

      otherSections.forEach(sec => sec.style.display = "none");
      resumenSection.style.display = "none";
      inventariosSection.style.display = "none";

      const selectores = document.querySelectorAll('.selectores');
      selectores.forEach(s => s.style.display = 'none');
      kpisContainer.style.display = "none";
      tabsContainer.innerHTML = "";

      financieroSection.style.display = "block";
      return;
    }

    /* ========== MÓDULOS NORMALES: Producción, Gastos, Liquidaciones ========== */

    resumenSection.style.display = "none";

    const selectores = document.querySelectorAll('.selectores');
    selectores.forEach(s => s.style.display = 'flex');

    kpisContainer.style.display = "flex";

    // Mostrar SOLO secciones de módulos normales
    otherSections.forEach(sec => {
      if (["produccion","gastos","liquidaciones"].includes(sec.dataset.vista)) {
        sec.style.display = "grid";
      } else {
        sec.style.display = "none";
      }
    });

    // Si no hay hoja para el módulo, limpia todo
    if (!sheetURLs[currentModule]) {
      tablaBody.innerHTML = "";
      theadTabla.innerHTML = "";
      kpisContainer.innerHTML = "";
      tabsContainer.innerHTML = "";
      if (chart) { chart.destroy(); chart = null; }
      return;
    }

    // Carga datos normalmente
    cargarDatosModulo(currentModule);
  });
});






/* ================= SELECTORES ================= */

empresaSelect.addEventListener("change", () => {
  actualizarKPIs();
  cargarHaciendas();
  haciendaSelect.value = "GLOBAL";
  renderTabla();
  renderGrafico();
});

haciendaSelect.addEventListener("change", () => {
  actualizarKPIs();
  renderTabla();
  renderGrafico();
});

/* ================= INICIO ================= */
// Cargamos los datos iniciales sin mostrar loader
(async () => {
  if (!sheetURLs[currentModule]) return;

  const res = await fetch(sheetURLs[currentModule]);
  const csv = await res.text();
  const parsed = Papa.parse(csv.trim(), { skipEmptyLines: true });
  const lines = parsed.data;
  if (!lines.length) return;

  const headers = lines[0];
  headersModules[currentModule] = headers;

  const data = {};
  for (const row of lines.slice(1)) {
    const empresa = row[1], hacienda = row[2];
    if (!empresa || !hacienda) continue;

    data[empresa] ??= {};
    data[empresa][hacienda] ??= [];

    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i] ?? "");
    data[empresa][hacienda].push(obj);
  }

  dataModules[currentModule] = data;

  

  // Cargamos los detalles iniciales sin loader
  const url = detallesURLs[currentModule];
  if (url) {
    const resDet = await fetch(url);
    const csvDet = await resDet.text();
    const parsedDet = Papa.parse(csvDet.trim(), { skipEmptyLines: true });
    const linesDet = parsedDet.data;
    if (linesDet.length) {
      const headersDet = linesDet[0].map(h => h.trim());
      const rowsDet = linesDet.slice(1);
      const dataDet = {};
      for (const row of rowsDet) {
        const empresa = (row[1] ?? "").trim();
        const hacienda = (row[2] ?? "").trim();
        if (!empresa || !hacienda) continue;

        dataDet[empresa] ??= {};
        dataDet[empresa][hacienda] ??= [];

        const obj = {};
        headersDet.forEach((h, i) => obj[h] = (row[i] ?? "").replace(/\n/g, " ").trim());
        dataDet[empresa][hacienda].push(obj);
      }
      dataDetalles = { data: dataDet, headers: headersDet };
    }
  }

  actualizarUI();
})();
