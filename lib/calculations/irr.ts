import { ScenarioInput } from './contracts';
import { calculateInitialCashInvested } from './acquisition';
import { buildProjection } from './operations';
import { calculateNetSaleProceeds } from './sale';

export function calculateCashflows(input: ScenarioInput): number[] {
  const projection = buildProjection(input);
  const initialCash = calculateInitialCashInvested(input);
  const netSale = calculateNetSaleProceeds(input);

  const cashflows: number[] = [-initialCash];

  projection.forEach((row, index) => {
    const isLastYear = index === projection.length - 1;
    cashflows.push(isLastYear ? row.annualCashflow + netSale : row.annualCashflow);
  });

  return cashflows;
}

function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((sum, cf, i) => {
    return sum + cf / Math.pow(1 + rate, i);
  }, 0);
}

function hasSignChange(cashflows: number[]): boolean {
  let hasPositive = false;
  let hasNegative = false;

  for (const cf of cashflows) {
    if (cf > 0) hasPositive = true;
    if (cf < 0) hasNegative = true;
  }

  return hasPositive && hasNegative;
}

export function calculateIRR(cashflows: number[]): number {
  if (cashflows.length < 2) return 0;
  if (!hasSignChange(cashflows)) return 0;

  let low = -0.9999;
  let high = 5;

  let npvLow = npv(low, cashflows);
  let npvHigh = npv(high, cashflows);

  let attempts = 0;
  while (npvLow * npvHigh > 0 && attempts < 50) {
    high *= 2;
    npvHigh = npv(high, cashflows);
    attempts += 1;
  }

  if (npvLow * npvHigh > 0) {
    return 0;
  }

  for (let i = 0; i < 300; i += 1) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid, cashflows);

    if (Math.abs(npvMid) < 1e-9) {
      return mid;
    }

    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return (low + high) / 2;
}

export function calculateMultipleCashOnCash(input: ScenarioInput): number {
  const projection = buildProjection(input);
  const initialCash = calculateInitialCashInvested(input);
  const netSale = calculateNetSaleProceeds(input);

  if (initialCash === 0) return 0;

  const totalInflows =
    projection.reduce((sum, row) => sum + row.annualCashflow, 0) + netSale;

  return totalInflows / initialCash;
}

export function calculateAverageMonthlyEffort(input: ScenarioInput): number {
  const projection = buildProjection(input);

  if (projection.length === 0) return 0;

  return (
    projection.reduce((sum, row) => sum + row.monthlyCashflow, 0) /
    projection.length
  );
}