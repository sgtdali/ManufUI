import { toast } from "sonner";

export async function shareReport(
  startDate: string,
  endDate: string,
  setSharing: (v: boolean) => void
) {
  const node = document.getElementById("performance-table-container");
  if (!node) {
    toast.error("Paylaşılacak tablo bulunamadı.");
    return;
  }

  setSharing(true);
  toast.info("Görüntü hazırlanıyor...");

  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "-9999px";
  wrapper.style.width = "1000px";
  wrapper.style.backgroundColor = "#fafafa";

  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = "1000px";
  clone.style.margin = "0";
  clone.style.padding = "24px";
  clone.style.borderRadius = "0px";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const { toBlob } = await import("html-to-image");

    const blob = await toBlob(clone, {
      backgroundColor: "#fafafa",
      pixelRatio: 2.5,
    });

    if (!blob) {
      throw new Error("Görüntü oluşturulamadı.");
    }

    const file = new File([blob], `HF901_Performans_Raporu_${startDate}_${endDate}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      toast.success("Paylaşım ekranı açıldı.");
    } else {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        toast.success("Görüntü panoya kopyalandı! WhatsApp'ta doğrudan yapıştırabilirsiniz (Ctrl+V).");
      } catch (clipErr) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `HF901_Performans_Raporu_${startDate}_${endDate}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Görüntü indirildi, WhatsApp'tan gönderebilirsiniz.");
      }
    }
  } catch (err: any) {
    console.error(err);
    toast.error(`Paylaşım başarısız oldu: ${err.message || err}`);
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
    setSharing(false);
  }
}
