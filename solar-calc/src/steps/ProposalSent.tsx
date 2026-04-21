function CheckIcon() {
  return (
    <div className="w-16 h-16 rounded-full bg-brand-lime flex items-center justify-center">
      <svg
        className="w-8 h-8 text-brand-dark-green"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

export default function ProposalSent() {
  return (
    <div className="relative min-h-dvh">
      {/* Background hero image */}
      <img
        src={`${import.meta.env.BASE_URL}hero-proposal.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content */}
      <div className="relative z-10 min-h-dvh flex flex-col">
        {/* Logo */}
        <div className="flex justify-center pt-8">
          <img
            src={`${import.meta.env.BASE_URL}logo-white.svg`}
            alt="Solviva"
            className="h-12 w-auto"
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="bg-neutral-white rounded-2xl p-8 w-full max-w-md lg:max-w-[682px] flex flex-col gap-8 shadow-md">
            {/* Header */}
            <div className="flex flex-col items-center gap-4">
              <CheckIcon />
              <div className="text-center">
                <p className="text-2xl font-semibold text-brand-dark-green-2 leading-8">
                  Proposal Sent
                </p>
                <p className="text-lg font-medium text-neutral-800 leading-7">
                  Please check your inbox.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-6">
              {/* What's included in the email */}
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-neutral-800 leading-7">
                  What's included in the email:
                </p>
                <ul className="list-disc pl-5 text-sm font-normal text-neutral-800 leading-5 space-y-0.5">
                  <li>Your personalized Solar Proposal</li>
                  <li>Our team's contact information</li>
                </ul>
              </div>

              {/* What's next */}
              <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold text-neutral-800 leading-7">
                  What's next?
                </p>
                <p className="text-base font-normal text-neutral-800 leading-6">
                  Our solar experts will reach out within 24-48 hours to guide
                  you through next steps
                </p>
              </div>

              {/* CTA */}
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold text-neutral-800 leading-6">
                  Want to talk to someone right away?
                </p>
                <p className="text-base font-normal text-neutral-800 leading-6">
                  Call us at 0917 802 8948
                </p>
              </div>

              {/* Buttons with reduced gap */}
              <div className="flex flex-col gap-4">
                {/* Visit website */}
                <a
                  href="https://www.solvivaenergy.com"
                  className="w-full inline-flex items-center justify-center rounded-lg bg-brand-lime px-6 py-3 text-sm font-bold text-brand-dark-green hover:brightness-95 transition-colors"
                >
                  Go to website
                </a>
                {/* Submit another inquiry */}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = import.meta.env.BASE_URL || "/";
                  }}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-neutral-200 px-6 py-3 text-sm font-bold text-neutral-600 hover:bg-neutral-300 transition-colors cursor-pointer"
                >
                  Submit another inquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
