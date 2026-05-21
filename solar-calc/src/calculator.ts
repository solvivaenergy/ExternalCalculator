// Solviva External Solar Calculator — Computation Engine
// Ported from "Solviva Calc v.B.2.4.xlsm"

// ─── ADMIN reference data ───

export const DEVICES = [
  { name: "1.0hp AC", peakPower: 1.0, pctOfPeak: 0.5, avgPower: 0.5 },
  { name: "1.5hp AC", peakPower: 1.3, pctOfPeak: 0.5, avgPower: 0.65 },
  { name: "2.0hp AC", peakPower: 1.8, pctOfPeak: 0.5, avgPower: 0.9 },
  { name: "2.5hp AC", peakPower: 2.0, pctOfPeak: 0.5, avgPower: 1.0 },
  { name: "3.0hp AC", peakPower: 2.8, pctOfPeak: 0.5, avgPower: 1.4 },
  { name: "Microwave/Toaster", peakPower: 1.0, pctOfPeak: 1.0, avgPower: 1.0 },
  { name: '6" Stove Burner', peakPower: 1.5, pctOfPeak: 0.9, avgPower: 1.35 },
  { name: '8" Stove Burner', peakPower: 2.5, pctOfPeak: 0.9, avgPower: 2.25 },
  { name: "Electric Oven", peakPower: 3.0, pctOfPeak: 0.8, avgPower: 2.4 },
  { name: "Level-1 EV Charger", peakPower: 1.5, pctOfPeak: 0.9, avgPower: 1.35 },
  { name: "Level-2 EV Charger", peakPower: 9.6, pctOfPeak: 0.9, avgPower: 8.64 },
  { name: "Washing Machine", peakPower: 0.8, pctOfPeak: 0.7, avgPower: 0.56 },
  { name: "Elec Clothes Dryer", peakPower: 5.0, pctOfPeak: 0.8, avgPower: 4.0 },
] as const;

export type DeviceName = (typeof DEVICES)[number]["name"];

// Constants from ADMIN sheet
const PANEL_CAPACITY_W = 630;
const KWH_PER_KWP_PER_DAY = 3.6;
const BASE_RTO_RATE = 0.28;
const RISK_PREMIUM_RATE = 0.30; // <8 panels — from ADMIN!C19 + C21/10000
const RISK_PREMIUM_PANELS = 8;  // ADMIN!C20
const BATTERY_EFFICIENCY = 0.98;
const BATTERY_DOD = 0.95;
const PANEL_DEGRADATION = 0.005; // per year
// const MAINTENANCE_INFLATION = 0.03;
// const NET_METERING_EFFICIENCY = 0.5;

// Pricing per panel
const PRICE_PER_PANEL_DP = 7745.23;
const MIN_MOUNTING_SUPPORT_DP = 6461.54;
const MOUNTING_PCT = 0.16;
const CABLE_PCT_TABLE = [
  { panels: 1, total: 0.69 },
  { panels: 8, total: 0.69 },
  { panels: 10, total: 0.66 },
  { panels: 13, total: 0.66 },
  { panels: 16, total: 0.58 },
  { panels: 19, total: 0.51 },
  { panels: 24, total: 0.40 },
  { panels: 31, total: 0.39 },
];

// Inverter lookup (kWp → inverter)
const INVERTERS = [
  { minKwp: 0.01, name: "5.00 kW Inverter", ratedKw: 5, priceDP: 66338.46 },
  { minKwp: 5, name: "6.00 kW Inverter", ratedKw: 6, priceDP: 74953.85 },
  { minKwp: 6, name: "8.00 kW Inverter", ratedKw: 8, priceDP: 99076.92 },
  { minKwp: 8, name: "12.00 kW Inverter", ratedKw: 12, priceDP: 138707.69 },
  { minKwp: 12, name: "16.00 kW Inverter", ratedKw: 16, priceDP: 188676.92 },
];

