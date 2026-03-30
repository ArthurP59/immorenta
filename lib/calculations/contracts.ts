export type TaxRegime = 'nue_reel' | 'lmnp_reel';

export interface ScenarioInput {
  name: string;

  // Acquisition
  purchasePrice: number;
  notaryFeesRate: number;
  works: number;
  furniture: number;
  loanFees: number;

  // Exploitation
  monthlyRent: number;
  vacancyRate: number;
  annualRentGrowthRate: number;

  // Charges annuelles
  nonRecoverableChargesAnnual: number;
  propertyTaxAnnual: number;
  pnoInsuranceAnnual: number;
  gliRate: number;
  managementFeesRate: number;
  accountingAnnual: number;
  maintenanceAnnual: number;
  otherChargesAnnual: number;
  annualChargesGrowthRate: number;

  // Financement
  downPayment: number;
  annualInterestRate: number;
  loanDurationYears: number;
  annualInsuranceRate: number;

  // Revente
  holdingPeriodYears: number;
  annualPriceGrowthRate: number;
  saleFeesRate: number;

  // Fiscalité
  taxRegime: TaxRegime;
  marginalTaxRate: number;
  socialTaxRate: number;
  landShareRate: number;
  buildingAmortYears: number;
  worksAmortYears: number;
  furnitureAmortYears: number;
  feesAmortYears: number;
}

export interface DebtYear {
  year: number;
  openingBalance: number;
  rate: number;
  annualPaymentExclInsurance: number;
  annualInsurance: number;
  annualDebtService: number;
  interestPaid: number;
  principalPaid: number;
  closingBalance: number;
}

export interface ProjectionYear {
  year: number;
  monthlyRent: number;
  annualGrossRent: number;
  annualVacancyLoss: number;
  annualCollectedRent: number;

  coproNonRecoverable: number;
  propertyTax: number;
  pnoInsurance: number;
  gli: number;
  managementFees: number;
  maintenance: number;
  accounting: number;
  otherCharges: number;

  annualCharges: number;
  noi: number;
  annualDebtService: number;
  annualCashflow: number;
  monthlyCashflow: number;

  annualInterest: number;
  annualPrincipal: number;
  remainingBalanceEnd: number;
}