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
  calculateTAEG,
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

type GlossaryItem = {
  title: string;
  short: string;
  full: string;
};

const GLOSSARY: Record<string, GlossaryItem> = {
  vacance: {
    title: 'Vacance locative',
    short: 'Période pendant laquelle le bien n’est pas loué.',
    full:
      "La vacance locative représente la part de l'année pendant laquelle ton logement ne génère pas de loyer. Plus elle est élevée, plus les loyers réellement encaissés diminuent. Dans un prévisionnel, elle permet d’éviter d’être trop optimiste.",
  },
  opex: {
    title: 'Opex',
    short: "Charges d’exploitation du bien.",
    full:
      "Les opex correspondent aux dépenses nécessaires au fonctionnement du bien : copropriété non récupérable, taxe foncière, assurance PNO, gestion locative, maintenance, comptabilité, autres charges, etc. Elles viennent réduire la rentabilité nette.",
  },
  noi: {
    title: 'NOI',
    short: "Revenu net d’exploitation avant dette.",
    full:
      "Le NOI (Net Operating Income) correspond aux loyers encaissés diminués des charges d’exploitation, mais avant remboursement du crédit. C’est un indicateur central pour mesurer la performance économique pure du bien.",
  },
  tri: {
    title: 'TRI',
    short: "Taux de rentabilité annuel global de l’investissement.",
    full:
      "Le TRI (Taux de Rendement Interne) mesure la rentabilité globale d’un investissement en tenant compte de tous les flux : apport initial, cash-flows annuels, revente finale. Plus il est élevé, plus l’investissement est performant. C’est l’un des indicateurs les plus complets.",
  },
  rendementBrut: {
    title: 'Rendement brut',
    short: 'Loyer annuel / coût total projet.',
    full:
      "Le rendement brut compare le loyer annuel théorique au coût total du projet. Il donne une première idée rapide du potentiel du bien, mais il ne tient pas compte des charges, de la vacance ou du financement.",
  },
  rendementNet: {
    title: 'Rendement net',
    short: 'NOI / coût total projet.',
    full:
      "Le rendement net tient compte des charges d’exploitation. Il est plus réaliste que le rendement brut, car il reflète mieux ce que produit réellement le bien avant remboursement de la dette.",
  },
  cashflow: {
    title: 'Cash-flow',
    short: 'Ce qu’il reste chaque mois après charges et dette.',
    full:
      "Le cash-flow correspond à l’argent restant après perception des loyers, paiement des charges et remboursement du crédit. Positif, il signifie que le bien s’autofinance en partie ou totalement. Négatif, il faut remettre de l’argent chaque mois.",
  },
  effort: {
    title: "Effort d’épargne",
    short: "Somme à remettre de sa poche pour équilibrer l’opération.",
    full:
      "L’effort d’épargne correspond au montant que l’investisseur doit ajouter lorsque le cash-flow est négatif. C’est très utile pour savoir si l’opération reste supportable au quotidien.",
  },
  crd: {
    title: 'CRD',
    short: 'Capital restant dû au prêt.',
    full:
      "Le CRD est le capital restant dû à la banque à une date donnée. Il diminue progressivement au fil des mensualités. En cas de revente, il faut généralement le rembourser avec le produit de cession.",
  },
  tauxNominal: {
    title: 'Taux nominal intérêt',
    short: 'Taux d’intérêt du crédit hors assurance.',
    full:
      "Le taux nominal intérêt est le taux appliqué par la banque sur le capital emprunté, hors assurance emprunteur. Il influence directement le coût du financement et donc la mensualité.",
  },
  assurance: {
    title: 'Assurance emprunteur',
    short: 'Assurance liée au crédit immobilier.',
    full:
      "L’assurance emprunteur couvre certains risques comme le décès, l’invalidité ou parfois l’incapacité. Elle s’ajoute à la mensualité du prêt et doit être intégrée dans le coût réel du financement.",
  },
  capAchat: {
    title: 'Cap achat',
    short: 'NOI initial / prix d’achat.',
    full:
      "Le cap rate à l’achat compare le NOI initial à la valeur d’acquisition. Il permet d’évaluer rapidement la performance économique du bien au moment de l’achat.",
  },
  capSortie: {
    title: 'Cap sortie',
    short: 'NOI de sortie / valeur de revente.',
    full:
      "Le cap rate de sortie permet d’apprécier la valorisation du bien à la revente. Il est souvent utilisé pour juger si le prix de sortie est cohérent avec le revenu produit par le bien.",
  },
  multiple: {
    title: 'Multiple cash-on-cash',
    short: 'Combien de fois l’apport est récupéré.',
    full:
      "Le multiple cash-on-cash mesure combien de fois l’investisseur récupère sa mise initiale sur toute la durée du projet. Par exemple, 2,0x signifie que l’apport a été récupéré deux fois.",
  },
  prixFai: {
    title: 'Prix FAI',
    short: 'Prix frais d’agence inclus.',
    full:
      "Le prix FAI est le prix d’achat incluant les frais d’agence lorsque ceux-ci sont supportés par l’acquéreur. C’est ce montant qu’il faut bien intégrer dans le coût global de l’opération.",
  },
};