// Battery pricing (direct purchase)
const BATTERY_PACK_DP = 74264.62;
const BATTERY_RACK_DP = 8615.38;
const ATS_DP = 10338.46;
const CRITICAL_LOADS_DP = 3790.77;
const BATTERY_LABOR_W_SOLAR_DP = 18092.31;

// Labor & fixed overhead (direct purchase)
const SOLAR_LABOR_PER_KWP_DP = 7753.85;
const FIXED_OVERHEAD_DP = 19476.15;

// Fixed available system sizes (panels → kWp) from the proposal generator
// Rounded labels: 5, 6, 8, 10, 13, 15, 20 kWp
const FIXED_PANEL_COUNTS = [8, 10, 13, 16, 21, 25, 32] as const;
const PANEL_KWP_LABEL: Record<number, number> = { 8: 5, 10: 6, 13: 8, 16: 10, 21: 13, 25: 15, 32: 20 };

/** Snap raw panel count up to the next available fixed size */
function snapToFixedPanels(panelsRaw: number): number {
  for (const fixed of FIXED_PANEL_COUNTS) {
    if (fixed >= Math.ceil(panelsRaw)) return fixed;
  }
  return FIXED_PANEL_COUNTS[FIXED_PANEL_COUNTS.length - 1];
}

// ─── Helpers ───

// Convert a direct-purchase price to 60-month RTO price (annuity due — matches Excel PMT(...,1)*60)
function dpToRto(dp: number, annualRate: number): number {
  const r = annualRate / 12;
  const n = 60;
  const factor = Math.pow(1 + r, n);
  return dp * r * factor / ((factor - 1) * (1 + r)) * n;
}

function lookupCablePct(panels: number): number {
  let result = CABLE_PCT_TABLE[0].total;
  for (const entry of CABLE_PCT_TABLE) {
    if (panels >= entry.panels) result = entry.total;
  }
  return result;
}

function lookupInverter(kwp: number) {
  let inv = INVERTERS[0];
  for (const entry of INVERTERS) {
    if (kwp >= entry.minKwp) inv = entry;
  }
  return inv;
}

// ─── Types ───

export interface DeviceEntry {
  deviceName: DeviceName;
  quantity: number;
  onTimeHour: number;
  onTimeMinute: number;
  onTimeAmPm: "AM" | "PM";
  offTimeHour: number;
  offTimeMinute: number;
  offTimeAmPm: "AM" | "PM";
  daysPerWeek: number;
}

export interface CalcInputs {
  electricityBill: number; // monthly average in ₱
  electricityRate?: number; // ₱ per kWh (default 14.5)
  devices: DeviceEntry[];
}

/** One of the 3 system tiers the external calc shows */
export interface SystemTier {
  label: string;
  kwpSystem: number;
  kwpLabel: number;
  panels: number;
  priceRTO: number;
  priceDP: number;
  monthlyPaymentRTO: number;
  monthlySavings: number;
  savingsPct: number;
  batteryKwh: number;
  paybackYears: number;
  paybackMonths: number;
  roi25yr: number;
  savings25yr: number;
}

export interface CalcResult {
  monthlyConsumptionKwh: number;
  dayTimeKwh: number;
  nightTimeKwh: number;
  dayTimePct: number;
  usageProfile: string; // "Day Time User" | "Night Time User" | "Balanced User"
  starter: SystemTier;
  recommended: SystemTier;
  full: SystemTier;
}

// ─── Device energy calculation (from SCHEDULE sheet logic) ───

function hoursTo24(h: number, m: number, ampm: "AM" | "PM"): number {
  let hour24 = h;
  if (ampm === "AM" && h === 12) hour24 = 0;
  else if (ampm === "PM" && h !== 12) hour24 += 12;
  return hour24 + m / 60;
}

