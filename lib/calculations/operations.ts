import { ProjectionYear, ScenarioInput } from './contracts';
import { buildDebtSchedule } from './debt';

export function calculateMonthlyRent(input: ScenarioInput): number {
  return input.monthlyRent;
}

export function calculateMonthlyRentForYear(
  input: ScenarioInput,
  year: number,
): number {
  return input.monthlyRent * Math.pow(1 + input.annualRentGrowthRate, year - 1);
}

export function calculateAnnualGrossRentForYear(
  input: ScenarioInput,
  year: number,
): number {
  return calculateMonthlyRentForYear(input, year) * 12;
}

export function calculateAnnualVacancyLossForYear(
  input: ScenarioInput,
  year: number,
): number {
  return calculateAnnualGrossRentForYear(input, year) * input.vacancyRate;
}

export function calculateAnnualCollectedRentForYear(
  input: ScenarioInput,
  year: number,
): number {
  return (
    calculateAnnualGrossRentForYear(input, year) -
    calculateAnnualVacancyLossForYear(input, year)
  );
}

function growth(value: number, rate: number, year: number): number {
  return value * Math.pow(1 + rate, year - 1);
}

export function calculateAnnualChargesBreakdownForYear(
  input: ScenarioInput,
  year: number,
) {
  const collectedRent = calculateAnnualCollectedRentForYear(input, year);

  const coproNonRecoverable = growth(
    input.nonRecoverableChargesAnnual,
    input.annualChargesGrowthRate,
    year,
  );

  const propertyTax = growth(
    input.propertyTaxAnnual,
    input.annualChargesGrowthRate,
    year,
  );

  const pnoInsurance = growth(
    input.pnoInsuranceAnnual,
    input.annualChargesGrowthRate,
    year,
  );

  const maintenance = growth(
    input.maintenanceAnnual,
    input.annualChargesGrowthRate,
    year,
  );

  const accounting = growth(
    input.accountingAnnual,
    input.annualChargesGrowthRate,
    year,
  );

  const otherCharges = growth(
    input.otherChargesAnnual,
    input.annualChargesGrowthRate,
    year,
  );

  const gli = collectedRent * input.gliRate;
  const managementFees = collectedRent * input.managementFeesRate;

  const annualCharges =
    coproNonRecoverable +
    propertyTax +
    pnoInsurance +
    gli +
    managementFees +
    maintenance +
    accounting +
    otherCharges;

  return {
    coproNonRecoverable,
    propertyTax,
    pnoInsurance,
    gli,
    managementFees,
    maintenance,
    accounting,
    otherCharges,
    annualCharges,
  };
}

export function calculateMonthlyCharges(input: ScenarioInput): number {
  const b = calculateAnnualChargesBreakdownForYear(input, 1);
  return b.annualCharges / 12;
}

export function calculateMonthlyCashflow(input: ScenarioInput): number {
  const projection = buildProjection(input);
  return projection[0] ? projection[0].monthlyCashflow : 0;
}

export function buildProjection(input: ScenarioInput): ProjectionYear[] {
  const debtSchedule = buildDebtSchedule(input);
  const rows: ProjectionYear[] = [];

  for (let year = 1; year <= input.holdingPeriodYears; year += 1) {
    const monthlyRent = calculateMonthlyRentForYear(input, year);
    const annualGrossRent = monthlyRent * 12;
    const annualVacancyLoss = annualGrossRent * input.vacancyRate;
    const annualCollectedRent = annualGrossRent - annualVacancyLoss;

    const charges = calculateAnnualChargesBreakdownForYear(input, year);
    const debt = debtSchedule[year - 1];

    const annualDebtService = debt ? debt.annualDebtService : 0;
    const annualInterest = debt ? debt.interestPaid : 0;
    const annualPrincipal = debt ? debt.principalPaid : 0;
    const remainingBalanceEnd = debt ? debt.closingBalance : 0;

    const noi = annualCollectedRent - charges.annualCharges;
    const annualCashflow = noi - annualDebtService;
    const monthlyCashflow = annualCashflow / 12;

    rows.push({
      year,
      monthlyRent,
      annualGrossRent,
      annualVacancyLoss,
      annualCollectedRent,

      coproNonRecoverable: charges.coproNonRecoverable,
      propertyTax: charges.propertyTax,
      pnoInsurance: charges.pnoInsurance,
      gli: charges.gli,
      managementFees: charges.managementFees,
      maintenance: charges.maintenance,
      accounting: charges.accounting,
      otherCharges: charges.otherCharges,

      annualCharges: charges.annualCharges,
      noi,
      annualDebtService,
      annualCashflow,
      monthlyCashflow,

      annualInterest,
      annualPrincipal,
      remainingBalanceEnd,
    });
  }

  return rows;
}