function roundToThree(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatInputValue(value: number, integer = false): string {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '';
  if (integer) return String(Math.round(value));
  return String(roundToThree(value));
}

function parseInputValue(value: string): number {
  const normalized = value.replace(',', '.').trim();
  if (normalized === '') return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

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

function GlossaryInline({
  termKey,
  activeTerm,
  onToggle,
}: {
  termKey: keyof typeof GLOSSARY;
  activeTerm: string | null;
  onToggle: (term: string) => void;
}) {
  const item = GLOSSARY[termKey];
  const isOpen = activeTerm === termKey;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      <span>{item.title}</span>
      <button
        type="button"
        onClick={() => onToggle(termKey)}
        aria-label={`Afficher l'explication de ${item.title}`}
        title={`Afficher l'explication de ${item.title}`}
        style={{
          width: 18,
          height: 18,
          minWidth: 18,
          borderRadius: '50%',
          border: '1px solid #9ca3af',
          background: isOpen ? '#111827' : '#fff',
          color: isOpen ? '#fff' : '#6b7280',
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        i
      </button>
      {isOpen ? (
        <span
          style={{
            display: 'block',
            width: '100%',
            marginTop: 8,
            padding: 12,
            border: '1px solid #d1d5db',
            borderRadius: 10,
            background: '#f9fafb',
            color: '#1f2937',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>{item.title} :</strong> {item.full}
        </span>
      ) : null}
    </span>
  );
}

function GlossaryGuide({
  activeTerm,
  onToggle,
}: {
  activeTerm: string | null;
  onToggle: (term: string) => void;
}) {
  const entries = Object.entries(GLOSSARY);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {entries.map(([key, item]) => {
        const isOpen = activeTerm === key;
        return (
          <div
            key={key}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => onToggle(key)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: isOpen ? '#f3f4f6' : '#fff',
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 700, color: '#111827' }}>{item.title}</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{item.short}</div>
            </button>

            {isOpen ? (
              <div
                style={{
                  padding: '0 16px 16px 16px',
                  color: '#374151',
                  fontSize: 14,
                  lineHeight: 1.6,
                  background: '#f3f4f6',
                }}
              >
                {item.full}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function NumberInput({
  value,
  onCommit,
  step = '1',
  integer = false,
}: {
  value: number;
  onCommit: (value: number) => void;
  step?: string;
  integer?: boolean;
}) {
  const [text, setText] = useState(formatInputValue(value, integer));

  useEffect(() => {
    setText(formatInputValue(value, integer));
  }, [value, integer]);

  function commit(rawValue: string) {
    const parsed = parseInputValue(rawValue);
    const nextValue = integer ? Math.round(parsed) : roundToThree(parsed);
    onCommit(nextValue);
    setText(formatInputValue(nextValue, integer));
  }

  return (
    <input
      style={inputCss}
      type="number"
      step={step}
      value={text}
      onFocus={() => {
        if (Number(text) === 0) setText('');
      }}
      onChange={(e) => {
        const rawValue = e.target.value.replace(',', '.');
        setText(rawValue);

        if (rawValue === '') return;

        const parsed = parseInputValue(rawValue);
        const nextValue = integer ? Math.round(parsed) : roundToThree(parsed);
        onCommit(nextValue);
      }}
      onBlur={() => commit(text)}
    />
  );
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
  const [activeGlossaryTerm, setActiveGlossaryTerm] = useState<string | null>(null);

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
      gridTemplateColumns: isMobile ? '1fr' : '380px minmax(0, 1fr)',
      gap: isMobile ? 16 : 24,
      alignItems: 'start',
      width: '100%',
      minWidth: 0,
    }),
    [isMobile],
  );

  function toggleGlossary(term: string) {
    setActiveGlossaryTerm((prev) => (prev === term ? null : term));
  }

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

async function handleExportPdf() {
  const pdfElement = document.getElementById('pdf-bankable-export');
  if (!pdfElement) return;

  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = (html2pdfModule as any).default ?? html2pdfModule;

  const originalOpacity = pdfElement.style.opacity;
  const originalZIndex = pdfElement.style.zIndex;
  const originalPointerEvents = pdfElement.style.pointerEvents;

  pdfElement.style.opacity = '1';
  pdfElement.style.zIndex = '9999';
  pdfElement.style.pointerEvents = 'none';

  await new Promise((resolve) => setTimeout(resolve, 150));

  await html2pdf()
    .set({
      margin: 8,
      filename: `rentab-immo-synthese-${scenario.name || 'simulation'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all', 'css'] },
    })
    .from(pdfElement)
    .save();

  pdfElement.style.opacity = originalOpacity;
  pdfElement.style.zIndex = originalZIndex;
  pdfElement.style.pointerEvents = originalPointerEvents;
}

  const notaryFees = calculateNotaryFees(scenario);
  const totalProjectCost = calculateTotalProjectCost(scenario);
  const financedAmount = calculateFinancedAmount(scenario);
  const initialCashInvested = calculateInitialCashInvested(scenario);

  const monthlyPayment = calculateMonthlyPayment(scenario);
  const monthlyInsurance = calculateMonthlyInsurance(scenario);
  const monthlyDebt = calculateTotalMonthlyDebt(scenario);
  const taeg = calculateTAEG(scenario);

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

  const dscr =
    year1 && year1.annualDebtService > 0 ? year1.noi / year1.annualDebtService : 0;

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

  const pdfSummaryRows = projection.slice(
    0,
    Math.min(projection.length, scenario.holdingPeriodYears),
  );

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
              Rentab&apos;Immo
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

          <button
            type="button"
            onClick={handleExportPdf}
            style={primaryButtonStyle(isMobile)}
          >
            Exporter en PDF
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
            maxHeight: isMobile ? undefined : 'calc(100vh - 40px)',
            overflowY: isMobile ? undefined : 'auto',
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
                <NumberInput
                  value={scenario.purchasePrice}
                  integer
                  onCommit={(value) => update('purchasePrice', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Frais de notaire (%)</label>
                <NumberInput
                  value={scenario.notaryFeesRate}
                  step="0.001"
                  onCommit={(value) => update('notaryFeesRate', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Travaux initiaux</label>
                <NumberInput
                  value={scenario.works}
                  integer
                  onCommit={(value) => update('works', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Mobilier initial</label>
                <NumberInput
                  value={scenario.furniture}
                  integer
                  onCommit={(value) => update('furniture', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Frais de dossier crédit</label>
                <NumberInput
                  value={scenario.loanFees}
                  integer
                  onCommit={(value) => update('loanFees', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Croissance annuelle de valeur du bien</label>
                <NumberInput
                  value={scenario.annualPriceGrowthRate}
                  step="0.001"
                  onCommit={(value) => update('annualPriceGrowthRate', value)}
                />
              </div>
            </div>
          </details>

          <details open style={{ marginTop: 18 }}>
            <summary style={summaryStyle(isMobile)}>Exploitation</summary>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelCss}>Loyer mensuel hors charges</label>
                <NumberInput
                  value={scenario.monthlyRent}
                  integer
                  onCommit={(value) => update('monthlyRent', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Vacance locative (%)</label>
                <NumberInput
                  value={scenario.vacancyRate}
                  step="0.001"
                  onCommit={(value) => update('vacancyRate', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Croissance annuelle des loyers</label>
                <NumberInput
                  value={scenario.annualRentGrowthRate}
                  step="0.001"
                  onCommit={(value) => update('annualRentGrowthRate', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Croissance annuelle des charges</label>
                <NumberInput
                  value={scenario.annualChargesGrowthRate}
                  step="0.001"
                  onCommit={(value) => update('annualChargesGrowthRate', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Charges de copro annuelles non récupérables</label>
                <NumberInput
                  value={scenario.nonRecoverableChargesAnnual}
                  integer
                  onCommit={(value) => update('nonRecoverableChargesAnnual', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Taxe foncière</label>
                <NumberInput
                  value={scenario.propertyTaxAnnual}
                  integer
                  onCommit={(value) => update('propertyTaxAnnual', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Assurance propriétaire annuelle (PNO)</label>
                <NumberInput
                  value={scenario.pnoInsuranceAnnual}
                  integer
                  onCommit={(value) => update('pnoInsuranceAnnual', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Gestion locative (% loyers encaissés)</label>
                <NumberInput
                  value={scenario.managementFeesRate}
                  step="0.001"
                  onCommit={(value) => update('managementFeesRate', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Gestion comptable annuelle</label>
                <NumberInput
                  value={scenario.accountingAnnual}
                  integer
                  onCommit={(value) => update('accountingAnnual', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Maintenance annuelle</label>
                <NumberInput
                  value={scenario.maintenanceAnnual}
                  integer
                  onCommit={(value) => update('maintenanceAnnual', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Autres charges annuelles</label>
                <NumberInput
                  value={scenario.otherChargesAnnual}
                  integer
                  onCommit={(value) => update('otherChargesAnnual', value)}
                />
              </div>
            </div>
          </details>

          <details open style={{ marginTop: 18 }}>
            <summary style={summaryStyle(isMobile)}>Financement et sortie</summary>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelCss}>Apport</label>
                <NumberInput
                  value={scenario.downPayment}
                  integer
                  onCommit={(value) => update('downPayment', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Taux nominal annuel</label>
                <NumberInput
                  value={scenario.annualInterestRate}
                  step="0.001"
                  onCommit={(value) => update('annualInterestRate', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Taux assurance emprunteur</label>
                <NumberInput
                  value={scenario.annualInsuranceRate}
                  step="0.001"
                  onCommit={(value) => update('annualInsuranceRate', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Durée du prêt (années)</label>
                <NumberInput
                  value={scenario.loanDurationYears}
                  integer
                  onCommit={(value) => update('loanDurationYears', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Durée de détention</label>
                <NumberInput
                  value={scenario.holdingPeriodYears}
                  integer
                  onCommit={(value) => update('holdingPeriodYears', value)}
                />
              </div>
              <div>
                <label style={labelCss}>Frais de vente (%)</label>
                <NumberInput
                  value={scenario.saleFeesRate}
                  step="0.001"
                  onCommit={(value) => update('saleFeesRate', value)}
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
                <div style={{ color: '#6b7280', fontSize: 13 }}>
                  <GlossaryInline
                    termKey="cashflow"
                    activeTerm={activeGlossaryTerm}
                    onToggle={toggleGlossary}
                  />
                </div>
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
                <div style={{ color: '#6b7280', fontSize: 13 }}>
                  <GlossaryInline
                    termKey="tri"
                    activeTerm={activeGlossaryTerm}
                    onToggle={toggleGlossary}
                  />
                </div>
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
                <div style={{ color: '#6b7280', fontSize: 13 }}>
                  <GlossaryInline
                    termKey="rendementBrut"
                    activeTerm={activeGlossaryTerm}
                    onToggle={toggleGlossary}
                  />
                </div>
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
                <div style={{ color: '#6b7280', fontSize: 13 }}>
                  <GlossaryInline
                    termKey="rendementNet"
                    activeTerm={activeGlossaryTerm}
                    onToggle={toggleGlossary}
                  />
                </div>
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
                <p>
                  <strong>
                    <GlossaryInline
                      termKey="prixFai"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  {formatCurrency(scenario.purchasePrice)}
                </p>
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
                <p>
                  <strong>
                    <GlossaryInline
                      termKey="assurance"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  {formatCurrency(monthlyInsurance)}
                </p>
                <p><strong>Mensualité totale :</strong> {formatCurrency(monthlyDebt)}</p>
                <p><strong>TAEG :</strong> {formatPercent(taeg)}</p>
                <p><strong>Service de la dette année 1 :</strong> {formatCurrency(year1 ? year1.annualDebtService : 0)}</p>
              </div>

              <div style={cardCss}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? 17 : 18 }}>Rendements</h3>

                <p>
                  <strong>
                    <GlossaryInline
                      termKey="rendementBrut"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  <span style={{ color: getGrossYieldColor(grossYield), fontWeight: 700 }}>
                    {formatPercent(grossYield)}
                  </span>
                </p>
                <p style={subtleNoteCss}>
                  Correspond au loyer HC × 12 / coût total projet.
                </p>

                <p>
                  <strong>
                    <GlossaryInline
                      termKey="rendementNet"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  <span style={{ color: getNetYieldColor(netYield), fontWeight: 700 }}>
                    {formatPercent(netYield)}
                  </span>
                </p>
                <p style={subtleNoteCss}>
                  Correspond au{' '}
                  <GlossaryInline
                    termKey="noi"
                    activeTerm={activeGlossaryTerm}
                    onToggle={toggleGlossary}
                  />{' '}
                  / coût total projet.
                </p>

                <p>
                  <strong>
                    <GlossaryInline
                      termKey="vacance"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  {formatPercent(economicVacancy)}
                </p>

                <p>
                  <strong>
                    <GlossaryInline
                      termKey="opex"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' ratio :'}
                  </strong>{' '}
                  {formatPercent(opexRatio)}
                </p>
                <p style={subtleNoteCss}>
                  Correspond aux charges d’exploitation / loyer.
                </p>

                <p>
                  <strong>
                    <GlossaryInline
                      termKey="effort"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' moyen :'}
                  </strong>{' '}
                  {formatCurrency(avgMonthlyEffort)}
                </p>
                <p><strong>Intérêts annuels moyens sur détention :</strong> {formatCurrency(avgInterest)}</p>
                <p><strong>Intérêts année 1 :</strong> {formatCurrency(year1 ? year1.annualInterest : 0)}</p>
              </div>

              <div style={cardCss}>
                <h3 style={{ marginTop: 0, fontSize: isMobile ? 17 : 18 }}>Sortie / création de valeur</h3>
                <p><strong>Prix de cession brut :</strong> {formatCurrency(grossSalePrice)}</p>
                <p><strong>Frais de vente :</strong> {formatCurrency(saleFees)}</p>
                <p><strong>Net vendeur après dette :</strong> {formatCurrency(netSaleProceeds)}</p>
                <p>
                  <strong>
                    <GlossaryInline
                      termKey="tri"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' equity :'}
                  </strong>{' '}
                  <span style={{ color: getIrrColor(irr), fontWeight: 700 }}>
                    {formatPercent(irr)}
                  </span>
                </p>
                <p>
                  <strong>
                    <GlossaryInline
                      termKey="multiple"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  {multipleCashOnCash.toFixed(2)}x
                </p>
                <p>
                  <strong>
                    <GlossaryInline
                      termKey="capAchat"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  {formatPercent(capAchat)}
                </p>
                <p>
                  <strong>
                    <GlossaryInline
                      termKey="capSortie"
                      activeTerm={activeGlossaryTerm}
                      onToggle={toggleGlossary}
                    />
                    {' :'}
                  </strong>{' '}
                  {formatPercent(capSortie)}
                </p>
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
                <p><strong>TAEG :</strong> {formatPercent(taeg)}</p>
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
              Les scénarios font varier principalement le loyer, le{' '}
              <GlossaryInline
                termKey="tauxNominal"
                activeTerm={activeGlossaryTerm}
                onToggle={toggleGlossary}
              />{' '}
              et la prise de valeur annuelle de l’actif.
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
              CRD ={' '}
              <GlossaryInline
                termKey="crd"
                activeTerm={activeGlossaryTerm}
                onToggle={toggleGlossary}
              />
              .
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

          <section style={{ ...sectionCss, padding: isMobile ? 14 : 20 }}>
            <h2 style={{ marginTop: 0, fontSize: isMobile ? 20 : 24 }}>
              Guide / Lexique immobilier
            </h2>
            <p style={{ color: '#6b7280', lineHeight: 1.5 }}>
              Cette section permet à un débutant de comprendre les principales notions affichées
              dans le simulateur. Tu peux cliquer sur chaque terme pour afficher son explication.
            </p>
            <GlossaryGuide
              activeTerm={activeGlossaryTerm}
              onToggle={toggleGlossary}
            />
          </section>
        </div>
      </div>

<div
  id="pdf-bankable-export"
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '794px',
    background: '#ffffff',
    color: '#111827',
    padding: '28px 32px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
    zIndex: -1,
    opacity: 0,
    pointerEvents: 'none',
  }}
>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 18, padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>Rentab&apos;Immo</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
              Fiche synthèse investissement locatif
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Cash-flow</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: getCashColor(year1 ? year1.monthlyCashflow : 0) }}>
                {formatCurrency(year1 ? year1.monthlyCashflow : 0)} / mois
              </div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Rendement net</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{formatPercent(netYield)}</div>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>TRI</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{formatPercent(irr)}</div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Projet</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div><strong>Type :</strong> Appartement locatif</div>
                <div><strong>Stratégie :</strong> Location longue durée</div>
                <div><strong>Horizon :</strong> {scenario.holdingPeriodYears} ans</div>
                <div><strong>Loyer HC :</strong> {formatCurrency(scenario.monthlyRent)}</div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Financement</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div><strong>Coût total projet :</strong> {formatCurrency(totalProjectCost)}</div>
                <div><strong>Apport :</strong> {formatCurrency(scenario.downPayment)}</div>
                <div><strong>Dette :</strong> {formatCurrency(financedAmount)}</div>
                <div><strong>Mensualité :</strong> {formatCurrency(monthlyDebt)}</div>
                <div><strong>TAEG :</strong> {formatPercent(taeg)}</div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Performance</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div><strong>Rendement brut :</strong> {formatPercent(grossYield)}</div>
                <div><strong>Rendement net :</strong> {formatPercent(netYield)}</div>
                <div><strong>NOI :</strong> {formatCurrency(year1 ? year1.noi : 0)}</div>
                <div><strong>Service dette :</strong> {formatCurrency(year1 ? year1.annualDebtService : 0)}</div>
                <div><strong>DSCR :</strong> {formatPercent(dscr)}</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Tableau d’exploitation annuelle résumé</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#111827', color: '#fff' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>Année</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Loyers encaissés</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>NOI</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Service dette</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Cash-flow annuel</th>
                </tr>
              </thead>
              <tbody>
                {pdfSummaryRows.map((row, index) => (
                  <tr key={row.year} style={{ background: index % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ padding: 6, borderBottom: '1px solid #e5e7eb' }}>{row.year}</td>
                    <td style={{ padding: 6, borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(row.annualCollectedRent)}</td>
                    <td style={{ padding: 6, borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(row.noi)}</td>
                    <td style={{ padding: 6, borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(row.annualDebtService)}</td>
                    <td style={{ padding: 6, borderBottom: '1px solid #e5e7eb', color: getCashColor(row.annualCashflow), fontWeight: 700 }}>
                      {formatCurrency(row.annualCashflow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Détail du TRI</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#111827', color: '#fff' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>Flux</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {cashflows.map((cashflow, index) => (
                  <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ padding: 6, borderBottom: '1px solid #e5e7eb' }}>
                      {index === 0 ? 'Apport initial' : `Année ${index}`}
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderBottom: '1px solid #e5e7eb',
                        color: cashflow >= 0 ? '#15803d' : '#dc2626',
                        fontWeight: 700,
                      }}
                    >
                      {formatCurrency(cashflow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280' }}>
              TRI total de la simulation : <strong style={{ color: '#111827' }}>{formatPercent(irr)}</strong>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}