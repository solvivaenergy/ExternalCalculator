import { useWizard } from "../context/WizardContext";
import type { DisqualifyReason } from "../context/WizardContext";

const CONFIRMATION_SUBTITLE: Partial<
  Record<NonNullable<DisqualifyReason>, string>
> = {
  condo:
    "We'll reach out as soon as Solviva becomes available for condo owners.",
  bill: "We'll reach out as soon as we offer smaller system sizes.",
  renter:
    "We'll reach out as soon as Solviva becomes available for home renters.",
  "renter-low-bill":
    "We'll reach out as soon as Solviva becomes available for home renters.",
  area: "We'll reach out as soon as we expand to your area.",
};

function CheckIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-brand-lime flex items-center justify-center">
      <svg
        className="w-8 h-8 text-brand-dark-green"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

export default function WaitlistConfirmation() {
  const { disqualifyReason } = useWizard();

  const subtitle =
    (disqualifyReason && CONFIRMATION_SUBTITLE[disqualifyReason]) ??
    "We'll notify you as soon as we can serve you.";

  const handleGoToWebsite = () => {
    window.location.href = "https://www.solvivaenergy.com";
  };

  const handleSubmitAnother = () => {
    window.location.href = "https://www.solvivaenergy.com/calculator/";
  };

  return (
    <div className="relative min-h-dvh">
      {/* Background hero image */}
      <img
        src={`${import.meta.env.BASE_URL}hero-proposal.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative z-10 min-h-dvh flex flex-col">
        {/* Logo */}
        <div className="flex justify-center pt-8">
          <img
            src={`${import.meta.env.BASE_URL}logo-white.svg`}
            alt="Solviva"
            className="h-12 w-auto"
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="bg-neutral-white rounded-2xl p-8 w-full max-w-md lg:max-w-[682px] flex flex-col gap-8 shadow-md">
            {/* Header */}
            <div className="flex flex-col items-center gap-4">
              <CheckIcon />
              <div className="text-center">
                <p className="text-2xl font-semibold text-brand-dark-green-2 leading-8">
                  You're on the list!
                </p>
                <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoToWebsite}
                className="w-full rounded-lg bg-brand-lime text-brand-dark-green font-bold py-2.5 text-sm hover:opacity-90 transition shadow-xs"
              >
                Go to website
              </button>
              <button
                onClick={handleSubmitAnother}
                className="w-full text-sm text-neutral-600 font-medium py-1 hover:underline transition"
              >
                Submit another inquiry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
