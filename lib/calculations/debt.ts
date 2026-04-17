import { DebtYear, ScenarioInput } from './contracts';
import { calculateFinancedAmount } from './acquisition';

function pmt(rate: number, nper: number, pv: number): number {
  if (nper <= 0) return 0;
  if (rate === 0) return pv / nper;
  return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

export function calculateMonthlyPayment(input: ScenarioInput): number {
  const principal = calculateFinancedAmount(input);
  const monthlyRate = input.annualInterestRate / 12;
  const numberOfPayments = input.loanDurationYears * 12;

  if (principal <= 0 || numberOfPayments <= 0) return 0;

  return pmt(monthlyRate, numberOfPayments, principal);
}

export function calculateMonthlyInsurance(input: ScenarioInput): number {
  const principal = calculateFinancedAmount(input);
  return (principal * input.annualInsuranceRate) / 12;
}

export function calculateTotalMonthlyDebt(input: ScenarioInput): number {
  return calculateMonthlyPayment(input) + calculateMonthlyInsurance(input);
}

export function calculateTAEG(input: ScenarioInput): number {
  const financedAmount = calculateFinancedAmount(input);

  if (financedAmount <= 0 || input.loanDurationYears <= 0) {
    return input.annualInterestRate + input.annualInsuranceRate;
  }

  const annualizedLoanFees =
    input.loanFees > 0
      ? input.loanFees / financedAmount / input.loanDurationYears
      : 0;

  return input.annualInterestRate + input.annualInsuranceRate + annualizedLoanFees;
}

export function buildDebtSchedule(input: ScenarioInput): DebtYear[] {
  const principal = calculateFinancedAmount(input);
  const annualInsurance = principal * input.annualInsuranceRate;
  const monthlyRate = input.annualInterestRate / 12;
  const totalMonths = input.loanDurationYears * 12;
  const monthlyPayment = calculateMonthlyPayment(input);

  if (principal <= 0 || totalMonths <= 0) return [];

  let remaining = principal;
  const result: DebtYear[] = [];

  for (let year = 1; year <= input.loanDurationYears; year += 1) {
    const openingBalance = remaining;
    let annualInterest = 0;
    let annualPrincipal = 0;

    for (let m = 1; m <= 12; m += 1) {
      if (remaining <= 0) break;

      const interest = remaining * monthlyRate;
      const principalPart = Math.min(monthlyPayment - interest, remaining);

      annualInterest += interest;
      annualPrincipal += principalPart;
      remaining = Math.max(0, remaining - principalPart);
    }

    const annualPaymentExclInsurance = annualInterest + annualPrincipal;
    const annualDebtService = annualPaymentExclInsurance + annualInsurance;

    result.push({
      year,
      openingBalance,
      rate: input.annualInterestRate,
      annualPaymentExclInsurance,
      annualInsurance,
      annualDebtService,
      interestPaid: annualInterest,
      principalPaid: annualPrincipal,
      closingBalance: remaining,
    });
  }

  return result;
}

export function calculateRemainingLoanBalance(input: ScenarioInput): number {
  const schedule = buildDebtSchedule(input);
  const row = schedule[input.holdingPeriodYears - 1];
  return row ? row.closingBalance : 0;
}