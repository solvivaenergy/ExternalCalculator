import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useWizard } from "../context/WizardContext";
import { DEVICES, type DeviceEntry, type DeviceName } from "../calculator";
import Layout from "../components/Layout";
import {
  StepHeader,
  TextInput,
  SelectInput,
  Button,
  ButtonFooter,
} from "../components/ui";

const MAX_DEVICES = 7;

function defaultDevice(): DeviceEntry {
  return {
    deviceName: DEVICES[0].name as DeviceName,
    quantity: 1,
    onTimeHour: 8,
    onTimeMinute: 0,
    onTimeAmPm: "AM",
    offTimeHour: 5,
    offTimeMinute: 0,
    offTimeAmPm: "PM",
    daysPerWeek: 7,
  };
}

/* ── Wheel time picker (overlay) ── */
const ITEM_H = 40;
const VISIBLE = 5;

/* 24 hourly options: 12 AM, 1 AM, … 11 AM, 12 PM, 1 PM, … 11 PM */
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? "AM" : "PM";
  const h = i % 12 === 0 ? 12 : i % 12;
  return {
    label: `${h}:00 ${ampm}`,
    hour: h,
    ampm: ampm as "AM" | "PM",
  };
});

/** Convert (hour 1-12, ampm) → 0-23 index */
function timeToIndex(hour: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

/* Single scroll-wheel column that fires onSelect when the user stops scrolling */
function WheelColumn({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const timer = useRef(0);

  /* sync scroll position when selectedIndex changes externally */
  useEffect(() => {
    if (ref.current && !isUserScrolling.current) {
      ref.current.scrollTop = selectedIndex * ITEM_H;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      onSelect(clamped);
      isUserScrolling.current = false;
    }, 80);
  }, [items.length, onSelect]);

  const pad = Math.floor(VISIBLE / 2) * ITEM_H;

  return (
    <div className="relative overflow-hidden w-full" style={{ height: VISIBLE * ITEM_H }}>
      {/* highlight band */}
      <div
        className="absolute inset-x-0 border-y border-brand-dark-green-2/30 pointer-events-none z-10"
        style={{ top: pad, height: ITEM_H }}
      />
      {/* fade top / bottom */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
      <div
        ref={ref}
        className="h-full overflow-y-auto scrollbar-hide"
        style={{ scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch" }}
        onScroll={handleScroll}
      >
        <div style={{ height: pad }} />
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-sm font-medium text-neutral-800"
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: pad }} />
      </div>
    </div>
  );
}

/* Wrapper: tap the time box → overlay wheel appears on top of everything */
function TimeWheelPicker({
  label,
  hour,
  ampm,
  onSelect,
  isOpen,
  onToggle,
}: {
  label: string;
  hour: number;
  ampm: "AM" | "PM";
  onSelect: (hour: number, ampm: "AM" | "PM") => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedIdx = timeToIndex(hour, ampm);

  /* close on outside click */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        onToggle();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onToggle]);

  const displayTime = `${hour}:00 ${ampm}`;

  return (
    <div className="relative flex flex-col gap-1 flex-1 min-w-0" ref={wrapRef}>
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <button
        type="button"
        className={`h-11 px-3 border rounded-lg bg-white text-sm font-medium text-neutral-800 text-center cursor-pointer transition-colors ${
          isOpen
            ? "border-brand-dark-green-2 ring-2 ring-brand-dark-green-2/20"
            : "border-neutral-300"
        }`}
        onClick={onToggle}
      >
        {displayTime}
      </button>
      {/* Wheel overlay — positioned absolute so nothing shifts */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border border-neutral-300 rounded-lg bg-white shadow-xs overflow-hidden">
          <WheelColumn
            items={TIME_OPTIONS.map((o) => o.label)}
            selectedIndex={selectedIdx}
            onSelect={(i) => {
              const opt = TIME_OPTIONS[i];
              onSelect(opt.hour, opt.ampm);
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ── Device card ── */
function DeviceCard({
  device,
  index,
  onChange,
  onRemove,
}: {
  device: DeviceEntry;
  index: number;
  onChange: (d: DeviceEntry) => void;
  onRemove: () => void;
}) {
  const upd = (patch: Partial<DeviceEntry>) =>
    onChange({ ...device, ...patch });

  /* only one picker open at a time: "on" | "off" | null */
  const [openPicker, setOpenPicker] = useState<"on" | "off" | null>(null);

  return (
    <div className="border border-neutral-200 rounded-lg bg-white p-4 shadow-xs space-y-3 overflow-visible">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-700">
          Appliance {index + 1}
        </span>
        <button
          type="button"
          className="p-1 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <SelectInput
        label="Select device"
        value={device.deviceName}
        onChange={(v) => upd({ deviceName: v as DeviceName })}
        options={DEVICES.map((d) => d.name)}
      />

      {/* Quantity */}
      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-neutral-700">
          Set quantity of appliance
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 cursor-pointer"
            onClick={() => upd({ quantity: Math.max(1, device.quantity - 1) })}
            disabled={device.quantity <= 1}
          >
            &minus;
          </button>
          <span className="text-sm font-medium w-6 text-center">
            {device.quantity}
          </span>
          <button
            type="button"
            className="w-8 h-8 rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            onClick={() => upd({ quantity: device.quantity + 1 })}
          >
            +
          </button>
        </div>
      </div>

      {/* Usage hours */}
      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-neutral-700">
          Usage hours
        </span>
        <div className="flex gap-2">
          <TimeWheelPicker
            label="ON"
            hour={device.onTimeHour}
            ampm={device.onTimeAmPm}
            onSelect={(h, a) =>
              upd({ onTimeHour: h, onTimeMinute: 0, onTimeAmPm: a })
            }
            isOpen={openPicker === "on"}
            onToggle={() => setOpenPicker((p) => (p === "on" ? null : "on"))}
          />
          <TimeWheelPicker
            label="OFF"
            hour={device.offTimeHour}
            ampm={device.offTimeAmPm}
            onSelect={(h, a) =>
              upd({ offTimeHour: h, offTimeMinute: 0, offTimeAmPm: a })
            }
            isOpen={openPicker === "off"}
            onToggle={() => setOpenPicker((p) => (p === "off" ? null : "off"))}
          />
        </div>
      </div>

      {/* Days per week */}
      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-neutral-700">
          Days per week
        </span>
        <select
          className="h-9 px-2 border border-neutral-300 rounded-lg bg-white text-sm outline-none shadow-xs w-full"
          value={device.daysPerWeek}
          onChange={(e) => upd({ daysPerWeek: +e.target.value })}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <option key={d} value={d}>
              {d} {d === 1 ? "day" : "days"} / week
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function Step3Appliances() {
  const { formData, updateForm, setStep } = useWizard();
  const devices = formData.devices;

  const addDevice = () => {
    if (devices.length >= MAX_DEVICES) return;
    updateForm({ devices: [...devices, defaultDevice()] });
  };

  const updateDevice = (i: number, d: DeviceEntry) => {
    const next = [...devices];
    next[i] = d;
    updateForm({ devices: next });
  };

  const removeDevice = (i: number) => {
    updateForm({ devices: devices.filter((_, idx) => idx !== i) });
  };

  return (
    <Layout progress={75} heroSrc={`${import.meta.env.BASE_URL}hero-step3.jpg`}>
      <div className="flex flex-col gap-6 flex-1">
        {/* Mobile title */}
        <div className="lg:hidden">
          <StepHeader
            step={3}
            totalSteps={4}
            title="Add your appliances (optional)"
            subtitle="This helps us size your system more accurately. You can add up to 7 devices."
          />
        </div>
        {/* Desktop title */}
        <div className="hidden lg:block">
          <StepHeader
            step={3}
            totalSteps={4}
            title="Add your appliances (optional)"
            subtitle="This helps us size your system more accurately. You can add up to 7 devices."
          />
        </div>

        {/* Bill field (desktop only — editable, pre-filled from Step 2) */}
        <div className="hidden lg:block">
          <TextInput
            label="Average monthly bill"
            value={formData.electricityBill}
            onChange={(v) =>
              updateForm({ electricityBill: v.replace(/[^0-9.]/g, "") })
            }
            prefix="₱"
            placeholder="10,000"
          />
        </div>

        {/* Note badge */}
        <div className="bg-green-50 rounded p-2 flex items-start gap-1.5">
          <p className="text-xs font-normal text-brand-dark-green leading-[18px]">
            Note: This helps us determine if you need a battery based on when
            you use the most power.
          </p>
        </div>

        {/* Device list */}
        <div className="flex flex-col gap-4">
          {devices.map((device, i) => (
            <DeviceCard
              key={i}
              device={device}
              index={i}
              onChange={(d) => updateDevice(i, d)}
              onRemove={() => removeDevice(i)}
            />
          ))}
        </div>

        {/* Add device button */}
        {devices.length < MAX_DEVICES && (
          <button
            type="button"
            className="flex items-center justify-center gap-2 h-10 w-full bg-brand-dark-green-2 text-neutral-white text-base font-medium rounded-lg shadow-xs cursor-pointer hover:brightness-95 transition-colors"
            onClick={addDevice}
          >
            Add device
            <Plus className="w-5 h-5" />
          </button>
        )}

        <ButtonFooter>
          <Button variant="secondary" onClick={() => setStep(2)}>
            Go back
          </Button>
          <Button onClick={() => setStep(4)}>Continue</Button>
        </ButtonFooter>
      </div>
    </Layout>
  );
}
