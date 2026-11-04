import { Plus, Trash2 } from "lucide-react";
import { useWizard } from "../context/WizardContext";
import { DEVICES, type DeviceEntry, type DeviceName } from "../calculator";
import Layout from "../components/Layout";
import {
  StepHeader,
  SelectInput,
  CustomDropdown,
  Button,
  ButtonFooter,
} from "../components/ui";

const MAX_DEVICES = 7;
const DEFAULT_RATE = 14.5;
const DAYS_PER_MONTH = 365 / 12;

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

/* 24 hourly options: 12 AM, 1 AM, … 11 AM, 12 PM, 1 PM, … 11 PM */
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? "AM" : "PM";
  const h = i % 12 === 0 ? 12 : i % 12;
  return `${h}:00 ${ampm}`;
});

/** Convert (hour 1-12, ampm) → time string */
function timeToString(hour: number, ampm: "AM" | "PM"): string {
  return `${hour}:00 ${ampm}`;
}

/** Convert time string → (hour 1-12, ampm) */
function stringToTime(str: string): { hour: number; ampm: "AM" | "PM" } {
  const match = str.match(/^(\d+):00\s+(AM|PM)$/);
  if (!match) return { hour: 12, ampm: "AM" };
  return { hour: parseInt(match[1]), ampm: match[2] as "AM" | "PM" };
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

      {/* Usage hours */}
      <div className="flex flex-col gap-1">
        <span className="text-base font-medium text-neutral-700">
          Usage hours
        </span>
        <div className="flex gap-2">
          <div className="flex-1">
            <CustomDropdown
              label="ON"
              value={timeToString(device.onTimeHour, device.onTimeAmPm)}
              onChange={(v) => {
                const { hour, ampm } = stringToTime(v);
                upd({ onTimeHour: hour, onTimeMinute: 0, onTimeAmPm: ampm });
              }}
              options={TIME_OPTIONS}
              maxVisibleOptions={6}
            />
          </div>
          <div className="flex-1">
            <CustomDropdown
              label="OFF"
              value={timeToString(device.offTimeHour, device.offTimeAmPm)}
              onChange={(v) => {
                const { hour, ampm } = stringToTime(v);
                upd({ offTimeHour: hour, offTimeMinute: 0, offTimeAmPm: ampm });
              }}
              options={TIME_OPTIONS}
              maxVisibleOptions={6}
            />
          </div>
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

/* ── Compute total device kWh/month ── */
function deviceTotalKwh(devices: DeviceEntry[]): number {
  let total = 0;
  for (const device of devices) {
    const info = DEVICES.find((d) => d.name === device.deviceName);
    if (!info) continue;
    // Convert on/off to 0-24 hours
    const toH24 = (h: number, ampm: "AM" | "PM") =>
      ampm === "AM" ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12;
    const on =
      toH24(device.onTimeHour, device.onTimeAmPm) + device.onTimeMinute / 60;
    const off =
      toH24(device.offTimeHour, device.offTimeAmPm) + device.offTimeMinute / 60;
    const hours = off > on ? off - on : 24 - on + off;
    total += hours * info.avgPower * (device.daysPerWeek / 7) * DAYS_PER_MONTH;
  }
  return total;
}

/* ── Main component ── */
export default function Step3Appliances() {
  const { formData, updateForm, setStep } = useWizard();
  const devices = formData.devices;

  const monthlyConsumptionKwh =
    parseFloat(formData.electricityBill) / DEFAULT_RATE || 0;
  const inconsistent =
    devices.length > 0 && deviceTotalKwh(devices) > monthlyConsumptionKwh;

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
      <div className="flex flex-col gap-6 flex-1 justify-center lg:my-0">
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

        {/* Note badge */}
        <div className="bg-green-50 rounded p-2 flex items-start gap-1.5">
          <p className="text-xs font-normal text-brand-dark-green leading-[18px]">
            Note: This helps us determine if you need a battery based on when
            you use the most power.
          </p>
        </div>

        {/* Inconsistency warning */}
        {inconsistent && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            <p className="text-sm font-semibold text-yellow-800 leading-5">
              Something doesn&apos;t add up.
            </p>
            <p className="text-sm font-normal text-yellow-800 leading-5 mt-0.5">
              The devices you&apos;ve listed consume more than your monthly bill
              suggests. Please review the device counts, hours, or your monthly
              bill.
            </p>
          </div>
        )}

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
