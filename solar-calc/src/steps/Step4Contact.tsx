import { useState } from "react";
import { useWizard } from "../context/WizardContext";
import { calculate } from "../calculator";
import Layout from "../components/Layout";
import { StepHeader, TextInput, Button, ButtonFooter } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.com$/i;
const MOBILE_RE = /^\d{10}$/;

export default function Step4Contact() {
  const { formData, updateForm, setStep, setResult } = useWizard();
  const [errors, setErrors] = useState<{ email?: string; mobile?: string }>({});

  const isValidEmail = EMAIL_RE.test(formData.email.trim());
  const isValidMobile = MOBILE_RE.test(formData.mobile.trim());

  const canProceed =
    formData.fullName.trim() &&
    isValidEmail &&
    isValidMobile &&
    formData.consentGiven;

  const handleSubmit = () => {
    const bill = parseFloat(formData.electricityBill);
    const result = calculate({
      electricityBill: bill,
      devices: formData.devices,
    });
    setResult(result);
    setStep(5);
  };

  return (
    <Layout
      progress={100}
      heroSrc={`${import.meta.env.BASE_URL}hero-step4.jpg`}
    >
      <div className="flex flex-col gap-6 flex-1 justify-center lg:my-0">
        <StepHeader
          step={4}
          totalSteps={4}
          title="Almost there!"
          subtitle="Get your custom solar proposal"
        />

        <div className="flex flex-col gap-6">
          <TextInput
            label="Full name"
            value={formData.fullName}
            onChange={(v) => updateForm({ fullName: v })}
          />
          <div className="flex flex-col gap-1">
            <TextInput
              label="Email address"
              placeholder="name@email.com"
              value={formData.email}
              onChange={(v) => {
                updateForm({ email: v });
                if (errors.email)
                  setErrors((e) => ({ ...e, email: undefined }));
              }}
              onBlur={() => {
                if (formData.email.trim() && !isValidEmail)
                  setErrors((e) => ({
                    ...e,
                    email: "Enter a valid email (e.g. name@email.com)",
                  }));
              }}
              type="email"
            />
            {errors.email && (
              <span className="text-xs text-red-500">{errors.email}</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <TextInput
              label="Mobile number"
              placeholder="9171234567"
              prefix="+63"
              value={formData.mobile}
              onChange={(v) => {
                updateForm({ mobile: v.replace(/[^0-9]/g, "").slice(0, 10) });
                if (errors.mobile)
                  setErrors((e) => ({ ...e, mobile: undefined }));
              }}
              onBlur={() => {
                if (formData.mobile.trim() && !isValidMobile)
                  setErrors((e) => ({
                    ...e,
                    mobile: "Enter a 10-digit mobile number",
                  }));
              }}
              type="tel"
            />
            {errors.mobile && (
              <span className="text-xs text-red-500">{errors.mobile}</span>
            )}
          </div>

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.consentGiven}
              onChange={(e) => updateForm({ consentGiven: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-brand-dark-green-2 cursor-pointer"
            />
            <span className="text-sm font-normal text-neutral-700 leading-5">
              I consent to Solviva Energy collecting and processing my data in
              line with its{" "}
              <a href="#" className="underline hover:text-neutral-900">
                Privacy Policy
              </a>
              , for contacting me about solar services and sending updates via
              Viber, SMS, email, or calls. I understand I may withdraw consent
              or update my data anytime.
            </span>
          </label>
        </div>

        <ButtonFooter>
          <Button variant="secondary" onClick={() => setStep(3)}>
            Go back
          </Button>
          <Button onClick={handleSubmit} disabled={!canProceed}>
            See my packages
          </Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
