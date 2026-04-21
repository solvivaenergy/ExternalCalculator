import { MapPin } from "lucide-react";
import { useWizard } from "../context/WizardContext";
import { QUALIFIED_AREAS } from "../calculator";
import Layout from "../components/Layout";
import { StepHeader, Button, ButtonFooter } from "../components/ui";
import AddressAutocomplete from "../components/AddressAutocomplete";

export default function Step1Location() {
  const { formData, updateForm, setStep, setDisqualifyReason } = useWizard();

  const handleNext = () => {
    const loc = formData.location.trim();
    if (!loc) return;
    const isQualified = QUALIFIED_AREAS.some((a) =>
      loc.toLowerCase().includes(a.toLowerCase()),
    );
    if (!isQualified) {
      setDisqualifyReason("area");
      setStep(-1);
      return;
    }
    setStep(2);
  };

  return (
    <Layout
      progress={25}
      heroSrc={`${import.meta.env.BASE_URL}hero-step1.jpg`}
      logoTopPadding="lg:pt-0"
      logoMarginTop="lg:mt-[50px]"
      contentTopPadding="lg:pt-0"
    >
      <div className="flex flex-col gap-6 flex-1 justify-center lg:mx-[200px] lg:my-0 lg:-mt-20">
        <StepHeader
          step={1}
          totalSteps={4}
          title="Let's get started!"
          subtitle="Where will you install your Solar Power System?"
        />

        <AddressAutocomplete
          // label="Enter your home address"
          placeholder="Enter your address"
          value={formData.location}
          onChange={(v) => updateForm({ location: v })}
          prefixIcon={<MapPin className="w-5 h-5" />}
        />

        <p className="text-xs font-medium text-neutral-500 leading-[18px] -mt-2">
          Currently serving: {QUALIFIED_AREAS.join(", ")}
        </p>

        <ButtonFooter>
          <Button onClick={handleNext} disabled={!formData.location.trim()}>
            See if my home qualifies
          </Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
