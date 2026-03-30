'use client';

import { ScenarioInput } from '@/lib/calculations/contracts';

function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export default function MonthlyTable({ scenario }: { scenario: ScenarioInput }) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const monthlyRent = scenario.monthlyRent;
  const vacancy = scenario.vacancyRate;

  const charges =
    scenario.nonRecoverableChargesAnnual / 12 +
    scenario.propertyTaxAnnual / 12 +
    scenario.pnoInsuranceAnnual / 12 +
    scenario.maintenanceAnnual / 12 +
    scenario.accountingAnnual / 12 +
    scenario.otherChargesAnnual / 12;

  const credit =
    (scenario.loanDurationYears > 0
      ? (scenario.purchasePrice * (1 - scenario.downPayment / scenario.purchasePrice))
      : 0) / (scenario.loanDurationYears * 12);

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
      <h2>Tableau mensuel (année 1)</h2>

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#111827', color: '#fff' }}>
              <th style={th}>Mois</th>
              <th style={th}>Loyer brut</th>
              <th style={th}>Vacance</th>
              <th style={th}>Loyer encaissé</th>
              <th style={th}>Charges</th>
              <th style={th}>Crédit</th>
              <th style={th}>Cashflow</th>
            </tr>
          </thead>

          <tbody>
            {months.map((m) => {
              const rent = monthlyRent;
              const vac = rent * vacancy;
              const collected = rent - vac;

              const cashflow = collected - charges - credit;

              return (
                <tr key={m}>
                  <td style={td}>{m}</td>
                  <td style={td}>{formatCurrency(rent)}</td>
                  <td style={td}>{formatCurrency(vac)}</td>
                  <td style={td}>{formatCurrency(collected)}</td>
                  <td style={td}>{formatCurrency(charges)}</td>
                  <td style={td}>{formatCurrency(credit)}</td>
                  <td
                    style={{
                      ...td,
                      color: cashflow >= 0 ? 'green' : 'red',
                      fontWeight: 600,
                    }}
                  >
                    {formatCurrency(cashflow)}
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

const th = {
  padding: 10,
  textAlign: 'left' as const,
};

const td = {
  padding: 10,
  borderBottom: '1px solid #e5e7eb',
};