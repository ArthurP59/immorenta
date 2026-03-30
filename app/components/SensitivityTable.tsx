'use client';

import {
  calculateCashflows,
  calculateIRR,
} from '@/lib/calculations/irr';
import { buildProjection } from '@/lib/calculations/operations';
import { ScenarioInput } from '@/lib/calculations/contracts';

type Props = {
  scenario: ScenarioInput;
};

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)} %`;
}

function getColor(value: number, type: 'cash' | 'irr'): string {
  if (type === 'cash') return value >= 0 ? '#15803d' : '#dc2626';
  if (value >= 0.1) return '#15803d';
  if (value >= 0.06) return '#ca8a04';
  return '#dc2626';
}

function buildScenario(
  base: ScenarioInput,
  field: 'monthlyRent' | 'annualInterestRate' | 'annualPriceGrowthRate',
  variation: number,
): ScenarioInput {
  if (field === 'monthlyRent') {
    return { ...base, monthlyRent: base.monthlyRent * (1 + variation) };
  }

  if (field === 'annualInterestRate') {
    return {
      ...base,
      annualInterestRate: Math.max(0, base.annualInterestRate + variation),
    };
  }

  return {
    ...base,
    annualPriceGrowthRate: base.annualPriceGrowthRate + variation,
  };
}

export default function SensitivityTable({ scenario }: Props) {
  const rentVariations = [-0.1, -0.05, 0, 0.05, 0.1];
  const rateVariations = [-0.005, 0, 0.005];
  const valueVariations = [-0.005, 0, 0.005];

  const rentRows = rentVariations.map((variation) => {
    const testScenario = buildScenario(scenario, 'monthlyRent', variation);
    const projection = buildProjection(testScenario);
    const year1 = projection[0];
    const cashflow = year1 ? year1.monthlyCashflow : 0;
    const irr = calculateIRR(calculateCashflows(testScenario));

    return {
      label: `${variation > 0 ? '+' : ''}${(variation * 100).toFixed(0)} %`,
      cashflow,
      irr,
    };
  });

  const rateRows = rateVariations.map((variation) => {
    const testScenario = buildScenario(scenario, 'annualInterestRate', variation);
    const projection = buildProjection(testScenario);
    const year1 = projection[0];
    const cashflow = year1 ? year1.monthlyCashflow : 0;
    const irr = calculateIRR(calculateCashflows(testScenario));

    return {
      label: `${variation > 0 ? '+' : ''}${(variation * 100).toFixed(2)} pts`,
      cashflow,
      irr,
    };
  });

  const valueRows = valueVariations.map((variation) => {
    const testScenario = buildScenario(
      scenario,
      'annualPriceGrowthRate',
      variation,
    );
    const projection = buildProjection(testScenario);
    const year1 = projection[0];
    const cashflow = year1 ? year1.monthlyCashflow : 0;
    const irr = calculateIRR(calculateCashflows(testScenario));

    return {
      label: `${variation > 0 ? '+' : ''}${(variation * 100).toFixed(2)} pts`,
      cashflow,
      irr,
    };
  });

  return (
    <div
      style={{
        marginTop: 24,
        padding: 20,
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        background: '#fff',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Analyse de sensibilité</h2>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>
        Impact des variations de loyer, de taux et de prise de valeur sur le cash-flow et le TRI.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        <SensitivityCard
          title="Sensibilité au loyer"
          rows={rentRows}
        />
        <SensitivityCard
          title="Sensibilité au taux"
          rows={rateRows}
        />
        <SensitivityCard
          title="Sensibilité à la valeur"
          rows={valueRows}
        />
      </div>
    </div>
  );
}

function SensitivityCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; cashflow: number; irr: number }[];
}) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        background: '#f9fafb',
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Variation</th>
            <th style={thStyle}>Cash-flow</th>
            <th style={thStyle}>TRI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={tdStyle}>{row.label}</td>
              <td
                style={{
                  ...tdStyle,
                  color: getColor(row.cashflow, 'cash'),
                  fontWeight: 700,
                }}
              >
                {formatCurrency(row.cashflow)}
              </td>
              <td
                style={{
                  ...tdStyle,
                  color: getColor(row.irr, 'irr'),
                  fontWeight: 700,
                }}
              >
                {formatPercent(row.irr)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 8,
  fontSize: 12,
  borderBottom: '1px solid #d1d5db',
};

const tdStyle: React.CSSProperties = {
  padding: 8,
  fontSize: 13,
  borderBottom: '1px solid #e5e7eb',
};