function calcDeviceKwh(device: DeviceEntry): { dayKwh: number; nightKwh: number } {
  const deviceInfo = DEVICES.find((d) => d.name === device.deviceName);
  if (!deviceInfo) return { dayKwh: 0, nightKwh: 0 };

  const onTime24 = hoursTo24(device.onTimeHour, device.onTimeMinute, device.onTimeAmPm);
  const offTime24 = hoursTo24(device.offTimeHour, device.offTimeMinute, device.offTimeAmPm);

  // Daytime hours: 6AM-6PM (hours 6-18)
  const DAY_START = 6;
  const DAY_END = 18;

  let totalHours: number;
  if (offTime24 > onTime24) {
    totalHours = offTime24 - onTime24;
  } else {
    totalHours = 24 - onTime24 + offTime24;
  }

  // Calculate daytime overlap
  let dayHours = 0;
  if (offTime24 > onTime24) {
    // Simple case: on and off same day
    const start = Math.max(onTime24, DAY_START);
    const end = Math.min(offTime24, DAY_END);
    dayHours = Math.max(0, end - start);
  } else {
    // Wraps midnight
    // Part 1: onTime to midnight
    const start1 = Math.max(onTime24, DAY_START);
    const end1 = Math.min(24, DAY_END);
    dayHours += Math.max(0, end1 - start1);
    // Part 2: midnight to offTime
    const start2 = Math.max(0, DAY_START);
    const end2 = Math.min(offTime24, DAY_END);
    dayHours += Math.max(0, end2 - start2);
  }

  const nightHours = totalHours - dayHours;
  const monthlyFactor = (device.daysPerWeek / 7) * 30 * device.quantity;

  const dayKwh = dayHours * deviceInfo.avgPower * monthlyFactor;
  const nightKwh = nightHours * deviceInfo.avgPower * monthlyFactor;

  return { dayKwh, nightKwh };
}

// ─── Main calculation ───

