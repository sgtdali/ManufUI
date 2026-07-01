import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

export type CellAverageLine = {
  name: string;
  saatlikOrt: number;
  gunlukProj: number;
};

export type CellInterventionLine = {
  name: string;
  plan: string;
};

export type CellClosureLine = {
  name: string;
  kapanisTarihi: string | null;
  sonGunUretim: number | null;
  devredenWip: number | null;
  wipLabel: string;
};

export type CellToplamLine = {
  name: string;
  toplam: number;
};

export type RaporPayload = {
  today: string;
  startDate: string;
  selectedSlotsCount: number;
  presEndDateFormatted: string;
  nonPresFinishRange: string;
  averages: CellAverageLine[];
  interventionsList: CellInterventionLine[];
  closureRows: CellClosureLine[];
  toplamRows: CellToplamLine[];
  footerNote: string | null;
};

// ── Colours ──────────────────────────────────────────────────────────────────
const DARK = "1F2937";
const BLACK = "111111";
const GREY = "555555";
const WHITE = "FFFFFF";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("tr-TR");
}

function fmtFloat(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function makeBorders() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: "auto" } as const;
  return { top: b, bottom: b, left: b, right: b, insideH: b, insideV: b };
}

function cellPadding() {
  return { top: 80, bottom: 80, left: 100, right: 100 };
}

function headerCell(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { fill: DARK, type: ShadingType.CLEAR, color: DARK },
    margins: cellPadding(),
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: WHITE, size: 18 })],
      }),
    ],
  });
}

function headerCellLeft(text: string, width: number): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { fill: DARK, type: ShadingType.CLEAR, color: DARK },
    margins: cellPadding(),
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, color: WHITE, size: 18 })],
      }),
    ],
  });
}

function dataCell(text: string, width: number, align: "center" | "left" = "center", bold = false): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    margins: cellPadding(),
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, bold, color: BLACK, size: 18 })],
      }),
    ],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 100 }, children: [new TextRun(text)] });
}

// ── Section 2: Averages Table ─────────────────────────────────────────────────
function buildAveragesTable(averages: CellAverageLine[]): Table {
  return new Table({
    width: { size: 8100, type: WidthType.DXA },
    borders: makeBorders(),
    rows: [
      new TableRow({
        children: [
          headerCell("İstasyon", 2400),
          headerCell("Saatlik Ortalama", 2850),
          headerCell("Günlük Projeksiyon", 2850),
        ],
      }),
      ...averages.map(
        (row) =>
          new TableRow({
            children: [
              dataCell(row.name, 2400, "center", true),
              dataCell(`${fmtFloat(row.saatlikOrt)} /sa`, 2850),
              dataCell(fmtNum(row.gunlukProj), 2850),
            ],
          })
      ),
    ],
  });
}

// ── Section 3: Interventions Table ───────────────────────────────────────────
function buildInterventionsTable(list: CellInterventionLine[]): Table {
  return new Table({
    width: { size: 8100, type: WidthType.DXA },
    borders: makeBorders(),
    rows: [
      new TableRow({
        children: [
          headerCell("İstasyon", 1600),
          headerCellLeft("Ek Mesai Planı", 6500),
        ],
      }),
      ...list.map(
        (row) =>
          new TableRow({
            children: [
              dataCell(row.name, 1600, "center", true),
              dataCell(row.plan, 6500, "left"),
            ],
          })
      ),
    ],
  });
}

// ── Section 4: Closure Table ─────────────────────────────────────────────────
function buildClosureTable(rows: CellClosureLine[]): Table {
  return new Table({
    width: { size: 8100, type: WidthType.DXA },
    borders: makeBorders(),
    rows: [
      new TableRow({
        children: [
          headerCell("İstasyon", 1500),
          headerCell("Kapanış Tarihi", 1600),
          headerCell("Son Gün Üretimi", 2300),
          headerCell("Kapanışta Devredilen WIP", 2700),
        ],
      }),
      ...rows.map((row) => {
        const kapanis = row.kapanisTarihi
          ? new Date(`${row.kapanisTarihi}T00:00:00`).toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
          : "—";
        const sonGun = row.sonGunUretim !== null ? fmtNum(row.sonGunUretim) : "—";
        const wip =
          row.devredenWip !== null
            ? `${fmtNum(row.devredenWip)} (${row.wipLabel})`
            : "—";

        return new TableRow({
          children: [
            dataCell(row.name, 1500, "center", true),
            dataCell(kapanis, 1600),
            dataCell(sonGun, 2300),
            dataCell(wip, 2700, "left"),
          ],
        });
      }),
    ],
  });
}

