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

/* ── Time picker row ── */
function TimePicker({
  label,
  hour,
  minute,
  ampm,
  onHour,
  onMinute,
  onAmPm,
}: {
  label: string;
  hour: number;
  minute: number;
  ampm: "AM" | "PM";
  onHour: (h: number) => void;
  onMinute: (m: number) => void;
  onAmPm: (a: "AM" | "PM") => void;
}) {
  const selCls =
    "h-9 px-2 border border-neutral-300 rounded-lg bg-white text-sm outline-none shadow-xs";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      <div className="flex items-center gap-1">
        <select
          className={selCls}
          value={hour}
          onChange={(e) => onHour(+e.target.value)}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="text-neutral-400">:</span>
        <select
          className={selCls}
          value={minute}
          onChange={(e) => onMinute(+e.target.value)}
        >
          {[0, 15, 30, 45].map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select
          className={selCls}
          value={ampm}
          onChange={(e) => onAmPm(e.target.value as "AM" | "PM")}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
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

  return (
    <div className="border border-neutral-200 rounded-lg bg-white p-4 shadow-xs space-y-3">
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
        label="Device"
        value={device.deviceName}
        onChange={(v) => upd({ deviceName: v as DeviceName })}
        options={DEVICES.map((d) => d.name)}
      />

      {/* Quantity */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">Quantity</span>
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

      {/* Time pickers */}
      <div className="flex gap-4">
        <TimePicker
          label="ON Time"
          hour={device.onTimeHour}
          minute={device.onTimeMinute}
          ampm={device.onTimeAmPm}
          onHour={(h) => upd({ onTimeHour: h })}
          onMinute={(m) => upd({ onTimeMinute: m })}
          onAmPm={(a) => upd({ onTimeAmPm: a })}
        />
        <TimePicker
          label="OFF Time"
          hour={device.offTimeHour}
          minute={device.offTimeMinute}
          ampm={device.offTimeAmPm}
          onHour={(h) => upd({ offTimeHour: h })}
          onMinute={(m) => upd({ offTimeMinute: m })}
          onAmPm={(a) => upd({ offTimeAmPm: a })}
        />
      </div>

      {/* Days per week */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500">
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
            title="Thanks! Now, let's calculate your solar savings"
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

        {/* Appliance section description (desktop) */}
        <div className="hidden lg:block">
          <p className="text-base font-medium text-neutral-700 leading-6">
            Tell us about your home appliances (optional)
          </p>
          <p className="text-sm font-medium text-neutral-500 leading-5 mt-1">
            Optional, but we highly recommend it! This helps us tailor the best
            solar package for you, you can add up to 7 devices.
          </p>
        </div>

        {/* Note badge */}
        <div className="bg-green-50 rounded p-2 flex items-start gap-1.5">
          <p className="text-xs font-normal text-brand-dark-green leading-[18px]">
            Note: Appliances added may affect daytime and nighttime energy
            distribution. Adding a battery can help store excess solar for use
            at night.
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
