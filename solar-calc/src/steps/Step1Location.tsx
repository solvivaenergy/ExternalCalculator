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
    const matchedArea = QUALIFIED_AREAS.find((a) =>
      loc.toLowerCase().includes(a.toLowerCase()),
    );
    if (!matchedArea) {
      setDisqualifyReason("area");
      setStep(-1);
      return;
    }
    // Build city string from the matched area and the part before it.
    // Strip trailing " City" suffix except for "Quezon City" and "Cavite City"
    // which are stored as-is in Odoo's qualification list.
    const areaIdx = loc.toLowerCase().indexOf(matchedArea.toLowerCase());
    const before = loc.substring(0, areaIdx).replace(/,\s*$/, "").trim();
    const beforeParts = before
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const rawCity = beforeParts[beforeParts.length - 1] ?? "";
    const KEEP_CITY_SUFFIX = ["quezon city", "cavite city"];
    const normalizedCity = KEEP_CITY_SUFFIX.includes(rawCity.toLowerCase())
      ? rawCity
      : rawCity.replace(/\s+city$/i, "").trim();
    // Metro Manila uses "Metro Manila ~ City" prefix; provinces use just the city name
    // to match Odoo's standalone city entries (e.g. 'santa rosa', 'bacoor').
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