// ── Section 5: Totals Table ──────────────────────────────────────────────────
function buildToplamTable(rows: CellToplamLine[]): Table {
  return new Table({
    width: { size: 8100, type: WidthType.DXA },
    borders: makeBorders(),
    rows: [
      new TableRow({
        children: [
          headerCell("İstasyon", 3000),
          headerCell("Kapanışa Kadar Toplam Üretim", 5100),
        ],
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              dataCell(row.name, 3000, "center", true),
              dataCell(fmtNum(row.toplam), 5100),
            ],
          })
      ),
    ],
  });
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(request: Request) {
  let payload: RaporPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response("Geçersiz istek", { status: 400 });
  }

  const {
    today,
    startDate,
    selectedSlotsCount,
    presEndDateFormatted,
    nonPresFinishRange,
    averages,
    interventionsList,
    closureRows,
    toplamRows,
    footerNote,
  } = payload;

  const raporTarihi = new Date(`${today}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const aktuelBaslangic = new Date(`${startDate}T00:00:00`).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const ozetText = `Mevcut üretim hızları ve planlanan mesai müdahaleleri esas alınarak yapılan projeksiyona göre Pres hücresi ${presEndDateFormatted}'da son üretimini yapacak. Diğer hücreler, üretim hattındaki mevcut yarı mamul (WIP) stoklarını eritene kadar kademeli olarak ${nonPresFinishRange} arasında kapanacak.`;

  const children: (Paragraph | Table)[] = [
    // Title
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: "Hat Kapanış / Üretim Projeksiyon Raporu", bold: true, color: DARK, size: 32 })],
    }),
    // Subtitle
    new Paragraph({
      spacing: { after: 220 },
      children: [
        new TextRun({
          text: `Rapor tarihi: ${raporTarihi}  ·  Aktüel başlangıç: ${aktuelBaslangic}  ·  Kalibrasyon: ${selectedSlotsCount} saat seçili üretim verisi`,
          color: GREY,
          size: 18,
        }),
      ],
    }),

    // Section 1
    heading2("1. Özet"),
    new Paragraph({
      spacing: { after: 220 },
      children: [new TextRun({ text: ozetText, size: 20 })],
    }),

    // Section 2
    heading2("2. Ortalama Üretim Hızları"),
    buildAveragesTable(averages),
    new Paragraph({ spacing: { after: 220 }, children: [] }),

    // Section 3
    heading2("3. Yapılan Müdahaleler (Ek Mesai)"),
    buildInterventionsTable(interventionsList),
    new Paragraph({ spacing: { after: 220 }, children: [] }),

    // Section 4
    heading2("4. Hücre Kapanış Tarihleri ve Devredilecek Stok"),
    buildClosureTable(closureRows),
  ];

  if (closureRows.length > 0) {
    children.push(
      new Paragraph({
        spacing: { after: 220 },
        children: [
          new TextRun({
            text: "Not: Bir hücre kapandığında, o ana kadar ürettiği ve henüz işlenmemiş parçalar bir sonraki istasyonun girişinde WIP (yarı mamul) olarak birikir ve o istasyon tarafından tüketilmeye devam edilir.",
            size: 18,
            color: GREY,
          }),
        ],
      })
    );
  }

  // Section 5
  children.push(heading2("5. Kapanışa Kadar Toplam Üretim"));
  children.push(buildToplamTable(toplamRows));

  if (footerNote) {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: footerNote,
            size: 18,
            color: GREY,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, color: DARK, size: 22 },
          paragraph: { spacing: { before: 240, after: 100 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 900, right: 900 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `Hat_Kapanis_Raporu_${today}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
