import { type DurusDetail } from "../page";
import { formatDate } from "./helpers";

export async function exportDurusExcel(sortedDetails: DurusDetail[]) {
  const ExcelJS = await import("exceljs");
  const Workbook = ExcelJS.Workbook || ExcelJS.default?.Workbook;
  if (!Workbook) throw new Error("ExcelJS has no Workbook constructor");

  const wb = new Workbook();
  wb.creator = "ManufUI";
  wb.created = new Date();

  const ws = wb.addWorksheet("Duruş Kayıtları");

  const columns = [
    { header: "Tarih", key: "tarih", width: 14 },
    { header: "Bölüm", key: "bolum", width: 22 },
    { header: "Sorumlu", key: "sorumlu", width: 20 },
    { header: "Zaman Dilimi", key: "zamanDilimi", width: 16 },
    { header: "Duruş Tipi", key: "durusTipi", width: 22 },
    { header: "Alt Tür", key: "altTur", width: 22 },
    { header: "Süre (dk)", key: "dakika", width: 12 },
    { header: "Açıklama / Operatör Notu", key: "aciklama", width: 45 },
    { header: "Arıza Durumu", key: "arizaDurumu", width: 16 },
    { header: "Çözüm Açıklaması", key: "arizaGiderilmeAciklama", width: 40 },
  ];

  ws.columns = columns;

  const headerRow = ws.getRow(1);
  headerRow.height = 32;
  columns.forEach((_, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF065F46" },
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  let rowIndex = 2;
  for (const item of sortedDetails) {
    const dataRow = ws.addRow({
      tarih: formatDate(item.tarih),
      bolum: item.bolum.replace(" Hücresi", ""),
      sorumlu: item.sorumlu,
      zamanDilimi: item.zamanDilimi,
      durusTipi: item.durusTipiLabel,
      altTur: item.altTur,
      dakika: item.dakika,
      aciklama: item.aciklama,
      arizaDurumu: item.durusTipiKey === "ariza" ? (item.arizaGiderildi ? "Giderildi" : "Açık") : "",
      arizaGiderilmeAciklama: item.durusTipiKey === "ariza" && item.arizaGiderildi ? item.arizaGiderilmeAciklama ?? "" : "",
    });

    const bgColor = rowIndex % 2 === 0 ? "FFF0FDF4" : "FFFFFFFF";
    columns.forEach((_, colIdx) => {
      const cell = dataRow.getCell(colIdx + 1);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.alignment = {
        vertical: "middle",
        horizontal: colIdx === 6 ? "right" : "left",
        wrapText: colIdx === 7 || colIdx === 9,
      };
      cell.border = {
        top: { style: "hair" },
        bottom: { style: "hair" },
        left: { style: "hair" },
        right: { style: "hair" },
      };
      if (colIdx === 6) {
        cell.numFmt = '#,##0" dk"';
      }
    });
    rowIndex++;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `durus_kayitlari_${now}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
