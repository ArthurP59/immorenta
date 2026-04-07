'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { User } from 'firebase/auth';

import Charts from '@/app/components/Charts';
import ScenarioComparison from '@/app/components/ScenarioComparison';
import SensitivityTable from '@/app/components/SensitivityTable';
import AuthPanel from '@/components/AuthPanel';

import {
  calculateFinancedAmount,
  calculateInitialCashInvested,
  calculateNotaryFees,
  calculateTotalProjectCost,
} from '@/lib/calculations/acquisition';

import {
  buildDebtSchedule,
  calculateMonthlyInsurance,
  calculateMonthlyPayment,
  calculateTotalMonthlyDebt,
} from '@/lib/calculations/debt';

import {
  calculateAverageMonthlyEffort,
  calculateCashflows,
  calculateIRR,
  calculateMultipleCashOnCash,
} from '@/lib/calculations/irr';

import {
  buildProjection,
  calculateAnnualChargesBreakdownForYear,
} from '@/lib/calculations/operations';

import {
  calculateCapAchat,
  calculateCapRateGain,
  calculateCapSortie,
  calculateGrossSalePrice,
  calculateNetSaleProceeds,
  calculateSaleFees,
} from '@/lib/calculations/sale';

import { ScenarioInput } from '@/lib/calculations/contracts';
import { defaultScenario } from '@/lib/defaults/scenario-defaults';

import { subscribeToAuth } from '@/lib/auth';
import {
  createSimulation,
  deleteSimulation,
  getSimulations,
  renameSimulation,
  updateSimulation,
  type SavedSimulation,
} from '@/lib/simulations';

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

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCashColor(value: number): string {
  return value >= 0 ? '#15803d' : '#dc2626';
}

function getGrossYieldColor(value: number): string {
  if (value < 0.03) return '#dc2626';
  if (value > 0.07) return '#15803d';
  return '#ca8a04';
}

function getNetYieldColor(value: number): string {
  if (value < 0.02) return '#dc2626';
  if (value > 0.05) return '#15803d';
  return '#ca8a04';
}

function getIrrColor(value: number): string {
  if (value < 0.03) return '#dc2626';
  if (value > 0.07) return '#15803d';
  return '#ca8a04';
}

const inputCss: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  fontSize: 14,
  background: '#fff',
  boxSizing: 'border-box',
};

const labelCss: CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: '#374151',
};

const sectionCss: CSSProperties = {
  marginTop: 24,
  padding: 20,
  border: '1px solid #e5e7eb',
  borderRadius: 14,
  background: '#fff',
  boxSizing: 'border-box',
  minWidth: 0,
};

const cardCss: CSSProperties = {
  padding: 16,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#fff',
  boxSizing: 'border-box',
  minWidth: 0,
};

const subtleNoteCss: CSSProperties = {
  fontStyle: 'italic',
  color: '#6b7280',
  fontSize: 12,
  lineHeight: 1.35,
  marginTop: -6,
  marginBottom: 10,
};

function summaryStyle(isMobile: boolean): CSSProperties {
  return {
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: isMobile ? 16 : 18,
    color: '#111827',
    listStyle: 'none',
  };
}

function toggleButtonStyle(active: boolean, isMobile: boolean): CSSProperties {
  return {
    padding: isMobile ? '10px 12px' : '10px 14px',
    border: 'none',
    background: active ? '#111827' : '#fff',
    color: active ? '#fff' : '#111827',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: isMobile ? 13 : 14,
    flex: isMobile ? 1 : undefined,
  };
}

function thStyle(): CSSProperties {
  return {
    textAlign: 'left',
    padding: 10,
    borderBottom: '1px solid #d1d5db',
    fontSize: 13,
    whiteSpace: 'nowrap',
    background: '#111827',
    color: '#fff',
  };
}

function tdStyle(bg = '#fff'): CSSProperties {
  return {
    padding: 10,
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
    background: bg,
  };
}

function primaryButtonStyle(isMobile: boolean): CSSProperties {
  return {
    padding: '10px 14px',
    border: 'none',
    borderRadius: 10,
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    width: isMobile ? '100%' : 'auto',
  };
}

function secondaryButtonStyle(isMobile: boolean): CSSProperties {
  return {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 10,
    background: '#fff',
    color: '#111827',
    cursor: 'pointer',
    fontWeight: 600,
    width: isMobile ? '100%' : 'auto',
  };
}

function dangerButtonStyle(isMobile: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #fecaca',
    background: '#fff',
    color: '#b91c1c',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    width: isMobile ? '100%' : 'auto',
  };
}

