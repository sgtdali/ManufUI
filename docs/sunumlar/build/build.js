const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const {
  FaIndustry, FaBullseye, FaChartBar, FaHourglassHalf, FaExchangeAlt,
  FaChartLine, FaLightbulb, FaExclamationTriangle, FaCheckCircle, FaClock,
  FaQuestionCircle, FaTasks, FaHandshake, FaCalendarAlt, FaArrowRight,
  FaArrowDown, FaTools
} = require("react-icons/fa");

const COLORS = {
  navy: "1E2761",
  navyDeep: "141B47",
  ice: "CADCFC",
  iceTint: "EEF2FC",
  white: "FFFFFF",
  bg: "F7F8FC",
  slate: "475569",
  slateLight: "8590A6",
  border: "D8DEEC",
  green: "15803D",
  greenBg: "DCFCE7",
  amber: "B45309",
  amberBg: "FEF3C7",
  red: "B91C1C",
  redBg: "FEE2E2",
};

const FONT_HEAD = "Cambria";
const FONT_BODY = "Calibri";

function renderIconSvg(IconComponent, color, size) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}
async function iconPng(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

function turkishUpper(s) {
  return s.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();
}
function fmtInt(n) {
  return Math.round(n).toLocaleString("tr-TR");
}
function fmtPct(from, to, decimals = 0) {
  if (from === 0) return "—";
  const pct = ((to - from) / from) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

// Sunumdan geçici olarak hariç tutulan hücreler. Geri eklemek için sadece bu
// listeyi boşaltmak yeterli — seçim aracı (tool/server.js) ve dataService.js
// bundan etkilenmez, orada hâlâ tüm 12 hücre listelenir. Bu liste sadece
// build.js'in ürettiği PPTX'i etkiler.
const EXCLUDED_CELLS = ["Fosfat", "Boya"];
function isExcludedCell(name) {
  return EXCLUDED_CELLS.some((ex) => name.includes(ex));
}
const ALL_CELLS = ["Pres", "ETM", "ROB108", "Flowform", "ROB104", "N602", "N603", "ROB109", "Quench", "ROB110-111", "Fosfat", "Boya"];
const ACTIVE_CELLS = ALL_CELLS.filter((c) => !isExcludedCell(c));

(async () => {
  const icons = {};
  const iconDefs = {
    industry: [FaIndustry, COLORS.white],
    bullseye: [FaBullseye, COLORS.white],
    chartBar: [FaChartBar, COLORS.white],
    hourglass: [FaHourglassHalf, COLORS.white],
    exchange: [FaExchangeAlt, COLORS.white],
    chartLine: [FaChartLine, COLORS.white],
    lightbulb: [FaLightbulb, COLORS.white],
    warning: [FaExclamationTriangle, COLORS.white],
    tasks: [FaTasks, COLORS.white],
    handshake: [FaHandshake, COLORS.white],
    calendar: [FaCalendarAlt, COLORS.white],
    tools: [FaTools, COLORS.white],
    checkGreen: [FaCheckCircle, COLORS.green],
    clockAmber: [FaClock, COLORS.amber],
    questionRed: [FaQuestionCircle, COLORS.red],
    checkWhite: [FaCheckCircle, COLORS.white],
    clockWhite: [FaClock, COLORS.white],
    questionWhite: [FaQuestionCircle, COLORS.white],
    arrowDownNavy: [FaArrowDown, COLORS.navy],
    arrowDownWhite: [FaArrowDown, COLORS.white],
  };
  for (const [key, [Comp, color]] of Object.entries(iconDefs)) {
    icons[key] = await iconPng(Comp, color, 256);
  }

  let pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
  pres.author = "Repkon HF901";
  pres.title = "Repkon HF901 Seri Üretim — Performans Raporu ve Aksiyon Talebi";

  const PW = 13.333, PH = 7.5;
  let pageNum = 0;
  const fosfatBoyaExcluded = isExcludedCell("Fosfat") && isExcludedCell("Boya");

  function newContentSlide() {
    pageNum += 1;
    const slide = pres.addSlide();
    slide.background = { color: COLORS.bg };
    return slide;
  }

  function addFooter(slide, sectionLabel) {
    slide.addText(sectionLabel || "Repkon HF901 Seri Üretim", {
      x: 0.6, y: PH - 0.42, w: 7, h: 0.3,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.slateLight, margin: 0,
    });
    slide.addText(String(pageNum), {
      x: PW - 1.1, y: PH - 0.42, w: 0.6, h: 0.3,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.slateLight, align: "right", margin: 0,
    });
  }

  function addHeader(slide, { icon, eyebrow, title, titleSize = 26, titleW = 11.3, titleH = 0.6 }) {
    slide.addShape(pres.shapes.OVAL, {
      x: 0.6, y: 0.55, w: 0.62, h: 0.62,
      fill: { color: COLORS.navy }, line: { type: "none" },
    });
    slide.addImage({ data: icon, x: 0.775, y: 0.725, w: 0.28, h: 0.28 });
    slide.addText(turkishUpper(eyebrow), {
      x: 1.4, y: 0.5, w: 10, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 11.5, color: COLORS.slateLight,
      bold: true, charSpacing: 2,
    });
    slide.addText(title, {
      x: 1.4, y: 0.78, w: titleW, h: titleH, margin: 0,
      fontFace: FONT_HEAD, fontSize: titleSize, color: COLORS.navy, bold: true,
    });
  }

  function badge(slide, { x, y, w = 1.9, label, type }) {
    const map = {
      done: { bg: COLORS.greenBg, fg: COLORS.green, icon: icons.checkGreen },
      progress: { bg: COLORS.amberBg, fg: COLORS.amber, icon: icons.clockAmber },
      decision: { bg: COLORS.redBg, fg: COLORS.red, icon: icons.questionRed },
    };
    const s = map[type];
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w, h: 0.36, rectRadius: 0.08,
      fill: { color: s.bg }, line: { type: "none" },
    });
    slide.addImage({ data: s.icon, x: x + 0.12, y: y + 0.08, w: 0.2, h: 0.2 });
    slide.addText(label, {
      x: x + 0.38, y, w: w - 0.42, h: 0.36, margin: 0, valign: "middle",
      fontFace: FONT_BODY, fontSize: 11, bold: true, color: s.fg,
    });
  }

  // ---------- helper: styled table ----------
  function styledTable(slide, header, rows, opts) {
    const headerRow = header.map((h) => ({
      text: h,
      options: {
        fill: { color: COLORS.navy }, color: COLORS.white, bold: true,
        fontFace: FONT_BODY, fontSize: 11, align: h === header[0] ? "left" : "center",
        valign: "middle",
      },
    }));
    const bodyRows = rows.map((r, i) =>
      r.map((cell, ci) => {
        let text = cell, color = COLORS.slate, bold = false, fill = { color: i % 2 === 0 ? COLORS.white : COLORS.iceTint };
        if (cell && typeof cell === "object") {
          text = cell.text;
          color = cell.color || COLORS.slate;
          bold = !!cell.bold;
          if (cell.fill) fill = cell.fill;
        }
        return {
          text: String(text),
          options: {
            fill,
            color, bold,
            fontFace: FONT_BODY, fontSize: 11,
            align: ci === 0 ? "left" : "center", valign: "middle",
          },
        };
      })
    );
    slide.addTable([headerRow, ...bodyRows], {
      x: opts.x, y: opts.y, w: opts.w, colW: opts.colW,
      border: { pt: 0.75, color: COLORS.border },
      autoPage: false,
      rowH: opts.rowH || 0.34,
    });
  }

  // ==================================================================
  // SLIDE 1 — KAPAK
  // ==================================================================
  {
    const slide = pres.addSlide();
    slide.background = { color: COLORS.navyDeep };
    slide.addShape(pres.shapes.OVAL, {
      x: 9.6, y: -2.4, w: 6.5, h: 6.5,
      fill: { color: COLORS.navy, transparency: 40 }, line: { type: "none" },
    });
    slide.addShape(pres.shapes.OVAL, {
      x: -2.6, y: 4.6, w: 5, h: 5,
      fill: { color: COLORS.navy, transparency: 55 }, line: { type: "none" },
    });
    slide.addShape(pres.shapes.OVAL, {
      x: 0.9, y: 1.0, w: 0.9, h: 0.9,
      fill: { color: COLORS.ice, transparency: 10 }, line: { type: "none" },
    });
    slide.addImage({ data: icons.industry, x: 1.12, y: 1.22, w: 0.46, h: 0.46 });

    slide.addText("REPKON HF901 · SERİ ÜRETİM", {
      x: 0.9, y: 2.3, w: 10, h: 0.4, margin: 0,
      fontFace: FONT_BODY, fontSize: 14, color: COLORS.ice, bold: true, charSpacing: 3,
    });
    slide.addText("Performans Raporu", {
      x: 0.85, y: 2.75, w: 11, h: 2.0, margin: 0,
      fontFace: FONT_HEAD, fontSize: 44, color: COLORS.white, bold: true, lineSpacing: 50,
    });

    slide.addShape(pres.shapes.LINE, {
      x: 0.9, y: 5.35, w: 2.2, h: 0, line: { color: COLORS.ice, width: 1.5 },
    });
  
  }



  // ==================================================================
  // Data
  // ==================================================================
  // tool/data/overview-data.json varsa (yerel arayüzden seçim yapılarak
  // üretilmiştir) onu kullan; yoksa son bilinen sabit veriye geri dön.
  const fs = require("fs");
  const path = require("path");
  const overviewDataPath = path.join(__dirname, "tool", "data", "overview-data.json");
  const overviewData = (fs.existsSync(overviewDataPath)
    ? JSON.parse(fs.readFileSync(overviewDataPath, "utf8"))
    : [
        { cell: "Pres Hücresi",     nm: 33.2, ht: 102.1, nmB: 0.0,   htB: 0.0,   note: "" },
        { cell: "ETM Hücresi",      nm: 23.6, ht: 118.1, nmB: 373.5, htB: 132.5, note: "" },
        { cell: "ROB108 Hücresi",   nm: 31.5, ht: 93.5,  nmB: 84.9,  htB: 34.4,  note: "" },
        { cell: "Flowform Hücresi", nm: 33.2, ht: 95.4,  nmB: 116.7, htB: 108.9, note: "" },
        { cell: "ROB104 Hücresi",   nm: 32.6, ht: 90.3,  nmB: 143.3, htB: 74.1,  note: "" },
        { cell: "N602-N603 Hücresi", nm: 37.2, ht: 98.9, nmB: 151.9, htB: 81.2,  note: "" },
        { cell: "ROB109 Hücresi",   nm: 30.6, ht: 92.0,  nmB: 63.0,  htB: 87.1,  note: "izlenmeli" },
        { cell: "Quench Hücresi",   nm: 36.8, ht: 73.6,  nmB: 20.6,  htB: 0.0,   note: "" },
        { cell: "ROB110-111 Hücresi", nm: 19.9, ht: 57.4, nmB: 38.6, htB: 17.8,  note: "" },
        { cell: "Fosfat Hücresi",   nm: 27.2, ht: null,  nmB: 33.3,  htB: null,  note: "veri yok" },
        { cell: "Boya Hücresi",     nm: 24.8, ht: null,  nmB: 40.0,  htB: null,  note: "veri yok" },
      ]).filter((d) => !isExcludedCell(d.cell));

  // Canlı OEE, MTBF, MTTR verilerini hesaplayalım (seçim arayüzü ile birebir aynı filtrelerle)
  let oeeData = [];
  try {
    const { computeOeeMtbfMttrData } = require(path.join(__dirname, "tool", "dataService"));
    
    // Filtre dosyalarını yükleyelim
    const selectionPath = path.join(__dirname, "tool", "data", "selection.json");
    const selection = fs.existsSync(selectionPath) ? JSON.parse(fs.readFileSync(selectionPath, "utf8")) : {};
    
    const exclusionsNm = selection.exclusionsNm || [];
    const exclusionsHt = selection.exclusionsHt || [];
    const periods = selection.periods || DEFAULT_PERIODS;

    const exclusionsPath = path.join(__dirname, "tool", "data", "oee-slot-exclusions.json");
    const plannedTimeExclusions = fs.existsSync(exclusionsPath) ? JSON.parse(fs.readFileSync(exclusionsPath, "utf8")) : [];

    const rangePath = path.join(__dirname, "tool", "data", "oee-date-range.json");
    const oeeDateRange = fs.existsSync(rangePath) ? JSON.parse(fs.readFileSync(rangePath, "utf8")) : null;

    const targetsPath = path.join(__dirname, "tool", "data", "oee-target-overrides.json");
    const targetOverrides = fs.existsSync(targetsPath) ? JSON.parse(fs.readFileSync(targetsPath, "utf8")) : {};

    const linksPath = path.join(__dirname, "tool", "data", "ariza-event-links.json");
    const arizaEventLinks = fs.existsSync(linksPath) ? JSON.parse(fs.readFileSync(linksPath, "utf8")) : [];

    const fpPath = path.join(__dirname, "tool", "data", "ariza-false-positives.json");
    const arizaFalsePositives = fs.existsSync(fpPath) ? JSON.parse(fs.readFileSync(fpPath, "utf8")) : [];

    // OEE verisini canlı hesapla
    oeeData = await computeOeeMtbfMttrData({
      periods,
      exclusionsNm,
      exclusionsHt,
      plannedTimeExclusions,
      dateRange: oeeDateRange,
      targetOverrides,
      arizaEventLinks,
      arizaFalsePositives,
    });

    // Filtrele
    oeeData = oeeData.filter((d) => !isExcludedCell(d.cell));

  } catch (err) {
    console.error("HATA: Canlı OEE verisi hesaplanamadı:", err);
    const oeeDataPath = path.join(__dirname, "tool", "data", "oee-mtbf-mttr-data.json");
    oeeData = (fs.existsSync(oeeDataPath)
      ? JSON.parse(fs.readFileSync(oeeDataPath, "utf8"))
      : [
          { cell: "Pres Hücresi",       availabilityNm: 27.3, availabilityHt: 63.0, performanceNm: null, performanceHt: 65.7, oeeNm: null, oeeHt: 41.4, mtbfNm: 315.8,  mtbfHt: 148.1, mttrNm: 54.3, mttrHt: 27.6, arizaEventsNm: 53,  arizaEventsHt: 56 },
          { cell: "ETM Hücresi",        availabilityNm: 8.9,  availabilityHt: 65.2, performanceNm: null, performanceHt: 54.3, oeeNm: null, oeeHt: 35.4, mtbfNm: 1198.1, mtbfHt: 446.8, mttrNm: 24.8, mttrHt: 38.2, arizaEventsNm: 21,  arizaEventsHt: 24 },
          { cell: "ROB108 Hücresi",     availabilityNm: 41.5, availabilityHt: 61.8, performanceNm: null, performanceHt: 45.7, oeeNm: null, oeeHt: 28.2, mtbfNm: 1162.8, mtbfHt: 336.3, mttrNm: 37.2, mttrHt: 29.3, arizaEventsNm: 16,  arizaEventsHt: 32 },
          { cell: "Flowform Hücresi",   availabilityNm: 41.7, availabilityHt: 62.7, performanceNm: null, performanceHt: 53.5, oeeNm: null, oeeHt: 33.6, mtbfNm: 210.3,  mtbfHt: 284.6, mttrNm: 47.4, mttrHt: 20.4, arizaEventsNm: 85,  arizaEventsHt: 48 },
          { cell: "ROB104 Hücresi",     availabilityNm: 37.7, availabilityHt: 57.5, performanceNm: null, performanceHt: 41.5, oeeNm: null, oeeHt: 23.8, mtbfNm: 6195.0, mtbfHt: 344.0, mttrNm: 45.0, mttrHt: 30.0, arizaEventsNm: 3,   arizaEventsHt: 30 },
          { cell: "N602-N603 Hücresi",  availabilityNm: 24.7, availabilityHt: 69.1, performanceNm: null, performanceHt: 57.3, oeeNm: null, oeeHt: 39.6, mtbfNm: 156.4,  mtbfHt: 187.7, mttrNm: 54.8, mttrHt: 24.8, arizaEventsNm: 179, arizaEventsHt: 61 },
          { cell: "ROB109 Hücresi",     availabilityNm: 39.0, availabilityHt: 64.1, performanceNm: null, performanceHt: 35.7, oeeNm: null, oeeHt: 22.9, mtbfNm: 552.9,  mtbfHt: 296.6, mttrNm: 41.1, mttrHt: 20.1, arizaEventsNm: 30,  arizaEventsHt: 36 },
          { cell: "Quench Hücresi",     availabilityNm: 89.9, availabilityHt: 48.0, performanceNm: null, performanceHt: null, oeeNm: null, oeeHt: null, mtbfNm: null,   mtbfHt: 480.0, mttrNm: null, mttrHt: 270.0, arizaEventsNm: 0,   arizaEventsHt: 4 },
          { cell: "ROB110-111 Hücresi", availabilityNm: 55.2, availabilityHt: 56.0, performanceNm: null, performanceHt: 49.6, oeeNm: null, oeeHt: 27.8, mtbfNm: 1234.4, mtbfHt: 106.9, mttrNm: 36.9, mttrHt: 31.7, arizaEventsNm: 16,  arizaEventsHt: 42 },
          { cell: "Fosfat Hücresi",     availabilityNm: 89.6, availabilityHt: null, performanceNm: null, performanceHt: null, oeeNm: null, oeeHt: null, mtbfNm: 7170.0, mtbfHt: null,  mttrNm: 60.0, mttrHt: null, arizaEventsNm: 2,   arizaEventsHt: 0 },
          { cell: "Boya Hücresi",       availabilityNm: 86.9, availabilityHt: null, performanceNm: null, performanceHt: null, oeeNm: null, oeeHt: null, mtbfNm: null,   mtbfHt: null,  mttrNm: null, mttrHt: null, arizaEventsNm: 0,   arizaEventsHt: 0 },
        ]).filter((d) => !isExcludedCell(d.cell));
  }

  // tool/data/kayip-analizi-data.json varsa yükle ve Pareto kategorilerini hesapla
  const kayipDataPath = path.join(__dirname, "tool", "data", "kayip-analizi-data.json");
  let kayipData = null;
  if (fs.existsSync(kayipDataPath)) {
    try {
      kayipData = JSON.parse(fs.readFileSync(kayipDataPath, "utf8"));
    } catch (e) {
      console.error("Kayıp analizi verisi okunamadı:", e.message);
    }
  }

  let activePareto = [];
  let actionPlanPareto = [];
  if (kayipData && kayipData.allDowntimes) {
    const activeDowntimes = kayipData.allDowntimes.filter(d => {
      if (isExcludedCell(d.cell)) return false;
      if (d.category === "Mola" || d.category === "Önceki İstasyon Bekleme") return false;
      return true;
    });

    const cellsMap = {};
    activeDowntimes.forEach(d => {
      const cellShort = d.cell.replace(" Hücresi", "");
      if (!cellsMap[cellShort]) {
        cellsMap[cellShort] = {
          category: cellShort,
          duration: 0,
          eventCount: 0,
          kokNedenler: new Set(),
          onleyiciAksiyonlar: new Set(),
          details: []
        };
      }
      const cellData = cellsMap[cellShort];
      cellData.duration += d.duration;
      cellData.eventCount += 1;
      if (d.kokNeden && d.kokNeden.trim()) cellData.kokNedenler.add(d.kokNeden.trim());
      if (d.onleyiciAksiyon && d.onleyiciAksiyon.trim()) cellData.onleyiciAksiyonlar.add(d.onleyiciAksiyon.trim());
      cellData.details.push(d);
    });

    // 1. Cell-level Pareto for Slide 14B chart
    const sorted = Object.values(cellsMap).sort((a, b) => b.duration - a.duration);
    const totalDuration = sorted.reduce((sum, c) => sum + c.duration, 0);
    let cumDuration = 0;

    activePareto = sorted.map(c => {
      cumDuration += c.duration;
      c.details.sort((a, b) => b.duration - a.duration);
      const topWithKok = c.details.find(d => d.kokNeden && d.kokNeden.trim() !== "");
      const topKok = topWithKok ? topWithKok.kokNeden : (Array.from(c.kokNedenler)[0] || "—");

      const topWithAksiyon = c.details.find(d => d.onleyiciAksiyon && d.onleyiciAksiyon.trim() !== "");
      const topAks = topWithAksiyon ? topWithAksiyon.onleyiciAksiyon : (Array.from(c.onleyiciAksiyonlar)[0] || "—");

      return {
        category: c.category,
        duration: c.duration,
        eventCount: c.eventCount,
        cumPercentage: totalDuration > 0 ? Math.round((cumDuration / totalDuration) * 100) : 0,
        topKokNeden: topKok,
        topOnleyiciAksiyon: topAks
      };
    });

    // 2. Root cause grouped Pareto for Slide 14C table
    const paretos = [];
    Object.values(cellsMap).forEach(c => {
      const totalCellDuration = c.duration;
      
      const groups = {};
      c.details.forEach(d => {
        const kok = (d.kokNeden || "").trim();
        if (!kok || kok === "—") return;

        if (!groups[kok]) {
          groups[kok] = {
            kokNeden: kok,
            duration: 0,
            eventCount: 0,
            onleyiciAksiyonlar: new Set()
          };
        }
        groups[kok].duration += d.duration;
        groups[kok].eventCount += 1;
        if (d.onleyiciAksiyon && d.onleyiciAksiyon.trim() && d.onleyiciAksiyon.trim() !== "—") {
          groups[kok].onleyiciAksiyonlar.add(d.onleyiciAksiyon.trim());
        }
      });

      Object.values(groups).forEach(g => {
        const ratio = totalCellDuration > 0 ? Math.round((g.duration / totalCellDuration) * 100) : 0;
        const aksiyonStr = g.onleyiciAksiyonlar.size > 0 ? Array.from(g.onleyiciAksiyonlar).join(", ") : "—";
        paretos.push({
          category: c.category,
          duration: g.duration,
          eventCount: g.eventCount,
          ratio: ratio,
          topKokNeden: g.kokNeden,
          topOnleyiciAksiyon: aksiyonStr
        });
      });
    });

    const CELL_ORDER = ["Pres", "Flowform", "N602", "ROB110-111"];
    paretos.sort((a, b) => {
      const idxA = CELL_ORDER.indexOf(a.category);
      const idxB = CELL_ORDER.indexOf(b.category);
      const orderA = idxA !== -1 ? idxA : 999;
      const orderB = idxB !== -1 ? idxB : 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return b.duration - a.duration;
    });
    actionPlanPareto = paretos;
  }

  let activeLossTypes = [];
  if (kayipData && kayipData.allDowntimes) {
    const activeDowntimes = kayipData.allDowntimes.filter(d => {
      if (isExcludedCell(d.cell)) return false;
      if (d.category === "Mola" || d.category === "Önceki İstasyon Bekleme") return false;
      return true;
    });

    const lossMap = {};
    activeDowntimes.forEach(d => {
      if (!lossMap[d.category]) {
        lossMap[d.category] = {
          category: d.category,
          duration: 0,
          eventCount: 0
        };
      }
      lossMap[d.category].duration += d.duration;
      lossMap[d.category].eventCount += 1;
    });

    const sortedLoss = Object.values(lossMap).sort((a, b) => b.duration - a.duration);
    const totalLossDuration = sortedLoss.reduce((sum, c) => sum + c.duration, 0);
    
    activeLossTypes = sortedLoss.map(c => ({
      category: c.category,
      duration: c.duration,
      eventCount: c.eventCount,
      percentage: totalLossDuration > 0 ? Math.round((c.duration / totalLossDuration) * 100) : 0
    }));
  }

  let dailyLossData = [];
  if (kayipData && kayipData.allDowntimes) {
    const activeDowntimes = kayipData.allDowntimes.filter(d => {
      if (isExcludedCell(d.cell)) return false;
      if (d.category === "Mola" || d.category === "Önceki İstasyon Bekleme") return false;
      return true;
    });

    const dailyMap = {};
    activeDowntimes.forEach(d => {
      const dateStr = d.tarih;
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          duration: 0,
          eventCount: 0
        };
      }
      dailyMap[dateStr].duration += d.duration;
      dailyMap[dateStr].eventCount += 1;
    });

    // 13.06.2026 sonrasını alalım, yarım kalan 07.07.2026 gününü ve talep edilen diğer günleri hariç tutalım
    const sortedDates = Object.keys(dailyMap)
      .filter(d => {
        if (d < "2026-06-13") return false;
        if (d === "2026-07-07") return false;
        if (d === "2026-06-20") return false;
        if (d === "2026-06-26") return false;
        if (d === "2026-06-27") return false;
        return true;
      })
      .sort();

    dailyLossData = sortedDates.map(dateStr => {
      const parts = dateStr.split("-");
      const shortLabel = `${parts[2]}.${parts[1]}`; // "DD.MM"
      return {
        label: shortLabel,
        duration: dailyMap[dateStr].duration,
        eventCount: dailyMap[dateStr].eventCount
      };
    });
  }

  // ==================================================================
  // OEE / MTBF / MTTR — yardımcılar
  // ==================================================================
  function shortCell(name) {
    return name.replace(" Hücresi", "");
  }
  function pctCell(v, opts = {}) {
    if (v === null || v === undefined) return { text: "veri yok", color: COLORS.red, bold: true };
    return { text: `${v.toFixed(1)}%`, ...opts };
  }
  function dkCell(v) {
    if (v === null || v === undefined) return { text: "veri yok", color: COLORS.red, bold: true };
    return v.toFixed(1);
  }

  // ==================================================================
  // SLIDE — GÖRESEL HÜCRE BAZLI ÜRETİM ADETLERİ (13.06.2026 - 11.07.2026)
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartBar, eyebrow: "Genel Bakış", title: "Hücre Bazlı Üretim Adetleri (Haziran–Temmuz)" });

    let finalProductionData = [];

    try {
      const { createClient } = require("@supabase/supabase-js");
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = require(path.join(__dirname, "tool", "env"));
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // fetchRawSlots benzeri sorgumuzu yapalım: 13.06.2026 - 11.07.2026
      const { data, error } = await supabaseClient
        .from("manuf_production_records")
        .select("bolum, tarih, manuf_production_rows(uretim_adeti)")
        .gte("tarih", "2026-06-13")
        .lte("tarih", "2026-07-11");

      if (error) throw error;

      // Hücre bazında üretim adetlerini toplayalım
      const totals = {};
      const dbCells = ["Pres Hücresi", "ETM Hücresi", "ROB108 Hücresi", "Flowform Hücresi", "ROB104 Hücresi", "N602 Hücresi", "N603 Hücresi", "ROB109 Hücresi", "Quench Hücresi", "ROB110-111 Hücresi"];
      dbCells.forEach(cell => {
        totals[cell] = 0;
      });

      (data || []).forEach(record => {
        const cell = record.bolum;
        if (totals[cell] !== undefined) {
          (record.manuf_production_rows || []).forEach(row => {
            totals[cell] += (row.uretim_adeti || 0);
          });
        }
      });

      // N602 ve N603'ü "N602-N603 Hücresi" olarak birleştirelim
      const n602_603_total = (totals["N602 Hücresi"] || 0) + (totals["N603 Hücresi"] || 0);

      finalProductionData = [
        { cell: "Pres Hücresi", total: totals["Pres Hücresi"] || 0 },
        { cell: "ETM Hücresi", total: totals["ETM Hücresi"] || 0 },
        { cell: "ROB108 Hücresi", total: totals["ROB108 Hücresi"] || 0 },
        { cell: "Flowform Hücresi", total: totals["Flowform Hücresi"] || 0 },
        { cell: "ROB104 Hücresi", total: totals["ROB104 Hücresi"] || 0 },
        { cell: "N602-N603 Hücresi", total: n602_603_total },
        { cell: "ROB109 Hücresi", total: totals["ROB109 Hücresi"] || 0 },
        { cell: "Quench Hücresi", total: totals["Quench Hücresi"] || 0 },
        { cell: "ROB110-111 Hücresi", total: totals["ROB110-111 Hücresi"] || 0 }
      ];

      // Barların sıralaması için büyükten küçüğe sıralayalım
      finalProductionData.sort((a, b) => b.total - a.total);

    } catch (err) {
      console.warn("Canlı veri çekilemedi, yedek statik veriler kullanılıyor:", err.message);
      finalProductionData = [
        { cell: "Pres Hücresi",      total: 2636 },
        { cell: "ETM Hücresi",       total: 2618 },
        { cell: "ROB108 Hücresi",    total: 2300 },
        { cell: "Flowform Hücresi",  total: 2270 },
        { cell: "ROB104 Hücresi",    total: 2202 },
        { cell: "N602-N603 Hücresi", total: 1993 },
        { cell: "ROB109 Hücresi",    total: 1914 },
        { cell: "Quench Hücresi",    total: 1889 },
        { cell: "ROB110-111 Hücresi", total: 1141 },
      ].filter((d) => !isExcludedCell(d.cell));
    }

    const chartFlowOrder = [...finalProductionData].reverse();
    slide.addChart(
      pres.charts.BAR,
      [{ name: "Üretim (adet)", labels: chartFlowOrder.map((d) => shortCell(d.cell)), values: chartFlowOrder.map((d) => d.total) }],
      {
        x: 0.6, y: 1.55, w: 12.1, h: 4.95, barDir: "bar", barGapWidthPct: 30,
        chartColors: [COLORS.navy],
        chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
        catAxisLabelColor: COLORS.slate, catAxisLabelFontSize: 11,
        valAxisLabelColor: COLORS.slateLight, valAxisLabelFontSize: 10,
        valAxisTitle: "adet", showValAxisTitle: true, valAxisTitleFontSize: 10, valAxisTitleColor: COLORS.slateLight,
        valGridLine: { color: COLORS.border, size: 0.5 },
        catGridLine: { style: "none" },
        showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: COLORS.slate,
        showLegend: false, showTitle: false,
      }
    );

    addFooter(slide, "Genel Bakış");
  }

  // ==================================================================
  // SLIDE 3 — GENEL BAKIŞ: ÜRETİM TABLOSU
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartBar, eyebrow: "Genel Bakış", title: `Günlük Ortalama Üretim Adedi` });


    // Legend Container on the Right (satır satır, alt alta - biraz yukarı ve sağda)
    const legendX = 11.4;
    const legendTextX = 11.6;
    
    // Satır 1: Nisan-Mayıs
    slide.addShape(pres.shapes.OVAL, {
      x: legendX, y: 3.86, w: 0.12, h: 0.12,
      fill: { color: COLORS.ice }, line: { type: "none" }
    });
    slide.addText("Nisan–Mayıs", {
      x: legendTextX, y: 3.80, w: 1.8, h: 0.25, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.slate
    });
    
    // Satır 2: Haziran-Temmuz
    slide.addShape(pres.shapes.OVAL, {
      x: legendX, y: 4.21, w: 0.12, h: 0.12,
      fill: { color: COLORS.navy }, line: { type: "none" }
    });
    slide.addText("Haziran–Temmuz", {
      x: legendTextX, y: 4.15, w: 1.8, h: 0.25, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.slate
    });

    // Satır 3: Hedef (Günlük 200)
    slide.addShape(pres.shapes.OVAL, {
      x: legendX, y: 4.56, w: 0.12, h: 0.12,
      fill: { color: COLORS.red }, line: { type: "none" }
    });
    slide.addText("Hedef (Günlük 200)", {
      x: legendTextX, y: 4.50, w: 2.1, h: 0.25, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.slate
    });

    const chartLeft = 3.0;
    const chartWidth = 7.5;
    const maxValue = 200;
    const scaleX = (val) => chartLeft + (val / maxValue) * chartWidth;

    // Draw Vertical Gridlines (0, 50, 100, 150, 200)
    const gridValues = [0, 50, 100, 150, 200];
    const gridTop = 1.8;
    const gridBottom = 6.1;
    const gridHeight = gridBottom - gridTop;

    gridValues.forEach((val) => {
      const valX = scaleX(val);
      // Vertical gridline
      slide.addShape(pres.shapes.LINE, {
        x: valX, y: gridTop, w: 0, h: gridHeight,
        line: { color: COLORS.border, width: 1, type: "solid" }
      });
      // X-axis label
      const labelText = val === 200 ? "200 adet/gün" : String(val);
      slide.addText(labelText, {
        x: valX - (val === 200 ? 0.8 : 0.4), y: gridBottom + 0.05, w: (val === 200 ? 1.6 : 0.8), h: 0.3,
        fontFace: FONT_BODY, fontSize: 10, color: COLORS.slate, align: val === 200 ? "left" : "center", margin: 0
      });
    });

    const startY = 2.0;
    const rowSpacing = 0.38;

    function chartCellName(name) {
      let s = name.replace(" Hücresi", "");
      if (s === "N602-N603") return "N602-603";
      return s;
    }

    overviewData.forEach((d, i) => {
      const cellY = startY + i * rowSpacing;

      // Cell Label on the left
      slide.addText(chartCellName(d.cell), {
        x: 0.6, y: cellY - 0.12, w: 2.2, h: 0.3, margin: 0,
        fontFace: FONT_HEAD, fontSize: 12, bold: true, color: COLORS.navyDeep, align: "left"
      });

      if (d.ht === null) {
        // "veri yok" case
        const x1 = scaleX(d.nm);
        // Gray dot at Nisan-Mayıs value
        slide.addShape(pres.shapes.OVAL, {
          x: x1 - 0.07, y: cellY - 0.07, w: 0.14, h: 0.14,
          fill: { color: "94A3B8" }, line: { type: "none" }
        });
        // Dashed gray line
        const lineW = 0.8;
        slide.addShape(pres.shapes.LINE, {
          x: x1, y: cellY, w: lineW, h: 0,
          line: { color: "94A3B8", width: 1.5, dashType: "dash" }
        });
        // "veri yok" text
        slide.addText("veri yok", {
          x: x1 + lineW + 0.1, y: cellY - 0.12, w: 1.5, h: 0.3, margin: 0,
          fontFace: FONT_BODY, fontSize: 11, italic: true, color: COLORS.red, bold: true
        });
      } else {
        // Normal case
        const x1 = scaleX(d.nm);
        const x2 = scaleX(d.ht);
        const xTarget = scaleX(200);

        // Connecting Line 1 (Nisan-Mayıs -> Haziran-Temmuz)
        slide.addShape(pres.shapes.LINE, {
          x: Math.min(x1, x2), y: cellY, w: Math.abs(x2 - x1), h: 0,
          line: { color: COLORS.navy, width: 2.0 }
        });

        // Connecting Line 2 (Haziran-Temmuz -> Hedef 200) (Red solid line)
        slide.addShape(pres.shapes.LINE, {
          x: Math.min(x2, xTarget), y: cellY, w: Math.abs(xTarget - x2), h: 0,
          line: { color: COLORS.red, width: 1.5 }
        });

        // Nisan-Mayıs Dot (Light Blue)
        slide.addShape(pres.shapes.OVAL, {
          x: x1 - 0.07, y: cellY - 0.07, w: 0.14, h: 0.14,
          fill: { color: COLORS.ice }, line: { type: "none" }
        });

        // Haziran-Temmuz Dot (Dark Blue)
        slide.addShape(pres.shapes.OVAL, {
          x: x2 - 0.07, y: cellY - 0.07, w: 0.14, h: 0.14,
          fill: { color: COLORS.navy }, line: { type: "none" }
        });

        // Hedef Dot (Red)
        slide.addShape(pres.shapes.OVAL, {
          x: xTarget - 0.07, y: cellY - 0.07, w: 0.14, h: 0.14,
          fill: { color: COLORS.red }, line: { type: "none" }
        });

        // Nisan-Mayıs Değeri (Topun üstüne)
        slide.addText(d.nm.toFixed(1), {
          x: x1 - 0.5, y: cellY - 0.26, w: 1.0, h: 0.18, margin: 0,
          fontFace: FONT_BODY, fontSize: 8.5, color: COLORS.slateLight, align: "center"
        });

        // Haziran-Temmuz Değeri (Topun üstüne)
        slide.addText(d.ht.toFixed(1), {
          x: x2 - 0.5, y: cellY - 0.26, w: 1.0, h: 0.18, margin: 0,
          fontFace: FONT_BODY, fontSize: 8.5, color: COLORS.navyDeep, bold: true, align: "center"
        });

        // Percentage text 1 (Nisan-Mayıs -> Haziran-Temmuz)
        const pct1 = fmtPct(d.nm, d.ht);
        const midX1 = (x1 + x2) / 2;
        slide.addText(pct1, {
          x: midX1 - 0.5, y: cellY - 0.26, w: 1.0, h: 0.18, margin: 0,
          fontFace: FONT_BODY, fontSize: 9.0, bold: true, color: d.ht > d.nm ? COLORS.green : COLORS.slate, align: "center"
        });

        // Percentage text 2 (Haziran-Temmuz -> Hedef 200)
        const neededPct = ((200 - d.ht) / d.ht) * 100;
        const pct2 = `+%${Math.round(neededPct)}`;
        const midX2 = (x2 + xTarget) / 2;
        slide.addText(pct2, {
          x: midX2 - 0.5, y: cellY - 0.26, w: 1.0, h: 0.18, margin: 0,
          fontFace: FONT_BODY, fontSize: 9.0, bold: true, color: COLORS.red, align: "center"
        });
      }
    });

    addFooter(slide, "Genel Bakış");
  }

  // ==================================================================
  // SLIDE — ZAMANA BAĞLI ORTALAMA ÜRETİM DEĞİŞİMİ
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartLine, eyebrow: "Genel Bakış", title: "Kayıp Azalışı ile Üretim Artışı İlişkisi (Haziran–Temmuz)" });

    let nmTrendData = [];
    let htTrendData = [];

    try {
      const { createClient } = require("@supabase/supabase-js");
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = require(path.join(__dirname, "tool", "env"));
      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Perform direct Supabase query synchronously in build execution flow starting from April 1st
      const { data: rawRecords, error: rawError } = await supabaseClient
        .from("manuf_production_records")
        .select(
          "bolum, tarih, manuf_production_rows(zaman_dilimi, uretim_adeti)"
        )
        .in("bolum", [
          "Pres Hücresi", "ETM Hücresi", "ROB108 Hücresi", "Flowform Hücresi",
          "ROB104 Hücresi", "N602 Hücresi", "N603 Hücresi", "ROB109 Hücresi",
          "Quench Hücresi", "ROB110-111 Hücresi", "Fosfat Hücresi", "Boya Hücresi"
        ])
        .gte("tarih", "2026-04-01")
        .order("tarih", { ascending: true });

      if (rawError) throw rawError;

      const exclusionsPath = path.join(__dirname, "tool", "data", "oee-slot-exclusions.json");
      const plannedTimeExclusions = fs.existsSync(exclusionsPath)
        ? JSON.parse(fs.readFileSync(exclusionsPath, "utf8"))
        : [];
      const ptExcl = new Set(Array.isArray(plannedTimeExclusions) ? plannedTimeExclusions : []);

      const selectionPath = path.join(__dirname, "tool", "data", "selection.json");
      const selection = fs.existsSync(selectionPath)
        ? JSON.parse(fs.readFileSync(selectionPath, "utf8"))
        : {};
      const exclusionsHt = selection.exclusionsHt || [];
      const exclusionsNm = selection.exclusionsNm || [];
      const excSet = new Set([...exclusionsHt, ...exclusionsNm]);

      const datesWithData = new Set();
      const recordsByDate = {};
      for (const record of rawRecords || []) {
        if (isExcludedCell(record.bolum)) continue;
        const dateStr = record.tarih;
        datesWithData.add(dateStr);
        if (!recordsByDate[dateStr]) {
          recordsByDate[dateStr] = [];
        }
        recordsByDate[dateStr].push(record);
      }

      const sortedDates = Array.from(datesWithData).sort();
      for (const dateStr of sortedDates) {
        // Exclude specific date range for June as requested: 01.06.2026 - 12.06.2026 (13.06 is included)
        if (dateStr >= "2026-06-01" && dateStr <= "2026-06-12") continue;

        // Exclude 20.06.2026 as requested
        if (dateStr === "2026-06-20") continue;

        // Exclude 07.07.2026 as requested
        if (dateStr === "2026-07-07") continue;

        const activeCellNames = [];
        const cellsToCalculate = ALL_CELLS.map(c => c + " Hücresi").filter(c => !isExcludedCell(c));
        for (const cell of cellsToCalculate) {
          if (cell === "N602 Hücresi" || cell === "N603 Hücresi") {
            if (!activeCellNames.includes("N602-N603 Hücresi")) {
              activeCellNames.push("N602-N603 Hücresi");
            }
          } else {
            activeCellNames.push(cell);
          }
        }

        const dailyCellProduction = {};
        for (const cellName of activeCellNames) {
          dailyCellProduction[cellName] = 0;
        }

        const cellsWithActiveSlots = new Set();
        let hasAnyValidSlot = false;
        for (const record of recordsByDate[dateStr]) {
          let cell = record.bolum;
          if (isExcludedCell(cell)) continue;

          // Map N602 and N603 to combined key in our daily production map
          if (cell === "N602 Hücresi" || cell === "N603 Hücresi") {
            cell = "N602-N603 Hücresi";
          }

          for (const row of record.manuf_production_rows || []) {
            const key = `${record.bolum}||${dateStr}||${row.zaman_dilimi}`;
            if (ptExcl.has(key) || excSet.has(key)) continue;

            dailyCellProduction[cell] += (row.uretim_adeti || 0);
            cellsWithActiveSlots.add(cell);
            hasAnyValidSlot = true;
          }
        }

        if (!hasAnyValidSlot) continue;

        let sum = 0;
        let count = 0;
        for (const cellName of activeCellNames) {
          if (cellsWithActiveSlots.has(cellName)) {
            sum += dailyCellProduction[cellName];
            count++;
          }
        }

        const avg = count > 0 ? sum / count : 0;
        const entry = {
          date: dateStr,
          average: Math.round(avg * 10) / 10
        };

        if (dateStr >= "2026-04-01" && dateStr <= "2026-05-31") {
          nmTrendData.push(entry);
        } else if (dateStr >= "2026-06-13" && dateStr <= "2026-07-31") {
          htTrendData.push(entry);
        }
      }
    } catch (e) {
      console.error("New trend slide calculation error, using fallback:", e);
      nmTrendData = [
        { date: "2026-04-02", average: 34.4 },
        { date: "2026-04-04", average: 33.3 },
        { date: "2026-04-05", average: 36.4 },
      ];
      htTrendData = [
        { date: "2026-06-13", average: 35.2 },
        { date: "2026-06-14", average: 38.1 },
        { date: "2026-06-15", average: 40.5 },
      ];
    }

    function formatChartDate(dateStr) {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      return `${parts[2]}.${parts[1]}`;
    }

    function calculateTrendLine(data) {
      const N = data.length;
      if (N < 2) return data.map(() => null);
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < N; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
      }
      const slope = (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / N;
      return data.map((_, i) => Math.round((slope * i + intercept) * 10) / 10);
    }

    // Draw Left Chart (Zamana Bağlı Kayıp Trendi)
    const rawDaily = dailyLossData.length > 0 ? dailyLossData : [
      { label: "13.06", duration: 450 },
      { label: "14.06", duration: 120 },
      { label: "15.06", duration: 800 },
      { label: "16.06", duration: 320 },
      { label: "17.06", duration: 150 },
      { label: "18.06", duration: 600 },
      { label: "19.06", duration: 1100 },
      { label: "21.06", duration: 450 },
      { label: "22.06", duration: 300 }
    ];

    const lossLabels = rawDaily.map((item) => item.label);
    const lossValues = rawDaily.map((item) => item.duration);

    const totalLossDuration = lossValues.reduce((sum, v) => sum + v, 0);
    const avgLossDuration = lossValues.length > 0 ? Math.round(totalLossDuration / lossValues.length) : 0;
    const maxLossVal = lossValues.length > 0 ? Math.max(...lossValues) : 0;

    slide.addText("GÜNLÜK TOPLAM KAYIP TRENDİ", {
      x: 0.5, y: 1.8, w: 5.9, h: 0.3, margin: 0,
      fontFace: FONT_HEAD, fontSize: 13, bold: true, color: COLORS.navy, align: "center"
    });

    slide.addChart(
      pres.charts.LINE,
      [
        {
          name: "Günlük Kayıp Süresi (dk)",
          labels: lossLabels,
          values: lossValues
        },
        {
          name: "Genel Trend",
          labels: lossLabels,
          values: calculateTrendLine(lossValues)
        }
      ],
      {
        x: 0.5, y: 2.1, w: 5.9, h: 4.1,
        chartColors: [COLORS.navy, COLORS.amber],
        lineSize: 2.5,
        showLegend: true,
        legendPos: "b",
        showTitle: false,
        catAxisLabelColor: COLORS.slate, catAxisLabelFontSize: 8.5,
        catLabelInterval: 6,
        valAxisLabelColor: COLORS.slateLight, valAxisLabelFontSize: 8.5,
        valAxisTitle: "dk", showValAxisTitle: true, valAxisTitleFontSize: 8.5, valAxisTitleColor: COLORS.slateLight,
        valGridLine: { color: COLORS.border, size: 0.5 },
        catGridLine: { style: "none" },
        showValue: false
      }
    );

    const lossStatsText = `En Yüksek: ${maxLossVal} dk  ·  Günlük Ort: ${avgLossDuration} dk`;
    slide.addText(lossStatsText, {
      x: 0.5, y: 6.3, w: 5.9, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, bold: true, color: COLORS.slate, align: "center"
    });

    // Draw Right Chart (Haziran-Temmuz)
    if (htTrendData.length > 0) {
      const htValues = htTrendData.map(d => d.average);
      const htMax = Math.max(...htValues);
      const htAvg = htValues.reduce((a, b) => a + b, 0) / htValues.length;

      slide.addText("GÜNLÜK ORTALAMA ÜRETİM TRENDİ", {
        x: 6.9, y: 1.8, w: 5.9, h: 0.3, margin: 0,
        fontFace: FONT_HEAD, fontSize: 13, bold: true, color: COLORS.navy, align: "center"
      });

      slide.addChart(
        pres.charts.LINE,
        [
          {
            name: "Ortalama Üretim (adet/gün)",
            labels: htTrendData.map(d => formatChartDate(d.date)),
            values: htValues
          },
          {
            name: "Genel Trend",
            labels: htTrendData.map(d => formatChartDate(d.date)),
            values: calculateTrendLine(htValues)
          }
        ],
        {
          x: 6.9, y: 2.1, w: 5.9, h: 4.1,
          chartColors: [COLORS.navy, COLORS.amber],
          lineSize: 2.5,
          showLegend: true,
          legendPos: "b",
          showTitle: false,
          catAxisLabelColor: COLORS.slate, catAxisLabelFontSize: 8.5,
          catLabelInterval: 3,
          valAxisLabelColor: COLORS.slateLight, valAxisLabelFontSize: 8.5,
          valAxisTitle: "adet/gün", showValAxisTitle: true, valAxisTitleFontSize: 8.5, valAxisTitleColor: COLORS.slateLight,
          valGridLine: { color: COLORS.border, size: 0.5 },
          catGridLine: { style: "none" },
          showValue: false
        }
      );

      const htStatsText = `En Yüksek Ort: ${htMax.toFixed(1)}  ·  Dönem Ort: ${htAvg.toFixed(1)}`;
      slide.addText(htStatsText, {
        x: 6.9, y: 6.3, w: 5.9, h: 0.3, margin: 0,
        fontFace: FONT_BODY, fontSize: 10.5, bold: true, color: COLORS.slate, align: "center"
      });
    } else {
      slide.addText("Hesaplanmış Haziran–Temmuz verisi bulunamadı.", {
        x: 6.9, y: 3.5, w: 5.9, h: 1, align: "center",
        fontFace: FONT_BODY, fontSize: 14, color: COLORS.red
      });
    }

    addFooter(slide, "Genel Bakış");
  }

  // ==================================================================
  // SLIDE 5 — OEE: EKİPMAN ETKİNLİĞİ
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartBar, eyebrow: "OEE, MTBF & MTTR", title: "OEE — Ekipman Etkinliği (Haziran–Temmuz)" });
    slide.addText("OEE (Ekipman Etkinlik Oranı); kullanılabilirlik (Availability), performans (Performance) ve kalite (Quality) bileşenlerini birleştirerek hattın net verimliliğini ölçer.", {
      x: 0.6, y: 1.45, w: 11.8, h: 0.65, margin: 0,
      fontFace: FONT_BODY, fontSize: 10, italic: true, color: COLORS.slateLight, lineSpacing: 13,
    });

    // oeeData hat akış sırasındadır (Pres → ... → son aktif hücre, dataService.js CELLS ile aynı;
    // EXCLUDED_CELLS'teki hücreler burada filtrelenmiş durumda) —
    // tablo bu sırayla gösterilir (OEE'ye göre sıralanmaz).
    const QUALITY_REDS = {
      "Pres Hücresi": 0.1,
      "ETM Hücresi": 0.2,
      "ROB108 Hücresi": 0.1,
      "Flowform Hücresi": 3.6,
      "N602-N603 Hücresi": 0.7,
      "ROB109 Hücresi": 0.1,
      "Quench Hücresi": 0.8,
      "ROB110-111 Hücresi": 7.0,
      "ROB104 Hücresi": 0.2
    };

    const header = ["Hücre", "Availability", "Performance", "Quality", "OEE", "Potansiyel Ort. (OEE %100)*"];
    let totalQualitySum = 0;
    let totalQualityCount = 0;

    const rows = oeeData.map((d) => {
      const redPct = QUALITY_REDS[d.cell] || 0.0;
      const qHt = 100.0 - redPct;
      
      totalQualitySum += qHt;
      totalQualityCount += 1;

      const calculatedOeeHt = (d.availabilityHt !== null && d.performanceHt !== null)
        ? Number(((d.availabilityHt / 100) * (d.performanceHt / 100) * (qHt / 100) * 100).toFixed(1))
        : null;

      // Sonraki hesaplamaların etkilenmesi için d.oeeHt değerini güncelliyoruz
      d.oeeHt = calculatedOeeHt;

      const ov = overviewData.find((o) => o.cell === d.cell);
      const avgProdHt = ov ? ov.ht : null;
      const potentialAvg = (calculatedOeeHt && calculatedOeeHt > 0 && avgProdHt !== null)
        ? (avgProdHt / (calculatedOeeHt / 100))
        : null;

      return [
        shortCell(d.cell),
        pctCell(d.availabilityHt),
        pctCell(d.performanceHt),
        pctCell(qHt),
        pctCell(calculatedOeeHt, { bold: true, color: COLORS.navy }),
        potentialAvg !== null ? potentialAvg.toFixed(1) : "—",
      ];
    });

    // Hat Ortalaması Satırını Hesaplama
    const activeAvail = oeeData.filter((d) => d.availabilityHt !== null);
    const avgAvail = activeAvail.length ? activeAvail.reduce((s, d) => s + d.availabilityHt, 0) / activeAvail.length : 0;

    const activePerf = oeeData.filter((d) => d.performanceHt !== null);
    const avgPerf = activePerf.length ? activePerf.reduce((s, d) => s + d.performanceHt, 0) / activePerf.length : 0;

    // Zincirleme (Kümülatif) Kalite Hesaplama (Rolled Throughput Yield)
    const avgQuality = oeeData.reduce((prod, d) => {
      const redPct = QUALITY_REDS[d.cell] || 0.0;
      const qHt = 100.0 - redPct;
      return prod * (qHt / 100);
    }, 1.0) * 100;

    // Zincirleme OEE Hesabı
    const avgOee = (avgAvail / 100) * (avgPerf / 100) * (avgQuality / 100) * 100;

    const activeProds = overviewData.filter((o) => o.ht !== null);
    const avgProdAllHt = activeProds.length ? activeProds.reduce((sum, o) => sum + o.ht, 0) / activeProds.length : 0;
    const avgPotentialAvg = (avgOee && avgOee > 0) ? (avgProdAllHt / (avgOee / 100)) : 0;

    // Görünümü farklı hat ortalaması satırını ekle (açık mavi/gri arka plan, kalın lacivert yazı)
    const rowFill = { color: "#DCE6F1" }; // Belirgin farklı arka plan
    rows.push([
      { text: "HAT ORTALAMASI (Zincirleme)", bold: true, color: COLORS.navy, fill: rowFill },
      { text: `${avgAvail.toFixed(1)}%`, bold: true, color: COLORS.navy, fill: rowFill },
      { text: `${avgPerf.toFixed(1)}%`, bold: true, color: COLORS.navy, fill: rowFill },
      { text: `${avgQuality.toFixed(1)}%`, bold: true, color: COLORS.navy, fill: rowFill },
      { text: `${avgOee.toFixed(1)}%`, bold: true, color: COLORS.navy, fill: rowFill },
      { text: avgPotentialAvg.toFixed(1), bold: true, color: COLORS.navy, fill: rowFill },
    ]);

    styledTable(slide, header, rows, { x: 0.6, y: 2.25, w: 11.8, colW: [2.8, 1.8, 1.8, 1.8, 1.8, 2.0], rowH: 0.32 });

    slide.addText("* Hücrenin Haziran–Temmuz dönemi gerçekleşen günlük ortalama üretim adedi ve hesaplanan OEE verimliliği baz alınarak, OEE %100 olsaydı ulaşabileceği teorik günlük ortalama üretimi gösterir.", {
      x: 0.6, y: 5.9, w: 11.8, h: 0.4, margin: 0,
      fontFace: FONT_BODY, fontSize: 9.5, italic: true, color: COLORS.slate
    });

    addFooter(slide, "OEE, MTBF & MTTR");
  }

  // ==================================================================
  // SLIDE 6 — MTBF ve MTTR
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.hourglass, eyebrow: "OEE, MTBF & MTTR", title: "MTBF ve MTTR — Arıza Bazlı Güvenilirlik (Haziran–Temmuz)" });
    slide.addText("MTBF, ekipmanın iki arıza arasında ortalama ne kadar süre durmaksızın çalıştığını gösteren güvenilirlik metriğidir. MTTR ise meydana gelen bir arızanın giderilmesi için geçen ortalama tamir süresini ifade eder.", {
      x: 0.6, y: 1.45, w: 11.8, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.slateLight, lineSpacing: 13,
    });

    const mtbfMttrHeader = ["Hücre", "MTBF (dk)", "MTTR (dk)", "Arıza Kaydı"];
    const mtbfMttrRows = oeeData.map((d) => [
      shortCell(d.cell),
      dkCell(d.mtbfHt),
      dkCell(d.mttrHt),
      d.arizaEventsHt === null ? { text: "veri yok", color: COLORS.red, bold: true } : String(d.arizaEventsHt),
    ]);
    styledTable(slide, mtbfMttrHeader, mtbfMttrRows, { x: 0.6, y: 2.05, w: 11.8, colW: [4.0, 2.6, 2.6, 2.6], rowH: 0.4 });

    addFooter(slide, "OEE, MTBF & MTTR");
  }



  // ==================================================================
  // SLIDE 14B — DURUŞ ANALİZİ: KAYIP ANALİZİ (PARETO) - 13.06.2026 VE SONRASI
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.warning, eyebrow: "Duruş Analizi", title: "Kayıp Analizi (Pareto)" });

    const rawPareto = activePareto.length > 0 ? activePareto : [
      { category: "Pres", duration: 1850, eventCount: 84 },
      { category: "N602", duration: 1450, eventCount: 52 },
      { category: "ROB109", duration: 1100, eventCount: 65 },
      { category: "Quench", duration: 750, eventCount: 22 },
      { category: "Flowform", duration: 150, eventCount: 15 }
    ];

    const totalDuration = rawPareto.reduce((sum, item) => sum + item.duration, 0);
    const paretoSource = [...rawPareto];

    // Kümülatif % değerlerini yeni listeye göre yeniden hesaplayalım
    let cum = 0;
    paretoSource.forEach(item => {
      cum += item.duration;
      item.cumPercentage = totalDuration > 0 ? Math.round((cum / totalDuration) * 100) : 0;
    });

    const labels = paretoSource.map((item) => item.category);
    
    // Combo chart formatı
    const chartTypes = [
      {
        type: pres.charts.BAR,
        data: [
          {
            name: "Duruş Süresi (dk)",
            labels: labels,
            values: paretoSource.map((item) => item.duration),
          }
        ],
        options: {
          barGrouping: "clustered",
          // İlk 3 neden vurgulu: navy, diğerleri sönük slateLight
          chartColors: paretoSource.map((item, idx) => idx < 3 ? COLORS.navy : "94A3B8"),
        }
      },
      {
        type: pres.charts.LINE,
        data: [
          {
            name: "Olay Sayısı",
            labels: labels,
            values: paretoSource.map((item) => item.eventCount),
          }
        ],
        options: {
          secondaryValAxis: true,
          secondaryCatAxis: true,
          chartColors: [COLORS.amber],
        }
      }
    ];

    slide.addChart(chartTypes, {
      x: 0.6, y: 1.6, w: 12.1, h: 4.3,
      showLegend: false,
      showTitle: false,
      valAxes: [
        {
          valAxisTitle: "Duruş Süresi (dk)",
          showValAxisTitle: true,
          valAxisTitleFontSize: 9.5,
          valAxisTitleColor: COLORS.slateLight,
          valAxisLabelFontSize: 9,
          valAxisLabelColor: COLORS.slate,
          valGridLine: { color: COLORS.border, size: 0.5 },
        },
        {
          valAxisTitle: "Olay Sayısı (Adet)",
          showValAxisTitle: true,
          valAxisTitleFontSize: 9.5,
          valAxisTitleColor: COLORS.slateLight,
          valAxisLabelFontSize: 9,
          valAxisLabelColor: COLORS.slate,
          valAxisMinVal: 0,
        }
      ],
      catAxes: [
        {
          catAxisLabelColor: COLORS.slate,
          catAxisLabelFontSize: 10.5, // Hücre adları kısa olduğu için daha büyük font seçtik
          catGridLine: { style: "none" },
        },
        {
          catAxisHidden: true
        }
      ],
      chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
    });

    const top3Duration = rawPareto.slice(0, 3).reduce((sum, item) => sum + item.duration, 0);
    const top3Percentage = totalDuration > 0 ? Math.round((top3Duration / totalDuration) * 100) : 0;

    const isDynamic = activePareto.length > 0;
    const footerText = `Grafik: Pareto duruş süresi (bar, sol eksen) ve Duruş sıklığı (turuncu çizgi, sağ eksen), ilk 3 neden vurgulu. İlk 3 neden toplam duruş süresinin %${top3Percentage}'ini oluşturmaktadır. ` + (isDynamic 
      ? "Veriler 13.06.2026 sonrası seçili hücrelerin kategorize edilmiş duruş verileridir."
      : "Veriler 13.06.2026 sonrası dönemi kapsayan taslak (dummy) verilerdir.");

    slide.addText(footerText, {
      x: 0.6, y: 6.0, w: 12.1, h: 0.65, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.slateLight,
    });
    
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 14C — DURUŞ ANALİZİ: KAYIP ANALİZİ AKSİYON PLANI
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.checkWhite, eyebrow: "Duruş Analizi", title: "Kayıp Analizi — Detay Kırılım" });

    const rawPareto = actionPlanPareto.length > 0 ? actionPlanPareto : [
      { category: "Pres", duration: 1850, eventCount: 84, cumPercentage: 35, topKokNeden: "CNC Rulman aşınması ve yatak boşluğu", topOnleyiciAksiyon: "Haftalık rulman titreşim analizi ve periyodik yağlama kontrolü" },
      { category: "N602", duration: 1450, eventCount: 52, cumPercentage: 62, topKokNeden: "Operatörlerin duruş kodu girmemesi", topOnleyiciAksiyon: "Duruş giriş ekranında 10 dk üzeri kayıtlarda kod zorunluluğu" },
      { category: "ROB109", duration: 1100, eventCount: 65, cumPercentage: 83, topKokNeden: "Gürültülü hatlarda I/O modül haberleşme kaybı", topOnleyiciAksiyon: "Haberleşme kablolarının ekranlı kablo ile değişimi ve topraklama" },
      { category: "Quench", duration: 750, eventCount: 22, cumPercentage: 97, topKokNeden: "Eşanjör tıkanıklığı ve yetersiz soğutma debisi", topOnleyiciAksiyon: "Kritik hücrelerin eşanjör temizliği ve soğutma suyu debi takibi" },
      { category: "Flowform", duration: 150, eventCount: 15, cumPercentage: 100, topKokNeden: "Minör arızalar ve mikro duruşlar", topOnleyiciAksiyon: "Aksiyon takip listesi üzerinden takip ve analiz" }
    ];

    const actionList = rawPareto.slice(0, 10);

    const header = ["Hücre", "Toplam Süre", "Payı %", "Duruş Sebebi", "Aksiyon", "Durum"];
    const rows = actionList.map((item) => {
      let statusObj = { text: "●", color: COLORS.amber, bold: true };
      const kok = item.topKokNeden || "";
      const aks = item.topOnleyiciAksiyon || "";
      const isCompleted = (
        (kok.includes("giderildi") || 
         aks.includes("gideril") || 
         aks.includes("çözül") || 
         aks.includes("değiştiril") || 
         aks.includes("güncellen") || 
         kok.includes("Rulman")) && 
        !kok.includes("Montaj") && 
        !kok.includes("Demontaj")
      );
      if (isCompleted) {
        statusObj = { text: "✔", color: COLORS.green, bold: true };
      }
      return [
        item.category,
        `${fmtInt(item.duration)} dk`,
        `%${item.ratio !== undefined ? item.ratio : item.cumPercentage}`,
        item.topKokNeden || "—",
        item.topOnleyiciAksiyon || "—",
        statusObj
      ];
    });

    const rowH = actionList.length > 5 ? 0.45 : 0.75;

    styledTable(slide, header, rows, {
      x: 0.6,
      y: 1.6,
      w: 12.1,
      colW: [1.6, 1.0, 0.9, 3.8, 3.8, 1.0], // Toplam: 1.6 + 1.0 + 0.9 + 3.8 + 3.8 + 1.0 = 12.1
      rowH: rowH
    });

    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 15B — DURUŞ ANALİZİ: KAYIP TÜRLERİNE GÖRE DAĞILIM
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartLine, eyebrow: "Duruş Analizi", title: "Kayıp Türlerine Göre Dağılım — 13.06.2026 ve Sonrası" });

    const rawLossTypes = activeLossTypes.length > 0 ? activeLossTypes : [
      { category: "Mekanik Arıza", duration: 3500, eventCount: 145, percentage: 38 },
      { category: "Setup / Ayar", duration: 2200, eventCount: 85, percentage: 24 },
      { category: "Elektrik Arıza", duration: 1500, eventCount: 45, percentage: 16 },
      { category: "Takım / Kalıp Değişimi", duration: 1100, eventCount: 30, percentage: 12 },
      { category: "Akışkan Arıza", duration: 600, eventCount: 18, percentage: 7 },
      { category: "Yardımcı Süreç Kayıpları", duration: 250, eventCount: 12, percentage: 3 }
    ];

    const labels = rawLossTypes.map((item) => item.category);
    const values = rawLossTypes.map((item) => item.duration);

    // Pasta grafik için kurumsal renk paleti
    const pieColors = [
      COLORS.navy,      // En büyük pay
      COLORS.amber,     // İkinci pay
      COLORS.green,     // Üçüncü pay
      "475569",         // Koyu gri
      "94A3B8",         // Orta gri
      "CBD5E1",         // Açık gri
      "E2E8F0"
    ];

    // Sol Taraf (Pie Chart)
    slide.addChart(
      pres.charts.PIE,
      [
        {
          name: "Kayıp Süresi (dk)",
          labels: labels,
          values: values,
        }
      ],
      {
        x: 0.6,
        y: 1.6,
        w: 5.8,
        h: 4.3,
        showLegend: true,
        legendPos: "b", // altta gösterilsin
        legendFontSize: 9.5,
        legendColor: COLORS.slate,
        showPercent: true,
        showValue: false,
        chartColors: pieColors,
        dataLabelFontSize: 10,
        dataLabelColor: "FFFFFF"
      }
    );

    // Sağ Taraf (Detay Tablosu)
    const header = ["Kayıp Türü", "Toplam Süre", "Duruş Sayısı", "Pay (%)"];
    const rows = rawLossTypes.map((item) => [
      item.category,
      `${fmtInt(item.duration)} dk`,
      String(item.eventCount),
      `%${item.percentage}`
    ]);

    styledTable(slide, header, rows, {
      x: 6.8,
      y: 1.6,
      w: 5.9,
      colW: [2.5, 1.2, 1.2, 1.0], // Toplam: 2.5 + 1.2 + 1.2 + 1.0 = 5.9
      rowH: 0.65
    });

    const isDynamic = activeLossTypes.length > 0;
    const footerText = `Grafik: Kayıp kategorilerinin toplam duruş sürelerine göre yüzde dağılımı. ` + (isDynamic
      ? "Veriler 13.06.2026 sonrası seçili hücrelerin kategorize edilmiş duruş verileridir."
      : "Veriler 13.06.2026 sonrası dönemi kapsayan taslak (dummy) verilerdir.");

    slide.addText(footerText, {
      x: 0.6, y: 6.0, w: 12.1, h: 0.65, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.slateLight,
    });

    addFooter(slide, "Duruş Analizi");
  }





  // ==================================================================
  // SLIDE 17 — DURUŞ ANALİZİ: KAYIT TAKİP DİSİPLİNİ
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.clockAmber, eyebrow: "Duruş Analizi", title: "Arıza Kayıtlarında Çözüm Takibi" });

    slide.addChart(
      pres.charts.DOUGHNUT,
      [{ name: "Durum", labels: ["İşaretlenmemiş", "Giderildi"], values: [295, 23] }],
      {
        x: 0.5, y: 1.6, w: 4.6, h: 4.3,
        chartColors: [COLORS.slateLight, COLORS.green],
        showLegend: true, legendPos: "b", legendColor: COLORS.slate, legendFontSize: 12,
        showValue: true, showPercent: true, dataLabelColor: COLORS.white, dataLabelFontSize: 12, dataLabelFontFace: FONT_BODY,
        showTitle: false, holeSize: 55,
      }
    );
    slide.addText("318", {
      x: 0.5, y: 3.15, w: 4.6, h: 0.7, margin: 0, align: "center",
      fontFace: FONT_HEAD, fontSize: 36, bold: true, color: COLORS.navy,
    });
    slide.addText("TOPLAM ARIZA OLAYI", {
      x: 0.5, y: 3.75, w: 4.6, h: 0.3, margin: 0, align: "center",
      fontFace: FONT_BODY, fontSize: 10, bold: true, color: COLORS.slateLight, charSpacing: 2,
    });

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.5, y: 1.6, w: 6.9, h: 2.0, rectRadius: 0.08,
      fill: { color: COLORS.white }, line: { type: "none" },
      shadow: { type: "outer", color: "1E2761", blur: 8, offset: 3, angle: 90, opacity: 0.1 },
    });
    slide.addText("GÖZLEM", {
      x: 5.85, y: 1.85, w: 6.2, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.slateLight, bold: true, charSpacing: 2,
    });
    slide.addText("Sistemde \"arıza giderildi\" alanı mevcut ancak sahada tutarlı doldurulmuyor: 318 arıza olayının sadece 23'ü (%7) çözüm olarak işaretlenmiş (957 / 9.610 dk). Bu, arızaların çözülmediği anlamına gelmiyor — takip alanının disiplinli kullanılmadığını gösteriyor.", {
      x: 5.85, y: 2.2, w: 6.2, h: 1.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 12, color: COLORS.slate, lineSpacing: 15,
    });

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 5.5, y: 3.8, w: 6.9, h: 1.1, rectRadius: 0.08,
      fill: { color: COLORS.iceTint }, line: { type: "none" },
    });
    slide.addText("ÖNERİ", {
      x: 5.85, y: 4.03, w: 6.2, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.navy, bold: true, charSpacing: 2,
    });
    slide.addText("Belirli bir süre üzerindeki arızalarda \"giderildi\" alanı ve çözüm açıklaması zorunlu hale getirilebilir; bu hem takip disiplinini hem de kök neden veri kalitesini artırır.", {
      x: 5.85, y: 4.35, w: 6.2, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 11.5, color: COLORS.slate, lineSpacing: 14,
    });
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // ÖNE ÇIKAN SORUNLAR — helper for case slides
  // ==================================================================
  function caseSlide({ eyebrow, cellTitle, statusType, statusLabel, evidence, description, actionLabel, action }) {
    const slide = newContentSlide();
    // Narrower title box so long titles never run under the status badge; allow 2 lines.
    addHeader(slide, { icon: icons.warning, eyebrow, title: cellTitle, titleSize: 22, titleW: 7.9, titleH: 0.85 });
    badge(slide, { x: 9.9, y: 0.68, w: 2.5, label: statusLabel, type: statusType });

    // evidence stat card
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 1.8, w: 3.6, h: 3.4, rectRadius: 0.08,
      fill: { color: COLORS.navy }, line: { type: "none" },
    });
    slide.addText("VERİ KANITI", {
      x: 0.9, y: 2.1, w: 3.0, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.ice, bold: true, charSpacing: 2,
    });
    evidence.forEach((e, i) => {
      const y = 2.5 + i * 1.1;
      slide.addText(e.big, {
        x: 0.9, y, w: 3.0, h: 0.55, margin: 0,
        fontFace: FONT_HEAD, fontSize: 24, bold: true, color: COLORS.white,
      });
      slide.addText(e.small, {
        x: 0.9, y: y + 0.5, w: 3.0, h: 0.45, margin: 0,
        fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.ice, lineSpacing: 12,
      });
    });

    // description card
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 4.5, y: 1.8, w: 7.4, h: 1.95, rectRadius: 0.08,
      fill: { color: COLORS.white }, line: { type: "none" },
      shadow: { type: "outer", color: "1E2761", blur: 8, offset: 3, angle: 90, opacity: 0.1 },
    });
    slide.addText("SORUN TANIMI", {
      x: 4.8, y: 2.05, w: 6.9, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.slateLight, bold: true, charSpacing: 2,
    });
    slide.addText(description, {
      x: 4.8, y: 2.4, w: 6.9, h: 1.2, margin: 0,
      fontFace: FONT_BODY, fontSize: 12, color: COLORS.slate, lineSpacing: 15,
    });

    // action card (gap >= 0.3in below description card)
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 4.5, y: 4.05, w: 7.4, h: 1.15, rectRadius: 0.08,
      fill: { color: COLORS.iceTint }, line: { type: "none" },
    });
    slide.addText(turkishUpper(actionLabel), {
      x: 4.8, y: 4.28, w: 6.9, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.navy, bold: true, charSpacing: 2,
    });
    slide.addText(action, {
      x: 4.8, y: 4.6, w: 6.9, h: 0.55, margin: 0,
      fontFace: FONT_BODY, fontSize: 12, color: COLORS.slate, lineSpacing: 14,
    });

    return slide;
  }



  // SLIDE 12 — Boya & Fosfat veri boşluğu (Karar bekliyor)
  // Bu hücreler EXCLUDED_CELLS ile sunumdan çıkarıldığında bu slayt da atlanır;
  // hücreler geri eklendiğinde (EXCLUDED_CELLS boşaltıldığında) otomatik döner.
  if (!fosfatBoyaExcluded) {
    const slide = caseSlide({
      eyebrow: "Öne Çıkan Sorunlar",
      cellTitle: "Boya & Fosfat Hücreleri — Veri Boşluğu",
      statusType: "decision",
      statusLabel: "Karar Bekliyor",
      evidence: [
        { big: "7 Mayıs", small: "Son kayıtlı üretim/duruş\nverisi tarihi" },
        { big: "~2 ay", small: "Veri girişi olmayan\nsüre" },
      ],
      description: "Boya ve Fosfat hücrelerinde 7 Mayıs 2026'dan bu yana günlük üretim formuna veri girişi yapılmamış. Sebep netleştirilmedi: hat mı durdu, veri girişi mi kesildi, sorumlu değişikliği mi yaşandı bilinmiyor.",
      actionLabel: "Gerekli Karar",
      action: "Üst yönetimden bu iki hücrenin güncel operasyonel durumu ve veri girişinin neden kesildiğine dair yönlendirme isteniyor.",
    });
    addFooter(slide, "Öne Çıkan Sorunlar");
  }

  // ==================================================================
  // SLIDE 13 — AKSİYON TAKİBİ: GENEL DURUM
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.tasks, eyebrow: "Aksiyon Takibi", title: "74 Madde — Genel Durum" });

    slide.addChart(
      pres.charts.DOUGHNUT,
      [{ name: "Durum", labels: ["Açık", "Tamamlandı"], values: [60, 14] }],
      {
        x: 0.5, y: 1.5, w: 4.6, h: 4.3,
        chartColors: [COLORS.amber, COLORS.green],
        showLegend: true, legendPos: "b", legendColor: COLORS.slate, legendFontSize: 12,
        showValue: true, showPercent: true, dataLabelColor: COLORS.white, dataLabelFontSize: 12, dataLabelFontFace: FONT_BODY,
        showTitle: false, holeSize: 55,
      }
    );
    slide.addText("74", {
      x: 0.5, y: 3.05, w: 4.6, h: 0.7, margin: 0, align: "center",
      fontFace: FONT_HEAD, fontSize: 36, bold: true, color: COLORS.navy,
    });
    slide.addText("TOPLAM MADDE", {
      x: 0.5, y: 3.65, w: 4.6, h: 0.3, margin: 0, align: "center",
      fontFace: FONT_BODY, fontSize: 10, bold: true, color: COLORS.slateLight, charSpacing: 2,
    });

    const header = ["Hücre", "Tamamlandı", "Açık", "Toplam"];
    const rows = [
      ["Pres Hücresi", "3", "29", "32"],
      ["Flowform Hücresi", "6", "10", "16"],
      ["N602-N603 Hücresi", "3", "10", "13"],
      ["Final Ölçüm", "2", "9", "11"],
      ["Quench Hücresi", "0", "1", "1"],
      ["ETM Hücresi", "0", "1", "1"],
    ];
    styledTable(slide, header, rows, { x: 5.5, y: 1.55, w: 7.3, colW: [3.4, 1.3, 1.3, 1.3], rowH: 0.42 });

    slide.addText("Nisan-Mayıs döneminde tamamlanan madde sayısı sıfırdı; 14 maddenin tamamı Haziran-Temmuz'da kapatıldı.", {
      x: 5.5, y: 4.55, w: 7.3, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 11.5, italic: true, color: COLORS.slateLight,
    });
    addFooter(slide, "Aksiyon Takibi");
  }

  // ==================================================================
  // SLIDE 15-16 — TALEP / KARAR (placeholder)
  // ==================================================================
  function placeholderSlide({ eyebrow, title, promptLabel, promptExample }) {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.handshake, eyebrow, title });

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 1.75, w: 11.8, h: 4.4, rectRadius: 0.08,
      fill: { color: COLORS.white }, line: { color: COLORS.border, width: 1.25, dashType: "dash" },
    });
    badge(slide, { x: 0.95, y: 2.05, w: 2.85, label: "İçerik Bekliyor", type: "decision" });
    slide.addText("Bu bölümün madde listesi henüz kesinleşmedi. Sunum hazırlığı sırasında ilgili paydaşlarla birlikte netleştirilecek.", {
      x: 0.95, y: 2.6, w: 11.1, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 12.5, color: COLORS.slate,
    });
    slide.addText(turkishUpper(promptLabel), {
      x: 0.95, y: 3.3, w: 11.1, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.slateLight, bold: true, charSpacing: 2,
    });
    slide.addText(promptExample, {
      x: 0.95, y: 3.65, w: 11.1, h: 2.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 12.5, color: COLORS.slateLight, italic: true, lineSpacing: 20,
    });
    addFooter(slide, eyebrow);
  }


  placeholderSlide({
    eyebrow: "Talep / Karar",
    title: "Müşteriden Talep Edilecekler",
    promptLabel: "Doldurulacak Şablon",
    promptExample: fosfatBoyaExcluded
      ? "[Talep Konusu]  —  Gerekçe  —  Beklenen Katkı\n\nÖrnek aday (bu oturumda netleşmedi): sunum hazırlığı sırasında ilgili paydaşlarla netleştirilecek."
      : "[Talep Konusu]  —  Gerekçe  —  Beklenen Katkı\n\nÖrnek aday (bu oturumda netleşmedi): Boya ve Fosfat hücrelerindeki operasyonel durumun ve veri girişi kesintisinin netleştirilmesi için müşteri/saha koordinasyonu.",
  });



  const outPath = "C:\\Users\\tvural.REPKON\\Desktop\\HF901\\Serial Production\\ManufUI\\docs\\sunumlar\\Repkon-HF901-Ust-Yonetim-Sunumu-2026-07.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log("done:", outPath, "pages:", pageNum + 1);
})();
