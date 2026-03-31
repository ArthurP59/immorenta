'use client';

import { useEffect, useState } from 'react';

import {
  calculateInitialCashInvested,
  calculateTotalProjectCost,
} from '@/lib/calculations/acquisition';
import { calculateCashflows, calculateIRR } from '@/lib/calculations/irr';
import { buildProjection } from '@/lib/calculations/operations';
import { ScenarioInput } from '@/lib/calculations/contracts';

type ScenarioItem = {
  id: string;
  name: string;
  data: ScenarioInput;
};

type Props = {
  scenarios: ScenarioItem[];
  onScenarioChange: (
    id: string,
    key: 'monthlyRent' | 'annualInterestRate' | 'annualPriceGrowthRate',
    value: number,
  ) => void;
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

function getColor(value: number, type: 'cash' | 'yield' | 'irr'): string {
  if (type === 'cash') return value >= 0 ? '#15803d' : '#dc2626';
  if (type === 'irr') {
    if (value >= 0.1) return '#15803d';
    if (value >= 0.06) return '#ca8a04';
    return '#dc2626';
  }
  if (value >= 0.08) return '#15803d';
  if (value >= 0.05) return '#ca8a04';
  return '#dc2626';
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 13,
  background: '#fff',
  boxSizing: 'border-box',
};

export default function ScenarioComparison({
  scenarios,
  onScenarioChange,
}: Props) {
  const [viewportWidth, setViewportWidth] = useState<number>(1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isMobile = viewportWidth < 900;

  const rows = scenarios.map((scenario) => {
    const totalProjectCost = calculateTotalProjectCost(scenario.data);
    const initialCashInvested = calculateInitialCashInvested(scenario.data);
    const projection = buildProjection(scenario.data);
    const year1 = projection[0];

    const grossYield =
      year1 && totalProjectCost > 0 ? year1.annualGrossRent / totalProjectCost : 0;

    const netYield =
      year1 && totalProjectCost > 0 ? year1.noi / totalProjectCost : 0;

    const monthlyCashflow = year1 ? year1.monthlyCashflow : 0;
    const irr = calculateIRR(calculateCashflows(scenario.data));

    return {
      id: scenario.id,
      name: scenario.name,
      monthlyRent: scenario.data.monthlyRent,
      annualInterestRate: scenario.data.annualInterestRate,
      annualPriceGrowthRate: scenario.data.annualPriceGrowthRate,
      totalProjectCost,
      initialCashInvested,
      monthlyCashflow,
      grossYield,
      netYield,
      irr,
    };
  });

  const bestIrr = Math.max(...rows.map((r) => r.irr));
  const bestCashflow = Math.max(...rows.map((r) => r.monthlyCashflow));

  return (
    <div
      style={{
        marginTop: 24,
        padding: isMobile ? 14 : 20,
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        background: '#fff',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Comparaison de scénarios</h2>
      <p style={{ color: '#6b7280', marginBottom: 20, lineHeight: 1.45 }}>
        Tu peux modifier directement les variables de scénario : <strong>loyer</strong>,{' '}
        <strong>taux</strong> et <strong>prise de valeur annuelle</strong>.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
          minWidth: 0,
        }}
      >
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 16,
              background: '#f9fafb',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            <h3 style={{ marginTop: 0 }}>{scenario.name}</h3>

            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <label style={labelStyle}>Loyer mensuel</label>
                <input
                  style={inputStyle}
                  type="number"
                  value={scenario.data.monthlyRent}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onScenarioChange(
                      scenario.id,
                      'monthlyRent',
                      Number(e.target.value),
                    )
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>Taux annuel</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.001"
                  value={scenario.data.annualInterestRate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onScenarioChange(
                      scenario.id,
                      'annualInterestRate',
                      Number(e.target.value),
                    )
                  }
                />
              </div>

              <div>
                <label style={labelStyle}>Prise de valeur annuelle</label>
                <input
                  style={inputStyle}
                  type="number"
                  step="0.001"
                  value={scenario.data.annualPriceGrowthRate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onScenarioChange(
                      scenario.id,
                      'annualPriceGrowthRate',
                      Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', minWidth: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr style={{ background: '#111827', color: '#fff' }}>
              <th style={thStyle}>Scénario</th>
              <th style={thStyle}>Loyer</th>
              <th style={thStyle}>Taux</th>
              <th style={thStyle}>Prise de valeur</th>
              <th style={thStyle}>Coût total</th>
              <th style={thStyle}>Cash investi</th>
              <th style={thStyle}>Cash-flow mensuel</th>
              <th style={thStyle}>Rendement brut</th>
              <th style={thStyle}>Rendement net</th>
              <th style={thStyle}>TRI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const bg = index % 2 === 0 ? '#fff' : '#f9fafb';
              return (
                <tr key={row.id} style={{ background: bg }}>
                  <td style={tdStyle}>{row.name}</td>
                  <td style={tdStyle}>{formatCurrency(row.monthlyRent)}</td>
                  <td style={tdStyle}>{formatPercent(row.annualInterestRate)}</td>
                  <td style={tdStyle}>{formatPercent(row.annualPriceGrowthRate)}</td>
                  <td style={tdStyle}>{formatCurrency(row.totalProjectCost)}</td>
                  <td style={tdStyle}>{formatCurrency(row.initialCashInvested)}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color: getColor(row.monthlyCashflow, 'cash'),
                      fontWeight: row.monthlyCashflow === bestCashflow ? 700 : 500,
                    }}
                  >
                    {formatCurrency(row.monthlyCashflow)}
                  </td>
                  <td style={{ ...tdStyle, color: getColor(row.grossYield, 'yield') }}>
                    {formatPercent(row.grossYield)}
                  </td>
                  <td style={{ ...tdStyle, color: getColor(row.netYield, 'yield') }}>
                    {formatPercent(row.netYield)}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: getColor(row.irr, 'irr'),
                      fontWeight: row.irr === bestIrr ? 700 : 500,
                    }}
                  >
                    {formatPercent(row.irr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  color: '#374151',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 10,
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
};