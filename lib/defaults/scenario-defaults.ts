import { ScenarioInput } from '@/lib/calculations/contracts';

export const defaultScenario: ScenarioInput = {
  name: 'Simulation V1',

  // Acquisition
  purchasePrice: 130000,
  notaryFeesRate: 0.08,
  works: 0,
  furniture: 1000,
  loanFees: 2500,

  // Exploitation
  monthlyRent: 600,
  vacancyRate: 0,
  annualRentGrowthRate: 0.005,

  // Charges annuelles
  nonRecoverableChargesAnnual: 720,
  propertyTaxAnnual: 913,
  pnoInsuranceAnnual: 300,
  gliRate: 0,
  managementFeesRate: 0,
  accountingAnnual: 0,
  maintenanceAnnual: 500,
  otherChargesAnnual: 0,
  annualChargesGrowthRate: 0.02,

  // Financement
  downPayment: 11400,
  annualInterestRate: 0.034,
  loanDurationYears: 25,
  annualInsuranceRate: 0.0036,

  // Revente
  holdingPeriodYears: 15,
  annualPriceGrowthRate: 0.01,
  saleFeesRate: 0.07,

  // Fiscalité
  taxRegime: 'lmnp_reel',
  marginalTaxRate: 0.3,
  socialTaxRate: 0.172,
  landShareRate: 0.15,
  buildingAmortYears: 40,
  worksAmortYears: 10,
  furnitureAmortYears: 7,
  feesAmortYears: 5,
};