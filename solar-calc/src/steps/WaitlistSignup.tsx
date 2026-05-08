import { useState } from "react";
import { useWizard } from "../context/WizardContext";
import Layout from "../components/Layout";
import { StepHeader, TextInput, Button, ButtonFooter } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.com$/i;
const MOBILE_RE = /^\d{10}$/;

export default function WaitlistSignup() {
  const { formData, updateForm, setStep } = useWizard();
  const [errors, setErrors] = useState<{ email?: string; mobile?: string }>({});

  const isValidEmail = EMAIL_RE.test(formData.email.trim());
  const isValidMobile = MOBILE_RE.test(formData.mobile.trim());

  const canProceed = formData.fullName.trim() && isValidEmail && isValidMobile;

  const handleSubmit = () => {
    setStep(9);
  };

  return (
    <Layout heroSrc={`${import.meta.env.BASE_URL}hero-dq.jpg`} hideMobileLogo>
      <div className="flex flex-col gap-6 flex-1 justify-center lg:my-0">
        <StepHeader
          step={1}
          totalSteps={1}
          title="Join the waitlist"
          subtitle="We'll let you know as soon as we can serve you"
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
                    mobile:
                      "Enter a valid 10-digit mobile number (e.g. 9171234567)",
                  }));
              }}
              type="tel"
            />
            {errors.mobile && (
              <span className="text-xs text-red-500">{errors.mobile}</span>
            )}
          </div>
        </div>

        <ButtonFooter>
          <Button variant="secondary" onClick={() => setStep(-1)}>
            Go back
          </Button>
          <Button onClick={handleSubmit} disabled={!canProceed}>
            Join waitlist
          </Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
