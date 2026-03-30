import { ScenarioInput } from './contracts';
import { calculateTotalProjectCost } from './acquisition';
import { calculateMonthlyCashflow, calculateMonthlyCharges, calculateMonthlyRent } from './operations';

export function calculateAnnualRent(input: ScenarioInput): number {
  return calculateMonthlyRent(input) * 12;
}

export function calculateAnnualCharges(input: ScenarioInput): number {
  return calculateMonthlyCharges(input) * 12;
}

export function calculateAnnualCashflow(input: ScenarioInput): number {
  return calculateMonthlyCashflow(input) * 12;
}

export function calculateGrossYield(input: ScenarioInput): number {
  const totalProjectCost = calculateTotalProjectCost(input);
  if (totalProjectCost === 0) return 0;

  return calculateAnnualRent(input) / totalProjectCost;
}

export function calculateNetYield(input: ScenarioInput): number {
  const totalProjectCost = calculateTotalProjectCost(input);
  if (totalProjectCost === 0) return 0;

  return (calculateAnnualRent(input) - calculateAnnualCharges(input)) / totalProjectCost;
}