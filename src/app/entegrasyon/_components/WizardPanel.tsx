"use client";

import { Check, ArrowRight, X, Wand2, Zap } from "lucide-react";
import { WIZARD_STEPS } from "./constants";
import type { WizardStep, WizardState } from "./constants";
import { WizardStep1, WizardStep2, WizardStep3, WizardStep4 } from "./WizardSteps";

type Props = {
  wizard: WizardState;
  setWizard: React.Dispatch<React.SetStateAction<WizardState>>;
  wizardStep: WizardStep;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  onDeploy: () => void;
  deploying: boolean;
  loadingColumns: boolean;
  tableColumns: { column_name: string; data_type: string }[];
  sqlPreview: string;
  onCopySql: () => void;
  sqlCopied: boolean;
};

export function WizardPanel({
  wizard, setWizard, wizardStep,
  onClose, onBack, onNext, canNext,
  onDeploy, deploying,
  loadingColumns, tableColumns,
  sqlPreview, onCopySql, sqlCopied,
}: Props) {
  return (
    <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden mb-5 shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 bg-indigo-50 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-bold text-zinc-800">Otomasyon Sihirbazi</span>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1 px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
              wizardStep === s.num ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
              wizardStep > s.num ? "bg-emerald-50 text-emerald-700" : "text-zinc-400"
            }`}>
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                wizardStep > s.num ? "bg-emerald-500 text-white" :
                wizardStep === s.num ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500"
              }`}>
                {wizardStep > s.num ? <Check className="h-2.5 w-2.5" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-300 mx-0.5" />}
          </div>
        ))}
      </div>
      <div className="p-5">
        {wizardStep === 1 && <WizardStep1 wizard={wizard} setWizard={setWizard} />}
        {wizardStep === 2 && <WizardStep2 wizard={wizard} setWizard={setWizard} loadingColumns={loadingColumns} tableColumns={tableColumns} />}
        {wizardStep === 3 && <WizardStep3 wizard={wizard} setWizard={setWizard} />}
        {wizardStep === 4 && <WizardStep4 wizard={wizard} setWizard={setWizard} sqlPreview={sqlPreview} onCopySql={onCopySql} sqlCopied={sqlCopied} />}
      </div>
      <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
        <button onClick={wizardStep === 1 ? onClose : onBack}
          className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer">
          {wizardStep === 1 ? "Vazgec" : "Geri"}
        </button>
        {wizardStep < 4 ? (
          <button onClick={onNext} disabled={!canNext}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            Devam <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <button onClick={onDeploy} disabled={deploying || !wizard.automationId || !wizard.automationName}
            className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <Zap className="h-3.5 w-3.5" />
            {deploying ? "Yayinlaniyor..." : "Yayinla (Deploy)"}
          </button>
        )}
      </div>
    </div>
  );
}
