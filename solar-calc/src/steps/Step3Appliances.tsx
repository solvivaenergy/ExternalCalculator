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

/* ── Wheel column for rolling time picker ── */
const WHEEL_ITEM_H = 36;
const WHEEL_VISIBLE = 3;
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ["00", "15", "30", "45"];
const PERIODS = ["AM", "PM"];

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
  const scrolling = useRef(false);
  const timer = useRef(0);

  useEffect(() => {
    if (ref.current && !scrolling.current) {
      ref.current.scrollTop = selectedIndex * WHEEL_ITEM_H;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    scrolling.current = true;
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / WHEEL_ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (clamped !== selectedIndex) onSelect(clamped);
      el.scrollTo({ top: clamped * WHEEL_ITEM_H, behavior: "smooth" });
      scrolling.current = false;
    }, 100);
  }, [items.length, selectedIndex, onSelect]);

  const padH = Math.floor(WHEEL_VISIBLE / 2) * WHEEL_ITEM_H;

  return (
    <div
      className="relative overflow-hidden flex-1 min-w-0"
      style={{ height: WHEEL_VISIBLE * WHEEL_ITEM_H }}
    >
      <div
        className="absolute inset-x-0 border-y border-brand-dark-green-2/30 pointer-events-none z-10"
        style={{ top: padH, height: WHEEL_ITEM_H }}
      />
      <div className="absolute inset-x-0 top-0 h-9 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
      <div
        ref={ref}
        className="h-full overflow-y-auto scrollbar-hide"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
        onScroll={handleScroll}
      >
        <div style={{ height: padH }} />
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-sm font-medium text-neutral-800"
            style={{ height: WHEEL_ITEM_H, scrollSnapAlign: "center" }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: padH }} />
      </div>
    </div>
  );
}

/* ── Rolling time picker (tap-to-open popup) ── */
function WheelTimePicker({
  label,
  hour,
  minute,
  ampm,
  onHour,
  onMinute,
  onAmPm,
  isOpen,
  onToggle,
}: {
  label: string;
  hour: number;
  minute: number;
  ampm: "AM" | "PM";
  onHour: (h: number) => void;
  onMinute: (m: number) => void;
  onAmPm: (a: "AM" | "PM") => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hourIdx = hour - 1;
  const minuteIdx = Math.max(
    0,
    MINUTES.indexOf(String(minute).padStart(2, "0")),
  );
  const periodIdx = PERIODS.indexOf(ampm);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  const displayTime = `${hour}:${String(minute).padStart(2, "0")} ${ampm}`;

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0" ref={wrapRef}>
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      {/* Tappable display */}
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
      {/* Wheel popup */}
      {isOpen && (
        <div className="border border-neutral-300 rounded-lg bg-white shadow-xs overflow-hidden">
          <div className="flex items-center">
            <WheelColumn
              items={HOURS}
              selectedIndex={hourIdx}
              onSelect={(i) => onHour(i + 1)}
            />
            <span className="text-neutral-400 shrink-0 text-sm">:</span>
            <WheelColumn
              items={MINUTES}
              selectedIndex={minuteIdx}
              onSelect={(i) => onMinute(+MINUTES[i])}
            />
            <WheelColumn
              items={PERIODS}
              selectedIndex={periodIdx}
              onSelect={(i) => onAmPm(PERIODS[i] as "AM" | "PM")}
            />
          </div>
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
    <div className="border border-neutral-200 rounded-lg bg-white p-4 shadow-xs space-y-3 overflow-hidden">
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
          <WheelTimePicker
            label="ON"
            hour={device.onTimeHour}
            minute={device.onTimeMinute}
            ampm={device.onTimeAmPm}
            onHour={(h) => upd({ onTimeHour: h })}
            onMinute={(m) => upd({ onTimeMinute: m })}
            onAmPm={(a) => upd({ onTimeAmPm: a })}
            isOpen={openPicker === "on"}
            onToggle={() => setOpenPicker((p) => (p === "on" ? null : "on"))}
          />
          <WheelTimePicker
            label="OFF"
            hour={device.offTimeHour}
            minute={device.offTimeMinute}
            ampm={device.offTimeAmPm}
            onHour={(h) => upd({ offTimeHour: h })}
            onMinute={(m) => upd({ offTimeMinute: m })}
            onAmPm={(a) => upd({ offTimeAmPm: a })}
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
