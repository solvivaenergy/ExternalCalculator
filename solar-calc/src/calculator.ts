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

// Constants from ADMIN sheet (aligned with solvivacalc-handoff-v3-59 / v3.2 Excel)
const PANEL_CAPACITY_W = 630;                // Inventory C3
const KWH_PER_KWP_PER_DAY = 3.6;            // Admin C125
const BASE_RTO_RATE = 0.28;                  // Admin C22
const RISK_PREMIUM_RATE = 0.32;              // Admin C22 + C24 (28% + 400bps)
const RISK_PREMIUM_PANELS = 8;               // Admin C23
const BATTERY_EFFICIENCY = 0.92;             // Admin C126
const BATTERY_DOD = 0.95;                    // Admin C127
const PANEL_DEGRADATION = 0.005;             // Admin C128

// Pricing per panel (v3.2 direct prices — Inventory D3)
const PRICE_PER_PANEL_DP = 8600;
const MIN_MOUNTING_SUPPORT_DP = 8579;        // Admin D32
const MOUNTING_PCT = 0.13;                   // Admin C33
const CABLE_PCT_TABLE = [
  // Admin B36:G48 — dcCablePct + acCablePct + conduitsPct + panelBoardPct
  { panels: 1,   total: 0.56 },  // 0.27+0.08+0.12+0.09
  { panels: 8,   total: 0.56 },  // 0.27+0.08+0.12+0.09
  { panels: 10,  total: 0.52 },  // 0.27+0.07+0.10+0.08
  { panels: 13,  total: 0.51 },  // 0.27+0.06+0.10+0.08
  { panels: 16,  total: 0.45 },  // 0.22+0.06+0.10+0.07
  { panels: 19,  total: 0.40 },  // 0.19+0.06+0.09+0.06
  { panels: 24,  total: 0.32 },  // 0.15+0.05+0.07+0.05
  { panels: 31,  total: 0.29 },  // 0.13+0.05+0.07+0.04
];

// Inverter lookup (kWp → inverter) — Inventory single-phase prices
const INVERTERS = [
  { minKwp: 0.01, name: "5.00 kW Inverter", ratedKw: 5,  priceDP: 58384  },
  { minKwp: 5,    name: "6.00 kW Inverter", ratedKw: 6,  priceDP: 65967  },
  { minKwp: 6,    name: "8.00 kW Inverter", ratedKw: 8,  priceDP: 87197  },
  { minKwp: 8,    name: "12.00 kW Inverter", ratedKw: 12, priceDP: 122076 },
  { minKwp: 12,   name: "16.00 kW Inverter", ratedKw: 16, priceDP: 166054 },
];

// Battery pricing — 5 kWh pack (Admin batteryPackages[0])
const BATTERY_UNIT_KWH = 5;
const BATTERY_UNIT_DP = 91898;               // per unit
const BATTERY_RACK_CAPACITY = 3;             // units per rack
const BATTERY_RACK_DP = 7582;               // per rack
const ATS_DP = 9099;
const CRITICAL_LOADS_DP = 3336;
const BATTERY_LABOR_W_SOLAR_DP = 15923;

// Labor & fixed overhead (direct purchase — Admin D53, D109:D113)
const SOLAR_LABOR_PER_KWP_DP = 8341;
const FIXED_OVERHEAD_DP = 2943 + 2066 + 0 + 7582 + 4549; // = 17140

// Fixed available system sizes (panels → kWp) from the proposal generator
// Rounded labels: 5, 6, 8, 10, 13, 15, 20 kWp
const FIXED_PANEL_COUNTS = [8, 10, 13, 16, 21, 25, 32] as const;
const PANEL_KWP_LABEL: Record<number, number> = { 8: 5, 10: 6, 13: 8, 16: 10, 21: 13, 25: 15, 32: 20 };

// Battery sizes to iterate (5 kWh per unit)
const BATTERY_KWH_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];

// ─── Hourly solar radiance ratios (Schedule!A55:A66, B55:B66) ───
// 12 ratios for hours 6 AM–5 PM, summing to 1.0
// production[h] = RADIANCE_RATIOS[h-6] × kWhPerKwpPerDay × systemKwp
const RADIANCE_RATIOS = [
  0.017, 0.049, 0.078, 0.103, 0.121, 0.132,
  0.132, 0.121, 0.103, 0.078, 0.049, 0.017,
] as const;

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

