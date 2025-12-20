/* ================================================================
   MINI SISTEMA AGRÍCOLA — MÓDULOS DINÁMICOS + LOADER
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

/* ===================== LOADER ===================== */
let moduloCargado = { "Producción": false, "Gastos": false, "Liquidaciones": false };

function showLoader(modulo) {
  if (moduloCargado[modulo]) return;
  loader.style.display = "flex";
  requestAnimationFrame(() => { loader.style.opacity = "1"; });
}

function hideLoader(modulo) {
  if (moduloCargado[modulo]) return;
  loader.style.opacity = "0";
  setTimeout(() => {
    loader.style.display = "none";
    moduloCargado[modulo] = true;
  }, 350);
}

/* ================= URLs ================= */
const sheetURLs = {
  "Producción": "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWUa0XHVhUxy79IY5bv2vppEWhA50Mye4loI4wCErMtGjSM7uP1MHWcCSb8ciUwi6YT2XO7iQhKhFq/pub?gid=0&single=true&output=csv",
  "Gastos": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGqKfSKtI7fdrgu6Ssz43ZFgXrrTf4B8fzWdKt6PAUJiRibhzE75cW9YNAN10T6cU3ORoqst4OTZiD/pub?gid=0&single=true&output=csv",
  "Liquidaciones": "https://docs.google.com/spreadsheets/d/e/2PACX-1vSme-Xj4jhGJVEG8QwV-plPbjvhvpEhLRY4gII1Uf85wmRBeVXa-adOqMkUl8EpQMBKvZdUg504-Zd2/pub?gid=0&single=true&output=csv"
};

/* ================= UTILIDADES ================= */
const num = v => +((v || "0").toString().replace(/[$,%\s]/g, "")) || 0;

