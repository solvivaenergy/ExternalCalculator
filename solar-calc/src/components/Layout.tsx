import type { ReactNode } from "react";

/**
 * Responsive layout matching Figma:
 * - Mobile: single column, centered logo, px-8 content
 * - Desktop split: 840px left panel + 600px hero right panel
 * - Desktop full-width: centered content (for Steps 5/6)
 */

interface LayoutProps {
  children: ReactNode;
  /** Progress bar percentage (0-100). Omit to hide progress bar. */
  progress?: number;
  /** Hero image URL for the desktop right panel. */
  heroSrc?: string;
  /** Full-width mode (no split panel) — used for results/detail pages. */
  fullWidth?: boolean;
  /** Hide the logo on mobile. */
  hideMobileLogo?: boolean;
}

export default function Layout({
  children,
  progress,
  heroSrc,
  fullWidth,
  hideMobileLogo,
}: LayoutProps) {
  /* ── Full-width variant (Steps 5, 6) ── */
  if (fullWidth) {
    return (
      <div className="min-h-dvh bg-bg-main">
        <div className="mx-auto max-w-[1440px]">
          <div className="hidden lg:flex lg:justify-start lg:pt-16 lg:px-16">
            <img
              src={`${import.meta.env.BASE_URL}logo.webp`}
              alt="Solviva"
              className="h-12 w-auto"
            />
          </div>
          <div className="px-8 pt-6 pb-12 lg:max-w-[960px] lg:mx-auto lg:px-0 lg:pt-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  /* ── Split layout variant (Steps 1–4, DQ) ── */
  return (
    <div className="min-h-dvh bg-bg-main flex flex-col lg:flex-row lg:h-dvh lg:overflow-hidden">
      {/* ─ Main content panel ─ */}
      <div className="flex-1 lg:flex-[58] flex flex-col min-h-dvh lg:min-h-0 lg:h-full lg:overflow-y-auto">
        {/* Progress bar: 8px mobile / 10px desktop */}
        {progress != null && (
          <div className="h-2 lg:h-2.5 bg-progress-track">
            <div
              className="h-full bg-progress-fill transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Logo */}
        <div
          className={`flex justify-center lg:justify-start pt-6 pb-2 lg:pt-20 lg:pb-0 lg:px-16${hideMobileLogo ? " hidden lg:flex" : ""}`}
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.webp`}
            alt="Solviva"
            className="h-12 w-auto"
          />
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col px-8 pb-6 lg:px-16 lg:pt-8 lg:pb-12">
          {children}
        </div>
      </div>

      {/* ─ Hero panel (desktop only) ─ */}
      <div className="hidden lg:block lg:flex-[42] relative overflow-hidden">
        {heroSrc ? (
          <img
            src={heroSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-200" />
        )}
      </div>
    </div>
  );
}
