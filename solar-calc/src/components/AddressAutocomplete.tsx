import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

interface Prediction {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
}

export default function AddressAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  prefixIcon,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  prefixIcon?: ReactNode;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressFetch = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const ready = Boolean(API_KEY && API_KEY !== "YOUR_KEY_HERE");

  /* Fetch predictions when value changes (Places API New — REST) */
  useEffect(() => {
    if (!ready || !value.trim() || suppressFetch.current) {
      suppressFetch.current = false;
      if (!value.trim()) setPredictions([]);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          input: value,
          includedRegionCodes: ["ph"],
          includedPrimaryTypes: ["geocode"],
          locationBias: {
            rectangle: {
              low: { latitude: 13.3, longitude: 120.3 },
              high: { latitude: 15.2, longitude: 122.5 },
            },
          },
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          const suggestions = data.suggestions ?? [];
          setPredictions(
            suggestions
              .filter((s: Record<string, unknown>) => s.placePrediction)
              .map(
                (s: {
                  placePrediction: {
                    placeId: string;
                    text: { text: string };
                    structuredFormat: {
                      mainText: { text: string };
                      secondaryText?: { text: string };
                    };
                  };
                }) => ({
                  placeId: s.placePrediction.placeId,
                  text: s.placePrediction.text.text,
                  mainText: s.placePrediction.structuredFormat.mainText.text,
                  secondaryText:
                    s.placePrediction.structuredFormat.secondaryText?.text ??
                    "",
                }),
              ),
          );
          setOpen(true);
          setActiveIdx(-1);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setPredictions([]);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [value, ready]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectPrediction = useCallback(
    (p: Prediction) => {
      suppressFetch.current = true;
      onChange(p.text);
      setPredictions([]);
      setOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || predictions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i < predictions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i > 0 ? i - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectPrediction(predictions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 relative" ref={containerRef}>
      {label && (
        <label className="text-base font-medium text-neutral-700 leading-6">
          {label}
        </label>
      )}
      <div className="flex items-center h-12 bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-brand-blue/30">
        {prefixIcon && (
          <span className="pl-3.5 text-neutral-500 shrink-0">{prefixIcon}</span>
        )}
        <input
          type="text"
          className="flex-1 h-full px-3.5 text-base font-medium text-neutral-800 placeholder:text-neutral-400 outline-none bg-transparent leading-6"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => predictions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
      </div>

      {/* Dropdown */}
      {open && predictions.length > 0 && (
        <ul
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto"
          role="listbox"
        >
          {predictions.map((p, i) => (
            <li
              key={p.placeId}
              role="option"
              aria-selected={i === activeIdx}
              className={`px-3.5 py-2.5 cursor-pointer text-sm leading-5 transition-colors ${
                i === activeIdx ? "bg-brand-lime/30" : "hover:bg-neutral-50"
              }`}
              onMouseDown={() => selectPrediction(p)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              <span className="font-semibold text-neutral-800">
                {p.mainText}
              </span>
              {p.secondaryText && (
                <span className="text-neutral-500 ml-1">{p.secondaryText}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
