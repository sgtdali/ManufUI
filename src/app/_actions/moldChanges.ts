"use server";

import { createClient } from "@/lib/supabase/server";

export async function loadPressMoldChanges() {
  const supabase = await createClient();

  const { data: changes, error: changesError } = await supabase
    .from("manuf_press_mold_changes")
    .select("*")
    .order("tarih", { ascending: true })
    .order("sira_no", { ascending: true });

  if (changesError) {
    return { success: false, error: changesError.message, data: [] };
  }

  const { data: pressProd, error: prodError } = await supabase
    .from("manuf_production_records")
    .select("tarih, manuf_production_rows(sira_no, uretim_adeti)")
    .eq("bolum", "Pres Hücresi");

  if (prodError) {
    return { success: false, error: prodError.message, data: [] };
  }

  const flatProd: { tarih: string; sira_no: number; uretim: number }[] = [];
  pressProd?.forEach((record) => {
    const rows = (record.manuf_production_rows as any[]) || [];
    rows.forEach((row) => {
      flatProd.push({
        tarih: record.tarih,
        sira_no: row.sira_no,
        uretim: row.uretim_adeti || 0,
      });
    });
  });

  flatProd.sort((a, b) => {
    if (a.tarih !== b.tarih) return a.tarih.localeCompare(b.tarih);
    return a.sira_no - b.sira_no;
  });

  const isAfterOrEqual = (pTarih: string, pSira: number, cTarih: string, cSira: number) => {
    if (pTarih !== cTarih) return pTarih.localeCompare(cTarih) > 0;
    return pSira >= cSira;
  };

  const result = changes.map((c: any, index: number) => {
    const nextChange = changes.slice(index + 1).find((nc: any) => nc.takilan_kalip === c.takilan_kalip);

    let piecesBetween = 0;
    let piecesAfter = 0;

    flatProd.forEach((p) => {
      const isAfterThisChange = isAfterOrEqual(p.tarih, p.sira_no, c.tarih, c.sira_no);
      if (isAfterThisChange) {
        piecesAfter += p.uretim;

        const isBeforeNextChange = !nextChange || !isAfterOrEqual(p.tarih, p.sira_no, nextChange.tarih, nextChange.sira_no);
        if (isBeforeNextChange) {
          piecesBetween += p.uretim;
        }
      }
    });

    return {
      ...c,
      piecesBetween,
      piecesAfter,
    };
  });

  result.sort((a: any, b: any) => {
    if (a.tarih !== b.tarih) return b.tarih.localeCompare(a.tarih);
    return b.sira_no - a.sira_no;
  });

  return { success: true, data: result };
}

export async function saveManualMoldChange(
  tarih: string,
  zaman_dilimi: string,
  sira_no: number,
  sokulen_kalip: string | null,
  takilan_kalip: string | null,
  description: string | null
) {
  if (!tarih || !zaman_dilimi || !sira_no) {
    return { success: false, error: "Tarih ve Zaman Dilimi zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_press_mold_changes")
    .upsert(
      {
        tarih,
        zaman_dilimi,
        sira_no,
        sokulen_kalip: sokulen_kalip || null,
        takilan_kalip: takilan_kalip || null,
        description: description || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tarih,sira_no" }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteMoldChange(id: string) {
  if (!id) {
    return { success: false, error: "ID zorunludur." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("manuf_press_mold_changes")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
