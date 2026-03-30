'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ProjectionYear, ScenarioInput } from '@/lib/calculations/contracts';

type Props = {
  projection: ProjectionYear[];
  scenario: ScenarioInput;
};

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export default function Charts({ projection, scenario }: Props) {
  const cashflowData = projection.map((row) => ({
    year: row.year,
    cashflow: Math.round(row.annualCashflow),
    noi: Math.round(row.noi),
  }));

  const valueData = projection.map((row) => ({
    year: row.year,
    capital: Math.round(row.remainingBalanceEnd),
    valeur: Math.round(
      scenario.purchasePrice *
        Math.pow(1 + scenario.annualPriceGrowthRate, row.year),
    ),
  }));

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
      <h2 style={{ marginTop: 0 }}>Graphiques</h2>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Cash-flow annuel</h3>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={cashflowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="cashflow"
                name="Cash-flow"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="noi"
                name="NOI"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ marginTop: 0 }}>Capital restant dû vs valeur du bien</h3>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={valueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="capital"
                name="Capital restant dû"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="valeur"
                name="Valeur du bien"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}