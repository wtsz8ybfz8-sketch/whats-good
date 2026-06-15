/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';

const STORAGE_KEY = 'whats-good-health-profile';

const OPTIONS = [
  { key: 'general',     emoji: '🌿', label: 'No specific condition', sub: 'General wellness' },
  { key: 'ibs',         emoji: '🫁', label: 'IBS',                   sub: 'Irritable Bowel Syndrome' },
  { key: 'low-fodmap',  emoji: '📋', label: 'Low-FODMAP diet',       sub: null },
  { key: 'acid-reflux', emoji: '🔥', label: 'Acid Reflux / GERD',    sub: null },
  { key: 'crohns',      emoji: '💊', label: "Crohn's disease",       sub: null },
  { key: 'coeliac',     emoji: '🌾', label: 'Coeliac / Gluten-free', sub: null },
] as const;

const PILL_LABELS: Record<string, string> = {
  general:      '🌿 General',
  ibs:          '🫁 IBS',
  'low-fodmap': '📋 Low-FODMAP',
  'acid-reflux':'🔥 Acid Reflux',
  crohns:       "💊 Crohn's",
  coeliac:      '🌾 Gluten-free',
};

export function useHealthProfile() {
  const [profile, setProfileState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  const setProfile = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setProfileState(key);
  };

  const clearProfile = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfileState(null);
  };

  return {
    profile,
    setProfile,
    clearProfile,
    pillLabel: profile ? (PILL_LABELS[profile] ?? profile) : null,
  };
}

interface HealthProfileProps {
  onSelect: (key: string) => void;
}

export function HealthProfile({ onSelect }: HealthProfileProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#FAF9F6]/95 backdrop-blur-sm flex items-center justify-center p-6 animate-[revealUp_0.4s_cubic-bezier(0.15,1,0.3,1)_forwards]">
      <div className="w-full max-w-[520px]">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-[#F2F1EE] rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-xl">🥗</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight mb-2">
            Any dietary needs we should know about?
          </h2>
          <p className="text-xs text-[#6E6A64]">Select one — you can change this any time from the header.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              className="flex items-start gap-3 text-left p-4 rounded-xl border border-black/[0.08] bg-white hover:border-[#7C2D12]/40 hover:bg-[#FEF9F7] active:scale-[0.98] transition-all cursor-pointer group"
            >
              <span className="text-xl mt-0.5 shrink-0">{opt.emoji}</span>
              <div>
                <span className="block font-sans text-sm font-bold text-[#1A1A1A] group-hover:text-[#7C2D12] transition-colors leading-snug">
                  {opt.label}
                </span>
                {opt.sub && (
                  <span className="block text-xs text-[#6E6A64] mt-0.5">{opt.sub}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