/* ================= CARGA DE MÓDULO ================= */
async function cargarDatosModulo(modulo) {
  showLoader(modulo);
  if (!sheetURLs[modulo]) { hideLoader(modulo); return; }
  if (dataModules[modulo]) { 
    actualizarUI(); 
    if(modulo==="Liquidaciones") await cargarDetallesLiquidaciones().then(() => renderDetallesLiquidaciones());
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
  actualizarUI();

  if(modulo==="Liquidaciones") await cargarDetallesLiquidaciones().then(() => renderDetallesLiquidaciones());

  hideLoader(modulo);
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
}

function cargarEmpresas() {
  const data = dataModules[currentModule] || {};
  empresaSelect.innerHTML = [...new Set(["GLOBAL", ...Object.keys(data)])].map(e => `<option>${e}</option>`).join("");
}

function cargarHaciendas() {
  const e = empresaSelect.value;
  const data = dataModules[currentModule] || {};
  haciendaSelect.innerHTML = [...new Set(["GLOBAL", ...(data[e] ? Object.keys(data[e]) : [])])].map(h => `<option>${h}</option>`).join("");
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
  const e = empresaSelect.value.trim(); // valor exacto del select de empresa
  const h = haciendaSelect.value.trim(); // valor exacto del select de hacienda

  // Filtrado exacto: solo filas de la empresa y hacienda seleccionadas
  let datosFiltradosTemp = [];
  if (data[e] && data[e][h]) {
    datosFiltradosTemp = [...data[e][h]];
  }

  // Excluimos filas con identificador "0"
  datosFiltrados = datosFiltradosTemp.filter(r => r[headers[0]] != "0");

  // Creamos encabezados excluyendo columna 1 (empresa) y 2 (hacienda)
  const headersTabla = headers.filter((_, idx) => idx !== 1 && idx !== 2);
  theadTabla.innerHTML = headersTabla.map(hd => `<th>${hd}</th>`).join("");

  // Índice de columna "Descuentos" clickeable
  const idxDescuentos = headersTabla.findIndex(hd => hd.toLowerCase().includes("descuentos"));

  // Construimos filas
  tablaBody.innerHTML = datosFiltrados.map(row => `<tr>${
    headersTabla.map((hd, colIndex) => {
      let valor = row[hd] ?? "";
      if (colIndex === idxDescuentos) {
        valor = `<span class="detalle-clic" data-semana="${row[headers[0]]}">${valor}</span>`;
      } else if (!isNaN(num(valor))) {
        valor = new Intl.NumberFormat('es-EC').format(num(valor));
      }
      return `<td>${valor}</td>`;
    }).join("")
  }</tr>`).join("");

  // Listener clic sobre columna descuentos
  document.querySelectorAll(".detalle-clic").forEach(el => {
    el.addEventListener("click", () => {
      const semana = el.dataset.semana;
      if (currentModule === "Liquidaciones") renderDetallesLiquidaciones(semana);
    });
  });

  const hect = HECTAREAS[h.toUpperCase()] ? ` (${HECTAREAS[h.toUpperCase()]} has)` : "";
  tituloTabla.innerText = `${currentModule} - ${e} / ${h}${hect}`;
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

  if (!tipo) { tipo = headers[3]; tipoGrafico = tipo; }

  const labels = datosFiltrados.map(x => `Sem ${x[headers[0]]}`);
  const valores = datosFiltrados.map(x => num(x[tipo]));
  const maxValor = Math.max(...valores);
  const margenSuperior = maxValor * 0.1;

  const pointLabelsPlugin = {
    id: "pointLabels",
    beforeDatasetsDraw(chartInstance) {
      const { ctx } = chartInstance;
      chartInstance.data.datasets.forEach((dataset, i) => {
        const meta = chartInstance.getDatasetMeta(i);
        meta.data.forEach((point, index) => {
          const value = dataset.data[index];
          ctx.save();
          ctx.fillStyle = "#484848ff";
          ctx.font = "11px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(new Intl.NumberFormat('es-EC').format(value), point.x, point.y - 8);
          ctx.restore();
        });
      });
    }
  };

  const ctx = document.getElementById("grafico");
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

  // Generar tabs
  tabsContainer.innerHTML = "";
  headers.slice(3).forEach(head => {
    const btn = document.createElement("button");
    btn.className = "tab" + (head === tipo ? " active" : "");
    btn.textContent = head;
    btn.onclick = () => { tipoGrafico = head; renderGrafico(head); };
    tabsContainer.appendChild(btn);
  });
}




/* ================= DETALLES LIQUIDACIONES ================= */
async function cargarDetallesLiquidaciones() {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTN4DhXzK6uTyZcR-HyF9h_yGkSHyNt-iaFN6zYXeNK-6hXJQMgxgQ6DNBzj5IT4DDeSBr6vVnrV0Rv/pub?gid=0&single=true&output=csv";
  const res = await fetch(url);
  const csv = await res.text();
  const parsed = Papa.parse(csv.trim(), { skipEmptyLines: true });
  const lines = parsed.data;
  if (!lines.length) return;

  const rows = lines.slice(1);

  dataDetalles ??= {};
  dataDetalles["Liquidaciones"] = rows.map(row => ({
    SEM: row[0],
    EMPRESA: row[1].trim(), // se mantiene solo como referencia
    HACIENDA: row[2].trim(),
    DETALLE: row[3],
    VALOR: row[4]
  }));
}

// Renderiza detalles solo según HACIENDA, ignorando EMPRESA
// Agrupa detalles repetidos y suma sus valores
function renderDetallesLiquidaciones(semanaFiltro = null) {
  if (!dataDetalles || !dataDetalles["Liquidaciones"]) return;

  const h = haciendaSelect.value.trim().toUpperCase();

  // Filtramos únicamente por HACIENDA
  let rows = dataDetalles["Liquidaciones"].filter(r => 
    h === "GLOBAL" || r.HACIENDA.toUpperCase() === h
  );

  // Si se pasó semanaFiltro (clic en Descuentos), filtramos también por SEM
  if (semanaFiltro) {
    rows = rows.filter(r => r.SEM === semanaFiltro);
  }

  // Omitir filas donde DETALLE diga "CAJAS"
  rows = rows.filter(r => r.DETALLE.toUpperCase() !== "CAJAS");

  if (!rows.length) {
    tablaDetalle.innerHTML = `
      <tbody>
        <tr>
          <td colspan="3" style="text-align:center; padding:20px;">
            No hay datos para ${h}${semanaFiltro ? " - Sem " + semanaFiltro : ""}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="total-detalle">
          <td></td>
          <td style="font-weight:bold; text-align:right;">TOTAL</td>
          <td style="font-weight:bold;">0</td>
        </tr>
      </tfoot>
    `;
    return;
  }

  // Agrupar por DETALLE y sumar valores
  const grouped = {};
  rows.forEach(r => {
    const key = r.DETALLE;
    if (!grouped[key]) {
      grouped[key] = { EMPRESA: r.EMPRESA, VALOR: 0 };
    }
    grouped[key].VALOR += num(r.VALOR);
  });

  // Construimos las filas del tbody mostrando EMPRESA en "Tipo"
  const filas = Object.entries(grouped).map(([detalle, info]) => 
    `<tr>
      <td>${info.EMPRESA}</td>
      <td>${detalle}</td>
      <td>${new Intl.NumberFormat('es-EC').format(info.VALOR)}</td>
    </tr>`
  ).join("");

  // Sumamos la columna VALOR total
  const total = Object.values(grouped).reduce((acc, r) => acc + r.VALOR, 0);

  tablaDetalle.innerHTML = `
    <tbody>
      ${filas}
    </tbody>
    <tfoot>
      <tr class="total-detalle">
        <td></td>
        <td style="font-weight:bold; text-align:right;">TOTAL</td>
        <td style="font-weight:bold;">${new Intl.NumberFormat('es-EC').format(total)}</td>
      </tr>
    </tfoot>
  `;
}






/* ================= CAMBIO DE MÓDULO ================= */
moduloBtns.forEach(btn => btn.addEventListener("click", async () => {
  moduloBtns.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  currentModule = btn.dataset.modulo.toLowerCase() === "produccion" ? "Producción" :
                  btn.dataset.modulo.toLowerCase() === "gastos" ? "Gastos" :
                  btn.dataset.modulo.toLowerCase() === "liquidaciones" ? "Liquidaciones" :
                  btn.dataset.modulo.toLowerCase() === "inventarios" ? "Inventarios" :
                  btn.dataset.modulo.toLowerCase() === "resumen" ? "Resumen" :
                  btn.dataset.modulo.toLowerCase() === "financiero" ? "Financiero" :
                  currentModule;

  tituloPrincipal.innerText = currentModule;
  tablaDetalle.innerHTML = "";

  const resumenSection = document.getElementById("modulo-resumen");
  const inventariosSection = document.getElementById("modulo-inventarios");
  const financieroSection = document.getElementById("modulo-financiero");
  const otherSections = document.querySelectorAll('[data-vista]');

  if (inventariosSection) inventariosSection.style.display = "none";

  // RESUMEN
  if (currentModule === "Resumen") {
    resumenSection.style.display = "flex";
    document.querySelectorAll('.selectores').forEach(s => s.style.display = 'none');
    kpisContainer.style.display = "none";
    tabsContainer.innerHTML = "";
    otherSections.forEach(sec => { if (sec.dataset.vista !== "resumen") sec.style.display = "none"; });
    cargarResumen();
    return;
  }

  // INVENTARIOS
  if (currentModule === "Inventarios") {
    otherSections.forEach(sec => sec.style.display = "none");
    resumenSection.style.display = "none";
    document.querySelectorAll('.selectores').forEach(s => s.style.display = 'none');
    kpisContainer.style.display = "none";
    tabsContainer.innerHTML = "";
    inventariosSection.style.display = "block";
    return;
  }

  // FINANCIERO
  if (currentModule === "Financiero") {
    otherSections.forEach(sec => sec.style.display = "none");
    resumenSection.style.display = "none";
    inventariosSection.style.display = "none";
    document.querySelectorAll('.selectores').forEach(s => s.style.display = 'none');
    kpisContainer.style.display = "none";
    tabsContainer.innerHTML = "";
    financieroSection.style.display = "block";
    return;
  }

  // MÓDULOS NORMALES
  resumenSection.style.display = "none";
  document.querySelectorAll('.selectores').forEach(s => s.style.display = 'flex');
  kpisContainer.style.display = "flex";
  otherSections.forEach(sec => {
    sec.style.display = ["produccion","gastos","liquidaciones"].includes(sec.dataset.vista) ? "grid" : "none";
  });

  if (!sheetURLs[currentModule]) {
    tablaBody.innerHTML = "";
    theadTabla.innerHTML = "";
    kpisContainer.innerHTML = "";
    tabsContainer.innerHTML = "";
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  await cargarDatosModulo(currentModule);
}));

// ================= INICIO =================
(async () => {
  await cargarDatosModulo(currentModule);

  // Si el módulo inicial es Liquidaciones, cargamos los detalles
  if (currentModule === "Liquidaciones") {
    await cargarDetallesLiquidaciones();
    renderDetallesLiquidaciones();
  }
})();

// ================= EVENTOS SELECT =================
empresaSelect.addEventListener("change", async () => {
  actualizarKPIs();
  cargarHaciendas();
  haciendaSelect.value = "GLOBAL";
  renderTabla();
  renderGrafico();

  if(currentModule === "Liquidaciones") {
    // Aseguramos que los detalles estén cargados
    if (!dataDetalles?.Liquidaciones) {
      await cargarDetallesLiquidaciones();
    }
    renderDetallesLiquidaciones();
  }
});

haciendaSelect.addEventListener("change", async () => {
  actualizarKPIs();
  renderTabla();
  renderGrafico();

  if(currentModule === "Liquidaciones") {
    if (!dataDetalles?.Liquidaciones) {
      await cargarDetallesLiquidaciones();
    }
    renderDetallesLiquidaciones();
  }
});

