import { useWizard } from "../context/WizardContext";
import Layout from "../components/Layout";
import { Button, ButtonFooter } from "../components/ui";

export default function Step6Confirmation() {
  const { result, selectedTierIndex, setStep, purchaseMode } = useWizard();

  if (!result) return null;

  const tiers = [result.starter, result.recommended, result.full] as const;
  const tier = tiers[selectedTierIndex];

  return (
    <Layout fullWidth>
      <div className="flex flex-col gap-6">
        {/* Breadcrumb (desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-sm">
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-700 cursor-pointer"
            onClick={() => setStep(5)}
          >
            Usage Details
          </button>
          <svg
            className="w-4 h-4 text-neutral-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-brand-dark-green-2 font-semibold">
            System Details
          </span>
        </div>

        {/* Back arrow (mobile) */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer hover:bg-neutral-100 transition-colors"
            onClick={() => setStep(5)}
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
            Your system in detail
          </h2>
        </div>

        {/* Title (desktop) */}
        <h2 className="hidden lg:block text-2xl font-semibold text-brand-blue leading-[30px]">
          Your System in Detail
        </h2>

        {/* Savings cards — side by side on desktop, after detail on mobile */}
        <div className="flex flex-col lg:flex-row gap-4 order-2 lg:order-1">
          {/* Green savings card */}
          <div className="flex-1 bg-brand-dark-green-2 rounded p-4 shadow-xs flex flex-col gap-1">
            <p className="text-lg font-semibold text-brand-lime leading-7">
              ₱{tier.monthlySavings.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-neutral-white leading-[18px]">
              Estimated monthly savings
            </p>
            <span className="inline-flex self-start bg-badge-dark rounded px-1.5 py-0.5 text-xs font-medium text-white leading-[18px]">
              -{Math.round(tier.savingsPct * 100)}% of your average electricity
              bill
            </span>
          </div>
          {/* Lime 25-year savings card */}
          <div className="flex-1 bg-brand-lime rounded p-4 shadow-xs flex flex-col gap-1 justify-center">
            <p className="text-lg font-semibold text-brand-blue leading-7">
              ₱{tier.savings25yr.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-neutral-800 leading-[18px]">
              25-year savings
            </p>
          </div>
        </div>

        {/* System detail + What's included — first on mobile, side by side on desktop */}
        <div className="flex flex-col lg:flex-row gap-6 order-1 lg:order-2">
          {/* System detail card */}
          <div className="flex-1">
            <div className="bg-white border border-neutral-300 rounded p-4 lg:p-6 shadow-xs">
              <p className="text-lg font-semibold text-neutral-800 leading-7">
                {tier.kwpSystem} kWp System
              </p>
              <p className="text-xs font-medium text-neutral-600 leading-[18px]">
                {tier.label}
              </p>

              <div className="mt-6 flex flex-col divide-y divide-neutral-200">
                {tier.batteryKwh > 0 && (
                  <div className="flex items-center justify-between py-3 first:pt-0">
                    <span className="text-sm font-medium text-neutral-600 leading-5">
                      Included Battery
                    </span>
                    <span className="text-sm font-medium text-neutral-800 leading-5">
                      {tier.batteryKwh}kW
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-neutral-600 leading-5">
                    System Price
                  </span>
                  <span className="text-sm font-medium text-neutral-800 leading-5">
                    ₱
                    {(purchaseMode === "rto"
                      ? tier.priceRTO
                      : tier.priceDP
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-neutral-600 leading-5">
                    Rent-to-Own Monthly
                  </span>
                  <span className="text-sm font-medium text-neutral-800 leading-5">
                    ₱{tier.monthlyPaymentRTO.toLocaleString()}/month
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 last:pb-0">
                  <span className="text-sm font-medium text-neutral-600 leading-5">
                    Return-on-Investment
                  </span>
                  <span className="text-sm font-medium text-neutral-800 leading-5">
                    {tier.roi25yr}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* What's included */}
          <div className="lg:w-[240px]">
            <h3 className="text-lg font-semibold text-neutral-800 leading-7 mb-2">
              What's included:
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-sm font-normal text-neutral-800 leading-[23px]">
              <li>Tier 1 Solar Panels</li>
              <li>Inverter and mounting system</li>
              {tier.batteryKwh > 0 && (
                <li>{tier.batteryKwh}kW battery storage</li>
              )}
              <li>Installation and permits</li>
              <li>25-year warranty</li>
              <li>After-sales support</li>
            </ul>
          </div>
        </div>

        <div className="order-3">
          <ButtonFooter>
            <Button variant="secondary" onClick={() => setStep(5)}>
              Download PDF
            </Button>
            <Button onClick={() => setStep(7)}>Send me a copy</Button>
          </ButtonFooter>
        </div>
      </div>
    </Layout>
  );
}
