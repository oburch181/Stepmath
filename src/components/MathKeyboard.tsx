import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  CornerDownLeft,
  Delete,
  Eraser,
} from 'lucide-react';
import { KeyboardTab, ProblemKind } from '../types/math';

interface MathKeyboardProps {
  variables: string[];
  problemKind?: ProblemKind;
  canCopyPrevious: boolean;
  onInsert: (text: string, cursorOffset?: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onMoveCursor: (delta: number) => void;
  onCopyPrevious: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
  submitLabel?: string;
}

interface KeyDef {
  label: string;
  insert: string;
  cursorOffset?: number;
  tone?: 'num' | 'op' | 'var' | 'action' | 'primary';
  italic?: boolean;
}

export const MathKeyboard: React.FC<MathKeyboardProps> = ({
  variables,
  problemKind,
  canCopyPrevious,
  onInsert,
  onBackspace,
  onClear,
  onMoveCursor,
  onCopyPrevious,
  onSubmit,
  submitDisabled = false,
  submitLabel = 'Check',
}) => {
  const [tab, setTab] = useState<KeyboardTab>('primary');

  // Contextual strip tailored to the active problem
  const uniqueVars = Array.from(new Set(variables.length > 0 ? variables : ['x']));
  const contextualKeys: KeyDef[] = [
    ...uniqueVars.slice(0, 3).map((v) => ({
      label: v,
      insert: v,
      tone: 'var' as const,
      italic: true,
    })),
    ...(problemKind === 'inequality'
      ? [
          { label: '<', insert: '<', tone: 'op' as const },
          { label: '>', insert: '>', tone: 'op' as const },
          { label: '≤', insert: '≤', tone: 'op' as const },
          { label: '≥', insert: '≥', tone: 'op' as const },
        ]
      : [
          { label: 'x²', insert: '^2', tone: 'op' as const },
          { label: '√', insert: '√()', cursorOffset: -1, tone: 'op' as const },
          { label: '±', insert: '±', tone: 'op' as const },
          { label: ',', insert: ', ', tone: 'op' as const },
        ]),
  ];

  const primaryGrid: (KeyDef | { special: 'backspace' | 'submit' })[] = [
    { label: '7', insert: '7', tone: 'num' },
    { label: '8', insert: '8', tone: 'num' },
    { label: '9', insert: '9', tone: 'num' },
    { label: '÷', insert: '/', tone: 'op' },
    { special: 'backspace' },

    { label: '4', insert: '4', tone: 'num' },
    { label: '5', insert: '5', tone: 'num' },
    { label: '6', insert: '6', tone: 'num' },
    { label: '×', insert: '*', tone: 'op' },
    { label: 'aᵇ', insert: '^', tone: 'op' },

    { label: '1', insert: '1', tone: 'num' },
    { label: '2', insert: '2', tone: 'num' },
    { label: '3', insert: '3', tone: 'num' },
    { label: '−', insert: '-', tone: 'op' },
    { label: '( )', insert: '()', cursorOffset: -1, tone: 'op' },

    { label: '0', insert: '0', tone: 'num' },
    { label: '.', insert: '.', tone: 'num' },
    { label: '=', insert: '=', tone: 'op' },
    { label: '+', insert: '+', tone: 'op' },
    { special: 'submit' },
  ];

  const functionsGrid: KeyDef[] = [
    { label: 'sin', insert: 'sin()', cursorOffset: -1, tone: 'op' },
    { label: 'cos', insert: 'cos()', cursorOffset: -1, tone: 'op' },
    { label: 'tan', insert: 'tan()', cursorOffset: -1, tone: 'op' },
    { label: 'ln', insert: 'ln()', cursorOffset: -1, tone: 'op' },
    { label: 'log', insert: 'log()', cursorOffset: -1, tone: 'op' },

    { label: 'eˣ', insert: 'e^()', cursorOffset: -1, tone: 'op' },
    { label: '√', insert: '√()', cursorOffset: -1, tone: 'op' },
    { label: '|x|', insert: '||', cursorOffset: -1, tone: 'op' },
    { label: 'π', insert: 'π', tone: 'var', italic: true },
    { label: 'e', insert: 'e', tone: 'var', italic: true },

    { label: '<', insert: '<', tone: 'op' },
    { label: '>', insert: '>', tone: 'op' },
    { label: '≤', insert: '≤', tone: 'op' },
    { label: '≥', insert: '≥', tone: 'op' },
    { label: '±', insert: '±', tone: 'op' },

    { label: '(', insert: '(', tone: 'op' },
    { label: ')', insert: ')', tone: 'op' },
    { label: 'n!', insert: '!', tone: 'op' },
    { label: 'x²', insert: '^2', tone: 'op' },
    { label: ',', insert: ', ', tone: 'op' },
  ];

  const variablesGrid: KeyDef[] = [
    { label: 'x', insert: 'x', tone: 'var', italic: true },
    { label: 'y', insert: 'y', tone: 'var', italic: true },
    { label: 'z', insert: 'z', tone: 'var', italic: true },
    { label: 't', insert: 't', tone: 'var', italic: true },
    { label: 'r', insert: 'r', tone: 'var', italic: true },

    { label: 'u', insert: 'u', tone: 'var', italic: true },
    { label: 'v', insert: 'v', tone: 'var', italic: true },
    { label: 'n', insert: 'n', tone: 'var', italic: true },
    { label: 'k', insert: 'k', tone: 'var', italic: true },
    { label: 'C', insert: 'C', tone: 'var', italic: true },

    { label: 'a', insert: 'a', tone: 'var', italic: true },
    { label: 'b', insert: 'b', tone: 'var', italic: true },
    { label: 'c', insert: 'c', tone: 'var', italic: true },
    { label: 'λ', insert: 'λ', tone: 'var', italic: true },
    { label: 'θ', insert: 'θ', tone: 'var', italic: true },

    { label: 'π', insert: 'π', tone: 'var', italic: true },
    { label: 'e', insert: 'e', tone: 'var', italic: true },
    { label: '=', insert: '=', tone: 'op' },
    { label: '+', insert: '+', tone: 'op' },
    { label: '−', insert: '-', tone: 'op' },
  ];

  const keyToneClass = (tone?: KeyDef['tone']) => {
    switch (tone) {
      case 'num':
        return 'bg-sheet text-ink border-hairline hover:bg-[#FFFFFF] active:bg-linen-deep';
      case 'var':
        return 'bg-[#F8F5EE] text-forest border-[#D8D1C4] hover:bg-sheet active:bg-forest-soft';
      case 'op':
        return 'bg-[#EAE5DB] text-ink border-[#DBD4C7] hover:bg-[#E4DED2] active:bg-linen-deep';
      default:
        return 'bg-sheet text-ink border-hairline';
    }
  };

  return (
    <div
      className="bg-linen border-t lg:border border-hairline lg:rounded-2xl select-none"
      aria-label="Math keypad"
    >
      {/* Top toolbar: Tab switcher + Copy previous + Cursor controls */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2 border-b border-hairline/80">
        <div
          className="inline-flex items-center bg-[#E4DFD4] p-0.5 rounded-lg"
          role="tablist"
          aria-label="Keypad modes"
        >
          {(
            [
              { id: 'primary', label: '123' },
              { id: 'functions', label: 'f(x)' },
              { id: 'variables', label: 'abc' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                tab === item.id
                  ? 'bg-sheet text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {canCopyPrevious && (
            <button
              type="button"
              onClick={onCopyPrevious}
              title="Copy previous line"
              className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-[#E4DFD4]/80 active:bg-linen-deep transition-colors whitespace-nowrap shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy prev</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onMoveCursor(-1)}
            aria-label="Move cursor left"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-[#E4DFD4]/80 active:bg-linen-deep transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveCursor(1)}
            aria-label="Move cursor right"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-[#E4DFD4]/80 active:bg-linen-deep transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear line"
            title="Clear line"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-muted hover:text-ochre hover:bg-[#E4DFD4]/80 active:bg-linen-deep transition-colors"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contextual quick-row on Primary tab */}
      {tab === 'primary' && (
        <div className="px-2.5 pt-2 pb-1">
          <div className="flex items-center gap-1.5">
            {contextualKeys.map((key) => (
              <button
                key={key.label}
                type="button"
                onClick={() => onInsert(key.insert, key.cursorOffset)}
                className={`flex-1 min-h-[40px] rounded-lg border text-[16px] font-medium transition-transform active:scale-[0.96] flex items-center justify-center ${
                  key.italic ? 'font-serif italic text-[18px]' : 'font-serif'
                } ${keyToneClass(key.tone)}`}
              >
                {key.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main 5-column keypad grid */}
      <div className="p-2.5 pt-1.5">
        {tab === 'primary' && (
          <div className="grid grid-cols-5 gap-1.5">
            {primaryGrid.map((item, idx) => {
              if ('special' in item) {
                if (item.special === 'backspace') {
                  return (
                    <button
                      key={`sp-${idx}`}
                      type="button"
                      onClick={onBackspace}
                      aria-label="Backspace"
                      className="min-h-[48px] rounded-xl border border-[#DBD4C7] bg-[#EAE5DB] text-ink hover:bg-[#E4DED2] active:scale-[0.96] transition-transform flex items-center justify-center"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  );
                }
                return (
                  <button
                    key={`sp-${idx}`}
                    type="button"
                    onClick={onSubmit}
                    disabled={submitDisabled}
                    aria-label={submitLabel}
                    className="min-h-[48px] rounded-xl bg-forest text-[#FCFBF8] hover:bg-forest-hover active:scale-[0.97] disabled:opacity-40 transition-all flex items-center justify-center gap-1 font-medium text-sm shadow-xs"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                  </button>
                );
              }

              return (
                <button
                  key={`${item.label}-${idx}`}
                  type="button"
                  onClick={() => onInsert(item.insert, item.cursorOffset)}
                  className={`min-h-[48px] rounded-xl border text-[19px] font-medium transition-transform active:scale-[0.96] flex items-center justify-center ${
                    item.tone === 'num' ? 'font-sans tabular-nums' : 'font-serif'
                  } ${keyToneClass(item.tone)}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'functions' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-5 gap-1.5">
              {functionsGrid.map((key, idx) => (
                <button
                  key={`${key.label}-${idx}`}
                  type="button"
                  onClick={() => onInsert(key.insert, key.cursorOffset)}
                  className={`min-h-[46px] rounded-xl border text-[16px] font-medium transition-transform active:scale-[0.96] flex items-center justify-center ${
                    key.italic ? 'font-serif italic text-[18px]' : 'font-serif'
                  } ${keyToneClass(key.tone)}`}
                >
                  {key.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={onBackspace}
                aria-label="Backspace"
                className="col-span-2 min-h-[44px] rounded-xl border border-[#DBD4C7] bg-[#EAE5DB] text-ink hover:bg-[#E4DED2] active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <Delete className="w-4 h-4" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitDisabled}
                className="col-span-3 min-h-[44px] rounded-xl bg-forest text-[#FCFBF8] hover:bg-forest-hover active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <span>{submitLabel}</span>
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {tab === 'variables' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-5 gap-1.5">
              {variablesGrid.map((key, idx) => (
                <button
                  key={`${key.label}-${idx}`}
                  type="button"
                  onClick={() => onInsert(key.insert, key.cursorOffset)}
                  className={`min-h-[46px] rounded-xl border text-[18px] font-medium transition-transform active:scale-[0.96] flex items-center justify-center ${
                    key.italic ? 'font-serif italic' : 'font-serif'
                  } ${keyToneClass(key.tone)}`}
                >
                  {key.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={onBackspace}
                aria-label="Backspace"
                className="col-span-2 min-h-[44px] rounded-xl border border-[#DBD4C7] bg-[#EAE5DB] text-ink hover:bg-[#E4DED2] active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <Delete className="w-4 h-4" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitDisabled}
                className="col-span-3 min-h-[44px] rounded-xl bg-forest text-[#FCFBF8] hover:bg-forest-hover active:scale-[0.98] disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 text-sm font-medium"
              >
                <span>{submitLabel}</span>
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
