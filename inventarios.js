/* ======================================================
   MÓDULO INVENTARIOS — GOOGLE SHEET (CSV)
   SUMA SOLO COLUMNA VALOR (ÚLTIMA)
   + ICONO ORDENAMIENTO FUNCIONAL
   + FILTRADO DE FILAS VACÍAS
   + ORDENAMIENTO MÚLTIPLE
   + BOTÓN IMPRIMIR EN CABECERA STOCK TECNIAGREX
====================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQMwaPDT6D77loQJnIbuoOBdEhkzxdStR9qoenXMKHtSTiZSIG9IMyf4Gvku7OpszCtT6TrSauwgBVs/pub?gid=0&single=true&output=csv";

  const modulo = document.getElementById("modulo-inventarios");
  const empresaSelect  = document.getElementById("invEmpresaSelect");
  const haciendaSelect = document.getElementById("invHaciendaSelect");
  const thead = document.getElementById("invThead");
  const tbody = document.getElementById("invTbody");
  const tituloHeader = document.getElementById("inventariosTitulo");

  let headers = [];
  let data = [];
  let sortStates = []; // [{idx: columnIndex, dir: "asc"|"desc"}]

  /* ===================== CARGA CSV ===================== */
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!results.data || results.data.length === 0) {
        console.error("Inventarios: CSV vacío");
        return;
      }
      data = results.data;
      headers = Object.keys(data[0]);
      llenarSelectEmpresa();
      renderTabla();
      agregarBotonImprimir(); // Crear botón dentro del header
    },
    error: err => console.error("Error CSV Inventarios:", err)
  });

  /* ===================== SELECT EMPRESA ===================== */
  function llenarSelectEmpresa() {
    const empresas = [...new Set(data.map(d => d[headers[1]]).filter(Boolean))];
    empresaSelect.innerHTML = `<option value="ALL">Todas</option>`;
    empresas.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e;
      opt.textContent = e;
      empresaSelect.appendChild(opt);
    });
    llenarSelectHacienda();
  }

  /* ===================== SELECT HACIENDA ===================== */
  function llenarSelectHacienda() {
    const empresa = empresaSelect.value;
    let filtrados = data;
    if (empresa !== "ALL") filtrados = data.filter(d => d[headers[1]] === empresa);
    const haciendas = [...new Set(filtrados.map(d => d[headers[2]]).filter(Boolean))];
    haciendaSelect.innerHTML = `<option value="ALL">Todas</option>`;
    haciendas.forEach(h => {
      const opt = document.createElement("option");
      opt.value = h;
      opt.textContent = h;
      haciendaSelect.appendChild(opt);
    });
  }

  /* ===================== FILTRO ===================== */
  function filtrarDatos() {
    const empresa  = empresaSelect.value;
    const hacienda = haciendaSelect.value;
    return data.filter(d => {
      if (empresa  !== "ALL" && d[headers[1]] !== empresa)  return false;
      if (hacienda !== "ALL" && d[headers[2]] !== hacienda) return false;
      return Object.values(d).some(v => v !== null && v !== undefined && v.toString().trim() !== "");
    });
  }

  /* ===================== ORDENAR COLUMNAS ===================== */
  function ordenarColumna(idx) {
    const existing = sortStates.find(s => s.idx === idx);
    if (existing) existing.dir = existing.dir === "asc" ? "desc" : "asc";
    else sortStates.push({idx, dir: "asc"});

    let datos = filtrarDatos();

    // Actualizar iconos
    thead.querySelectorAll("th").forEach((th, i) => {
      const icon = th.querySelector(".sort-icon");
      const state = sortStates.find(s => s.idx === i);
      if (state) {
        icon.textContent = state.dir === "asc" ? "⬆" : "⬇";
        icon.style.color = state.dir === "asc" ? "blue" : "red";
      } else {
        icon.textContent = "⬍";
        icon.style.color = "black";
      }
    });

    // Ordenamiento múltiple
    datos.sort((a, b) => {
      for (const s of sortStates) {
        let valA = a[headers[s.idx]] ?? "";
        let valB = b[headers[s.idx]] ?? "";
        const numA = parseFloat(valA.toString().replace(/[^0-9.-]/g, ""));
        const numB = parseFloat(valB.toString().replace(/[^0-9.-]/g, ""));
        if (!isNaN(numA) && !isNaN(numB)) { valA = numA; valB = numB; }
        else { valA = valA.toString().toLowerCase(); valB = valB.toString().toLowerCase(); }
        if (valA < valB) return s.dir === "asc" ? -1 : 1;
        if (valA > valB) return s.dir === "asc" ? 1 : -1;
      }
      return 0;
    });

    renderTablaOrdenada(datos);
  }

  /* ===================== RENDER TABLA ===================== */
  function renderTabla() {
    const datos = filtrarDatos();
    renderTablaOrdenada(datos);
  }

  /* ===================== RENDER TABLA ORDENADA ===================== */
  function renderTablaOrdenada(datos) {
    const lastIndex = headers.length - 1;
    let totalValor = 0;

    // HEADER
    thead.innerHTML = "";
    headers.forEach((h, idx) => {
      const th = document.createElement("th");
      th.classList.add("sortable");

      const spanText = document.createElement("span");
      spanText.textContent = h;
      th.appendChild(spanText);

      const spanIcon = document.createElement("span");
      spanIcon.className = "sort-icon";
      spanIcon.style.marginLeft = "4px";
      spanIcon.style.fontSize = "12px";
      spanIcon.style.color = "black";
      spanIcon.textContent = "⬍";
      th.appendChild(spanIcon);

      th.addEventListener("click", () => ordenarColumna(idx));
      thead.appendChild(th);
    });

    tbody.innerHTML = "";
    datos.forEach(row => {
      const tr = document.createElement("tr");
      headers.forEach((h, idx) => {
        const td = document.createElement("td");
        const val = row[h] ?? "";
        td.textContent = val;
        if (idx === lastIndex) {
          const num = parseFloat(val.toString().replace(/[^0-9.-]/g, ""));
          if (!isNaN(num)) totalValor += num;
          td.classList.add("numero");
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // FILA TOTAL
    const trTotal = document.createElement("tr");
    trTotal.className = "fila-total";
    headers.forEach((h, idx) => {
      const td = document.createElement("td");
      if (idx === 0) td.textContent = "TOTAL";
      else if (idx === lastIndex) {
        td.textContent = totalValor.toLocaleString("es-EC", {minimumFractionDigits:2, maximumFractionDigits:2});
        td.classList.add("numero");
      } else td.textContent = "";
      trTotal.appendChild(td);
    });
    tbody.appendChild(trTotal);
  }

  /* ===================== EVENTOS ===================== */
  empresaSelect.addEventListener("change", () => { llenarSelectHacienda(); renderTabla(); });
  haciendaSelect.addEventListener("change", renderTabla);


/* ===================== BOTÓN IMPRIMIR EN CABECERA — CELDAS COMPACTAS ===================== */
function agregarBotonImprimir() {
  if (!tituloHeader) return;

  // Contenedor flex para título + botón
  const flexContainer = document.createElement("div");
  flexContainer.style.display = "flex";
  flexContainer.style.justifyContent = "space-between";
  flexContainer.style.alignItems = "center";

  // Clonamos el título existente
  const titulo = tituloHeader.cloneNode(true);
  titulo.style.margin = "0";

  // Botón imprimir
  const printBtn = document.createElement("button");
  printBtn.textContent = "🖨 Imprimir";
  printBtn.style.padding = "3px 8px";
  printBtn.style.border = "none";
  printBtn.style.borderRadius = "6px";
  printBtn.style.background = "#1abc9c";
  printBtn.style.color = "#fff";
  printBtn.style.fontWeight = "700";
  printBtn.style.cursor = "pointer";

  printBtn.addEventListener("click", () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
      <head>
        <title>Reporte Inventario TECNIAGREX</title>
        <style>
          @media print {
            @page { size: landscape; margin: 10mm; }
          }
          body { font-family: 'Comfortaa', sans-serif; margin: 10px; }
          header { 
            text-align: center; 
            margin-bottom: 8px; 
            border-bottom: 2px solid #1abc9c; 
            padding-bottom: 4px; 
          }
          header h1 { 
            margin: 0; 
            font-size: 1.2rem; 
            color: #1abc9c; 
          }
          header p { 
            margin: 1px 0 0; 
            font-size: 0.75rem; 
            color: #555; 
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 0.7rem; /* fuente muy pequeña */
          }
          th, td { 
            border: 0.2px solid #333; 
            padding: 1px 2px; /* celdas muy compactas */
            text-align: left; 
          }
          th { background: #ececec; }
          .numero { text-align: right; }
          .fila-total { font-weight: bold; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <header>
          <h1>REPORTE DE INVENTARIO TECNIAGREX</h1>
          <p>Actualizado hasta Corte al 2025-12-14</p>
        </header>
        ${modulo.querySelector(".tabla-inventarios").outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  });

  flexContainer.appendChild(titulo);
  flexContainer.appendChild(printBtn);

  // Reemplazamos el título original por el contenedor flex
  const headerDiv = tituloHeader.parentNode;
  headerDiv.innerHTML = "";
  headerDiv.appendChild(flexContainer);
}

  


});