// ─── Hourly load profile ───
// Returns 24 values (kWh per average day, one per hour) = baseload + devices.
// Uses the same isOnAtHour logic as Schedule.js: times stored as day-fractions.
function buildHourlyLoad(devices: DeviceEntry[], dailyBaseloadKwh: number): number[] {
  const load: number[] = Array(24).fill(0);
  const basePerHour = dailyBaseloadKwh / 24;
  for (const device of devices) {
    const info = DEVICES.find((d) => d.name === device.deviceName);
    if (!info) continue;
    const onFrac = hoursTo24(device.onTimeHour, device.onTimeMinute, device.onTimeAmPm) / 24;
    const offFrac = hoursTo24(device.offTimeHour, device.offTimeMinute, device.offTimeAmPm) / 24;
    const dwFrac = device.daysPerWeek / 7;
    for (let h = 0; h < 24; h++) {
      const t = h / 24;
      let on: number;
      if (onFrac === offFrac) {
        on = 1; // all day
      } else if (offFrac > onFrac) {
        on = t >= onFrac && t < offFrac ? 1 : 0;
      } else {
        on = t >= onFrac || t < offFrac ? 1 : 0; // wraps midnight
      }
      load[h] += on * info.avgPower * dwFrac * device.quantity;
    }
  }
  for (let h = 0; h < 24; h++) load[h] += basePerHour;
  return load;
}

// ─── 24-hour energy simulation ───
// Mirrors Schedule.js buildHourlyCurve, returning:
//   coverage = (solarUsed + battUsed) / totalLoad  (= Schedule!F51)
//   dailySavingsKwh = totalLoad - afterBatt          (daily average)
function runHourlySim(
  systemKwp: number,
  batteryKwh: number,
  hourlyLoad: number[],
): { coverage: number; dailySavingsKwh: number } {
  const solarUsed: number[] = Array(24).fill(0);
  const excessSolar: number[] = Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    const prod =
      h >= 6 && h <= 17
        ? RADIANCE_RATIOS[h - 6] * KWH_PER_KWP_PER_DAY * systemKwp
        : 0;
    solarUsed[h] = Math.min(hourlyLoad[h], prod);
    excessSolar[h] = prod - solarUsed[h];
  }
  const dailyExcess = excessSolar.reduce((s, v) => s + v, 0);
  // Schedule H12: usable battery = min(excess, cap×eff) × DOD
  let battRemaining =
    Math.min(dailyExcess, batteryKwh * BATTERY_EFFICIENCY) * BATTERY_DOD;
  let afterBattTotal = 0;
  for (let h = 0; h < 24; h++) {
    const uncovered = hourlyLoad[h] - solarUsed[h];
    const battUsed = Math.min(battRemaining, uncovered);
    battRemaining -= battUsed;
    afterBattTotal += uncovered - battUsed;
  }
  const totalLoad = hourlyLoad.reduce((s, v) => s + v, 0);
  const coverage = totalLoad > 0 ? 1 - afterBattTotal / totalLoad : 0;
  return { coverage, dailySavingsKwh: totalLoad - afterBattTotal };
}

// ─── Direct-purchase price estimate (for tier cost comparison) ───
function computeDP(panels: number, batteryKwh: number): number {
  const kwp = (panels * PANEL_CAPACITY_W) / 1000;
  const pCost = panels * PRICE_PER_PANEL_DP;
  const mounting = Math.max(MIN_MOUNTING_SUPPORT_DP, pCost * MOUNTING_PCT);
  const cables = lookupCablePct(panels) * pCost;
  const labor = kwp * SOLAR_LABOR_PER_KWP_DP + FIXED_OVERHEAD_DP;
  const inv = lookupInverter(kwp).priceDP;
  let battCost = 0;
  if (batteryKwh > 0) {
    const n = Math.ceil(batteryKwh / BATTERY_UNIT_KWH);
    battCost =
      n * BATTERY_UNIT_DP +
      Math.ceil(n / BATTERY_RACK_CAPACITY) * BATTERY_RACK_DP +
      ATS_DP + CRITICAL_LOADS_DP + BATTERY_LABOR_W_SOLAR_DP;
  }
  return pCost + mounting + cables + labor + inv + battCost;
}

