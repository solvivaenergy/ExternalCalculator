import { useWizard } from "../context/WizardContext";
import { MIN_BILL_THRESHOLD } from "../calculator";
import Layout from "../components/Layout";
import { Button, ButtonFooter } from "../components/ui";

const CONTENT: Record<
  NonNullable<ReturnType<typeof useWizard>["disqualifyReason"]>,
  { title: string; description: string }
> = {
  area: {
    title: "We're not in your area yet",
    description:
      "Solviva is currently available in Metro Manila and nearby provinces (Batangas, Bulacan, Cavite, Laguna, Pampanga, Quezon Province, Rizal).\n\nWant us in your area? Join the waitlist — your interest helps us know where to go next!",
  },
  bill: {
    title: "Solar might not be right for you yet",
    description: `We recommend a monthly bill of at least ₱${MIN_BILL_THRESHOLD.toLocaleString()} to maximize your savings. Below that, it takes too long to break even.`,
  },
  condo: {
    title: "Condo installations aren't available yet",
    description:
      "We currently don't serve condo units due to building restrictions and homeowner association requirements.",
  },
  renter: {
    title: "We currently serve homeowners only",
    description:
      "Solar installations require homeowner approval. If you own your home, you're good to go!\n\nStill want to see what solar could do for you?",
  },
  "renter-low-bill": {
    title: "We currently serve homeowners only",
    description:
      "We don't serve renters yet, but we're working on it! Join our waitlist and we'll notify you when we can help.",
  },
};

export default function Disqualified() {
  const { disqualifyReason, setStep, setDisqualifyReason } = useWizard();

  if (!disqualifyReason) return null;

  const { title, description } = CONTENT[disqualifyReason];

  // Hard stops — no waitlist or continue exploring, just restart
  const isHardStop =
    disqualifyReason === "bill" || disqualifyReason === "condo";

  // Renter with low bill — only waitlist, no continuing
  const isWaitlistOnly = disqualifyReason === "renter-low-bill";

  // "Continue exploring" destination
  const continueStep = disqualifyReason === "area" ? 2 : 3;

  const handleContinue = () => {
    setDisqualifyReason(null);
    setStep(continueStep);
  };

  const handleJoinWaitlist = () => {
    setStep(8);
  };

  const handleStartOver = () => {
    setDisqualifyReason(null);
    setStep(1);
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
          {title}
        </h2>

        {description && (
          <p className="text-sm font-medium text-neutral-800 leading-5 whitespace-pre-line">
            {description}
          </p>
        )}

        {isHardStop && (
          <ButtonFooter>
            <Button onClick={handleStartOver}>Start over</Button>
          </ButtonFooter>
        )}

        {isWaitlistOnly && (
          <ButtonFooter>
            <Button onClick={handleJoinWaitlist}>Join waitlist</Button>
          </ButtonFooter>
        )}

        {!isHardStop && !isWaitlistOnly && (
          <ButtonFooter>
            <Button variant="secondary" onClick={handleJoinWaitlist}>
              Join waitlist
            </Button>
            <Button onClick={handleContinue}>Continue exploring</Button>
          </ButtonFooter>
        )}
      </div>
    </Layout>
  );
}
