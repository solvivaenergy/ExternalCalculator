import { useState } from "react";
import { useWizard } from "../context/WizardContext";
import type { DisqualifyReason } from "../context/WizardContext";
import Layout from "../components/Layout";
import { TextInput, Button, ButtonFooter } from "../components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.com$/i;
const MOBILE_RE = /^\d{10}$/;

const WAITLIST_DESCRIPTION: Partial<Record<NonNullable<DisqualifyReason>, string>> = {
  condo:
    "Interested in knowing when we can cater to condo owners? Let us know the best way to reach you, and we'll update you as soon as we're available.",
  bill:
    "We'll begin to offer smaller system sizes soon — join the waitlist and we'll let you know when they're available!",
  renter:
    "Planning to buy a home soon? Join our waitlist to get updates when you're ready.",
  "renter-low-bill":
    "Planning to buy a home soon? Join our waitlist to get updates when you're ready.",
  area:
    "Want us in your area? Join the waitlist — your interest helps us know where to go next!",
};

export default function WaitlistSignup() {
  const { formData, updateForm, setStep, disqualifyReason } = useWizard();
  const [errors, setErrors] = useState<{ email?: string; mobile?: string }>({});

  const isValidEmail = EMAIL_RE.test(formData.email.trim());
  const isValidMobile = MOBILE_RE.test(formData.mobile.trim());

  const canProceed = formData.fullName.trim() && isValidEmail && isValidMobile;

  const handleSubmit = () => {
    setStep(9);
  };

  const description =
    (disqualifyReason && WAITLIST_DESCRIPTION[disqualifyReason]) ??
    "We'll let you know as soon as we can serve you.";

  return (
    <Layout heroSrc={`${import.meta.env.BASE_URL}hero-dq.jpg`} hideMobileLogo>
      <div className="flex flex-col gap-6 flex-1 justify-center lg:my-0">
        {/* Logo — centered above title on mobile */}
        <div className="flex justify-center lg:hidden">
          <img
            src={`${import.meta.env.BASE_URL}logo.webp`}
            alt="Solviva"
            className="h-12 w-auto"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-brand-blue leading-[30px]">
            Join waitlist
          </h1>
          <p className="text-base font-normal text-neutral-800 leading-6">
            {description}
          </p>
        </div>

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
          <Button onClick={handleSubmit} disabled={!canProceed}>
            Submit
          </Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