// ─── Coverage-based tier size selection ───
// Returns the (panels, batteryKwh) with minimum cost that achieves
// targetCoverage using the hourly simulation.
function selectTierSize(
  targetCoverage: number,
  withBattery: boolean,
  hourlyLoad: number[],
): { panels: number; batteryKwh: number } {
  if (!withBattery) {
    // No battery: iterate fixed kWp sizes and find smallest meeting target
    for (const panels of FIXED_PANEL_COUNTS) {
      const kwp = (panels * PANEL_CAPACITY_W) / 1000;
      if (runHourlySim(kwp, 0, hourlyLoad).coverage >= targetCoverage) {
        return { panels, batteryKwh: 0 };
      }
    }
    return { panels: FIXED_PANEL_COUNTS[FIXED_PANEL_COUNTS.length - 1], batteryKwh: 0 };
  }
  // With battery: for each fixed kWp, find minimum battery kWh meeting target,
  // then pick the lowest-cost valid (kWp, battery) combination.
  let best: { panels: number; batteryKwh: number; cost: number } | null = null;
  for (const panels of FIXED_PANEL_COUNTS) {
    const kwp = (panels * PANEL_CAPACITY_W) / 1000;
    for (const batt of BATTERY_KWH_OPTIONS) {
      if (runHourlySim(kwp, batt, hourlyLoad).coverage >= targetCoverage) {
        const cost = computeDP(panels, batt);
        if (!best || cost < best.cost) best = { panels, batteryKwh: batt, cost };
        break; // minimum battery found for this kWp
      }
    }
  }
  if (best) return { panels: best.panels, batteryKwh: best.batteryKwh };
  // Target unachievable — return the combination with highest coverage
  let bestCov = 0;
  let fallback = {
    panels: FIXED_PANEL_COUNTS[FIXED_PANEL_COUNTS.length - 1] as number,
    batteryKwh: BATTERY_KWH_OPTIONS[BATTERY_KWH_OPTIONS.length - 1],
  };
  for (const panels of FIXED_PANEL_COUNTS) {
    const kwp = (panels * PANEL_CAPACITY_W) / 1000;
    for (const batt of BATTERY_KWH_OPTIONS) {
      const { coverage } = runHourlySim(kwp, batt, hourlyLoad);
      if (coverage > bestCov) {
        bestCov = coverage;
        fallback = { panels, batteryKwh: batt };
      }
    }
  }
  return fallback;
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
  targetCoverage: number,
  hourlyLoad: number[],
  electricityRate: number,
  withBattery: boolean,
  label: string,
): SystemTier {
  const { panels, batteryKwh } = selectTierSize(targetCoverage, withBattery, hourlyLoad);
  const kwpSystem = (panels * PANEL_CAPACITY_W) / 1000;

  // Run simulation to get actual savings
  const { coverage, dailySavingsKwh } = runHourlySim(kwpSystem, batteryKwh, hourlyLoad);
  const DAYS_PER_MONTH = 365 / 12;
  const savingsKwh = dailySavingsKwh * DAYS_PER_MONTH;
  // Round monthly peso savings to nearest ₱100 — matches Schedule J45 ROUND(...,-2)
  const monthlySavings = Math.round(electricityRate * savingsKwh / 100) * 100;
  const savingsPct = coverage; // coverage fraction = savingsKwh / monthlyConsumptionKwh

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
  if (batteryKwh > 0) {
    const numBatteries = Math.ceil(batteryKwh / BATTERY_UNIT_KWH);
    const numRacks = Math.ceil(numBatteries / BATTERY_RACK_CAPACITY);
    batteryTotalDP =
      numBatteries * BATTERY_UNIT_DP +
      numRacks * BATTERY_RACK_DP +
      ATS_DP + CRITICAL_LOADS_DP + BATTERY_LABOR_W_SOLAR_DP;
  }

  const totalDP = panelsCostDP + mountingDP + cablesDP + laborDP + inverterDP + batteryTotalDP;

  // RTO price — derived from DP at actual rate (annuity due, 60-mo)
  const totalRTO = dpToRto(totalDP, actualRate);
  const monthlyPaymentRTO = totalRTO / 60;

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

  // Build 24-hour load profile for hourly simulation (average day, kWh per hour)
  const dailyBaseloadKwh = Math.max(0, baseload) * 12 / 365;
  const hourlyLoad = buildHourlyLoad(inputs.devices, dailyBaseloadKwh);

  // 3 tiers (coverage-based, using hourly simulation matching reference schedule.js)
  // Starter: no battery, smallest fixed kWp with coverage ≥ 30%
  // Recommended: with battery, lowest-cost combo with coverage ≥ 50%
  // Full Independence: with battery, lowest-cost combo with coverage = 100%
  const starter = calcSystemTier(0.30, hourlyLoad, rate, false, "Starter System");
  const recommended = calcSystemTier(0.50, hourlyLoad, rate, true, "With Battery");
  const full = calcSystemTier(1.00, hourlyLoad, rate, true, "Full Independence");

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
