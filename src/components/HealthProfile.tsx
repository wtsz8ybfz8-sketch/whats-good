/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

const STORAGE_KEY = 'whats-good-health-profile';

export interface HealthProfileData {
  condition: string;
  dietary: string;
}

// ─── Option lists ────────────────────────────────────────────────────────────

const CONDITIONS = [
  { key: 'general',          emoji: '🌿', label: 'General wellness',      sub: 'No specific condition' },
  { key: 'ibs',              emoji: '🫁', label: 'IBS',                   sub: 'Irritable Bowel Syndrome' },
  { key: 'low-fodmap',       emoji: '📋', label: 'Low-FODMAP diet',       sub: null },
  { key: 'acid-reflux',      emoji: '🔥', label: 'Acid Reflux / GERD',    sub: null },
  { key: 'crohns',           emoji: '💊', label: "Crohn's disease",       sub: null },
  { key: 'coeliac',          emoji: '🌾', label: 'Coeliac / Gluten-free', sub: null },
  { key: 'diabetes',         emoji: '💉', label: 'Diabetes',              sub: 'Type 1 or 2' },
  { key: 'high-cholesterol', emoji: '❤️', label: 'High cholesterol',      sub: null },
  { key: 'lactose',          emoji: '🥛', label: 'Lactose intolerance',   sub: null },
  { key: 'nut-allergy',      emoji: '🥜', label: 'Nut allergy awareness', sub: null },
  { key: 'kidney',           emoji: '🫘', label: 'Kidney disease',        sub: 'Low potassium diet' },
  { key: 'hypertension',     emoji: '🧂', label: 'Hypertension',          sub: 'Low sodium diet' },
];

const DIETARY_OPTIONS = [
  { key: 'none',         emoji: '—',  label: 'No specific preference', sub: null },
  { key: 'vegan',        emoji: '🌱', label: 'Vegan',                  sub: null },
  { key: 'vegetarian',   emoji: '🥦', label: 'Vegetarian',             sub: null },
  { key: 'high-protein', emoji: '💪', label: 'High protein',           sub: 'Fitness focus' },
];

// ─── Label maps for the header pill ─────────────────────────────────────────

const CONDITION_LABELS: Record<string, string> = {
  general:           '🌿 General',
  ibs:               '🫁 IBS',
  'low-fodmap':      '📋 Low-FODMAP',
  'acid-reflux':     '🔥 Acid Reflux',
  crohns:            "💊 Crohn's",
  coeliac:           '🌾 Gluten-free',
  diabetes:          '💉 Diabetes',
  'high-cholesterol':'❤️ Cholesterol',
  lactose:           '🥛 Lactose',
  'nut-allergy':     '🥜 Nut Allergy',
  kidney:            '🫘 Kidney',
  hypertension:      '🧂 Low Sodium',
};

const DIETARY_LABELS: Record<string, string> = {
  vegan:        '🌱 Vegan',
  vegetarian:   '🥦 Vegetarian',
  'high-protein':'💪 High Protein',
};

// ─── Storage helpers ─────────────────────────────────────────────────────────

function load(): HealthProfileData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'condition' in parsed && 'dietary' in parsed) {
      return parsed as HealthProfileData;
    }
    return null; // old single-string format — treat as unset
  } catch {
    return null;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useHealthProfile() {
  const [profileData, setProfileData] = useState<HealthProfileData | null>(load);

  const setProfile = (data: HealthProfileData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setProfileData(data);
  };

  const clearProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfileData(null);
  };

  const condLabel = profileData ? (CONDITION_LABELS[profileData.condition] ?? profileData.condition) : null;
  const dietLabel = profileData?.dietary && profileData.dietary !== 'none'
    ? (DIETARY_LABELS[profileData.dietary] ?? null)
    : null;
  const pillLabel = condLabel
    ? [condLabel, dietLabel].filter(Boolean).join(' · ')
    : null;

  return {
    condition: profileData?.condition ?? null,
    dietary:   profileData?.dietary ?? null,
    setProfile,
    clearProfile,
    pillLabel,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface HealthProfileProps {
  onSave: (data: HealthProfileData) => void;
}

export function HealthProfile({ onSave }: HealthProfileProps) {
  const [localCondition, setLocalCondition] = useState<string | null>(null);
  const [localDietary, setLocalDietary] = useState<string>('none');

  const canSave = localCondition !== null;

  const cardClass = (selected: boolean) =>
    `flex items-start gap-3 text-left p-3.5 rounded-xl border transition-all cursor-pointer group ${
      selected
        ? 'bg-[#1A1A1A] border-[#1A1A1A]'
        : 'bg-white border-black/[0.08] hover:border-[#7C2D12]/40 hover:bg-[#FEF9F7]'
    }`;

  const labelClass = (selected: boolean) =>
    `block font-sans text-sm font-bold leading-snug transition-colors ${
      selected ? 'text-white' : 'text-[#1A1A1A] group-hover:text-[#7C2D12]'
    }`;

  const subClass = (selected: boolean) =>
    `block text-xs mt-0.5 ${selected ? 'text-white/60' : 'text-[#6E6A64]'}`;

  return (
    <div className="fixed inset-0 z-[100] bg-[#FAF9F6]/95 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto animate-[revealUp_0.4s_cubic-bezier(0.15,1,0.3,1)_forwards]">
      <div className="w-full max-w-[600px] my-auto py-6">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-[#F2F1EE] rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-xl">🥗</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-2">
            Any dietary needs we should know about?
          </h2>
          <p className="text-xs text-[#6E6A64]">
            Pick one from each section — you can change this any time from the header.
          </p>
        </div>

        {/* Health conditions */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-[#6E6A64]">
              Health conditions
            </span>
            <span className="h-px flex-1 bg-[#e6e4e0]" />
            {localCondition && (
              <span className="text-[10px] text-[#7C2D12] font-bold">✓ selected</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CONDITIONS.map(opt => {
              const sel = localCondition === opt.key;
              return (
                <button key={opt.key} onClick={() => setLocalCondition(opt.key)} className={cardClass(sel)}>
                  <span className="text-lg mt-0.5 shrink-0 leading-none">{opt.emoji}</span>
                  <div>
                    <span className={labelClass(sel)}>{opt.label}</span>
                    {opt.sub && <span className={subClass(sel)}>{opt.sub}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary preferences */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[1.5px] text-[#6E6A64]">
              Dietary preferences
            </span>
            <span className="h-px flex-1 bg-[#e6e4e0]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DIETARY_OPTIONS.map(opt => {
              const sel = localDietary === opt.key;
              return (
                <button key={opt.key} onClick={() => setLocalDietary(opt.key)} className={cardClass(sel)}>
                  <span className="text-lg mt-0.5 shrink-0 leading-none">{opt.emoji}</span>
                  <div>
                    <span className={labelClass(sel)}>{opt.label}</span>
                    {opt.sub && <span className={subClass(sel)}>{opt.sub}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={() => canSave && onSave({ condition: localCondition!, dietary: localDietary })}
          disabled={!canSave}
          className={`w-full py-4 rounded-xl font-serif text-lg font-semibold transition-all ${
            canSave
              ? 'bg-[#7C2D12] text-white hover:bg-[#5E220E] cursor-pointer'
              : 'bg-[#e6e4e0] text-[#a2a8a8] cursor-not-allowed'
          }`}
        >
          {canSave ? 'Save Profile →' : 'Select a health condition above to continue'}
        </button>
      </div>
    </div>
  );
}
