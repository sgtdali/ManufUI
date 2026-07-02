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
        let text = cell, color = COLORS.slate, bold = false;
        if (cell && typeof cell === "object") {
          text = cell.text; color = cell.color || COLORS.slate; bold = !!cell.bold;
        }
        return {
          text: String(text),
          options: {
            fill: { color: i % 2 === 0 ? COLORS.white : COLORS.iceTint },
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
    slide.addText("Performans Raporu ve\nAksiyon / Yatırım Talebi", {
      x: 0.85, y: 2.75, w: 11, h: 2.0, margin: 0,
      fontFace: FONT_HEAD, fontSize: 44, color: COLORS.white, bold: true, lineSpacing: 50,
    });
    slide.addText("Nisan – Temmuz 2026 Değerlendirmesi  ·  12 Üretim Hücresi", {
      x: 0.9, y: 4.75, w: 10, h: 0.4, margin: 0,
      fontFace: FONT_BODY, fontSize: 16, color: COLORS.ice,
    });
    slide.addShape(pres.shapes.LINE, {
      x: 0.9, y: 5.35, w: 2.2, h: 0, line: { color: COLORS.ice, width: 1.5 },
    });
    slide.addText("Üst Yönetim Sunumu · Temmuz 2026", {
      x: 0.9, y: 6.7, w: 8, h: 0.35, margin: 0,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.slateLight,
    });
  }

  // ==================================================================
  // SLIDE 2 — AMAÇ VE KAPSAM
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.bullseye, eyebrow: "Genel Bakış", title: "Sunumun Amacı ve Kapsamı" });

    const cardY = 1.75, cardH = 2.15;
    const cards = [
      { title: "3 Aylık Performans Özeti", body: "Nisan – Temmuz döneminde 12 üretim hücresinin üretim adedi, duruş süreleri ve darboğaz göstergeleri veriye dayalı olarak özetlenir." },
      { title: "Somut Aksiyon / Yatırım Talebi", body: "Sadece durum raporu değil; açık aksiyon maddeleri, yatırım ihtiyaçları ve müşteriden talep edilecek konular için karar talebi içerir." },
    ];
    cards.forEach((c, i) => {
      const x = 0.6 + i * 6.15;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: cardY, w: 5.85, h: cardH, rectRadius: 0.08,
        fill: { color: COLORS.white }, line: { type: "none" },
        shadow: { type: "outer", color: "1E2761", blur: 8, offset: 3, angle: 90, opacity: 0.1 },
      });
      slide.addText(c.title, {
        x: x + 0.35, y: cardY + 0.3, w: 5.15, h: 0.5, margin: 0,
        fontFace: FONT_HEAD, fontSize: 17, bold: true, color: COLORS.navy,
      });
      slide.addText(c.body, {
        x: x + 0.35, y: cardY + 0.85, w: 5.15, h: 1.1, margin: 0,
        fontFace: FONT_BODY, fontSize: 12.5, color: COLORS.slate, lineSpacing: 18,
      });
    });

    slide.addText("ZAMAN KURGUSU", {
      x: 0.6, y: 4.25, w: 6, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 11.5, color: COLORS.slateLight, bold: true, charSpacing: 2,
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 4.6, w: 11.5, h: 0.95, rectRadius: 0.08,
      fill: { color: COLORS.iceTint }, line: { type: "none" },
    });
    slide.addText([
      { text: "Nisan – Mayıs: ", options: { bold: true, color: COLORS.navy } },
      { text: "kısa özet.  ", options: { color: COLORS.slate } },
      { text: "Haziran – Temmuz: ", options: { bold: true, color: COLORS.navy } },
      { text: "atılan aksiyonların sonuçları detaylı işlenir. Sunumun ağırlığı Haziran sonrası ilerlemededir — veri bu kurguyu destekliyor.", options: { color: COLORS.slate } },
    ], { x: 0.95, y: 4.6, w: 10.8, h: 0.95, margin: 0, valign: "middle", fontFace: FONT_BODY, fontSize: 13, lineSpacing: 18 });

    slide.addText("KAPSAM", {
      x: 0.6, y: 5.75, w: 6, h: 0.3, margin: 0,
      fontFace: FONT_BODY, fontSize: 11.5, color: COLORS.slateLight, bold: true, charSpacing: 2,
    });
    const cells = ["Pres", "ETM", "ROB108", "Flowform", "ROB104", "N602", "N603", "ROB109", "Quench", "ROB110-111", "Fosfat", "Boya"];
    const chipW = 0.88, gap = 0.1;
    cells.forEach((c, i) => {
      const col = i % 12;
      const x = 0.6 + col * (chipW + gap);
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 6.1, w: chipW, h: 0.42, rectRadius: 0.21,
        fill: { color: COLORS.navy }, line: { type: "none" },
      });
      slide.addText(c, {
        x, y: 6.1, w: chipW, h: 0.42, margin: 0, align: "center", valign: "middle",
        fontFace: FONT_BODY, fontSize: 8.7, color: COLORS.white, bold: true,
      });
    });
    addFooter(slide, "Genel Bakış");
  }

  // ==================================================================
  // Data
  // ==================================================================
  // tool/data/overview-data.json varsa (yerel arayüzden seçim yapılarak
  // üretilmiştir) onu kullan; yoksa son bilinen sabit veriye geri dön.
  const fs = require("fs");
  const path = require("path");
  const overviewDataPath = path.join(__dirname, "tool", "data", "overview-data.json");
  const overviewData = fs.existsSync(overviewDataPath)
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
      ];

  // ==================================================================
  // SLIDE 3 — GENEL BAKIŞ: ÜRETİM TABLOSU
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartBar, eyebrow: "Genel Bakış", title: "11 Hücre — Günlük Ortalama Üretim Adedi" });
    slide.addText("Karşılaştırma günlük ortalama bazındadır (dönemlerdeki kayıtlı gün sayısı farklı olduğundan toplamlar yerine ortalama kullanılmıştır).", {
      x: 0.6, y: 1.5, w: 11.8, h: 0.35, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.slateLight,
    });

    const header = ["Hücre", "Nisan–Mayıs (adet/gün)", "Haziran–Temmuz (adet/gün)", "Değişim"];
    const rows = overviewData.map((d) => [
      d.cell,
      d.nm.toFixed(1),
      d.ht === null ? { text: "veri yok", color: COLORS.red, bold: true } : d.ht.toFixed(1),
      d.ht === null ? { text: "—", color: COLORS.red } : { text: fmtPct(d.nm, d.ht), color: COLORS.green, bold: true },
    ]);
    styledTable(slide, header, rows, { x: 0.6, y: 2.0, w: 11.8, colW: [4.1, 2.9, 2.9, 1.9], rowH: 0.335 });
    addFooter(slide, "Genel Bakış");
  }

  // ==================================================================
  // SLIDE 4 — GENEL BAKIŞ: BEKLEME + KPI
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.hourglass, eyebrow: "Genel Bakış", title: "11 Hücre — Önceki İstasyon Bekleme Süresi" });

    const header = ["Hücre", "Nisan–Mayıs (dk/gün)", "Haziran–Temmuz (dk/gün)", "Değişim"];
    const rows = overviewData.map((d) => {
      let changeCell;
      if (d.htB === null) changeCell = { text: "—", color: COLORS.red };
      else if (d.cell === "Pres Hücresi") changeCell = { text: "ilk istasyon", color: COLORS.slateLight };
      else {
        const pct = fmtPct(d.nmB, d.htB);
        const worse = d.htB > d.nmB;
        changeCell = { text: pct + (d.note ? " ⚠" : ""), color: worse ? COLORS.amber : COLORS.green, bold: true };
      }
      return [
        d.cell,
        d.nmB.toFixed(1),
        d.htB === null ? { text: "veri yok", color: COLORS.red, bold: true } : d.htB.toFixed(1),
        changeCell,
      ];
    });
    styledTable(slide, header, rows, { x: 0.6, y: 1.55, w: 7.3, colW: [2.6, 1.7, 1.7, 1.3], rowH: 0.335 });

    // KPI stat callouts
    const stats = [
      { big: "+195%", small: "Hücre başına\ngünlük ortalama üretim" },
      { big: "-46%", small: "Ortalama önceki istasyon\nbekleme süresi" },
      { big: "14 / 74", small: "Haziran-Temmuz'da kapanan\naksiyon maddesi" },
    ];
    stats.forEach((s, i) => {
      const y = 1.55 + i * 1.65;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: 8.2, y, w: 4.2, h: 1.4, rectRadius: 0.08,
        fill: { color: COLORS.navy }, line: { type: "none" },
      });
      slide.addText(s.big, {
        x: 8.45, y: y + 0.1, w: 3.7, h: 0.65, margin: 0,
        fontFace: FONT_HEAD, fontSize: 30, bold: true, color: COLORS.white,
      });
      slide.addText(s.small, {
        x: 8.45, y: y + 0.78, w: 3.7, h: 0.55, margin: 0,
        fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.ice, lineSpacing: 12,
      });
    });

    slide.addText("⚠ ROB109 hücresinde bekleme günlük ortalamada arttı (63,0 → 87,1 dk) — Quench / N602-N603 çıktı dalgalanmasına bağlı yeni darboğaz riski, izleniyor.", {
      x: 0.6, y: 6.55, w: 11.8, h: 0.4, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.amber,
    });
    addFooter(slide, "Genel Bakış");
  }

  // ==================================================================
  // SLIDE 5 — DARBOĞAZ: AKIŞ ŞEMASI
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.exchange, eyebrow: "Darboğaz ve Kök Neden Analizi", title: "Hücreler Arası Akış Sırası" });

    // Row 1: Pres -> ... -> ROB104 -> N602/N603 (combined, paralel çalışan hücreler tek kutuda)
    const flowRow1 = ["Pres", "ETM", "ROB108", "Flowform", "ROB104", "N602 / N603"];
    const boxW1 = 1.78, boxH = 0.8, gapX1 = 0.16;
    const startX = 0.7, y1 = 1.75;
    flowRow1.forEach((c, i) => {
      const x = startX + i * (boxW1 + gapX1);
      const isLast = i === flowRow1.length - 1;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: y1, w: boxW1, h: boxH, rectRadius: 0.07,
        fill: { color: isLast ? COLORS.slateLight : COLORS.navy }, line: { type: "none" },
      });
      slide.addText(c, {
        x, y: y1, w: boxW1, h: boxH, margin: 0, align: "center", valign: "middle",
        fontFace: FONT_BODY, fontSize: 12, bold: true, color: COLORS.white,
      });
      if (i < flowRow1.length - 1) {
        slide.addImage({ data: icons.arrowDownNavy, x: x + boxW1 + 0.005, y: y1 + 0.25, w: 0.28, h: 0.28, rotate: 270 });
      }
    });
    slide.addText("N602 ve N603 paralel çalışır; ikisi de ROB104'ten beslenir, ikisi de ROB109'a gönderir.", {
      x: startX, y: y1 + boxH + 0.06, w: 6 * boxW1 + 5 * gapX1, h: 0.3, margin: 0, align: "right",
      fontFace: FONT_BODY, fontSize: 9.5, italic: true, color: COLORS.slateLight,
    });

    // continuation arrow between the two rows
    const arrowX = PW / 2 - 0.16;
    const arrowY = y1 + boxH + 0.55;
    slide.addImage({ data: icons.arrowDownNavy, x: arrowX, y: arrowY, w: 0.32, h: 0.32 });

    // Row 2: ROB109 -> Quench -> ROB110-111 -> Fosfat -> Boya
    const flowRow2 = ["ROB109", "Quench", "ROB110-111", "Fosfat", "Boya"];
    const boxW2 = 1.85, gapX2 = 0.42;
    const y3 = arrowY + 0.32 + 0.25;
    flowRow2.forEach((c, i) => {
      const x = startX + i * (boxW2 + gapX2);
      const isLast = i === flowRow2.length - 1;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: y3, w: boxW2, h: boxH, rectRadius: 0.07,
        fill: { color: isLast ? COLORS.slateLight : COLORS.navy }, line: { type: "none" },
      });
      slide.addText(c, {
        x, y: y3, w: boxW2, h: boxH, margin: 0, align: "center", valign: "middle",
        fontFace: FONT_BODY, fontSize: 12, bold: true, color: COLORS.white,
      });
      if (i < flowRow2.length - 1) {
        slide.addImage({ data: icons.arrowDownNavy, x: x + boxW2 + 0.06, y: y3 + 0.25, w: 0.28, h: 0.28, rotate: 270 });
      }
    });

    const infoY = y3 + boxH + 0.45;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.7, y: infoY, w: 11.3, h: 0.85, rectRadius: 0.08,
      fill: { color: COLORS.iceTint }, line: { type: "none" },
    });
    slide.addText([
      { text: "ETM ve ROB108, ", options: { bold: true, color: COLORS.navy } },
      { text: "Pres'in hemen ardından gelen istasyonlar olarak en yüksek upstream bekleme baskısını taşıyordu. Bu analizde odak buradadır.", options: { color: COLORS.slate } },
    ], { x: 1.0, y: infoY, w: 10.7, h: 0.85, margin: 0, valign: "middle", fontFace: FONT_BODY, fontSize: 12.5, lineSpacing: 16 });

    addFooter(slide, "Darboğaz ve Kök Neden Analizi");
  }

  // ==================================================================
  // SLIDE 6 — DARBOĞAZ: BEKLEME TREND GRAFİĞİ
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartLine, eyebrow: "Darboğaz ve Kök Neden Analizi", title: "Önceki İstasyon Bekleme Trendi (dk/gün)" });

    slide.addChart(
      pres.charts.BAR,
      [
        { name: "Nisan–Mayıs", labels: ["ETM", "N602", "ROB108", "ROB109"], values: [373.5, 95.0, 84.9, 63.0] },
        { name: "Haziran–Temmuz", labels: ["ETM", "N602", "ROB108", "ROB109"], values: [132.5, 81.2, 34.4, 87.1] },
      ],
      {
        x: 0.7, y: 1.6, w: 11.9, h: 4.6, barDir: "col", barGapWidthPct: 40,
        chartColors: [COLORS.ice, COLORS.navy],
        chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
        catAxisLabelColor: COLORS.slate, catAxisLabelFontSize: 12,
        valAxisLabelColor: COLORS.slateLight, valAxisLabelFontSize: 10,
        valAxisTitle: "dk / gün", showValAxisTitle: true, valAxisTitleFontSize: 11, valAxisTitleColor: COLORS.slateLight,
        valGridLine: { color: COLORS.border, size: 0.5 },
        catGridLine: { style: "none" },
        showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: COLORS.slate,
        showLegend: true, legendPos: "t", legendColor: COLORS.slate, legendFontSize: 11,
        showTitle: false,
      }
    );
    slide.addText("ETM ve ROB108'de bekleme belirgin şekilde düştü; N602 ılımlı iyileşti. ROB109 istisna oluşturuyor ve ayrıca izleniyor (bkz. Genel Bakış notu).", {
      x: 0.7, y: 6.35, w: 11.9, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 11.5, italic: true, color: COLORS.slateLight,
    });
    addFooter(slide, "Darboğaz ve Kök Neden Analizi");
  }

  // ==================================================================
  // SLIDE 7 — KÖK NEDEN ÖZETİ
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.lightbulb, eyebrow: "Darboğaz ve Kök Neden Analizi", title: "Kök Neden Özeti ve Alınan Aksiyonlar" });

    const cols = [
      {
        title: "Kök Nedenler",
        items: [
          "Hücreler arası hız/hazırlık dengesizliği (Pres sonrası istasyonlarda birikme)",
          "Tekrarlayan ekipman arızaları — özellikle N603 titreşim problemi (Nisan)",
          "Flowform'da yağlama ve ejektör kaynaklı mekanik duruşlar",
        ],
      },
      {
        title: "Alınan Aksiyonlar",
        items: [
          "N602-N603 indüksiyon fırını coil yükseltme plakası revize edildi",
          "ROB108 çalışan makine sayısına göre dinamik hedef sistemi kuruldu",
          "Flowform'da 6 mekanik madde (ejektör, yağlama, kalıp yıkama) Haziran sonunda kapatıldı",
        ],
      },
    ];
    cols.forEach((col, i) => {
      const x = 0.6 + i * 6.15;
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: 1.65, w: 5.85, h: 3.55, rectRadius: 0.08,
        fill: { color: COLORS.white }, line: { type: "none" },
        shadow: { type: "outer", color: "1E2761", blur: 8, offset: 3, angle: 90, opacity: 0.1 },
      });
      slide.addText(col.title, {
        x: x + 0.35, y: 1.95, w: 5.15, h: 0.4, margin: 0,
        fontFace: FONT_HEAD, fontSize: 16, bold: true, color: COLORS.navy,
      });
      const textItems = [];
      col.items.forEach((it, idx) => {
        textItems.push({ text: it, options: { bullet: { code: "2022" }, breakLine: idx < col.items.length - 1, color: COLORS.slate } });
      });
      slide.addText(textItems, {
        x: x + 0.35, y: 2.45, w: 5.15, h: 2.6, margin: 0,
        fontFace: FONT_BODY, fontSize: 13, lineSpacing: 20, paraSpaceAfter: 12,
      });
    });

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 5.45, w: 11.4, h: 1.15, rectRadius: 0.08,
      fill: { color: COLORS.navy }, line: { type: "none" },
    });
    slide.addText([
      { text: "Sonuç:  ", options: { bold: true, color: COLORS.white } },
      { text: "Upstream bekleme, ortalama hücre bazında %46 azaldı; üretim adetleri günlük ortalamada yaklaşık 3 katına çıktı. ROB109 istisnası hariç, darboğaz baskısı hattın geneline yayılmış durumdan tekil noktalara geriledi.", options: { color: COLORS.ice } },
    ], { x: 0.95, y: 5.45, w: 10.8, h: 1.15, margin: 0, valign: "middle", fontFace: FONT_BODY, fontSize: 13, lineSpacing: 17 });

    addFooter(slide, "Darboğaz ve Kök Neden Analizi");
  }

  // ==================================================================
  // SLIDE 8 — DURUŞ ANALİZİ: GENEL BAKIŞ
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.tools, eyebrow: "Duruş Analizi", title: "Toplam Duruş Yükü — Genel Görünüm" });
    slide.addText("Sadece önceki istasyon bekleme değil; arıza, planlı duruş, setup/hazırlık, takım-kalıp değişimi, mola ve müşteri/kalite kaynaklı duruşların tamamı bu bölümde derinlemesine incelenir.", {
      x: 0.6, y: 1.5, w: 11.8, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 11.5, italic: true, color: COLORS.slateLight,
    });

    const stats = [
      { big: "9.610 dk", small: "Haziran–Temmuz toplam\narıza süresi (~160 saat, 11 hücre)" },
      { big: "-51,7%", small: "Nisan-Mayıs'a göre toplam arıza\ndakikası değişimi (19.899 → 9.610 dk)" },
      { big: "Belirsiz", small: "En sık arıza nedeni\n(1.836 dk / 78 olay)" },
      { big: "%7", small: "Arıza olaylarının 'giderildi' olarak\nişaretlenme oranı (23 / 318 olay)" },
    ];
    const cardW = 2.7, cardGap = 0.23, cardH = 2.1, cardY = 2.3;
    stats.forEach((s, i) => {
      const x = 0.6 + i * (cardW + cardGap);
      slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x, y: cardY, w: cardW, h: cardH, rectRadius: 0.08,
        fill: { color: COLORS.navy }, line: { type: "none" },
      });
      slide.addText(s.big, {
        x: x + 0.2, y: cardY + 0.25, w: cardW - 0.4, h: 0.7, margin: 0,
        fontFace: FONT_HEAD, fontSize: 22, bold: true, color: COLORS.white,
      });
      slide.addText(s.small, {
        x: x + 0.2, y: cardY + 1.0, w: cardW - 0.4, h: 1.0, margin: 0,
        fontFace: FONT_BODY, fontSize: 10.5, color: COLORS.ice, lineSpacing: 13,
      });
    });

    slide.addText("Aşağıdaki sayfalarda: duruş kategorilerinin hücrelere dağılımı, üretim hacmine göre normalize edilmiş arıza yoğunluğu, en sık nedenler (Pareto), hücre bazlı baskın neden ve tekrarlayan somut sorunlar ele alınır.", {
      x: 0.6, y: 4.75, w: 11.8, h: 0.7, margin: 0,
      fontFace: FONT_BODY, fontSize: 12, color: COLORS.slate, lineSpacing: 16,
    });
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 9 — DURUŞ ANALİZİ: KATEGORİ DAĞILIMI
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartBar, eyebrow: "Duruş Analizi", title: "Duruş Kategorileri — Zaman Nereye Gidiyor?" });

    const durusLabels = ["Pres", "ETM", "ROB108", "Flowform", "ROB104", "N602-N603", "ROB109", "Quench", "ROB110-111"];
    slide.addChart(
      pres.charts.BAR,
      [
        { name: "Arıza", labels: durusLabels, values: [1544, 917, 939, 849, 869, 1481, 707, 1080, 1224] },
        { name: "Planlı Duruş", labels: durusLabels, values: [750, 89, 729, 633, 1018, 352, 291, 0, 93] },
        { name: "Setup / Hazırlık", labels: durusLabels, values: [454, 136, 442, 973, 235, 6, 15, 0, 50] },
        { name: "Takım / Kalıp", labels: durusLabels, values: [858, 56, 495, 256, 336, 0, 631, 0, 73] },
        { name: "Önc. İst. Bekleme", labels: durusLabels, values: [0, 2012, 551, 1658, 1112, 1137, 1182, 0, 160] },
        { name: "Mola", labels: durusLabels, values: [0, 585, 1107, 640, 965, 764, 925, 0, 302] },
        { name: "Müşteri / Kalite", labels: durusLabels, values: [30, 70, 60, 220, 0, 55, 134, 480, 326] },
      ],
      {
        x: 0.5, y: 1.5, w: 12.3, h: 4.55, barDir: "col", barGrouping: "stacked", barGapWidthPct: 35,
        chartColors: [COLORS.red, COLORS.navy, COLORS.slate, COLORS.slateLight, COLORS.amber, COLORS.ice, "6B7FBF"],
        chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
        catAxisLabelColor: COLORS.slate, catAxisLabelFontSize: 10.5,
        valAxisLabelColor: COLORS.slateLight, valAxisLabelFontSize: 9.5,
        valAxisTitle: "dk (Haziran-Temmuz toplamı)", showValAxisTitle: true, valAxisTitleFontSize: 10, valAxisTitleColor: COLORS.slateLight,
        valGridLine: { color: COLORS.border, size: 0.5 },
        catGridLine: { style: "none" },
        showLegend: true, legendPos: "b", legendColor: COLORS.slate, legendFontSize: 9.5,
        showTitle: false,
      }
    );
    slide.addText("Toplam dakikadır (hücrelerin kayıtlı gün sayısı farklı olduğundan günlük ortalama değildir — yoğunluk karşılaştırması için bir sonraki sayfaya bakınız). Boya ve Fosfat'ta bu dönemde veri girişi olmadığından grafiğe dahil edilmemiştir.", {
      x: 0.5, y: 6.15, w: 12.3, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 10, italic: true, color: COLORS.slateLight,
    });
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 10 — DURUŞ ANALİZİ: ÜRETİME ORANLI YOĞUNLUK
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.chartLine, eyebrow: "Duruş Analizi", title: "Arıza Yoğunluğu — Üretime Oranlı Karşılaştırma" });
    slide.addText("Mutlak arıza dakikası, üretim hacmi arttıkça doğal olarak artabilir. Bu tablo arızayı üretilen 100 adet başına dakika olarak normalize eder; böylece hücreler arası ve dönemler arası karşılaştırma daha adil olur.", {
      x: 0.6, y: 1.5, w: 11.8, h: 0.55, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.slateLight,
    });

    const intensityRows = [
      { cell: "Pres Hücresi", nm: 234.5, ht: 82.7, tag: "good" },
      { cell: "ETM Hücresi", nm: 45.0, ht: 50.9, tag: "mild" },
      { cell: "ROB108 Hücresi", nm: 52.5, ht: 62.8, tag: "mild" },
      { cell: "Flowform Hücresi", nm: 295.7, ht: 58.1, tag: "good" },
      { cell: "ROB104 Hücresi", nm: 11.8, ht: 64.2, tag: "bad" },
      { cell: "N602-N603 Hücresi", nm: 694.5, ht: 116.6, tag: "good" },
      { cell: "ROB109 Hücresi", nm: 122.1, ht: 58.0, tag: "good" },
      { cell: "Quench Hücresi", nm: 0.0, ht: 86.3, tag: "new" },
      { cell: "ROB110-111 Hücresi", nm: 78.0, ht: 236.9, tag: "bad" },
      { cell: "Fosfat Hücresi", nm: 16.3, ht: null, tag: "nodata" },
      { cell: "Boya Hücresi", nm: 0.0, ht: null, tag: "nodata" },
    ];
    const header = ["Hücre", "Nisan–Mayıs (dk/100 adet)", "Haziran–Temmuz (dk/100 adet)", "Değişim"];
    const rows = intensityRows.map((d) => {
      let changeCell;
      if (d.tag === "nodata") changeCell = { text: "—", color: COLORS.red };
      else if (d.tag === "new") changeCell = { text: "yeni sorun", color: COLORS.red, bold: true };
      else {
        const pct = fmtPct(d.nm, d.ht);
        const color = d.tag === "bad" ? COLORS.red : d.tag === "mild" ? COLORS.amber : COLORS.green;
        changeCell = { text: pct, color, bold: true };
      }
      return [
        d.cell,
        d.nm.toFixed(1),
        d.ht === null ? { text: "veri yok", color: COLORS.red, bold: true } : d.ht.toFixed(1),
        changeCell,
      ];
    });
    styledTable(slide, header, rows, { x: 0.6, y: 2.15, w: 11.8, colW: [4.1, 2.9, 2.9, 1.9], rowH: 0.335 });

    slide.addText("ROB104 ve ROB110-111'de arıza yoğunluğu belirgin arttı — üretim artışıyla açıklanamayacak kadar büyük (+444% / +204%). Quench'te Haziran-Temmuz'da yeni bir arıza kaynağı ortaya çıktı (bkz. 29 Haziran olayı).", {
      x: 0.6, y: 6.15, w: 11.8, h: 0.5, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.amber,
    });
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 11 — DURUŞ ANALİZİ: NEDEN PARETO
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.warning, eyebrow: "Duruş Analizi", title: "En Sık Arıza Nedenleri — Tüm Hat (Haz-Tem)" });

    slide.addChart(
      pres.charts.BAR,
      [{
        name: "Arıza Süresi",
        labels: ["Mekanik", "Belirsiz", "Elektrik", "Akışkan", "Pres (Lokasyon)", "Robot", "Bor Yağı Bitti", "Ortak", "Diğer"],
        values: [2119, 1836, 1367, 1061, 894, 462, 325, 278, 1268],
      }],
      {
        x: 0.6, y: 1.55, w: 11.8, h: 4.35, barDir: "bar", barGapWidthPct: 30,
        chartColors: [COLORS.navy],
        chartArea: { fill: { color: COLORS.white }, roundedCorners: true },
        catAxisLabelColor: COLORS.slate, catAxisLabelFontSize: 11.5,
        valAxisLabelColor: COLORS.slateLight, valAxisLabelFontSize: 10,
        valAxisTitle: "dk", showValAxisTitle: true, valAxisTitleFontSize: 10.5, valAxisTitleColor: COLORS.slateLight,
        valGridLine: { color: COLORS.border, size: 0.5 },
        catGridLine: { style: "none" },
        showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 10, dataLabelColor: COLORS.slate,
        showLegend: false, showTitle: false,
      }
    );
    slide.addText("\"Belirsiz\" kategorisi 1.836 dk (%19) ile 2. sırada — kök nedeni etiketlenmemiş arızaların payı yüksek. \"Diğer\" grubu: Talaş Arabası Dolu, Pres Öncesi/Sonrası, Çıkış Konveyörü Dolu ve hiç neden kodu girilmemiş kayıtların (251 dk) toplamıdır.", {
      x: 0.6, y: 6.0, w: 11.8, h: 0.65, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.slateLight,
    });
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 12 — DURUŞ ANALİZİ: HÜCRE BAZLI BASKIN NEDEN
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.warning, eyebrow: "Duruş Analizi", title: "Hücre Bazlı Baskın Arıza Nedeni (Haz-Tem)" });

    const header = ["Hücre", "Baskın Neden", "Süre", "Olay Sayısı"];
    const rows = [
      ["Pres Hücresi", "Pres (lokasyon bazlı)", "894 dk", "33"],
      ["ETM Hücresi", "Mekanik", "490 dk", "10"],
      ["ROB108 Hücresi", "Elektrik", "270 dk", "5"],
      ["Flowform Hücresi", "Belirsiz", "529 dk", "34"],
      ["ROB104 Hücresi", "Elektrik", "283 dk", "6"],
      ["N602 Hücresi", "Akışkan (hidrolik yağ sıcaklığı)", "1.061 dk", "38"],
      ["N603 Hücresi", { text: "Titreşim — Çözüldü (bkz. Öne Çıkan Sorunlar)", color: COLORS.green, bold: true }, "6.810 → 70 dk", "—"],
      ["ROB109 Hücresi", "Belirsiz", "524 dk", "18"],
      ["Quench Hücresi", "Mekanik", "1.080 dk", "4"],
      ["ROB110-111 Hücresi", "Elektrik", "390 dk", "10"],
    ];
    styledTable(slide, header, rows, { x: 0.6, y: 1.7, w: 11.8, colW: [2.6, 5.2, 2.2, 1.8], rowH: 0.43 });

    slide.addText("N602'deki hidrolik yağ sıcaklığı sorunu N603'ün titreşim probleminin de kaynağıydı; kök nedeni ortak (bkz. Slayt — N603 Titreşim vakası).", {
      x: 0.6, y: 6.35, w: 11.8, h: 0.4, margin: 0,
      fontFace: FONT_BODY, fontSize: 10.5, italic: true, color: COLORS.slateLight,
    });
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 13 — DURUŞ ANALİZİ: TEKRARLAYAN SOMUT SORUNLAR
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.warning, eyebrow: "Duruş Analizi", title: "Aynı Açıklamayla ≥3 Kez Tekrarlanan Duruşlar" });

    const header = ["Hücre", "Açıklama", "Tekrar", "Toplam Süre"];
    const rows = [
      ["ROB104 + ROB108", "\"Fabrikada elektrik yok\" — tesis geneli kesinti", "4 + 4", "480 dk"],
      ["Pres Hücresi", "[Hidrolik Yağ Sıcaklık Alarmı]", "13", "216 dk"],
      ["N602 Hücresi", "Hidrolik yağ sıcaklığı yükselmesi (N603 titreşim kökeni)", "8", "264 dk"],
      ["ROB110-111 Hücresi", "Haberleşme hatası / problemi", "6", "236 dk"],
      ["ROB110-111 Hücresi", "Shuttle motor mili arızası", "4", "157 dk"],
      ["ROB104 + ROB108", "Cnc tezgah takım kırılması ve yatak ayarı", "3 + 3", "191 dk"],
    ];
    styledTable(slide, header, rows, { x: 0.6, y: 1.7, w: 11.8, colW: [2.6, 6.4, 1.3, 1.5], rowH: 0.5 });

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y: 5.55, w: 11.8, h: 1.15, rectRadius: 0.08,
      fill: { color: COLORS.iceTint }, line: { type: "none" },
    });
    slide.addText([
      { text: "Yeni bulgu:  ", options: { bold: true, color: COLORS.navy } },
      { text: "ROB110-111'deki tekrarlayan haberleşme hatası (6 olay, 236 dk) hiçbir aksiyon maddesinde henüz ele alınmamış. \"Fabrikada elektrik yok\" kaydı aynı gün iki ayrı hücrede girilmiş — tek bir tesis geneli kesinti, çift kayıt değil.", options: { color: COLORS.slate } },
    ], { x: 0.95, y: 5.55, w: 11.1, h: 1.15, margin: 0, valign: "middle", fontFace: FONT_BODY, fontSize: 11.5, lineSpacing: 15 });
    addFooter(slide, "Duruş Analizi");
  }

  // ==================================================================
  // SLIDE 14 — DURUŞ ANALİZİ: KAYIT TAKİP DİSİPLİNİ
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

  // SLIDE 8 — N603 Titreşim (Çözüldü)
  {
    const slide = caseSlide({
      eyebrow: "Öne Çıkan Sorunlar",
      cellTitle: "N603 Hücresi — Titreşim Problemi",
      statusType: "done",
      statusLabel: "Çözüldü",
      evidence: [
        { big: "6.810 → 70 dk", small: "Toplam arıza süresi\n(Nisan-Mayıs → Haziran-Temmuz)" },
        { big: "-99%", small: "Azalış oranı" },
      ],
      description: "16–28 Nisan arasında art arda günlerde 400–540 dk/gün arıza kaynaklı duruş yaşandı. Kök neden olarak X ekseni pozisyon kaybı, makara grubu ve sürücü/enkoder kaynaklı titreşim tespit edildi.",
      actionLabel: "Alınan Aksiyon",
      action: "İndüksiyon fırını coil yükseltme plakası ve ejektör yağ tavası ile ilgili 3 madde 29 Haziran – 1 Temmuz arasında kapatıldı. Sorun tekrarlamadı.",
    });
    addFooter(slide, "Öne Çıkan Sorunlar");
  }

  // SLIDE 9 — Quench 29 Haziran (Karar Bekliyor)
  {
    const slide = caseSlide({
      eyebrow: "Öne Çıkan Sorunlar",
      cellTitle: "Quench Hücresi — 29 Haziran Olayı",
      statusType: "decision",
      statusLabel: "Karar Bekliyor",
      evidence: [
        { big: "300 dk", small: "Duruş süresi\n(29 Haziran olayı)" },
        { big: "6 parça", small: "Hasarlı V-bükümü,\n34 parça bekletildi" },
      ],
      description: "Gece vardiyasında operatör parçayı fırın çıkışındaki dişli-zincir arasına sıkıştırdı, 20 dakika bu şekilde çalıştırdı: 6 adet V Büküm parça hasar gördü, 5 saatlik müdahale gerekti. Ayrıca 18 Haziran'da ayrı bir valf contası arızası 480 dk'lık duruşa yol açtı.",
      actionLabel: "Gerekli Karar",
      action: "Operatör prosedürü (SOP) ve eğitim gözden geçirmesi gerekiyor. Aksiyon takibinde bu hücre için sadece 1 açık madde kayıtlı — kapsam genişletilmeli.",
    });
    addFooter(slide, "Öne Çıkan Sorunlar");
  }

  // SLIDE 10 — Flowform (Çözüldü örnek kümesi)
  {
    const slide = caseSlide({
      eyebrow: "Öne Çıkan Sorunlar",
      cellTitle: "Flowform Hücresi — Mekanik İyileştirme Paketi",
      statusType: "done",
      statusLabel: "Kısmen Çözüldü",
      evidence: [
        { big: "4.025 → 849 dk", small: "Toplam arıza süresi\n(Nisan-Mayıs → Haziran-Temmuz)" },
        { big: "6 / 16", small: "Madde kapatıldı,\n10 madde hâlâ açık" },
      ],
      description: "Ejektör titreşimi, boryağı kaçağı, yağlama sensörü üzerinde pasta birikimi, AMR montür çarpışması ve HS mandrel kovan için yedek kalıp eksikliği gibi çoklu mekanik sorun kaynağı vardı.",
      actionLabel: "Alınan Aksiyon",
      action: "29 Haziran'da 6 madde birden kapatıldı (ejektör, yağlama sensörü braketi, kalıp yıkama hattı dahil). Kalan 10 açık madde ile çalışma devam ediyor.",
    });
    addFooter(slide, "Öne Çıkan Sorunlar");
  }

  // SLIDE 11 — Pres açık madde yükü (Devam ediyor)
  {
    const slide = caseSlide({
      eyebrow: "Öne Çıkan Sorunlar",
      cellTitle: "Pres Hücresi — En Yüksek Açık Madde Yükü",
      statusType: "progress",
      statusLabel: "Devam Ediyor",
      evidence: [
        { big: "29 / 32", small: "Açık aksiyon maddesi\n(tüm hücreler içinde en yüksek)" },
        { big: "1.526 dk", small: "Haziran-Temmuz arıza süresi\n(Nisan-Mayıs: 2.880 dk)" },
      ],
      description: "Pres, hattaki en yüksek açık madde yüküne sahip hücre. Üretim hacmi artmasına rağmen (33,2 → 102,1 adet/gün) mutlak arıza süresi hâlâ yüksek seyrediyor.",
      actionLabel: "Zaman Baskısı",
      action: "Pres, mevcut planla 9 Temmuz'da üretimi durduracak (bkz. Hat Kapanış Tahmini). Açık 29 maddenin bir kısmı bu tarihe yetişmeyebilir — önceliklendirme kararı gerekiyor.",
    });
    addFooter(slide, "Öne Çıkan Sorunlar");
  }

  // SLIDE 12 — Boya & Fosfat veri boşluğu (Karar bekliyor)
  {
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
  // SLIDE 14 — AKSİYON TAKİBİ: KAPANAN ÖRNEKLER
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.tasks, eyebrow: "Aksiyon Takibi", title: "Haziran–Temmuz'da Kapanan Öne Çıkan Maddeler" });

    const closed = [
      { cell: "N602-N603", title: "İndüksiyon fırını coil yükseltme plaka çapı sorunu", date: "1 Tem" },
      { cell: "Final Ölçüm", title: "Diş tazeleme masası oluşturuldu", date: "1 Tem" },
      { cell: "Final Ölçüm", title: "Final kalite konveyörü parça ilerletme sorunu", date: "1 Tem" },
      { cell: "Pres", title: "HFP dişi kalıp oringleri yedeklendi", date: "30 Haz" },
      { cell: "Pres", title: "Ejektör offset plakası dış çapı düzeltildi (164 mm)", date: "30 Haz" },
      { cell: "Pres", title: "Hadde asansörü tufal birikimi giderildi", date: "29 Haz" },
      { cell: "Flowform", title: "FF kalıp yıkama hattı eklenerek cycle time düşürüldü", date: "29 Haz" },
      { cell: "Flowform", title: "Ejektör tam strok titreşim/ses sorunu giderildi", date: "29 Haz" },
      { cell: "Flowform", title: "AMR montürlerine parça binmesi sorunu giderildi", date: "29 Haz" },
      { cell: "N602-N603", title: "Ejektör yağ tavaları eklendi", date: "29 Haz" },
    ];
    const header = ["Hücre", "Kapatılan Madde", "Tarih"];
    const rows = closed.map((c) => [c.cell, c.title, c.date]);
    styledTable(slide, header, rows, { x: 0.6, y: 1.55, w: 11.8, colW: [2.2, 8.4, 1.2], rowH: 0.42 });
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
    title: "Yatırım Talepleri",
    promptLabel: "Doldurulacak Şablon",
    promptExample: "[Ekipman / Sistem Adı]  —  Gerekçe (hangi veri/vaka destekliyor)  —  Tahmini Etki  —  Tahmini Bütçe / Süre\n\nÖrnek adaylar (bu oturumda netleşmedi): Quench hattı operatör eğitim/SOP güncellemesi, Pres açık madde yükünün azaltılması için ek kapasite, ROB109 darboğazına yönelik inceleme.",
  });
  placeholderSlide({
    eyebrow: "Talep / Karar",
    title: "Müşteriden Talep Edilecekler",
    promptLabel: "Doldurulacak Şablon",
    promptExample: "[Talep Konusu]  —  Gerekçe  —  Beklenen Katkı\n\nÖrnek aday (bu oturumda netleşmedi): Boya ve Fosfat hücrelerindeki operasyonel durumun ve veri girişi kesintisinin netleştirilmesi için müşteri/saha koordinasyonu.",
  });

  // ==================================================================
  // SLIDE 17 — SONRAKI ADIMLAR / TAKVİM
  // ==================================================================
  {
    const slide = newContentSlide();
    addHeader(slide, { icon: icons.calendar, eyebrow: "Talep / Karar", title: "Sonraki Adımlar" });

    const steps = [
      { n: "1", title: "Öne çıkan sorunlar için aksiyon planı", body: "Quench SOP/eğitim gözden geçirmesi ve Boya/Fosfat veri boşluğunun nedeni netleştirilecek." },
      { n: "2", title: "Talep listesinin kesinleştirilmesi", body: "Yatırım ve müşteri talebi maddeleri ilgili sorumlularla birlikte tamamlanacak." },
      { n: "3", title: "Pres kapanış takvimine göre önceliklendirme", body: "9 Temmuz öncesi Pres hücresindeki 29 açık maddenin önceliklendirilmesi." },
      { n: "4", title: "Üst yönetim sunumu ve karar toplantısı", body: "Netleşen talep listesiyle birlikte nihai sunumun üst yönetime iletilmesi." },
    ];
    steps.forEach((s, i) => {
      const y = 1.75 + i * 1.15;
      slide.addShape(pres.shapes.OVAL, {
        x: 0.6, y: y + 0.05, w: 0.55, h: 0.55,
        fill: { color: COLORS.navy }, line: { type: "none" },
      });
      slide.addText(s.n, {
        x: 0.6, y: y + 0.05, w: 0.55, h: 0.55, margin: 0, align: "center", valign: "middle",
        fontFace: FONT_HEAD, fontSize: 16, bold: true, color: COLORS.white,
      });
      slide.addText(s.title, {
        x: 1.35, y, w: 10.6, h: 0.4, margin: 0,
        fontFace: FONT_BODY, fontSize: 14.5, bold: true, color: COLORS.navy,
      });
      slide.addText(s.body, {
        x: 1.35, y: y + 0.4, w: 10.6, h: 0.55, margin: 0,
        fontFace: FONT_BODY, fontSize: 11.5, color: COLORS.slate, lineSpacing: 15,
      });
    });
    addFooter(slide, "Talep / Karar");
  }

  const outPath = "C:\\Users\\tvural.REPKON\\Desktop\\HF901\\Serial Production\\ManufUI\\docs\\sunumlar\\Repkon-HF901-Ust-Yonetim-Sunumu-2026-07.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log("done:", outPath, "pages:", pageNum + 1);
})();
