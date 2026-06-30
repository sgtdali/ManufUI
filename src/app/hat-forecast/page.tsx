import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadForecastActuals } from "./_actions/actions";
import ForecastClient from "./_components/ForecastClient";

const START_DATE = "2026-06-13";
const PRES_END_DATE = "2026-07-09";

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function HatForecastPage() {
  const today = getToday();
  const actuals = await loadForecastActuals(START_DATE, today);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-6">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Hat Kapanış Tahmini</h1>
              <p className="text-sm text-zinc-500">
                Pres son üretim: <span className="text-blue-400 font-medium">9 Temmuz 2026</span>
                {" · "}
                Aktüel başlangıç: <span className="text-zinc-400">{START_DATE}</span>
                {" · "}
                Bugün: <span className="text-zinc-400">{today}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <ForecastClient
          initialActuals={actuals}
          today={today}
          presEndDate={PRES_END_DATE}
          startDate={START_DATE}
        />
      </div>
    </div>
  );
}