function calcSystemTier(
  savingsFactor: number,
  monthlyConsumptionKwh: number,
  dayTimeKwh: number,
  nightTimeKwh: number,
  electricityRate: number,
  withBattery: boolean,
  label: string,
  snapToFixed = true
): SystemTier {
  // Battery sizing: scale in 5 kWh increments to cover target portion of nighttime load
  let batteryKwh = 0;
  if (withBattery) {
    const nightConsumptionPerDay = nightTimeKwh / 30;
    const neededBatteryOutput = savingsFactor * nightConsumptionPerDay;
    const rawBatteryKwh = neededBatteryOutput / BATTERY_DOD;
    batteryKwh = Math.max(5, Math.ceil(rawBatteryKwh / 5) * 5);
  }

  // Panel sizing
  let panelsRaw: number;
  if (withBattery) {
    // Battery tiers: size to cover (day + night/battery) at the savings factor
    const battNight = nightTimeKwh / BATTERY_EFFICIENCY / BATTERY_DOD;
    const dailyCapacity = (dayTimeKwh + battNight) * 12 / 365;
    panelsRaw = (savingsFactor * dailyCapacity * 1000) / PANEL_CAPACITY_W / KWH_PER_KWP_PER_DAY;
  } else {
    // No-battery starter: size so that (production × dayTimePct) = savingsFactor × totalConsumption
    // i.e. system produces enough during the day to cover the target % of the full bill
    const dayTimePct = monthlyConsumptionKwh > 0 ? dayTimeKwh / monthlyConsumptionKwh : 0.5;
    const neededMonthlyProduction = (savingsFactor * monthlyConsumptionKwh) / dayTimePct;
    panelsRaw = (neededMonthlyProduction / 30) * 1000 / PANEL_CAPACITY_W / KWH_PER_KWP_PER_DAY;
  }
  const rawCeil = Math.max(8, Math.ceil(panelsRaw));
  const panels = snapToFixed ? snapToFixedPanels(rawCeil) : rawCeil;
  const kwpSystem = (panels * PANEL_CAPACITY_W) / 1000;

  // Actual interest rate — 2% risk premium for systems under 8 panels (ADMIN!C22)
  const actualRate = panels < RISK_PREMIUM_PANELS ? RISK_PREMIUM_RATE : BASE_RTO_RATE;

  const cablePct = lookupCablePct(panels);
  const inverter = lookupInverter(kwpSystem);

  // Direct purchase price
  const panelsCostDP = panels * PRICE_PER_PANEL_DP;
  const mountingDP = Math.max(MIN_MOUNTING_SUPPORT_DP, panelsCostDP * MOUNTING_PCT);
  const cablesDP = cablePct * panelsCostDP;
  const laborDP = kwpSystem * SOLAR_LABOR_PER_KWP_DP + FIXED_OVERHEAD_DP;
  const inverterDP = inverter.priceDP;

  let batteryTotalDP = 0;
  if (withBattery) {
    const numBatteries = batteryKwh / 5; // each Pylontech pack is 5 kWh
    batteryTotalDP = numBatteries * (BATTERY_PACK_DP + BATTERY_RACK_DP) + ATS_DP + CRITICAL_LOADS_DP + BATTERY_LABOR_W_SOLAR_DP;
  }

  const totalDP = panelsCostDP + mountingDP + cablesDP + laborDP + inverterDP + batteryTotalDP;

  // RTO price — derived from DP at actual rate (annuity due, 60-mo), matching Excel ADMIN!E28 pattern
  const totalRTO = dpToRto(totalDP, actualRate);
  const monthlyPaymentRTO = totalRTO / 60;

  // Savings
  // With battery: actual production-based formula
  //   1. Direct daytime use: solar consumed as it's produced (capped by daytime consumption)
  //   2. Excess solar charges the battery (capped by usable battery capacity)
  //   3. Battery discharges at night (capped by night consumption)
  // Without battery: system production * dayTimePct (fraction of solar that overlaps with daytime usage),
  //   capped at actual daytime consumption (can't save more than you use during the day)
  let savingsKwh: number;
  if (withBattery) {
    const solarPerDay = kwpSystem * KWH_PER_KWP_PER_DAY;
    const dayConsumptionPerDay = dayTimeKwh / 30;
    const nightConsumptionPerDay = nightTimeKwh / 30;

    const directUsePerDay = Math.min(solarPerDay, dayConsumptionPerDay);
    const excessSolarPerDay = solarPerDay - directUsePerDay;

    // Battery: charge from excess solar, discharge at night
    const batteryInputCapacity = batteryKwh * BATTERY_DOD / BATTERY_EFFICIENCY;
    const batteryInputPerDay = Math.min(excessSolarPerDay, batteryInputCapacity);
    const batteryOutputPerDay = batteryInputPerDay * BATTERY_EFFICIENCY;
    const nightSavingsPerDay = Math.min(batteryOutputPerDay, nightConsumptionPerDay);

    savingsKwh = (directUsePerDay + nightSavingsPerDay) * 30;
  } else {
    const monthlyProduction = kwpSystem * KWH_PER_KWP_PER_DAY * 30;
    const dayTimePct = monthlyConsumptionKwh > 0 ? dayTimeKwh / monthlyConsumptionKwh : 0.5;
    savingsKwh = Math.min(monthlyProduction * dayTimePct, dayTimeKwh);
  }
  const monthlySavings = electricityRate * savingsKwh;
  const savingsPct = monthlyConsumptionKwh > 0 ? savingsKwh / monthlyConsumptionKwh : 0;

  // Payback (simple) — from SCHEDULE X3 formula
  const annualSavings = monthlySavings * 12;
  const adjustedAnnualSavings = annualSavings; // Simplified (degradation is minor in early years)
  const paybackMonthsTotal = annualSavings > 0 ? Math.round(totalRTO / (adjustedAnnualSavings / 12)) : 999;
  const paybackYears = Math.floor(paybackMonthsTotal / 12);
  const paybackMonths = paybackMonthsTotal % 12;

  // 25-year savings (cumulative, with degradation)
  let savings25yr = 0;
  for (let year = 1; year <= 25; year++) {
    const degradationFactor = Math.pow(1 - PANEL_DEGRADATION, year);
    savings25yr += annualSavings * degradationFactor;
  }

  // ROI (simplified IRR approximation)
  const roi25yr = annualSavings > 0 ? ((savings25yr - totalRTO) / totalRTO) : 0;

  return {
    label,
    kwpSystem: Math.round(kwpSystem * 100) / 100,
    kwpLabel: PANEL_KWP_LABEL[panels] ?? Math.round(kwpSystem),
    panels,
    priceRTO: Math.round(totalRTO),
    priceDP: Math.round(totalDP),
    monthlyPaymentRTO: Math.round(monthlyPaymentRTO),
    monthlySavings: Math.round(monthlySavings),
    savingsPct,
    batteryKwh,
    paybackYears,
    paybackMonths,
    roi25yr: Math.round(roi25yr * 1000) / 10,
    savings25yr: Math.round(savings25yr),
  };
}

