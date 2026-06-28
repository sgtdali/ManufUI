import {
  ProductionRow,
  DURUS_KOLONLARI,
  ETM_ARIZA_TURLER,
  ROB_ARIZA_TURLER,
  N_ARIZA_TURLER,
} from "@/lib/types";

export type VisibleColumn = {
  key: keyof ProductionRow;
  label: string;
  altTurKey?: keyof ProductionRow;
  altTurler?: { code: string }[];
};

export function getVisibleColumns(bolum: string): VisibleColumn[] {
  return DURUS_KOLONLARI.filter((column) => {
    if (bolum === "Pres Hücresi") {
      return column.key !== "takim_degisimi";
    } else if (bolum === "Quench Hücresi") {
      return column.key !== "kalip_demontaj" && column.key !== "kalip_montaj" && column.key !== "setup_ve_ayar";
    } else {
      return column.key !== "kalip_demontaj" && column.key !== "kalip_montaj";
    }
  }).map((column) => {
    if ((bolum === "Pres Hücresi" || bolum === "ETM Hücresi") && column.key === "setup_ve_ayar") {
      return { ...column, label: "Hazırlık" };
    }
    if (bolum === "ETM Hücresi" && column.key === "takim_degisimi") {
      return {
        ...column,
        label: "Holder - Insert Değişim",
        altTurKey: "takim_degisim_turu" as keyof ProductionRow,
        altTurler: [
          { code: "Holder Değişim" },
          { code: "Holder Ayar" },
          { code: "Insert Değişim" },
          { code: "Punta Değişim" },
        ],
      };
    }
    if (bolum === "Flowform Hücresi" && column.key === "takim_degisimi") {
      return {
        ...column,
        altTurKey: "takim_degisim_turu" as keyof ProductionRow,
        altTurler: [
          { code: "Tırnaklı Değişimi" },
          { code: "Mandrel Değişimi" },
        ],
      };
    }
    if (bolum === "Quench Hücresi" && column.key === "takim_degisimi") {
      return { ...column, label: "Rejim Bekleme" };
    }
    return column;
  });
}

export function getAltOptions(
  bolum: string,
  column: VisibleColumn
): { code: string }[] {
  let options = column.altTurler || [];

  if (bolum === "Pres Hücresi") {
    if (column.key === "ariza") {
      options = [{ code: "Pres Öncesi" }, { code: "Pres" }, { code: "Pres Sonrası" }];
    } else if (column.key === "setup_ve_ayar") {
      options = [
        { code: "Kalıp Isıtma" },
        { code: "Fırın Isıtma Bekleme" },
        { code: "IHU Rejim Bekleme" },
        { code: "Kalıp Soğuma Bekleme" },
        { code: "Offset Alma" },
        { code: "Kaçak Kontrolü" },
      ];
    }
  } else if (bolum === "ETM Hücresi") {
    if (column.key === "ariza") {
      options = ETM_ARIZA_TURLER;
    } else if (column.key === "setup_ve_ayar") {
      options = [
        { code: "Parça Ölçüm" },
        { code: "Otomatik Mod Hazırlık" },
      ];
    } else if (column.key === "planli_durus") {
      options = [
        { code: "Planlı Bakım" },
        { code: "Parça Basmama Kararı" },
        { code: "Kasa Alma - Bırakma" },
      ];
    }
  } else if (["ROB104 Hücresi", "ROB108 Hücresi", "ROB109 Hücresi"].includes(bolum)) {
    if (column.key === "ariza") {
      options = ROB_ARIZA_TURLER;
    }
  } else if (["N602 Hücresi", "N603 Hücresi"].includes(bolum)) {
    if (column.key === "ariza") {
      options = N_ARIZA_TURLER;
    }
  }

  const hasKasaAlmaOption = [
    "ETM Hücresi",
    "ROB104 Hücresi",
    "ROB105 Hücresi",
    "ROB108 Hücresi",
    "Flowform Hücresi",
    "N602 Hücresi",
    "N603 Hücresi",
  ].includes(bolum);
  if (column.key === "planli_durus" && hasKasaAlmaOption) {
    options = [
      { code: "Planlı Bakım" },
      { code: "Parça Basmama Kararı" },
      { code: "Kasa Alma - Bırakma" },
    ];
  }

  return options;
}
