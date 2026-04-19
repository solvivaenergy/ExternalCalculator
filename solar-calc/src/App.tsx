import { WizardProvider, useWizard } from "./context/WizardContext";
import Step1Location from "./steps/Step1Location";
import Step2HomeDetails from "./steps/Step2HomeDetails";
import Step3Appliances from "./steps/Step3Appliances";
import Step4Contact from "./steps/Step4Contact";
import Step5Results from "./steps/Step5Results";
import Step6Confirmation from "./steps/Step6Confirmation";
import ProposalSent from "./steps/ProposalSent";
import Disqualified from "./steps/Disqualified";

function WizardRouter() {
  const { step, disqualifyReason } = useWizard();

  if (disqualifyReason && step === -1) return <Disqualified />;

  switch (step) {
    case 1:
      return <Step1Location />;
    case 2:
      return <Step2HomeDetails />;
    case 3:
      return <Step3Appliances />;
    case 4:
      return <Step4Contact />;
    case 5:
      return <Step5Results />;
    case 6:
      return <Step6Confirmation />;
    case 7:
      return <ProposalSent />;
    default:
      return <Step1Location />;
  }
}

export default function App() {
  return (
    <WizardProvider>
      <WizardRouter />
    </WizardProvider>
  );
}