export function calculate(inputs: CalcInputs): CalcResult {
  const rate = inputs.electricityRate ?? 14.5;
  const monthlyConsumptionKwh = rate > 0 ? inputs.electricityBill / rate : 0;

  // Calculate device day/night split
  let deviceDayKwh = 0;
  let deviceNightKwh = 0;
  for (const device of inputs.devices) {
    const { dayKwh, nightKwh } = calcDeviceKwh(device);
    deviceDayKwh += dayKwh;
    deviceNightKwh += nightKwh;
  }

  const deviceTotalKwh = deviceDayKwh + deviceNightKwh;
  const baseload = monthlyConsumptionKwh - deviceTotalKwh;

  // Day/Night split (from CALCULATOR Q28/Q29)
  const dayTimeKwh = Math.max(0, baseload / 2 + deviceDayKwh);
  const nightTimeKwh = Math.max(0, baseload / 2 + deviceNightKwh);
  // Clamp to [0,1] for display only — underlying kWh values remain for sizing
  const dayTimePct = monthlyConsumptionKwh > 0
    ? Math.min(1, Math.max(0, dayTimeKwh / monthlyConsumptionKwh))
    : 0.5;

  let usageProfile: string;
  if (dayTimePct > 0.5) usageProfile = "Day Time User";
  else if (dayTimePct < 0.5) usageProfile = "Night Time User";
  else usageProfile = "Balanced User";

  // 3 tiers
  // Starter: no battery, snapped to smallest fixed size hitting ≥30% daytime savings
  // Recommended: 1× 5kWh battery, snapped to smallest fixed size hitting ≥50% total savings
  // Full: exact computed size (no snapping) — custom pricing, shows actual kWp needed for 100% coverage
  const starter = calcSystemTier(0.3, monthlyConsumptionKwh, dayTimeKwh, nightTimeKwh, rate, false, "Starter System");
  const recommended = calcSystemTier(0.5, monthlyConsumptionKwh, dayTimeKwh, nightTimeKwh, rate, true, "With Battery");
  const full = calcSystemTier(1.0, monthlyConsumptionKwh, dayTimeKwh, nightTimeKwh, rate, true, "Full Independence");

  return {
    monthlyConsumptionKwh: Math.round(monthlyConsumptionKwh),
    dayTimeKwh: Math.round(dayTimeKwh),
    nightTimeKwh: Math.round(nightTimeKwh),
    dayTimePct: Math.round(dayTimePct * 100),
    usageProfile,
    starter,
    recommended,
    full,
  };
}

// Qualified areas from the design
export const QUALIFIED_AREAS = [
  "Metro Manila",
  "Batangas",
  "Bulacan",
  "Cavite",
  "Laguna",
  "Pampanga",
  "Quezon Province",
  "Rizal",
];

export const PROPERTY_TYPES = ["Apartment", "Detached house", "Townhouse", "Condo"] as const;
export const INSTALL_TIMELINES = [
  "Within the month",
  "Within the next 2 months",
  "Within the next 6 months",
  "Interested and not urgent",
] as const;

export const MIN_BILL_THRESHOLD = 8000;
