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
const RTO_INTEREST_RATE = 0.28;
const BATTERY_EFFICIENCY = 0.98;
const BATTERY_DOD = 0.95;
const PANEL_DEGRADATION = 0.005; // per year
// const MAINTENANCE_INFLATION = 0.03;
// const NET_METERING_EFFICIENCY = 0.5;

// Pricing per panel (60-mo RTO)
const PRICE_PER_PANEL_RTO = 14139.33;
const MIN_MOUNTING_SUPPORT_RTO = 11795.88;
const MOUNTING_PCT = 0.16;

// Cable percentage lookup (panels → total cable pct)
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
  { minKwp: 0.01, name: "5.00 kW Inverter", ratedKw: 5, priceRTO: 121104.38, priceDP: 66338.46 },
  { minKwp: 5, name: "6.00 kW Inverter", ratedKw: 6, priceRTO: 136832.22, priceDP: 74953.85 },
  { minKwp: 6, name: "8.00 kW Inverter", ratedKw: 8, priceRTO: 180870.17, priceDP: 99076.92 },
  { minKwp: 8, name: "12.00 kW Inverter", ratedKw: 12, priceRTO: 253218.24, priceDP: 138707.69 },
  { minKwp: 12, name: "16.00 kW Inverter", ratedKw: 16, priceRTO: 344439.72, priceDP: 188676.92 },
];

// Battery pricing (60-mo RTO)
const BATTERY_PACK_RTO = 135573.99;
const BATTERY_RACK_RTO = 15727.84;
const ATS_RTO = 18873.41;
const CRITICAL_LOADS_RTO = 6920.25;
const BATTERY_LABOR_W_SOLAR_RTO = 33028.47;

// Labor & fixed overhead
const SOLAR_LABOR_PER_KWP_RTO = 14155.06;
const FIXED_OVERHEAD_RTO = 35554.75;

// Direct purchase equivalents
const PRICE_PER_PANEL_DP = 7745.23;
const MIN_MOUNTING_SUPPORT_DP = 6461.54;
const SOLAR_LABOR_PER_KWP_DP = 7753.85;
const FIXED_OVERHEAD_DP = 19476.15;
const BATTERY_PACK_DP = 74264.62;
const BATTERY_RACK_DP = 8615.38;
const ATS_DP = 10338.46;
const CRITICAL_LOADS_DP = 3790.77;
const BATTERY_LABOR_W_SOLAR_DP = 18092.31;

// ─── Helpers ───

function pmtFormula(rate: number, nper: number, pv: number): number {
  if (rate === 0) return -pv / nper;
  const factor = Math.pow(1 + rate, nper);
  return (-pv * rate * factor) / (factor - 1);
}

function pvFormula(rate: number, nper: number, pmt: number): number {
  if (rate === 0) return -pmt * nper;
  const factor = Math.pow(1 + rate, nper);
  return (-pmt * (factor - 1)) / (rate * factor);
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
  usageProfile: string; // "Daytime User" | "Nighttime User" | "Balanced"
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
  label: string
): SystemTier {
  // Panel sizing (from CALCULATOR Q32-Q33)
  const battNight = withBattery ? nightTimeKwh / BATTERY_EFFICIENCY / BATTERY_DOD : 0;
  const dailyCapacity = (dayTimeKwh + battNight) * 12 / 365;
  const panelsRaw = (savingsFactor * dailyCapacity * 1000) / PANEL_CAPACITY_W / KWH_PER_KWP_PER_DAY;
  const panels = Math.max(1, Math.ceil(panelsRaw));
  const kwpSystem = (panels * PANEL_CAPACITY_W) / 1000;

  // Pricing — RTO (60-month)
  const panelsCostRTO = panels * PRICE_PER_PANEL_RTO;
  const mountingRTO = Math.max(MIN_MOUNTING_SUPPORT_RTO, panelsCostRTO * MOUNTING_PCT);
  const cablePct = lookupCablePct(panels);
  const cablesRTO = cablePct * panelsCostRTO;
  const laborRTO = kwpSystem * SOLAR_LABOR_PER_KWP_RTO + FIXED_OVERHEAD_RTO;
  const inverter = lookupInverter(kwpSystem);
  const inverterRTO = inverter.priceRTO;

  let batteryTotalRTO = 0;
  let batteryKwh = 0;
  if (withBattery) {
    batteryKwh = 5; // Standard 5kW Pylontech
    batteryTotalRTO = BATTERY_PACK_RTO + BATTERY_RACK_RTO + ATS_RTO + CRITICAL_LOADS_RTO + BATTERY_LABOR_W_SOLAR_RTO;
  }

  const totalRTO = panelsCostRTO + mountingRTO + cablesRTO + laborRTO + inverterRTO + batteryTotalRTO;

  // Direct purchase price
  const panelsCostDP = panels * PRICE_PER_PANEL_DP;
  const mountingDP = Math.max(MIN_MOUNTING_SUPPORT_DP, panelsCostDP * MOUNTING_PCT);
  const cablesDP = cablePct * panelsCostDP;
  const laborDP = kwpSystem * SOLAR_LABOR_PER_KWP_DP + FIXED_OVERHEAD_DP;
  const inverterDP = inverter.priceDP;
  let batteryTotalDP = 0;
  if (withBattery) {
    batteryTotalDP = BATTERY_PACK_DP + BATTERY_RACK_DP + ATS_DP + CRITICAL_LOADS_DP + BATTERY_LABOR_W_SOLAR_DP;
  }
  const totalDP = panelsCostDP + mountingDP + cablesDP + laborDP + inverterDP + batteryTotalDP;

  // Monthly payment (60-month RTO, from M9 formula)
  const monthlyRate = RTO_INTEREST_RATE / 12;
  const pvOfTotal = pvFormula(monthlyRate, 60, -totalRTO / 60);
  const monthlyPaymentRTO = -pmtFormula(monthlyRate, 60, pvOfTotal);

  // Savings
  const monthlySavings = electricityRate * monthlyConsumptionKwh * savingsFactor;
  const savingsPct = savingsFactor;

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
  const dayTimePct = monthlyConsumptionKwh > 0 ? dayTimeKwh / monthlyConsumptionKwh : 0.5;

  let usageProfile: string;
  if (dayTimePct >= 0.6) usageProfile = "Daytime User";
  else if (dayTimePct <= 0.4) usageProfile = "Nighttime User";
  else usageProfile = "Balanced User";

  // 3 tiers
  const starter = calcSystemTier(0.5, monthlyConsumptionKwh, dayTimeKwh, nightTimeKwh, rate, false, "Starter System");
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

export const PROPERTY_TYPES = ["House", "Townhouse", "Condo", "Commercial"] as const;
export const INSTALL_TIMELINES = [
  "Within 1 month",
  "1-3 months",
  "3-6 months",
  "6+ months",
  "Just exploring",
] as const;

export const MIN_BILL_THRESHOLD = 8000;
