'use client';

import { useEffect, useState } from 'react';
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

function formatTooltipValue(value: unknown): string {
  return typeof value === 'number' ? formatCurrency(value) : String(value ?? '');
}

export default function Charts({ projection, scenario }: Props) {
  const [mounted, setMounted] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(1200);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isMobile = viewportWidth < 900;
  const chartHeight = isMobile ? 280 : 320;

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
        padding: isMobile ? 14 : 20,
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        background: '#fff',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Graphiques</h2>

      <div style={{ marginTop: 24, minWidth: 0 }}>
        <h3 style={{ marginTop: 0 }}>Cash-flow annuel</h3>
        <div
          style={{
            width: '100%',
            height: chartHeight,
            minHeight: chartHeight,
            minWidth: 0,
          }}
        >
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={cashflowData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis width={isMobile ? 60 : 80} />
                <Tooltip formatter={formatTooltipValue} />
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
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 32, minWidth: 0 }}>
        <h3 style={{ marginTop: 0 }}>Capital restant dû vs valeur du bien</h3>
        <div
          style={{
            width: '100%',
            height: chartHeight,
            minHeight: chartHeight,
            minWidth: 0,
          }}
        >
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={valueData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis width={isMobile ? 60 : 80} />
                <Tooltip formatter={formatTooltipValue} />
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
          ) : null}
        </div>
      </div>
    </div>
  );
}