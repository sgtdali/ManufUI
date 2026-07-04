const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const {
  CELLS, DEFAULT_PERIODS, fetchRawSlots, computeOverviewData, computeOeeMtbfMttrData,
  DOWNTIME_FIELDS, DOWNTIME_FIELD_LABELS, DOWNTIME_FIELD_DETAIL_KEYS, CELL_OEE_RULES, fetchCellDetailSlots,
} = require("./dataService");

const PORT = 4590;
const DATA_DIR = path.join(__dirname, "data");
const SELECTION_PATH = path.join(DATA_DIR, "selection.json");
const OVERVIEW_PATH = path.join(DATA_DIR, "overview-data.json");
const OEE_MTBF_MTTR_PATH = path.join(DATA_DIR, "oee-mtbf-mttr-data.json");
const OEE_SLOT_EXCLUSIONS_PATH = path.join(DATA_DIR, "oee-slot-exclusions.json");
const OEE_DATE_RANGE_PATH = path.join(DATA_DIR, "oee-date-range.json");
const OEE_TARGET_OVERRIDES_PATH = path.join(DATA_DIR, "oee-target-overrides.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const BUILD_DIR = path.join(__dirname, "..");

const MIME = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSelection() {
  ensureDataDir();
  if (!fs.existsSync(SELECTION_PATH)) {
    return { periods: DEFAULT_PERIODS, exclusionsNm: [], exclusionsHt: [] };
  }
  return JSON.parse(fs.readFileSync(SELECTION_PATH, "utf8"));
}

function saveSelection(sel) {
  ensureDataDir();
  fs.writeFileSync(SELECTION_PATH, JSON.stringify(sel, null, 2), "utf8");
}

function loadPlannedTimeExclusions() {
  ensureDataDir();
  if (!fs.existsSync(OEE_SLOT_EXCLUSIONS_PATH)) return [];
  return JSON.parse(fs.readFileSync(OEE_SLOT_EXCLUSIONS_PATH, "utf8"));
}

function savePlannedTimeExclusions(list) {
  ensureDataDir();
  fs.writeFileSync(OEE_SLOT_EXCLUSIONS_PATH, JSON.stringify(list, null, 2), "utf8");
}

// nm+ht dönemlerinin birleşik (en erken başlangıç → en geç bitiş) tarih aralığı —
// "OEE — Planlı Süre" bölümünün varsayılan (kısıtlamasız) tarih filtresi.
function defaultCombinedRange(sel) {
  const periods = sel.periods && sel.periods.nm ? sel.periods : DEFAULT_PERIODS;
  return {
    start: periods.nm.start < periods.ht.start ? periods.nm.start : periods.ht.start,
    end: periods.nm.end > periods.ht.end ? periods.nm.end : periods.ht.end,
  };
}

function loadOeeDateRange() {
  ensureDataDir();
  if (!fs.existsSync(OEE_DATE_RANGE_PATH)) return defaultCombinedRange(loadSelection());
  return JSON.parse(fs.readFileSync(OEE_DATE_RANGE_PATH, "utf8"));
}

function saveOeeDateRange(range) {
  ensureDataDir();
  fs.writeFileSync(OEE_DATE_RANGE_PATH, JSON.stringify(range, null, 2), "utf8");
}

function loadTargetOverrides() {
  ensureDataDir();
  if (!fs.existsSync(OEE_TARGET_OVERRIDES_PATH)) return {};
  return JSON.parse(fs.readFileSync(OEE_TARGET_OVERRIDES_PATH, "utf8"));
}

function saveTargetOverrides(overrides) {
  ensureDataDir();
  fs.writeFileSync(OEE_TARGET_OVERRIDES_PATH, JSON.stringify(overrides || {}, null, 2), "utf8");
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

function serveStatic(req, res) {
  const reqPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(PUBLIC_DIR, reqPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = "";
    req.on("data", (c) => (chunks += c));
    req.on("end", () => {
      try {
        resolve(chunks ? JSON.parse(chunks) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === "GET" && url.pathname === "/api/cells") {
      return sendJson(res, 200, { cells: CELLS, periods: DEFAULT_PERIODS });
    }

    if (req.method === "GET" && url.pathname === "/api/raw") {
      const period = url.searchParams.get("period"); // "nm" | "ht"
      const sel = loadSelection();
      const range = sel.periods[period];
      if (!range) return sendJson(res, 400, { error: "Geçersiz dönem" });
      const raw = await fetchRawSlots(range.start, range.end);
      return sendJson(res, 200, { raw, range });
    }

    if (req.method === "GET" && url.pathname === "/api/selection") {
      return sendJson(res, 200, loadSelection());
    }

    if (req.method === "POST" && url.pathname === "/api/selection") {
      const body = await readBody(req);
      saveSelection(body);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/oee-cell-meta") {
      return sendJson(res, 200, {
        cells: CELLS,
        downtimeFields: DOWNTIME_FIELDS.map((key) => ({
          key, label: DOWNTIME_FIELD_LABELS[key], ...DOWNTIME_FIELD_DETAIL_KEYS[key],
        })),
        cellOeeRules: CELL_OEE_RULES,
      });
    }

    if (req.method === "GET" && url.pathname === "/api/cell-detail") {
      const cell = url.searchParams.get("cell");
      if (!CELLS.includes(cell)) return sendJson(res, 400, { error: "Geçersiz hücre" });
      const savedRange = loadOeeDateRange();
      const start = url.searchParams.get("start") || savedRange.start;
      const end = url.searchParams.get("end") || savedRange.end;
      if (!start || !end || start > end) return sendJson(res, 400, { error: "Gecersiz tarih araligi" });
      const byDate = await fetchCellDetailSlots(cell, start, end);
      return sendJson(res, 200, { byDate, range: { start, end } });
    }

    if (req.method === "GET" && url.pathname === "/api/oee-slot-exclusions") {
      return sendJson(res, 200, { exclusions: loadPlannedTimeExclusions() });
    }

    if (req.method === "POST" && url.pathname === "/api/oee-slot-exclusions") {
      const body = await readBody(req);
      savePlannedTimeExclusions(body.exclusions || []);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/oee-date-range") {
      return sendJson(res, 200, loadOeeDateRange());
    }

    if (req.method === "POST" && url.pathname === "/api/oee-date-range") {
      const body = await readBody(req);
      if (!body.start || !body.end) return sendJson(res, 400, { error: "start ve end gerekli" });
      saveOeeDateRange({ start: body.start, end: body.end });
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/oee-target-overrides") {
      return sendJson(res, 200, { overrides: loadTargetOverrides() });
    }

    if (req.method === "POST" && url.pathname === "/api/oee-target-overrides") {
      const body = await readBody(req);
      saveTargetOverrides(body.overrides || {});
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && url.pathname === "/api/generate") {
      const sel = loadSelection();
      const plannedTimeExclusions = loadPlannedTimeExclusions();
      const oeeDateRange = loadOeeDateRange();
      const targetOverrides = loadTargetOverrides();
      const overviewData = await computeOverviewData({
        periods: sel.periods,
        exclusionsNm: sel.exclusionsNm || [],
        exclusionsHt: sel.exclusionsHt || [],
      });
      const oeeMtbfMttrData = await computeOeeMtbfMttrData({
        periods: sel.periods,
        exclusionsNm: sel.exclusionsNm || [],
        exclusionsHt: sel.exclusionsHt || [],
        plannedTimeExclusions,
        dateRange: oeeDateRange,
        targetOverrides,
      });
      ensureDataDir();
      fs.writeFileSync(OVERVIEW_PATH, JSON.stringify(overviewData, null, 2), "utf8");
      fs.writeFileSync(OEE_MTBF_MTTR_PATH, JSON.stringify(oeeMtbfMttrData, null, 2), "utf8");

      const child = spawn(process.execPath, ["build.js"], { cwd: BUILD_DIR });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("close", (code) => {
        if (code === 0) {
          sendJson(res, 200, { ok: true, log: out, overviewData, oeeMtbfMttrData });
        } else {
          sendJson(res, 500, { ok: false, log: out, error: err });
        }
      });
      return;
    }

    return serveStatic(req, res);
  } catch (e) {
    return sendJson(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`Sunum yapılandırma arayüzü: http://localhost:${PORT}`);
});
