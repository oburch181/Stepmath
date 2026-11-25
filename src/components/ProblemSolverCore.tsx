import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { Problem, StepLine } from '../types/math';
import { verifySlotValue, verifyStep } from '../math/engine';
import { MathDisplay, MathInputDisplay } from './MathDisplay';
import { MathKeyboard } from './MathKeyboard';

interface ProblemSolverCoreProps {
  problem: Problem;
  mode: 'practice' | 'exam';
  initialSteps?: StepLine[];
  /** Triggered whenever the problem is solved (or submitted in exam mode) */
  onSolved: (steps: StepLine[]) => void;
  /** Triggered on step updates (for persistence in practice mode) */
  onStepsChange?: (steps: StepLine[], solved: boolean) => void;
  /** Triggered in exam mode if a concept_choice answer is submitted incorrectly */
  onExamIncorrectSubmit?: (summary: string) => void;
  /** Optional footer slot rendered inside the paper sheet once solved */
  solvedFooter?: React.ReactNode;
  /** Optional action trigger when Enter is pressed after solving */
  onEnterAfterSolved?: () => void;
}

export const ProblemSolverCore: React.FC<ProblemSolverCoreProps> = ({
  problem,
  mode,
  initialSteps,
  onSolved,
  onStepsChange,
  onExamIncorrectSubmit,
  solvedFooter,
  onEnterAfterSolved,
}) => {
  const format = problem.format ?? 'line_by_line';

  // --- Line-by-line state ---
  const [steps, setSteps] = useState<StepLine[]>(initialSteps ?? []);
  const [input, setInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [keypadCollapsed, setKeypadCollapsed] = useState(false);

  // --- Slots state (Taylor coefficients, tables, matrix entries) ---
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [activeSlotId, setActiveSlotId] = useState<string>(
    problem.slots?.[0]?.id ?? ''
  );
  const [slotCursor, setSlotCursor] = useState<number>(0);
  const [slotFeedback, setSlotFeedback] = useState<
    Record<string, { ok: boolean; message?: string }>
  >({});
  const [slotsSolved, setSlotsSolved] = useState<boolean>(
    Boolean(initialSteps?.some((s) => s.status === 'solved'))
  );

  // --- Concept choice state ---
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [choiceChecked, setChoiceChecked] = useState<boolean>(
    Boolean(initialSteps?.some((s) => s.status === 'solved'))
  );
  const [choiceSolved, setChoiceSolved] = useState<boolean>(
    Boolean(initialSteps?.some((s) => s.status === 'solved'))
  );

  const sheetEndRef = useRef<HTMLDivElement | null>(null);

  // Reset cleanly when problem changes
  useEffect(() => {
    const alreadySolved = Boolean(initialSteps?.some((s) => s.status === 'solved'));
    setSteps(initialSteps ?? []);
    setInput('');
    setCursorPos(0);
    setInlineError(null);
    setKeypadCollapsed(false);

    const initSlots: Record<string, string> = {};
    if (alreadySolved && problem.slots) {
      problem.slots.forEach((s) => {
        initSlots[s.id] = s.expected;
      });
    }
    setSlotValues(initSlots);
    setActiveSlotId(problem.slots?.[0]?.id ?? '');
    setSlotCursor(0);
    setSlotFeedback({});
    setSlotsSolved(alreadySolved);

    setSelectedChoiceId(alreadySolved ? problem.correctChoiceId ?? null : null);
    setChoiceChecked(alreadySolved);
    setChoiceSolved(alreadySolved);
  }, [problem.id]);

  const isSolved =
    format === 'line_by_line'
      ? steps.some((s) => s.status === 'solved')
      : format === 'slots'
        ? slotsSolved
        : choiceSolved;

  const validLines = steps.filter((s) => s.status === 'valid' || s.status === 'solved');
  const lastValidRaw =
    validLines.length > 0
      ? validLines[validLines.length - 1].raw
      : problem.displayGiven
        ? ''
        : problem.given;

  useEffect(() => {
    sheetEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [steps.length, inlineError]);

  // -------------------------------------------------------------------------
  // Handlers for Line-by-line & Slots shared custom MathKeyboard
  // -------------------------------------------------------------------------
  const handleInsert = useCallback(
    (text: string, cursorOffset = 0) => {
      if (isSolved) return;

      if (format === 'slots') {
        if (!activeSlotId) return;
        setSlotFeedback((prev) => {
          if (!prev[activeSlotId]) return prev;
          const next = { ...prev };
          delete next[activeSlotId];
          return next;
        });
        setSlotValues((prev) => {
          const cur = prev[activeSlotId] ?? '';
          const safePos = Math.max(0, Math.min(slotCursor, cur.length));
          const nextVal = cur.slice(0, safePos) + text + cur.slice(safePos);
          setSlotCursor(
            Math.max(0, Math.min(nextVal.length, safePos + text.length + cursorOffset))
          );
          return { ...prev, [activeSlotId]: nextVal };
        });
        return;
      }

      setInlineError(null);
      setInput((prev) => {
        const safePos = Math.max(0, Math.min(cursorPos, prev.length));
        const next = prev.slice(0, safePos) + text + prev.slice(safePos);
        setCursorPos(
          Math.max(0, Math.min(next.length, safePos + text.length + cursorOffset))
        );
        return next;
      });
    },
    [activeSlotId, cursorPos, format, isSolved, slotCursor]
  );

  const handleBackspace = useCallback(() => {
    if (isSolved) return;

    if (format === 'slots') {
      if (!activeSlotId) return;
      setSlotValues((prev) => {
        const cur = prev[activeSlotId] ?? '';
        const safePos = Math.max(0, Math.min(slotCursor, cur.length));
        if (safePos === 0) return prev;
        const nextVal = cur.slice(0, safePos - 1) + cur.slice(safePos);
        setSlotCursor(safePos - 1);
        return { ...prev, [activeSlotId]: nextVal };
      });
      return;
    }

    setInlineError(null);
    setInput((prev) => {
      const safePos = Math.max(0, Math.min(cursorPos, prev.length));
      if (safePos === 0) return prev;
      const next = prev.slice(0, safePos - 1) + prev.slice(safePos);
      setCursorPos(safePos - 1);
      return next;
    });
  }, [activeSlotId, cursorPos, format, isSolved, slotCursor]);

  const handleClear = useCallback(() => {
    if (format === 'slots') {
      if (!activeSlotId) return;
      setSlotValues((prev) => ({ ...prev, [activeSlotId]: '' }));
      setSlotCursor(0);
      return;
    }
    setInlineError(null);
    setInput('');
    setCursorPos(0);
  }, [activeSlotId, format]);

  const handleMoveCursor = useCallback(
    (delta: number) => {
      if (format === 'slots') {
        const len = (slotValues[activeSlotId] ?? '').length;
        setSlotCursor((p) => Math.max(0, Math.min(len, p + delta)));
        return;
      }
      setCursorPos((p) => Math.max(0, Math.min(input.length, p + delta)));
    },
    [activeSlotId, format, input.length, slotValues]
  );

  const handleCopyPrevious = useCallback(() => {
    if (isSolved || format !== 'line_by_line') return;
    const source = lastValidRaw || problem.given;
    if (!source) return;
    setInlineError(null);
    setInput(source);
    setCursorPos(source.length);
  }, [format, isSolved, lastValidRaw, problem.given]);

  const handleCheckSlots = useCallback(() => {
    if (isSolved || !problem.slots) return;
    const results: Record<string, { ok: boolean; message?: string }> = {};
    let allOk = true;
    let firstInvalidId: string | null = null;

    for (const slot of problem.slots) {
      const val = slotValues[slot.id] ?? '';
      const check = verifySlotValue(val, slot.expected);
      results[slot.id] = check;
      if (!check.ok) {
        allOk = false;
        if (!firstInvalidId) firstInvalidId = slot.id;
      }
    }

    setSlotFeedback(results);

    if (allOk) {
      setSlotsSolved(true);
      const summaryStep: StepLine = {
        id: `${Date.now()}`,
        raw: problem.slots.map((s) => `${s.label} = ${slotValues[s.id]}`).join(', '),
        status: 'solved',
        feedback: 'All entries verified',
      };
      onStepsChange?.([summaryStep], true);
      onSolved([summaryStep]);
    } else if (firstInvalidId) {
      setActiveSlotId(firstInvalidId);
      setSlotCursor((slotValues[firstInvalidId] ?? '').length);
    }
  }, [isSolved, onSolved, onStepsChange, problem.slots, slotValues]);

  const handleSubmit = useCallback(() => {
    if (isSolved) return;

    if (format === 'slots') {
      if (!problem.slots) return;
      // If current slot isn't last and next slot is empty, advance smoothly; else verify all
      const idx = problem.slots.findIndex((s) => s.id === activeSlotId);
      const anyEmpty = problem.slots.some((s) => !(slotValues[s.id] ?? '').trim());
      if (anyEmpty && idx !== -1 && idx + 1 < problem.slots.length) {
        const nextEmpty =
          problem.slots.slice(idx + 1).find((s) => !(slotValues[s.id] ?? '').trim()) ??
          problem.slots.find((s) => !(slotValues[s.id] ?? '').trim());
        if (nextEmpty && nextEmpty.id !== activeSlotId) {
          setActiveSlotId(nextEmpty.id);
          setSlotCursor((slotValues[nextEmpty.id] ?? '').length);
          return;
        }
      }
      handleCheckSlots();
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      setInlineError('Write your next line before checking.');
      return;
    }

    const priorRawLines = validLines.map((s) => s.raw);
    const result = verifyStep(trimmed, priorRawLines, problem);

    if (result.status === 'error') {
      setInlineError(result.feedback);
      return;
    }

    const newStep: StepLine = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      raw: trimmed,
      status: result.status,
      feedback: result.feedback,
    };

    const nextSteps = [...steps, newStep];
    setSteps(nextSteps);
    setInput('');
    setCursorPos(0);
    setInlineError(null);

    const solvedNow = result.status === 'solved';
    onStepsChange?.(nextSteps, solvedNow);
    if (solvedNow) {
      onSolved(nextSteps);
    }
  }, [
    activeSlotId,
    format,
    handleCheckSlots,
    input,
    isSolved,
    onSolved,
    onStepsChange,
    problem,
    slotValues,
    steps,
    validLines,
  ]);

  const handleUndo = useCallback(() => {
    if (steps.length === 0) return;
    const removed = steps[steps.length - 1];
    const nextSteps = steps.slice(0, -1);
    setSteps(nextSteps);
    setInput(removed.raw);
    setCursorPos(removed.raw.length);
    setInlineError(null);
    onStepsChange?.(nextSteps, false);
  }, [onStepsChange, steps]);

  const handleReset = useCallback(() => {
    setSteps([]);
    setInput('');
    setCursorPos(0);
    setInlineError(null);
    setSlotValues({});
    setSlotFeedback({});
    setSlotsSolved(false);
    setActiveSlotId(problem.slots?.[0]?.id ?? '');
    setSlotCursor(0);
    setSelectedChoiceId(null);
    setChoiceChecked(false);
    setChoiceSolved(false);
    onStepsChange?.([], false);
  }, [onStepsChange, problem.slots]);

  const handleSelectChoice = (choiceId: string) => {
    if (isSolved) return;
    setSelectedChoiceId(choiceId);
    if (mode === 'practice') {
      setChoiceChecked(true);
      if (choiceId === problem.correctChoiceId) {
        setChoiceSolved(true);
        const choice = problem.choices?.find((c) => c.id === choiceId);
        const doneStep: StepLine = {
          id: `${Date.now()}`,
          raw: choice?.label ?? choiceId,
          status: 'solved',
          feedback: 'Correct reasoning',
        };
        onStepsChange?.([doneStep], true);
        onSolved([doneStep]);
      }
    }
  };

  const handleSubmitExamChoice = () => {
    if (!selectedChoiceId) return;
    setChoiceChecked(true);
    const choice = problem.choices?.find((c) => c.id === selectedChoiceId);
    if (selectedChoiceId === problem.correctChoiceId) {
      setChoiceSolved(true);
      onSolved([
        {
          id: `${Date.now()}`,
          raw: choice?.label ?? selectedChoiceId,
          status: 'solved',
          feedback: 'Correct',
        },
      ]);
    } else {
      onExamIncorrectSubmit?.(choice?.label ?? 'Incorrect selection');
    }
  };

  // Seamless physical keyboard support for line_by_line and slots
  useEffect(() => {
    if (format === 'concept_choice') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Tab' && format === 'slots' && problem.slots?.length) {
        e.preventDefault();
        const curIdx = problem.slots.findIndex((s) => s.id === activeSlotId);
        const nextIdx = (curIdx + (e.shiftKey ? -1 : 1) + problem.slots.length) % problem.slots.length;
        const nextId = problem.slots[nextIdx].id;
        setActiveSlotId(nextId);
        setSlotCursor((slotValues[nextId] ?? '').length);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isSolved && onEnterAfterSolved) {
          onEnterAfterSolved();
        } else {
          handleSubmit();
        }
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleMoveCursor(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleMoveCursor(1);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
        return;
      }
      if (e.key.length === 1 && /[0-9a-zA-Z+\-*/^()=<>.,|!\s]/.test(e.key)) {
        e.preventDefault();
        handleInsert(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeSlotId,
    format,
    handleBackspace,
    handleClear,
    handleInsert,
    handleMoveCursor,
    handleSubmit,
    isSolved,
    onEnterAfterSolved,
    problem.slots,
    slotValues,
  ]);

  const showKeyboard = format !== 'concept_choice' && !isSolved;

  return (
    <div
      className={`flex-1 w-full max-w-6xl mx-auto px-0 sm:px-6 lg:pb-12 grid grid-cols-1 ${
        format === 'concept_choice' ? 'lg:grid-cols-12' : 'lg:grid-cols-12'
      } lg:gap-8 items-start`}
    >
      {/* Left / Upper Zone: Paper Proof Sheet */}
      <div
        className={`${
          format === 'concept_choice' ? 'lg:col-span-8 lg:col-start-3' : 'lg:col-span-7'
        } flex flex-col px-4 sm:px-0 pb-6 lg:pb-0`}
      >
        <div className="paper-sheet rounded-2xl border border-hairline overflow-hidden">
          {/* Prompt Header */}
          <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-hairline/70 flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs text-ink-muted mb-1">
                {problem.title}
                {format === 'slots' && (
                  <>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>Fill entries</span>
                  </>
                )}
                {format === 'concept_choice' && (
                  <>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>Concept check</span>
                  </>
                )}
              </p>
              <p className="text-sm font-medium text-ink leading-relaxed">
                {problem.instruction}
              </p>
            </div>

            {mode === 'practice' && (steps.length > 0 || isSolved) && (
              <div className="flex items-center gap-1 shrink-0">
                {format === 'line_by_line' && !isSolved && steps.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    title="Undo last line"
                    className="inline-flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-linen transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  title="Start over"
                  className="inline-flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-linen transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* FORMAT 1: LINE-BY-LINE DERIVATION (Standard)                    */}
          {/* =============================================================== */}
          {format === 'line_by_line' && (
            <div className="divide-y divide-hairline/55">
              <div className="px-5 sm:px-7 py-5 flex items-baseline gap-4 bg-[#FAF8F4]">
                <span className="font-mono text-xs text-ink-subtle tabular-nums w-6 shrink-0 select-none">
                  00
                </span>
                <div className="flex-1 min-w-0">
                  <MathDisplay
                    expression={problem.displayGiven ?? problem.given}
                    size="xl"
                  />
                </div>
              </div>

              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`px-5 sm:px-7 py-4 flex items-start gap-4 transition-colors ${
                    step.status === 'solved' ? 'bg-forest-soft/55' : 'bg-sheet'
                  }`}
                >
                  <span className="font-mono text-xs text-ink-subtle tabular-nums w-6 pt-1.5 shrink-0 select-none">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <MathDisplay expression={step.raw} size="lg" />
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ${
                          step.status === 'solved' ? 'text-forest' : 'text-forest/80'
                        }`}
                      />
                      <span
                        className={
                          step.status === 'solved'
                            ? 'font-medium text-forest'
                            : 'text-ink-muted'
                        }
                      >
                        {step.feedback}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {!isSolved && (
                <div className="px-5 sm:px-7 py-4 bg-sheet">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-xs text-forest font-medium tabular-nums w-6 pt-2.5 shrink-0 select-none">
                      {String(steps.length + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <MathInputDisplay
                          value={input}
                          cursorPos={cursorPos}
                          onCursorChange={setCursorPos}
                          placeholder={
                            steps.length === 0
                              ? 'Write your first step…'
                              : 'Write your next line…'
                          }
                          active
                        />
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={!input.trim()}
                          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover disabled:opacity-35 transition-colors whitespace-nowrap shrink-0"
                        >
                          <span>Check line</span>
                        </button>
                      </div>

                      {inlineError && (
                        <div
                          role="alert"
                          className="mt-2.5 flex items-start gap-2 rounded-lg bg-ochre-soft px-3 py-2 text-xs text-ochre"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{inlineError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* FORMAT 2: STRUCTURED SLOTS (Taylor Coefficients / Tables / Vec) */}
          {/* =============================================================== */}
          {format === 'slots' && problem.slots && (
            <div className="divide-y divide-hairline/55">
              <div className="px-5 sm:px-7 py-5 bg-[#FAF8F4]">
                <MathDisplay
                  expression={problem.displayGiven ?? problem.given}
                  size="lg"
                />
              </div>

              <div className="px-5 sm:px-7 py-6 bg-sheet space-y-5">
                {problem.slotLayout === 'series' ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
                    {problem.slots.map((slot, idx) => {
                      const val = slotValues[slot.id] ?? '';
                      const isActive = !isSolved && activeSlotId === slot.id;
                      const fb = slotFeedback[slot.id];

                      return (
                        <React.Fragment key={slot.id}>
                          {idx > 0 && (
                            <span className="font-serif text-lg text-ink-muted select-none">
                              +
                            </span>
                          )}
                          <div className="inline-flex flex-col items-start">
                            <span className="font-mono text-[11px] text-ink-subtle mb-1 pl-0.5">
                              {slot.label}
                            </span>
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSolved) return;
                                  setActiveSlotId(slot.id);
                                  setSlotCursor(val.length);
                                }}
                                className={`min-w-[74px] min-h-[44px] px-3 rounded-xl border text-left transition-colors flex items-center ${
                                  isSolved || fb?.ok
                                    ? 'border-forest/50 bg-forest-soft/50'
                                    : fb && !fb.ok
                                      ? 'border-ochre bg-ochre-soft/60'
                                      : isActive
                                        ? 'border-forest bg-[#FFFFFF] ring-2 ring-forest/15'
                                        : 'border-hairline bg-[#FAF8F4] hover:border-ink-subtle'
                                }`}
                              >
                                <MathInputDisplay
                                  value={val}
                                  cursorPos={isActive ? slotCursor : val.length}
                                  onCursorChange={(pos) => {
                                    if (isSolved) return;
                                    setActiveSlotId(slot.id);
                                    setSlotCursor(pos);
                                  }}
                                  placeholder="?"
                                  active={isActive}
                                />
                              </button>
                              {slot.suffix && (
                                <MathDisplay
                                  expression={slot.suffix}
                                  size="md"
                                  className="text-ink-muted"
                                />
                              )}
                            </div>
                            {fb && !fb.ok && (
                              <span className="text-[11px] text-ochre mt-1">
                                {fb.message}
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <span className="font-serif text-lg text-ink-muted pl-1 pt-5">
                      + …
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {problem.slots.map((slot) => {
                      const val = slotValues[slot.id] ?? '';
                      const isActive = !isSolved && activeSlotId === slot.id;
                      const fb = slotFeedback[slot.id];

                      return (
                        <div key={slot.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-ink-muted">
                              {slot.label}
                            </span>
                            {(isSolved || fb?.ok) && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-forest font-medium">
                                <Check className="w-3 h-3" />
                                Verified
                              </span>
                            )}
                            {fb && !fb.ok && (
                              <span className="text-[11px] text-ochre font-medium">
                                {fb.message}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (isSolved) return;
                              setActiveSlotId(slot.id);
                              setSlotCursor(val.length);
                            }}
                            className={`w-full min-h-[50px] px-3.5 rounded-xl border text-left transition-colors flex items-center ${
                              isSolved || fb?.ok
                                ? 'border-forest/50 bg-forest-soft/50'
                                : fb && !fb.ok
                                  ? 'border-ochre bg-ochre-soft/50'
                                  : isActive
                                    ? 'border-forest bg-[#FFFFFF] ring-2 ring-forest/15'
                                    : 'border-hairline bg-[#FAF8F4] hover:border-ink-subtle'
                            }`}
                          >
                            <MathInputDisplay
                              value={val}
                              cursorPos={isActive ? slotCursor : val.length}
                              onCursorChange={(pos) => {
                                if (isSolved) return;
                                setActiveSlotId(slot.id);
                                setSlotCursor(pos);
                              }}
                              placeholder={slot.placeholder ?? 'Enter value…'}
                              active={isActive}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isSolved && (
                  <div className="pt-2 flex items-center justify-between gap-4">
                    <span className="text-xs text-ink-subtle">
                      Tap any entry to edit, then check all values.
                    </span>
                    <button
                      type="button"
                      onClick={handleCheckSlots}
                      className="px-4 py-2.5 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
                    >
                      Check entries
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* FORMAT 3: CONCEPTUAL CHOICE                                     */}
          {/* =============================================================== */}
          {format === 'concept_choice' && problem.choices && (
            <div className="divide-y divide-hairline/55">
              <div className="px-5 sm:px-7 py-5 bg-[#FAF8F4]">
                <MathDisplay
                  expression={problem.displayGiven ?? problem.given}
                  size="lg"
                />
              </div>

              <div className="divide-y divide-hairline/60 bg-sheet">
                {problem.choices.map((choice, idx) => {
                  const isSelected = selectedChoiceId === choice.id;
                  const isCorrect = choice.id === problem.correctChoiceId;
                  const showResult =
                    (mode === 'practice' && choiceChecked && isSelected) ||
                    (mode === 'exam' && choiceChecked && isSelected);

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={isSolved || (mode === 'exam' && choiceChecked)}
                      onClick={() => handleSelectChoice(choice.id)}
                      className={`w-full text-left px-5 sm:px-7 py-4 transition-colors flex items-start gap-4 min-h-[60px] ${
                        showResult && isCorrect
                          ? 'bg-forest-soft/65'
                          : showResult && !isCorrect
                            ? 'bg-ochre-soft/65'
                            : isSelected
                              ? 'bg-linen/70'
                              : 'hover:bg-[#FAF8F4]'
                      }`}
                    >
                      <span
                        className={`font-mono text-xs tabular-nums pt-0.5 w-5 shrink-0 ${
                          showResult && isCorrect
                            ? 'text-forest font-medium'
                            : showResult && !isCorrect
                              ? 'text-ochre font-medium'
                              : 'text-ink-subtle'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm sm:text-[15px] text-ink leading-relaxed">
                          {choice.label}
                        </p>
                        {choice.math && (
                          <MathDisplay expression={choice.math} size="sm" />
                        )}
                        {showResult && (
                          <div
                            className={`pt-1 flex items-start gap-1.5 text-xs leading-relaxed ${
                              isCorrect ? 'text-forest' : 'text-ochre'
                            }`}
                          >
                            {isCorrect ? (
                              <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            )}
                            <span>{choice.explanation}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {mode === 'exam' && !choiceChecked && (
                <div className="px-5 sm:px-7 py-4 bg-sheet flex justify-end">
                  <button
                    type="button"
                    disabled={!selectedChoiceId}
                    onClick={handleSubmitExamChoice}
                    className="px-4 py-2.5 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover disabled:opacity-35 transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                  >
                    Submit answer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Optional Solved Footer */}
          {isSolved && solvedFooter}

          <div ref={sheetEndRef} />
        </div>

        {showKeyboard && (
          <p className="hidden lg:block mt-3 text-xs text-ink-subtle px-1">
            {format === 'slots'
              ? 'Use Tab or tap boxes to switch entries. Fractions like 1/6 or decimals both work.'
              : 'Type directly on your keyboard or tap keys on the right. Press Enter to check each line.'}
          </p>
        )}
      </div>

      {/* Right / Bottom Zone: Custom Touch Math Keyboard */}
      {showKeyboard && (
        <div className="lg:col-span-5 sticky bottom-0 lg:top-20 z-20 w-full mt-auto lg:mt-0">
          <div className="lg:hidden flex justify-center bg-gradient-to-t from-linen via-linen/80 to-transparent pt-1">
            <button
              type="button"
              onClick={() => setKeypadCollapsed((c) => !c)}
              className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-ink-muted hover:text-ink"
            >
              {keypadCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show keypad</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide keypad</span>
                </>
              )}
            </button>
          </div>

          {!keypadCollapsed && (
            <MathKeyboard
              variables={problem.variables}
              problemKind={problem.kind}
              canCopyPrevious={
                format === 'line_by_line' && Boolean(lastValidRaw || problem.given)
              }
              onInsert={handleInsert}
              onBackspace={handleBackspace}
              onClear={handleClear}
              onMoveCursor={handleMoveCursor}
              onCopyPrevious={handleCopyPrevious}
              onSubmit={handleSubmit}
              submitDisabled={
                format === 'line_by_line' ? !input.trim() : false
              }
              submitLabel={format === 'slots' ? 'Next / Check' : 'Check line'}
            />
          )}
        </div>
      )}
    </div>
  );
};