function smallPrimaryButtonStyle(isMobile: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: 'none',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    width: isMobile ? '100%' : 'auto',
  };
}

function smallSecondaryButtonStyle(isMobile: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#111827',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    width: isMobile ? '100%' : 'auto',
  };
}

function buildComparisonScenarios(baseScenario: ScenarioInput) {
  return [
    { id: 'base', name: 'Base', data: baseScenario },
    {
      id: 'scenario2',
      name: 'Scénario 2',
      data: {
        ...baseScenario,
        monthlyRent: baseScenario.monthlyRent * 0.95,
        annualInterestRate: baseScenario.annualInterestRate + 0.003,
        annualPriceGrowthRate: Math.max(
          0,
          baseScenario.annualPriceGrowthRate - 0.003,
        ),
      },
    },
    {
      id: 'scenario3',
      name: 'Scénario 3',
      data: {
        ...baseScenario,
        monthlyRent: baseScenario.monthlyRent * 1.05,
        annualInterestRate: Math.max(
          0,
          baseScenario.annualInterestRate - 0.003,
        ),
        annualPriceGrowthRate: baseScenario.annualPriceGrowthRate + 0.003,
      },
    },
  ];
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [scenario, setScenario] = useState<ScenarioInput>(defaultScenario);
  const [tableMode, setTableMode] = useState<'resume' | 'detail'>('resume');

  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([]);
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);
  const [simulationsLoading, setSimulationsLoading] = useState(false);
  const [simulationsError, setSimulationsError] = useState<string | null>(null);
  const [uiMessage, setUiMessage] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(1200);

  const [comparisonScenarios, setComparisonScenarios] = useState<
    { id: string; name: string; data: ScenarioInput }[]
  >(buildComparisonScenarios(defaultScenario));

  useEffect(() => {
    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);

    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void refreshSavedSimulations(user);
  }, [user, authLoading]);

  const isSmallMobile = viewportWidth < 640;
  const isMobile = viewportWidth < 900;

  const appGridStyle: CSSProperties = useMemo(
    () => ({
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '360px minmax(0, 1fr)',
      gap: isMobile ? 16 : 24,
      alignItems: 'start',
      width: '100%',
      minWidth: 0,
    }),
    [isMobile],
  );

  function rebuildComparisonScenarios(baseScenario: ScenarioInput) {
    setComparisonScenarios(buildComparisonScenarios(baseScenario));
  }

  function update<K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) {
    setScenario((prev) => ({ ...prev, [key]: value }));

    if (
      key !== 'monthlyRent' &&
      key !== 'annualInterestRate' &&
      key !== 'annualPriceGrowthRate'
    ) {
      setComparisonScenarios((prev) =>
        prev.map((item) => ({
          ...item,
          data: { ...item.data, [key]: value },
        })),
      );
    }

    if (
      key === 'monthlyRent' ||
      key === 'annualInterestRate' ||
      key === 'annualPriceGrowthRate'
    ) {
      setComparisonScenarios((prev) =>
        prev.map((item) =>
          item.id === 'base'
            ? { ...item, data: { ...item.data, [key]: value } }
            : item,
        ),
      );
    }
  }

  function updateComparisonScenario(
    id: string,
    key: 'monthlyRent' | 'annualInterestRate' | 'annualPriceGrowthRate',
    value: number,
  ) {
    setComparisonScenarios((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, data: { ...item.data, [key]: value } }
          : item,
      ),
    );

    if (id === 'base') {
      setScenario((prev) => ({ ...prev, [key]: value }));
    }
  }

  async function refreshSavedSimulations(currentUser: User | null) {
    if (!currentUser) {
      setSavedSimulations([]);
      setActiveSimulationId(null);
      setSimulationsError(null);
      return;
    }

    try {
      setSimulationsLoading(true);
      setSimulationsError(null);

      const simulations = await getSimulations(currentUser.uid);
      setSavedSimulations(simulations);

      if (
        activeSimulationId &&
        !simulations.some((simulation) => simulation.id === activeSimulationId)
      ) {
        setActiveSimulationId(null);
      }
    } catch (error: any) {
      console.error('Erreur refreshSavedSimulations:', error);
      setSimulationsError(error?.message ?? 'Impossible de charger les simulations.');
    } finally {
      setSimulationsLoading(false);
    }
  }

  async function handleSaveSimulation() {
    if (!user) {
      setUiMessage('Connecte-toi pour enregistrer une simulation.');
      return;
    }

    const defaultName = `Simulation ${savedSimulations.length + 1}`;
    const name = window.prompt('Nom de la simulation ?', defaultName);
    if (!name || !name.trim()) return;

    try {
      setSimulationsLoading(true);
      setSimulationsError(null);
      setUiMessage(null);

      const newId = await createSimulation(user.uid, name.trim(), scenario);
      setActiveSimulationId(newId);

      const refreshed = await getSimulations(user.uid);
      setSavedSimulations(refreshed);

      setUiMessage('✅ Simulation enregistrée');
    } catch (error: any) {
      console.error('Erreur handleSaveSimulation:', error);
      setSimulationsError(error?.message ?? "Impossible d'enregistrer la simulation.");
      setUiMessage("❌ Erreur lors de l'enregistrement");
    } finally {
      setSimulationsLoading(false);
    }
  }

  async function handleUpdateCurrentSimulation() {
    if (!user) {
      setUiMessage('Connecte-toi pour mettre à jour une simulation.');
      return;
    }

    if (!activeSimulationId) {
      setUiMessage('Aucune simulation active sélectionnée.');
      return;
    }

    try {
      setSimulationsLoading(true);
      setSimulationsError(null);
      setUiMessage(null);

      await updateSimulation(activeSimulationId, scenario);

      const refreshed = await getSimulations(user.uid);
      setSavedSimulations(refreshed);

      setUiMessage('✅ Simulation mise à jour');
    } catch (error: any) {
      console.error('Erreur handleUpdateCurrentSimulation:', error);
      setSimulationsError(error?.message ?? 'Impossible de mettre à jour la simulation.');
      setUiMessage('❌ Erreur lors de la mise à jour');
    } finally {
      setSimulationsLoading(false);
    }
  }

  async function handleDeleteSimulation(simulationId: string) {
    if (!user) return;

    const confirmed = window.confirm('Supprimer cette simulation ?');
    if (!confirmed) return;

    try {
      setSimulationsLoading(true);
      setSimulationsError(null);
      setUiMessage(null);

      await deleteSimulation(simulationId);

      if (activeSimulationId === simulationId) {
        setActiveSimulationId(null);
      }

      const refreshed = await getSimulations(user.uid);
      setSavedSimulations(refreshed);

      setUiMessage('✅ Simulation supprimée');
    } catch (error: any) {
      console.error('Erreur handleDeleteSimulation:', error);
      setSimulationsError(error?.message ?? 'Impossible de supprimer la simulation.');
      setUiMessage('❌ Erreur lors de la suppression');
    } finally {
      setSimulationsLoading(false);
    }
  }

  async function handleRenameSimulation(simulation: SavedSimulation) {
    if (!user) return;

    const newName = window.prompt('Nouveau nom de la simulation', simulation.name);
    if (!newName || !newName.trim()) return;

    try {
      setSimulationsLoading(true);
      setSimulationsError(null);
      setUiMessage(null);

      await renameSimulation(simulation.id, newName.trim());

      const refreshed = await getSimulations(user.uid);
      setSavedSimulations(refreshed);

      setUiMessage('✅ Simulation renommée');
    } catch (error: any) {
      console.error('Erreur handleRenameSimulation:', error);
      setSimulationsError(error?.message ?? 'Impossible de renommer la simulation.');
      setUiMessage('❌ Erreur lors du renommage');
    } finally {
      setSimulationsLoading(false);
    }
  }

  function handleLoadSimulation(simulation: SavedSimulation) {
    setScenario(simulation.scenario);
    setActiveSimulationId(simulation.id);
    rebuildComparisonScenarios(simulation.scenario);
    setUiMessage(`✅ Simulation "${simulation.name}" chargée`);
  }

  function handleResetScenario() {
    setScenario(defaultScenario);
    setActiveSimulationId(null);
    rebuildComparisonScenarios(defaultScenario);
    setUiMessage('✅ Retour au scénario par défaut');
  }

  const notaryFees = calculateNotaryFees(scenario);
  const totalProjectCost = calculateTotalProjectCost(scenario);
  const financedAmount = calculateFinancedAmount(scenario);
  const initialCashInvested = calculateInitialCashInvested(scenario);

  const monthlyPayment = calculateMonthlyPayment(scenario);
  const monthlyInsurance = calculateMonthlyInsurance(scenario);
  const monthlyDebt = calculateTotalMonthlyDebt(scenario);

  const projection = buildProjection(scenario);
  const year1 = projection[0];

  const debtSchedule = buildDebtSchedule(scenario);
  const avgInterest = average(
    debtSchedule.slice(0, scenario.holdingPeriodYears).map((row) => row.interestPaid),
  );

  const year1ChargesBreakdown = calculateAnnualChargesBreakdownForYear(scenario, 1);

  const grossYield =
    year1 && totalProjectCost > 0 ? year1.annualGrossRent / totalProjectCost : 0;

  const netYield =
    year1 && totalProjectCost > 0 ? year1.noi / totalProjectCost : 0;

  const economicVacancy =
    year1 && year1.annualGrossRent > 0
      ? year1.annualVacancyLoss / year1.annualGrossRent
      : 0;

  const opexRatio =
    year1 && year1.annualGrossRent > 0
      ? year1.annualCharges / year1.annualGrossRent
      : 0;

  const avgMonthlyEffort = calculateAverageMonthlyEffort(scenario);

  const grossSalePrice = calculateGrossSalePrice(scenario);
  const saleFees = calculateSaleFees(scenario);
  const netSaleProceeds = calculateNetSaleProceeds(scenario);

  const cashflows = calculateCashflows(scenario);
  const irr = calculateIRR(cashflows);
  const multipleCashOnCash = calculateMultipleCashOnCash(scenario);
  const capAchat = calculateCapAchat(scenario);
  const capSortie = calculateCapSortie(scenario);
  const gainCapRate = calculateCapRateGain(scenario);

  const resumeColumns = [
    'Année',
    'Loyer mensuel',
    'Loyer facial annuel',
    'Vacance locative',
    'Loyers encaissés',
    'Total opex',
    'NOI',
    'Service dette',
    "Effort d'épargne annuel",
    "Effort d'épargne mensuel",
    'CRD fin',
  ];

  const detailColumns = [
    'Année',
    'Loyer mensuel',
    'Loyer facial annuel',
    'Vacance locative',
    'Loyers encaissés',
    'Charges copro NR',
    'Taxe foncière',
    'Assurance PNO',
    'Gestion locative',
    'Maintenance',
    'Comptabilité',
    'Autres charges',
    'Total opex',
    'NOI',
    'Service dette',
    "Effort d'épargne annuel",
    "Effort d'épargne mensuel",
    'Intérêts',
    'Amortissement',
    'CRD fin',
  ];

  const activeColumns = tableMode === 'resume' ? resumeColumns : detailColumns;

  return (
    <main
      style={{
        padding: isMobile ? 12 : 32,
        fontFamily: 'Arial, sans-serif',
        maxWidth: 1500,
        margin: '0 auto',
        background: '#f9fafb',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <div
        style={{
          ...sectionCss,
          marginTop: 0,
          padding: isMobile ? 14 : 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: isMobile ? 'flex-start' : 'center',
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row',
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: isMobile ? 28 : 36,
                lineHeight: 1.1,
              }}
            >
              RentablImmo
            </h1>
            <p
              style={{
                color: '#4b5563',
                margin: 0,
                fontSize: isMobile ? 14 : 16,
                lineHeight: 1.4,
              }}
            >
              Simulez, comparez et pilotez vos investissements locatifs.
            </p>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: '#111827',
              color: '#fff',
              minWidth: isMobile ? '100%' : 180,
              width: isMobile ? '100%' : 'auto',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>Simulations</div>
            <div style={{ fontWeight: 700 }}>{savedSimulations.length} enregistrée(s)</div>
          </div>
        </div>
      </div>

      <div style={{ ...sectionCss, marginTop: 16, marginBottom: 16, padding: isMobile ? 14 : 20 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: isMobile ? 20 : 24 }}>Compte</h2>
        <AuthPanel user={user} />
      </div>

      <div style={{ ...sectionCss, marginTop: 0, marginBottom: 16, padding: isMobile ? 14 : 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            flexDirection: isMobile ? 'column' : 'row',
            minWidth: 0,
          }}
        >
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: isMobile ? 20 : 24 }}>
              Mes simulations
            </h2>
            <div style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.4 }}>
              Gère tes scénarios d’investissement depuis ton espace personnel.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 12,
            marginTop: 20,
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(260px, max-content))',
          }}
        >
          <button
            type="button"
            onClick={handleSaveSimulation}
            style={primaryButtonStyle(isMobile)}
          >
            Enregistrer la simulation actuelle
          </button>

          <button
            type="button"
            onClick={handleUpdateCurrentSimulation}
            style={secondaryButtonStyle(isMobile)}
          >
            Mettre à jour la simulation active
          </button>

          <button
            type="button"
            onClick={handleResetScenario}
            style={secondaryButtonStyle(isMobile)}
          >
            Revenir au scénario par défaut
          </button>
        </div>

        {uiMessage ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 10,
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              color: '#111827',
              fontSize: 14,
            }}
          >
            {uiMessage}
          </div>
        ) : null}

        <div style={{ marginTop: 14, color: '#6b7280', fontSize: 14, lineHeight: 1.4 }}>
          {!user
            ? 'Connecte-toi pour enregistrer tes simulations et les retrouver sur tous tes appareils.'
            : activeSimulationId
            ? 'Une simulation enregistrée est actuellement chargée.'
            : 'Aucune simulation enregistrée active.'}
        </div>

        {simulationsError ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              border: '1px solid #fecaca',
              borderRadius: 10,
              background: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            {simulationsError}
          </div>
        ) : null}

        <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          {simulationsLoading ? (
            <div
              style={{
                padding: 14,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
                color: '#6b7280',
              }}
            >
              Chargement des simulations...
            </div>
          ) : savedSimulations.length === 0 ? (
            <div
              style={{
                padding: 14,
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                background: '#fff',
                color: '#6b7280',
              }}
            >
              Aucune simulation enregistrée pour le moment.
            </div>
          ) : (
            savedSimulations.map((simulation) => (
              <div
                key={simulation.id}
                style={{
                  padding: 14,
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  background: activeSimulationId === simulation.id ? '#f3f4f6' : '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: isMobile ? 'stretch' : 'center',
                  flexWrap: 'wrap',
                  flexDirection: isMobile ? 'column' : 'row',
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{simulation.name}</div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, max-content)',
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleLoadSimulation(simulation)}
                    style={smallPrimaryButtonStyle(isMobile)}
                  >
                    Charger
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRenameSimulation(simulation)}
                    style={smallSecondaryButtonStyle(isMobile)}
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSimulation(simulation.id)}
                    style={dangerButtonStyle(isMobile)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        style={
          isMobile
            ? {
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                minWidth: 0,
              }
            : appGridStyle
        }
      >
        <div
          style={{
            ...sectionCss,
            marginTop: 0,
            position: isMobile ? 'static' : 'sticky',
            top: isMobile ? undefined : 20,
            padding: isMobile ? 14 : 20,
            order: isMobile ? 2 : 0,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: isMobile ? 20 : 24 }}>Hypothèses modifiables</h2>

          <details open style={{ marginTop: 16 }}>
            <summary style={summaryStyle(isMobile)}>Acquisition</summary>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelCss}>Prix d’achat (Frais agence acquéreur inclus)</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.purchasePrice}
                  onChange={(e) => update('purchasePrice', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Frais de notaire (%)</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.notaryFeesRate}
                  onChange={(e) => update('notaryFeesRate', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Travaux initiaux</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.works}
                  onChange={(e) => update('works', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Mobilier initial</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.furniture}
                  onChange={(e) => update('furniture', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Frais de dossier crédit</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.loanFees}
                  onChange={(e) => update('loanFees', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Croissance annuelle de valeur du bien</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.annualPriceGrowthRate}
                  onChange={(e) =>
                    update('annualPriceGrowthRate', Number(e.target.value))
                  }
                />
              </div>
            </div>
          </details>

          <details open style={{ marginTop: 18 }}>
            <summary style={summaryStyle(isMobile)}>Exploitation</summary>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelCss}>Loyer mensuel hors charges</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.monthlyRent}
                  onChange={(e) => update('monthlyRent', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Vacance locative (%)</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.vacancyRate}
                  onChange={(e) => update('vacancyRate', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Croissance annuelle des loyers</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.annualRentGrowthRate}
                  onChange={(e) =>
                    update('annualRentGrowthRate', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Croissance annuelle des charges</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.annualChargesGrowthRate}
                  onChange={(e) =>
                    update('annualChargesGrowthRate', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Charges de copro annuelles non récupérables</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.nonRecoverableChargesAnnual}
                  onChange={(e) =>
                    update('nonRecoverableChargesAnnual', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Taxe foncière</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.propertyTaxAnnual}
                  onChange={(e) =>
                    update('propertyTaxAnnual', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Assurance propriétaire annuelle (PNO)</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.pnoInsuranceAnnual}
                  onChange={(e) =>
                    update('pnoInsuranceAnnual', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Gestion locative (% loyers encaissés)</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.managementFeesRate}
                  onChange={(e) =>
                    update('managementFeesRate', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Gestion comptable annuelle</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.accountingAnnual}
                  onChange={(e) =>
                    update('accountingAnnual', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Maintenance annuelle</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.maintenanceAnnual}
                  onChange={(e) =>
                    update('maintenanceAnnual', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Autres charges annuelles</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.otherChargesAnnual}
                  onChange={(e) =>
                    update('otherChargesAnnual', Number(e.target.value))
                  }
                />
              </div>
            </div>
          </details>

          <details open style={{ marginTop: 18 }}>
            <summary style={summaryStyle(isMobile)}>Financement et sortie</summary>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelCss}>Apport</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.downPayment}
                  onChange={(e) => update('downPayment', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={labelCss}>Taux nominal annuel</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.annualInterestRate}
                  onChange={(e) =>
                    update('annualInterestRate', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Taux assurance emprunteur</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.annualInsuranceRate}
                  onChange={(e) =>
                    update('annualInsuranceRate', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Durée du prêt (années)</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.loanDurationYears}
                  onChange={(e) =>
                    update('loanDurationYears', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Durée de détention</label>
                <input
                  style={inputCss}
                  type="number"
                  value={scenario.holdingPeriodYears}
                  onChange={(e) =>
                    update('holdingPeriodYears', Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label style={labelCss}>Frais de vente (%)</label>
                <input
                  style={inputCss}
                  type="number"
                  step="0.001"
                  value={scenario.saleFeesRate}
                  onChange={(e) => update('saleFeesRate', Number(e.target.value))}
                />
              </div>
            </div>
          </details>
        </div>

        <div style={{ minWidth: 0, order: isMobile ? 1 : 0 }}>
          <details open style={{ ...sectionCss, marginTop: 0, padding: isMobile ? 14 : 20 }}>
            <summary style={summaryStyle(isMobile)}>Dashboard détaillé</summary>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isSmallMobile
                  ? '1fr'
                  : isMobile
                  ? '1fr 1fr'
                  : 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginTop: 16,
                marginBottom: 18,
              }}
            >
              <div style={cardCss}>
                <div style={{ color: '#6b7280', fontSize: 13 }}>Coût total projet</div>
                <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, lineHeight: 1.2 }}>
                  {formatCurrency(totalProjectCost)}
                </div>
              </div>

              <div style={cardCss}>
                <div style={{ color: '#6b7280', fontSize: 13 }}>Cash investi</div>
                <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, lineHeight: 1.2 }}>
                  {formatCurrency(initialCashInvested)}
                </div>
              </div>

              <div style={cardCss}>
                <div style={{ color: '#6b7280', fontSize: 13 }}>Cash-flow mensuel</div>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: getCashColor(year1 ? year1.monthlyCashflow : 0),
                  }}
                >
                  {formatCurrency(year1 ? year1.monthlyCashflow : 0)}
                </div>
              </div>

              <div style={cardCss}>
                <div style={{ color: '#6b7280', fontSize: 13 }}>TRI equity</div>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: getIrrColor(irr),
                  }}
                >
                  {formatPercent(irr)}
                </div>
              </div>

              <div style={cardCss}>
                <div style={{ color: '#6b7280', fontSize: 13 }}>Rendement brut</div>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: getGrossYieldColor(grossYield),
                  }}
                >
                  {formatPercent(grossYield)}
                </div>
              </div>

              <div style={cardCss}>
                <div style={{ color: '#6b7280', fontSize: 13 }}>Rendement net</div>
                <div
                  style={{
                    fontSize: isMobile ? 22 : 28,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: getNetYieldColor(netYield),
                  }}
                >
                  {formatPercent(netYield)}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 14,
              }}
            >
              <div style={cardCss}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? 17 : 18 }}>Coût d’acquisition</h3>
                <p><strong>Prix FAI :</strong> {formatCurrency(scenario.purchasePrice)}</p>
                <p><strong>Frais de notaire :</strong> {formatCurrency(notaryFees)}</p>
                <p><strong>Frais de dossier crédit :</strong> {formatCurrency(scenario.loanFees)}</p>
                <p><strong>Mobilier :</strong> {formatCurrency(scenario.furniture)}</p>
                <p><strong>Travaux :</strong> {formatCurrency(scenario.works)}</p>
                <p><strong>Coût total projet :</strong> {formatCurrency(totalProjectCost)}</p>
                <p><strong>Dont apport :</strong> {formatCurrency(scenario.downPayment)}</p>
              </div>

              <div style={cardCss}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? 17 : 18 }}>Dette / cash-flow</h3>
                <p><strong>Dette initiale :</strong> {formatCurrency(financedAmount)}</p>
                <p><strong>Mensualité hors assurance :</strong> {formatCurrency(monthlyPayment)}</p>
                <p><strong>Assurance mensuelle :</strong> {formatCurrency(monthlyInsurance)}</p>
                <p><strong>Mensualité totale :</strong> {formatCurrency(monthlyDebt)}</p>
                <p><strong>Service de la dette année 1 :</strong> {formatCurrency(year1 ? year1.annualDebtService : 0)}</p>
              </div>

              <div style={cardCss}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? 17 : 18 }}>Rendements</h3>

                <p>
                  <strong>Rendement brut initial :</strong>{' '}
                  <span style={{ color: getGrossYieldColor(grossYield), fontWeight: 700 }}>
                    {formatPercent(grossYield)}
                  </span>
                </p>
                <p style={subtleNoteCss}>
                  Correspond au loyer HC × 12 / coût total projet.
                </p>

                <p>
                  <strong>Rendement net initial :</strong>{' '}
                  <span style={{ color: getNetYieldColor(netYield), fontWeight: 700 }}>
                    {formatPercent(netYield)}
                  </span>
                </p>
                <p style={subtleNoteCss}>
                  Correspond au NOI / coût total projet. Le NOI correspond aux loyers moins les charges d’exploitation.
                </p>

                <p><strong>Vacance économique :</strong> {formatPercent(economicVacancy)}</p>

                <p><strong>Opex ratio :</strong> {formatPercent(opexRatio)}</p>
                <p style={subtleNoteCss}>
                  Correspond aux charges d’exploitation / loyer.
                </p>

                <p><strong>Effort épargne mensuel moy. :</strong> {formatCurrency(avgMonthlyEffort)}</p>
                <p><strong>Intérêts annuels moyens sur détention :</strong> {formatCurrency(avgInterest)}</p>
                <p><strong>Intérêts année 1 :</strong> {formatCurrency(year1 ? year1.annualInterest : 0)}</p>
              </div>

              <div style={cardCss}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? 17 : 18 }}>Sortie / création de valeur</h3>
                <p><strong>Prix de cession brut :</strong> {formatCurrency(grossSalePrice)}</p>
                <p><strong>Frais de vente :</strong> {formatCurrency(saleFees)}</p>
                <p><strong>Net vendeur après dette :</strong> {formatCurrency(netSaleProceeds)}</p>
                <p>
                  <strong>TRI equity :</strong>{' '}
                  <span style={{ color: getIrrColor(irr), fontWeight: 700 }}>
                    {formatPercent(irr)}
                  </span>
                </p>
                <p><strong>Multiple cash-on-cash :</strong> {multipleCashOnCash.toFixed(2)}x</p>
                <p><strong>Cap Achat :</strong> {formatPercent(capAchat)}</p>
                <p><strong>Cap Sortie :</strong> {formatPercent(capSortie)}</p>
                <p><strong>Gain Cap rate :</strong> {formatPercent(gainCapRate)}</p>
              </div>
            </div>
          </details>

          <details open style={{ ...sectionCss, padding: isMobile ? 14 : 20 }}>
            <summary style={summaryStyle(isMobile)}>Synthèse des Inputs année 1</summary>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 14,
                marginTop: 16,
              }}
            >
              <div style={cardCss}>
                <p><strong>Frais de notaire :</strong> {formatCurrency(notaryFees)}</p>
                <p><strong>Mensualité hors assurance :</strong> {formatCurrency(monthlyPayment)}</p>
                <p><strong>Assurance emprunteur mensuelle :</strong> {formatCurrency(monthlyInsurance)}</p>
                <p><strong>Mensualité totale :</strong> {formatCurrency(monthlyDebt)}</p>
              </div>
              <div style={cardCss}>
                <p><strong>Charges de copro annuelles non récupérables :</strong> {formatCurrency(year1ChargesBreakdown.coproNonRecoverable)}</p>
                <p><strong>Taxe foncière :</strong> {formatCurrency(year1ChargesBreakdown.propertyTax)}</p>
                <p><strong>Assurance propriétaire annuelle (PNO) :</strong> {formatCurrency(year1ChargesBreakdown.pnoInsurance)}</p>
              </div>
              <div style={cardCss}>
                <p><strong>Gestion locative :</strong> {formatCurrency(year1ChargesBreakdown.managementFees)}</p>
                <p><strong>Maintenance annuelle :</strong> {formatCurrency(year1ChargesBreakdown.maintenance)}</p>
                <p><strong>Gestion comptable annuelle :</strong> {formatCurrency(year1ChargesBreakdown.accounting)}</p>
                <p><strong>Autres charges annuelles :</strong> {formatCurrency(year1ChargesBreakdown.otherCharges)}</p>
              </div>
            </div>
          </details>

          <div style={{ minWidth: 0 }}>
            <SensitivityTable scenario={scenario} />
          </div>

          <div style={{ ...sectionCss, padding: isMobile ? 14 : 20 }}>
            <h2 style={{ marginTop: 0, fontSize: isMobile ? 20 : 24 }}>Comparaison de scénarios</h2>
            <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 16, lineHeight: 1.45 }}>
              Les scénarios font varier principalement le loyer, le <strong>taux nominal intérêt</strong> et la <strong>prise de valeur annuelle de l’actif</strong>.
            </p>
            <div style={{ minWidth: 0, overflowX: 'auto' }}>
              <ScenarioComparison
                scenarios={comparisonScenarios}
                onScenarioChange={updateComparisonScenario}
              />
            </div>
          </div>

          <details open style={{ ...sectionCss, padding: isMobile ? 14 : 20 }}>
            <summary style={summaryStyle(isMobile)}>Tableau d’exploitation annuelle</summary>

            <div
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#fff',
                  width: isSmallMobile ? '100%' : 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => setTableMode('resume')}
                  style={toggleButtonStyle(tableMode === 'resume', isSmallMobile)}
                >
                  Mode résumé
                </button>
                <button
                  type="button"
                  onClick={() => setTableMode('detail')}
                  style={toggleButtonStyle(tableMode === 'detail', isSmallMobile)}
                >
                  Mode détaillé
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: tableMode === 'resume' ? (isMobile ? 900 : 1300) : (isMobile ? 1200 : 2200),
                }}
              >
                <thead>
                  <tr>
                    {activeColumns.map((header) => (
                      <th key={header} style={thStyle()}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projection.map((row, index) => {
                    const bg = index % 2 === 0 ? '#ffffff' : '#f9fafb';

                    const cells: Record<string, React.ReactNode> = {
                      'Année': row.year,
                      'Loyer mensuel': formatCurrency(row.monthlyRent),
                      'Loyer facial annuel': formatCurrency(row.annualGrossRent),
                      'Vacance locative': formatCurrency(row.annualVacancyLoss),
                      'Loyers encaissés': formatCurrency(row.annualCollectedRent),
                      'Charges copro NR': formatCurrency(row.coproNonRecoverable),
                      'Taxe foncière': formatCurrency(row.propertyTax),
                      'Assurance PNO': formatCurrency(row.pnoInsurance),
                      'Gestion locative': formatCurrency(row.managementFees),
                      'Maintenance': formatCurrency(row.maintenance),
                      'Comptabilité': formatCurrency(row.accounting),
                      'Autres charges': formatCurrency(row.otherCharges),
                      'Total opex': formatCurrency(row.annualCharges),
                      'NOI': formatCurrency(row.noi),
                      'Service dette': formatCurrency(row.annualDebtService),
                      "Effort d'épargne annuel": formatCurrency(row.annualCashflow),
                      "Effort d'épargne mensuel": formatCurrency(row.monthlyCashflow),
                      'Intérêts': formatCurrency(row.annualInterest),
                      'Amortissement': formatCurrency(row.annualPrincipal),
                      'CRD fin': formatCurrency(row.remainingBalanceEnd),
                    };

                    return (
                      <tr key={row.year} style={{ background: bg }}>
                        {activeColumns.map((col) => {
                          const isStrong = col === 'Loyers encaissés' || col === 'NOI';
                          const isTotalOpex = col === 'Total opex';
                          const isAnnualEffort = col === "Effort d'épargne annuel";
                          const isMonthlyEffort = col === "Effort d'épargne mensuel";

                          return (
                            <td
                              key={col}
                              style={{
                                ...tdStyle(bg),
                                color: isAnnualEffort
                                  ? getCashColor(row.annualCashflow)
                                  : isMonthlyEffort
                                  ? getCashColor(row.monthlyCashflow)
                                  : isTotalOpex
                                  ? '#6b7280'
                                  : undefined,
                                fontWeight: isTotalOpex || isStrong ? 700 : 400,
                              }}
                            >
                              {cells[col]}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p style={{ fontStyle: 'italic', color: '#6b7280', marginTop: 12 }}>
              CRD = Capital restant dû.
            </p>
          </details>

          <div style={{ minWidth: 0 }}>
            <Charts projection={projection} scenario={scenario} />
          </div>

          <details style={{ ...sectionCss, padding: isMobile ? 14 : 20 }}>
            <summary style={summaryStyle(isMobile)}>Revente</summary>
            <div style={{ marginTop: 16 }}>
              <p><strong>Prix de cession brut :</strong> {formatCurrency(grossSalePrice)}</p>
              <p><strong>Frais de vente :</strong> {formatCurrency(saleFees)}</p>
              <p><strong>Net vendeur après dette :</strong> {formatCurrency(netSaleProceeds)}</p>
              <p style={subtleNoteCss}>
                Le net vendeur après dette correspond au prix de revente – frais de revente – capital restant dû en année de revente.
              </p>
              <p><strong>Flux TRI :</strong> {cashflows.map(formatCurrency).join(' | ')}</p>
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}