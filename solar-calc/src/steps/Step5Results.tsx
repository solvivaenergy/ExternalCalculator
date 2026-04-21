import type { ReactNode } from "react";
import { useWizard } from "../context/WizardContext";
import type { SystemTier } from "../calculator";
import Layout from "../components/Layout";
import { Button } from "../components/ui";

/* ── Inline SVG icons ── */
function ZapIcon() {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#50890A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="w-6 h-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#50890A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#006AC6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="w-6 h-6 text-neutral-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* ── Usage summary card ── */
function SummaryCard({
  icon,
  value,
  label,
  description,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  description?: string;
}) {
  return (
    <div className="bg-white border border-neutral-300 rounded p-4 shadow-xs flex flex-col gap-1">
      <div className="mb-1">{icon}</div>
      <p className="text-lg font-semibold text-brand-dark-green-2 leading-7">
        {value}
      </p>
      <p className="text-xs font-medium text-neutral-600 leading-[18px]">
        {label}
      </p>
      {description && (
        <p className="text-xs font-medium text-neutral-600 leading-[18px]">
          {description}
        </p>
      )}
    </div>
  );
}

/* ── Tier card ── */
function TierCard({
  tier,
  purchaseMode,
  recommended,
  onViewDetails,
}: {
  tier: SystemTier;
  purchaseMode: "rto" | "direct";
  recommended?: boolean;
  onViewDetails: () => void;
}) {
  return (
    <div>
      {recommended && (
        <div className="bg-brand-blue rounded-t px-2 py-1 flex items-center justify-center">
          <span className="text-xs font-semibold text-brand-lime leading-[18px]">
            Recommended
          </span>
        </div>
      )}
      <div
        className={`bg-white ${
          recommended
            ? "border-2 border-brand-blue rounded-b"
            : "border border-neutral-300 rounded"
        } p-4 shadow-xs flex flex-col gap-6`}
      >
        {/* Header */}
        <div>
          <p className="text-lg font-semibold text-neutral-800 leading-7">
            {tier.kwpSystem} kWp System
          </p>
          <p className="text-xs font-medium text-neutral-600 leading-[18px]">
            {tier.label}
          </p>
        </div>

        {/* Pricing */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-base font-medium text-neutral-800 leading-6">
              ₱
              {(purchaseMode === "rto"
                ? tier.priceRTO
                : tier.priceDP
              ).toLocaleString()}
            </p>
            <p className="text-xs font-medium text-neutral-600 leading-[18px]">
              Price
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <div>
              <p className="text-base font-medium text-neutral-800 leading-6">
                ₱{tier.monthlySavings.toLocaleString()}/month
              </p>
              <p className="text-xs font-medium text-neutral-600 leading-[18px]">
                Est. monthly savings
              </p>
            </div>
            <span className="inline-flex self-start bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full leading-[18px]">
              -{Math.round(tier.savingsPct * 100)}% of your average electricity
              bill
            </span>
          </div>
          {tier.batteryKwh > 0 && (
            <div>
              <p className="text-base font-medium text-neutral-800 leading-6">
                {tier.batteryKwh}kWh
              </p>
              <p className="text-xs font-medium text-neutral-600 leading-[18px]">
                Included Battery
              </p>
            </div>
          )}
        </div>

        {/* View details */}
        <Button variant="outline" onClick={onViewDetails}>
          View details
        </Button>
      </div>
    </div>
  );
}

/* ── Locked tier card ── */
function LockedTierCard({ tier }: { tier: SystemTier }) {
  return (
    <div className="bg-white border border-neutral-300 rounded p-4 shadow-xs relative overflow-hidden">
      <div>
        <p className="text-lg font-semibold text-neutral-800 leading-7">
          {tier.kwpSystem} kWp System
        </p>
        <p className="text-xs font-medium text-neutral-600 leading-[18px]">
          Full energy independence
        </p>
      </div>
      <div className="blur-[4px] mt-6 flex flex-col gap-4">
        <div>
          <p className="text-base font-medium text-neutral-800 leading-6">
            ₱---,---
          </p>
          <p className="text-xs font-medium text-neutral-600 leading-[18px]">
            Price
          </p>
        </div>
        <div>
          <p className="text-base font-medium text-neutral-800 leading-6">
            ₱---/month
          </p>
          <p className="text-xs font-medium text-neutral-600 leading-[18px]">
            Est. monthly savings
          </p>
          <span className="inline-flex mt-1 bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full leading-[18px]">
            -100% of your average electricity bill
          </span>
        </div>
        <div>
          <p className="text-base font-medium text-neutral-800 leading-6">
            10-15kWh
          </p>
          <p className="text-xs font-medium text-neutral-600 leading-[18px]">
            Included Battery
          </p>
        </div>
      </div>
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-white p-2 flex flex-col items-center gap-2 mt-12">
          <LockIcon />
          <p className="text-sm font-medium text-neutral-800 leading-5 text-center">
            Custom Pricing
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Main Results page ── */
export default function Step5Results() {
  const {
    result,
    purchaseMode,
    setPurchaseMode,
    setStep,
    setSelectedTierIndex,
  } = useWizard();

  if (!result) return null;

  const handleViewDetails = (idx: number) => {
    setSelectedTierIndex(idx);
    setStep(6);
  };

  return (
    <Layout fullWidth>
      <div className="flex flex-col gap-6">
        {/* Section: Usage Summary */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer hover:bg-neutral-100 transition-colors"
            onClick={() => setStep(4)}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#006AC6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="text-2xl font-semibold text-brand-blue leading-[30px]">
            Your Usage Summary
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SummaryCard
            icon={<ZapIcon />}
            value={`${result.monthlyConsumptionKwh.toLocaleString()} kWh`}
            label="Average monthly consumption"
          />
          <SummaryCard
            icon={<SunIcon />}
            value={result.usageProfile}
            label=""
            description={
              result.usageProfile === "Daytime User"
                ? "You consume most electricity during daylight hours when solar produces maximum power"
                : result.usageProfile === "Nighttime User"
                  ? "You consume most electricity at night — a battery can help store solar for later"
                  : "Your energy usage is evenly distributed between day and night"
            }
          />
        </div>

        {/* Chart placeholder */}
        <div className="h-[154px] bg-white border border-neutral-300 rounded shadow-xs flex items-center justify-center text-sm text-neutral-500">
          Solar production vs consumption chart
        </div>

        {/* Info badge */}
        {result.recommended.batteryKwh > 0 && (
          <div
            className="flex items-center gap-1.5 rounded p-2"
            style={{ background: "linear-gradient(90deg, #F0F9FF, #F0F9FF)" }}
          >
            <InfoIcon />
            <p className="text-xs font-normal text-brand-blue leading-[18px]">
              You can store your excess solar with a{" "}
              {result.recommended.batteryKwh}kWh Battery
            </p>
          </div>
        )}

        {/* Section: Recommended System Sizes */}
        <h2 className="text-2xl font-semibold text-brand-blue leading-[30px] mt-4">
          Recommended System Sizes
        </h2>

        {/* Toggle: Rent-to-Own / Direct Purchase */}
        <div className="bg-white border border-neutral-200 rounded-full p-1 flex w-fit mx-auto lg:mx-0">
          <button
            type="button"
            className={`py-2 px-6 rounded-full text-sm font-medium leading-5 transition-colors cursor-pointer ${
              purchaseMode === "rto"
                ? "bg-brand-dark-green-2 text-white"
                : "text-neutral-600"
            }`}
            onClick={() => setPurchaseMode("rto")}
          >
            Rent-to-Own
          </button>
          <button
            type="button"
            className={`py-2 px-6 rounded-full text-sm font-medium leading-5 transition-colors cursor-pointer ${
              purchaseMode === "direct"
                ? "bg-brand-dark-green-2 text-white"
                : "text-neutral-600"
            }`}
            onClick={() => setPurchaseMode("direct")}
          >
            Direct Purchase
          </button>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TierCard
            tier={result.starter}
            purchaseMode={purchaseMode}
            onViewDetails={() => handleViewDetails(0)}
          />
          <TierCard
            tier={result.recommended}
            purchaseMode={purchaseMode}
            recommended
            onViewDetails={() => handleViewDetails(1)}
          />
          <LockedTierCard tier={result.full} />
        </div>
      </div>
    </Layout>
  );
}
