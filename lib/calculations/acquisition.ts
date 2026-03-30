import { ScenarioInput } from './contracts';

export function calculateNotaryFees(input: ScenarioInput): number {
  return input.purchasePrice * input.notaryFeesRate;
}

export function calculateTotalProjectCost(input: ScenarioInput): number {
  return (
    input.purchasePrice +
    calculateNotaryFees(input) +
    input.works +
    input.furniture +
    input.loanFees
  );
}

export function calculateFinancedAmount(input: ScenarioInput): number {
  return Math.max(0, calculateTotalProjectCost(input) - input.downPayment);
}

export function calculateInitialCashInvested(input: ScenarioInput): number {
  return Math.min(input.downPayment, calculateTotalProjectCost(input));
}

export function calculateAmortizableBuildingBase(input: ScenarioInput): number {
  return input.purchasePrice * (1 - input.landShareRate);
}

export function calculateAnnualLmnpAmortization(input: ScenarioInput): number {
  const building =
    input.buildingAmortYears > 0
      ? calculateAmortizableBuildingBase(input) / input.buildingAmortYears
      : 0;

  const works =
    input.worksAmortYears > 0 ? input.works / input.worksAmortYears : 0;

  const furniture =
    input.furnitureAmortYears > 0
      ? input.furniture / input.furnitureAmortYears
      : 0;

  const feesBase = calculateNotaryFees(input) + input.loanFees;
  const fees =
    input.feesAmortYears > 0 ? feesBase / input.feesAmortYears : 0;

  return building + works + furniture + fees;
}