import { useWizard } from "../context/WizardContext";
import { MIN_BILL_THRESHOLD } from "../calculator";
import Layout from "../components/Layout";
import { Button, ButtonFooter } from "../components/ui";

const REASONS = {
  area: {
    title: "We're not in your area yet",
    description:
      "Solviva is currently available in Metro Manila and nearby provinces (Batangas, Bulacan, Cavite, Laguna, Pampanga, Quezon Province, Rizal).\n\nWant us in your area? Join the waitlist — your interest helps us know where to go next!",
    primary: "Continue exploring",
    secondary: "Join waitlist",
  },
  bill: {
    title: "Solar might not be right for you yet",
    description: `We recommend a monthly bill of at least ₱${MIN_BILL_THRESHOLD.toLocaleString()} to maximize your savings. Below that, it takes too long to break even.\n\nMade a mistake? Re-enter your bill or continue exploring anyway.`,
    primary: "Continue exploring",
    secondary: "Re-enter your electricity bill",
  },
  condo: {
    title: "Condo installations aren't available yet",
    description:
      "We're not set up to install on condos at this time.\n\nJoin our waitlist to get notified when we can serve condos.",
    primary: "Continue exploring",
    secondary: "Join waitlist",
  },
  renter: {
    title: "We currently serve homeowners only",
    description: "",
    primary: "Continue exploring",
    secondary: "Join waitlist",
  },
} as const;

export default function Disqualified() {
  const { disqualifyReason, setStep, setDisqualifyReason } = useWizard();

  if (!disqualifyReason) return null;

  const reason = REASONS[disqualifyReason];

  // "Continue exploring" goes to the next step after the one that disqualified
  const nextStep = disqualifyReason === "area" ? 2 : 3;

  const handlePrimary = () => {
    setDisqualifyReason(null);
    setStep(nextStep);
  };

  const handleSecondary = () => {
    if (disqualifyReason === "bill") {
      setDisqualifyReason(null);
      setStep(2);
    }
    // For area/condo/renter "Join waitlist" — no-op for now
  };

  return (
    <Layout heroSrc={`${import.meta.env.BASE_URL}hero-dq.jpg`} hideMobileLogo>
      <div className="flex flex-col gap-[10px] flex-1">
        {/* Hero image (mobile only) */}
        <div className="lg:hidden -mx-8 -mt-2">
          <img
            src={`${import.meta.env.BASE_URL}hero-dq.jpg`}
            alt=""
            className="h-[237px] w-full object-cover"
          />
        </div>

        <h2 className="text-2xl font-semibold text-brand-blue leading-[30px]">
          {reason.title}
        </h2>

        {reason.description && (
          <p className="text-sm font-medium text-neutral-800 leading-5 whitespace-pre-line">
            {reason.description}
          </p>
        )}

        <ButtonFooter>
          <Button variant="secondary" onClick={handleSecondary}>
            {reason.secondary}
          </Button>
          <Button onClick={handlePrimary}>{reason.primary}</Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
