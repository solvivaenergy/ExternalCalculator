import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import type { DeviceEntry, CalcResult } from "../calculator";

// ─── Wizard Form Data ───

export interface FormData {
  // Step 1
  location: string;
  // Step 2
  electricityBill: string;
  homeOwnership: string; // "Yes" | "No"
  propertyType: string;
  installTimeline: string;
  // Step 3
  devices: DeviceEntry[];
  // Step 4
  fullName: string;
  email: string;
  mobile: string;
}

const DEFAULT_FORM: FormData = {
  location: "",
  electricityBill: "",
  homeOwnership: "",
  propertyType: "",
  installTimeline: "",
  devices: [],
  fullName: "",
  email: "",
  mobile: "",
};

export type DisqualifyReason = "area" | "bill" | "condo" | "renter" | null;

interface WizardContextType {
  step: number;
  setStep: (s: number) => void;
  formData: FormData;
  updateForm: (patch: Partial<FormData>) => void;
  result: CalcResult | null;
  setResult: (r: CalcResult | null) => void;
  disqualifyReason: DisqualifyReason;
  setDisqualifyReason: (r: DisqualifyReason) => void;
  selectedTierIndex: number;
  setSelectedTierIndex: (i: number) => void;
  purchaseMode: "rto" | "direct";
  setPurchaseMode: (m: "rto" | "direct") => void;
}

const WizardContext = createContext<WizardContextType | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [disqualifyReason, setDisqualifyReason] =
    useState<DisqualifyReason>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(1);
  const [purchaseMode, setPurchaseMode] = useState<"rto" | "direct">("rto");

  const updateForm = useCallback(
    (patch: Partial<FormData>) =>
      setFormData((prev) => ({ ...prev, ...patch })),
    [],
  );

  return (
    <WizardContext.Provider
      value={{
        step,
        setStep,
        formData,
        updateForm,
        result,
        setResult,
        disqualifyReason,
        setDisqualifyReason,
        selectedTierIndex,
        setSelectedTierIndex,
        purchaseMode,
        setPurchaseMode,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be inside WizardProvider");
  return ctx;
}
