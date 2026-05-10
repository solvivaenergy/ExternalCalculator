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
    description: `Our current system sizes work best with a monthly bill of at least ₱${MIN_BILL_THRESHOLD.toLocaleString()} to maximize your savings. Below that, it takes too long to break even.\n\nWe'll begin to offer smaller system sizes soon — join the waitlist and we'll let you know when they're available!`,
  },
  condo: {
    title: "Condo installations aren't available yet",
    description:
      "We're not set up to install on condos at this time. Join our waitlist to get notified when we can serve condos.",
  },
  renter: {
    title: "We currently serve homeowners only",
    description:
      "Solar panels require permanent installation, so we need property owners who can make long-term modifications. Planning to buy a home soon? Join our waitlist to get updates when you're ready.",
  },
  "renter-low-bill": {
    title: "We currently serve homeowners only",
    description:
      "Solar panels require permanent installation, so we need property owners who can make long-term modifications. Planning to buy a home soon? Join our waitlist to get updates when you're ready.",
  },
};

export default function Disqualified() {
  const { disqualifyReason, setStep, setDisqualifyReason } = useWizard();

  if (!disqualifyReason) return null;

  const { title, description } = CONTENT[disqualifyReason];

  // "Continue exploring" destination
  const continueStep = disqualifyReason === "area" ? 2 : 3;

  const handleContinue = () => {
    setDisqualifyReason(null);
    setStep(continueStep);
  };

  const handleJoinWaitlist = () => {
    setStep(8);
  };

  const handleGoBack = () => {
    setDisqualifyReason(null);
    setStep(2);
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

        {disqualifyReason === "condo" && (
          <ButtonFooter>
            <Button onClick={handleJoinWaitlist}>Join waitlist</Button>
          </ButtonFooter>
        )}

        {disqualifyReason === "bill" && (
          <ButtonFooter>
            <Button variant="secondary" onClick={handleJoinWaitlist}>
              Join waitlist
            </Button>
            <Button onClick={handleGoBack}>
              Re-enter your electricity bill
            </Button>
          </ButtonFooter>
        )}

        {disqualifyReason === "renter-low-bill" && (
          <ButtonFooter>
            <Button variant="secondary" onClick={handleGoBack}>
              Go back
            </Button>
            <Button onClick={handleJoinWaitlist}>Join waitlist</Button>
          </ButtonFooter>
        )}

        {disqualifyReason === "renter" && (
          <ButtonFooter>
            <Button variant="secondary" onClick={handleGoBack}>
              Go back
            </Button>
            <Button onClick={handleContinue}>Continue exploring</Button>
          </ButtonFooter>
        )}

        {disqualifyReason === "area" && (
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
