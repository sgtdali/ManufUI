import ExcelJS from "exceljs";

type RawRow = Record<string, unknown>;
type RawRecord = {
  bolum: string;
  sorumlu: string;
  tarih: string;
  manuf_production_rows: RawRow[];
};

const KOLONLAR = [
  { header: "Tarih", key: "tarih", width: 14 },
  { header: "Bölüm", key: "bolum", width: 22 },
  { header: "Sorumlu", key: "sorumlu", width: 20 },
  { header: "Zaman Dilimi", key: "zaman_dilimi", width: 16 },
  { header: "Üretim Adeti", key: "uretim_adeti", width: 14 },
  { header: "Müşteri Var", key: "musteri_var", width: 14 },
  { header: "Mola (dk)", key: "mola", width: 10 },
  { header: "Mola Türü", key: "mola_turu", width: 12 },
  { header: "Arıza (dk)", key: "ariza", width: 10 },
  { header: "Arıza Türü", key: "ariza_turu", width: 12 },
  { header: "Arıza Açıklaması", key: "ariza_aciklama", width: 30 },
  { header: "Arıza Giderildi", key: "ariza_giderildi", width: 16 },
  { header: "Arıza Giderilme Açıklaması", key: "ariza_giderilme_aciklama", width: 36 },
  { header: "Arıza Giderildi Zamanı", key: "ariza_giderildi_at", width: 22 },
  { header: "Planlı Duruş (dk)", key: "planli_durus", width: 18 },
  { header: "Planlı Duruş Türü", key: "planli_durus_turu", width: 18 },
  { header: "Planlı Duruş Açıklaması", key: "planli_durus_aciklama", width: 30 },
  { header: "Setup ve Ayar (dk)", key: "setup_ve_ayar", width: 18 },
  { header: "Setup Türü", key: "setup_turu", width: 12 },
  { header: "Setup Açıklaması", key: "setup_aciklama", width: 30 },
  { header: "Takım Değişimi (dk)", key: "takim_degisimi", width: 18 },
  { header: "Önceki İstasyon Bekleme (dk)", key: "onceki_istasyon_bekleme", width: 28 },
  { header: "Müşteri Kaynaklı Duruş (dk)", key: "musteri_kaynakli_durus", width: 28 },
  { header: "Müşteri Duruş Türü", key: "musteri_durus_turu", width: 20 },
  { header: "Kalite Kaynaklı Duruş (dk)", key: "kalite_kaynakli_durus", width: 26 },
  { header: "Hedef Üretim Adeti", key: "hedef_uretim_adeti", width: 18 },
];

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function exportToExcel(records: RawRecord[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ManufUI";
  wb.created = new Date();

  const ws = wb.addWorksheet("Üretim Verileri");

  ws.columns = KOLONLAR;

  // Başlık stili
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });
  headerRow.height = 32;

  // Veri satırları
  const ZAMAN_SIRASI = [
    "07:45 - 08:45", "08:45 - 09:45", "09:45 - 10:45",
    "10:45 - 12:00", "12:00 - 13:00", "13:00 - 14:00",
    "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:15",
  ];

  let rowIndex = 2;
  for (const record of records) {
    const rowsByZaman = Object.fromEntries(
      (record.manuf_production_rows ?? []).map((r) => [r.zaman_dilimi as string, r])
    );

    for (const zaman of ZAMAN_SIRASI) {
      const r = rowsByZaman[zaman] ?? {};
      const hasAriza = typeof r.ariza === "number" && r.ariza > 0;
      const dataRow = ws.addRow({
        tarih: record.tarih,
        bolum: record.bolum,
        sorumlu: record.sorumlu ?? "",
        zaman_dilimi: zaman,
        hedef_uretim_adeti: r.hedef_uretim_adeti ?? "",
        uretim_adeti: r.uretim_adeti ?? "",
        musteri_var: r.musteri_var === true ? "Evet" : "Hayır",
        mola: r.mola ?? "",
        mola_turu: r.mola_turu ?? "",
        ariza: r.ariza ?? "",
        ariza_turu: r.ariza_turu ?? "",
        ariza_aciklama: r.ariza_aciklama ?? "",
        ariza_giderildi: hasAriza ? (r.ariza_giderildi === true ? "Evet" : "Hayır") : "",
        ariza_giderilme_aciklama: hasAriza ? r.ariza_giderilme_aciklama ?? "" : "",
        ariza_giderildi_at: hasAriza ? formatDateTime(r.ariza_giderildi_at) : "",
        planli_durus: r.planli_durus ?? "",
        planli_durus_turu: r.planli_durus_turu ?? "",
        planli_durus_aciklama: r.planli_durus_aciklama ?? "",
        setup_ve_ayar: r.setup_ve_ayar ?? "",
        setup_turu: r.setup_turu ?? "",
        setup_aciklama: r.setup_aciklama ?? "",
        takim_degisimi: r.takim_degisimi ?? "",
        onceki_istasyon_bekleme: r.onceki_istasyon_bekleme ?? "",
        musteri_kaynakli_durus: r.musteri_kaynakli_durus ?? "",
        musteri_durus_turu: r.musteri_durus_turu ?? "",
        kalite_kaynakli_durus: r.kalite_kaynakli_durus ?? "",
      });

      const bgColor = rowIndex % 2 === 0 ? "FFF0F4FF" : "FFFFFFFF";
      dataRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.alignment = { vertical: "middle", wrapText: false };
        cell.border = {
          top: { style: "hair" }, bottom: { style: "hair" },
          left: { style: "hair" }, right: { style: "hair" },
        };
      });
      rowIndex++;
    }
  }

  // İndir
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const now = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `uretim_verileri_${now}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
