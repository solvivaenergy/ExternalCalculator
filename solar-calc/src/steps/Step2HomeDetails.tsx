import { useWizard } from "../context/WizardContext";
import {
  PROPERTY_TYPES,
  INSTALL_TIMELINES,
  MIN_BILL_THRESHOLD,
} from "../calculator";
import Layout from "../components/Layout";
import {
  StepHeader,
  TextInput,
  SelectInput,
  RadioGroup,
  Button,
  ButtonFooter,
} from "../components/ui";

export default function Step2HomeDetails() {
  const { formData, updateForm, setStep, setDisqualifyReason } = useWizard();

  const canProceed =
    formData.electricityBill &&
    formData.homeOwnership &&
    formData.propertyType &&
    formData.installTimeline;

  const handleNext = () => {
    const bill = parseFloat(formData.electricityBill);
    if (isNaN(bill) || bill < MIN_BILL_THRESHOLD) {
      setDisqualifyReason("bill");
      setStep(-1);
      return;
    }
    if (formData.propertyType === "Condo") {
      setDisqualifyReason("condo");
      setStep(-1);
      return;
    }
    if (formData.homeOwnership === "No") {
      setDisqualifyReason("renter");
      setStep(-1);
      return;
    }
    setStep(3);
  };

  return (
    <Layout progress={50} heroSrc="/hero-step2.jpg">
      <div className="flex flex-col gap-6 flex-1">
        <StepHeader step={2} totalSteps={4} title="Tell us about your home" />

        {/* Numbered questions */}
        <div className="flex flex-col gap-6">
          {/* Q1: Electricity bill */}
          <div>
            <p className="text-lg font-medium text-neutral-700 leading-7 mb-2">
              1. What's your average electricity bill?
            </p>
            <TextInput
              placeholder="10,000"
              prefix="₱"
              value={formData.electricityBill}
              onChange={(v) =>
                updateForm({ electricityBill: v.replace(/[^0-9.]/g, "") })
              }
            />
          </div>

          {/* Q2: Home ownership */}
          <div>
            <p className="text-lg font-medium text-neutral-700 leading-7 mb-2">
              2. Do you own your home?
            </p>
            <RadioGroup
              value={formData.homeOwnership}
              onChange={(v) => updateForm({ homeOwnership: v })}
              options={[
                { label: "Yes", value: "Yes" },
                { label: "No", value: "No" },
              ]}
            />
          </div>

          {/* Q3: Property type */}
          <div>
            <p className="text-lg font-medium text-neutral-700 leading-7 mb-2">
              3. What type of property do you have?
            </p>
            <SelectInput
              value={formData.propertyType}
              onChange={(v) => updateForm({ propertyType: v })}
              options={PROPERTY_TYPES}
            />
          </div>

          {/* Q4: Install timeline */}
          <div>
            <p className="text-lg font-medium text-neutral-700 leading-7 mb-2">
              4. How soon do you want to install solar?
            </p>
            <SelectInput
              value={formData.installTimeline}
              onChange={(v) => updateForm({ installTimeline: v })}
              options={INSTALL_TIMELINES}
            />
          </div>
        </div>

        <ButtonFooter>
          <Button variant="secondary" onClick={() => setStep(1)}>
            Go back
          </Button>
          <Button onClick={handleNext} disabled={!canProceed}>
            Continue
          </Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
