import { ScenarioInput } from './contracts';
import { calculateRemainingLoanBalance } from './debt';
import { buildProjection } from './operations';
import { calculateTotalProjectCost } from './acquisition';

export function calculateGrossSalePrice(input: ScenarioInput): number {
  return input.purchasePrice * Math.pow(1 + input.annualPriceGrowthRate, input.holdingPeriodYears);
}

export function calculateSaleFees(input: ScenarioInput): number {
  return calculateGrossSalePrice(input) * input.saleFeesRate;
}

export function calculateNetSaleProceeds(input: ScenarioInput): number {
  return (
    calculateGrossSalePrice(input) -
    calculateSaleFees(input) -
    calculateRemainingLoanBalance(input)
  );
}

export function calculateCapAchat(input: ScenarioInput): number {
  const projection = buildProjection(input);
  const year1 = projection[0];
  const totalProjectCost = calculateTotalProjectCost(input);

  if (!year1 || totalProjectCost === 0) return 0;

  return year1.annualGrossRent / totalProjectCost;
}

export function calculateCapSortie(input: ScenarioInput): number {
  const projection = buildProjection(input);
  const lastYear = projection[projection.length - 1];
  const grossSalePrice = calculateGrossSalePrice(input);

  if (!lastYear || grossSalePrice === 0) return 0;

  return lastYear.annualGrossRent / grossSalePrice;
}

export function calculateCapRateGain(input: ScenarioInput): number {
  return calculateCapSortie(input) - calculateCapAchat(input);
}