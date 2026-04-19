import type { ReactNode } from "react";

/* ── Step Header ── */
export function StepHeader({
  step,
  totalSteps,
  title,
  subtitle,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-base font-semibold text-brand-dark-green-2 leading-6">
        Step {step} of {totalSteps}
      </p>
      <h1 className="text-2xl lg:text-[30px] font-semibold text-brand-blue leading-[30px] lg:leading-[38px]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-base font-normal text-neutral-800 leading-6 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ── Button ── */
type ButtonVariant = "primary" | "secondary" | "outline" | "green";

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const base =
    "flex-1 flex items-center justify-center px-[18px] py-[10px] rounded-lg shadow-xs text-sm font-bold leading-5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-brand-lime text-brand-dark-green hover:brightness-95",
    secondary: "bg-neutral-200 text-neutral-600 hover:bg-neutral-300",
    outline:
      "border border-neutral-600 text-neutral-600 bg-white hover:bg-neutral-100 font-medium",
    green:
      "bg-brand-dark-green-2 text-neutral-white hover:brightness-95 font-medium",
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/* ── Text Input ── */
export function TextInput({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  prefix,
  prefixIcon,
  type = "text",
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  prefix?: string;
  prefixIcon?: ReactNode;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-base font-medium text-neutral-700 leading-6">
          {label}
        </label>
      )}
      <div className="flex items-center h-12 bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-brand-blue/30">
        {prefixIcon && (
          <span className="pl-3.5 text-neutral-500 shrink-0">{prefixIcon}</span>
        )}
        {prefix && (
          <span className="pl-3.5 text-neutral-800 font-medium text-base shrink-0">
            {prefix}
          </span>
        )}
        <input
          type={type}
          className="flex-1 h-full px-3.5 text-base font-medium text-neutral-800 placeholder:text-neutral-400 outline-none bg-transparent leading-6"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    </div>
  );
}

/* ── Select Input ── */
export function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder = "Please select",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-base font-medium text-neutral-700 leading-6">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className="w-full h-12 px-3.5 bg-white border border-neutral-300 rounded-lg shadow-xs text-base font-medium text-neutral-800 outline-none appearance-none focus:ring-2 focus:ring-brand-blue/30 leading-6"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled className="text-neutral-600">
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none"
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* ── Radio Group (card-style matching Figma) ── */
export function RadioGroup({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-base font-medium text-neutral-700 leading-6">
          {label}
        </label>
      )}
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`flex items-center gap-2 w-full h-12 px-3.5 rounded-lg border text-base font-medium transition-colors cursor-pointer ${
              value === opt.value
                ? "bg-green-50 border-brand-dark-green-2 shadow-xs"
                : "bg-white border-neutral-300 shadow-xs hover:bg-neutral-50"
            }`}
            onClick={() => onChange(opt.value)}
          >
            <span
              className={`w-5 h-5 rounded-full shrink-0 border flex items-center justify-center ${
                value === opt.value
                  ? "bg-brand-dark-green-2 border-brand-dark-green-2"
                  : "bg-white border-neutral-300"
              }`}
            >
              {value === opt.value && (
                <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                  <path
                    d="M12 5L6.5 10.5L4 8"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="text-neutral-600">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Button Footer (pushes to bottom with mt-auto) ── */
export function ButtonFooter({ children }: { children: ReactNode }) {
  return (
    <div className="pt-6">
      <div className="flex gap-4">{children}</div>
    </div>
  );
}
