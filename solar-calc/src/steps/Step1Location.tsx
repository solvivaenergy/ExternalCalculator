import { MapPin } from "lucide-react";
import { useWizard } from "../context/WizardContext";
import { QUALIFIED_AREAS } from "../calculator";
import Layout from "../components/Layout";
import { StepHeader, Button, ButtonFooter } from "../components/ui";
import AddressAutocomplete, {
  type PlaceDetailsData,
} from "../components/AddressAutocomplete";

export default function Step1Location() {
  const { formData, updateForm, setStep, setDisqualifyReason } = useWizard();

  const handleNext = () => {
    const loc = formData.location?.trim();
    if (!loc) return;

    // Check if the user's fetched province or region exactly matches a qualified area.
    // If they typed manually and didn't select from the dropdown, province/region might be empty,
    // so we fallback to a strict string includes check as a safety net.
    const matchedArea = QUALIFIED_AREAS.find((a) => {
      const target = a.toLowerCase();

      // Primary check: Strict match against actual geographic region/province
      if (
        formData.province?.toLowerCase() === target ||
        formData.region?.toLowerCase() === target
      ) {
        return true;
      }
      // Fallback check: If they didn't select an autocomplete item (raw string fallback)
      if (!formData.province && loc.toLowerCase().includes(target)) {
        return true;
      }
      return false;
    });

    if (!matchedArea) {
      setDisqualifyReason("area");
      setStep(-1);
      return;
    }

    const rawCity = formData.rawCity || "";
    const KEEP_CITY_SUFFIX = ["quezon city", "cavite city"];

    const normalizedCity = KEEP_CITY_SUFFIX.includes(rawCity.toLowerCase())
      ? rawCity
      : rawCity.replace(/\s+city$/i, "").trim();

    const formattedCity =
      matchedArea === "Metro Manila"
        ? normalizedCity
          ? `Metro Manila ~ ${normalizedCity}`
          : "Metro Manila"
        : normalizedCity || matchedArea;

    updateForm({ city: formattedCity });
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
      <div className="flex flex-col gap-6 flex-1 justify-center lg:my-0 lg:-mt-20">
        <StepHeader
          step={1}
          totalSteps={4}
          title="Let's get started!"
          subtitle="Where will you install your Solar Power System?"
        />

        <AddressAutocomplete
          placeholder="Enter your address"
          value={formData.location}
          onChange={(data: string | PlaceDetailsData) => {
            if (typeof data === "string") {
              // User is manually typing
              updateForm({
                location: data,
                province: "",
                region: "",
                rawCity: "",
              });
            } else {
              // User selected an autocomplete option and we fetched the details!
              updateForm({
                location: data.formattedAddress,
                province: data.province,
                region: data.region,
                rawCity: data.city,
              });
            }
          }}
          prefixIcon={<MapPin className="w-5 h-5" />}
        />

        <p className="text-xs font-medium text-neutral-500 leading-[18px] -mt-2">
          Currently serving: {QUALIFIED_AREAS.join(", ")}
        </p>

        <ButtonFooter>
          <Button onClick={handleNext} disabled={!formData.location?.trim()}>
            See if my home qualifies
          </Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
