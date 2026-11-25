import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, RotateCcw, Undo2 } from 'lucide-react';
import { StepLine } from '../types/math';
import { parseExpression, verifyScratchpadStep, normalizeInput } from '../math/engine';
import { MathDisplay, MathInputDisplay } from './MathDisplay';
import { MathKeyboard } from './MathKeyboard';

const STARTER_EXAMPLES = [
  '4x - 9 = 2x + 7',
  '3(x + 2) = 21',
  '(2x + 4)/3 = 6',
];

export const ScratchpadWorkspace: React.FC = () => {
  const [startingLine, setStartingLine] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepLine[]>([]);
  const [input, setInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const lastValidLine =
    steps.length > 0 ? steps[steps.length - 1].raw : startingLine ?? '';
  const isSolved = steps.some((s) => s.status === 'solved');

  const handleInsert = useCallback(
    (text: string, cursorOffset = 0) => {
      if (isSolved) return;
      setInlineError(null);
      setInput((prev) => {
        const safePos = Math.max(0, Math.min(cursorPos, prev.length));
        const next = prev.slice(0, safePos) + text + prev.slice(safePos);
        setCursorPos(Math.max(0, Math.min(next.length, safePos + text.length + cursorOffset)));
        return next;
      });
    },
    [cursorPos, isSolved]
  );

  const handleBackspace = useCallback(() => {
    if (isSolved) return;
    setInlineError(null);
    setInput((prev) => {
      const safePos = Math.max(0, Math.min(cursorPos, prev.length));
      if (safePos === 0) return prev;
      const next = prev.slice(0, safePos - 1) + prev.slice(safePos);
      setCursorPos(safePos - 1);
      return next;
    });
  }, [cursorPos, isSolved]);

  const handleClear = useCallback(() => {
    setInlineError(null);
    setInput('');
    setCursorPos(0);
  }, []);

  const handleMoveCursor = useCallback(
    (delta: number) => {
      setCursorPos((p) => Math.max(0, Math.min(input.length, p + delta)));
    },
    [input.length]
  );

  const handleCopyPrevious = useCallback(() => {
    if (!lastValidLine || isSolved) return;
    setInlineError(null);
    setInput(lastValidLine);
    setCursorPos(lastValidLine.length);
  }, [isSolved, lastValidLine]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setInlineError(
        startingLine ? 'Write your next line first.' : 'Enter an equation or expression to begin.'
      );
      return;
    }

    // Setting Line 0 (the user's custom problem)
    if (!startingLine) {
      const norm = normalizeInput(trimmed);
      const eqParts = norm.split('=');
      try {
        if (eqParts.length === 2) {
          if (!eqParts[0].trim() || !eqParts[1].trim()) {
            throw new Error('Complete both sides of the "=" sign.');
          }
          parseExpression(eqParts[0]);
          parseExpression(eqParts[1]);
        } else if (eqParts.length === 1) {
          parseExpression(norm);
        } else {
          throw new Error('Use at most one "=" sign per line.');
        }
      } catch (err) {
        setInlineError(err instanceof Error ? err.message : 'Check syntax before starting.');
        return;
      }
      setStartingLine(trimmed);
      setSteps([]);
      setInput('');
      setCursorPos(0);
      setInlineError(null);
      return;
    }

    // Checking next derivation step
    const result = verifyScratchpadStep(trimmed, lastValidLine);
    if (result.status === 'error') {
      setInlineError(result.feedback);
      return;
    }

    setSteps((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        raw: trimmed,
        status: result.status,
        feedback: result.feedback,
      },
    ]);
    setInput('');
    setCursorPos(0);
    setInlineError(null);
  }, [input, lastValidLine, startingLine]);

  const handleUndo = () => {
    if (steps.length > 0) {
      const last = steps[steps.length - 1];
      setSteps((s) => s.slice(0, -1));
      setInput(last.raw);
      setCursorPos(last.raw.length);
      setInlineError(null);
    } else if (startingLine) {
      setInput(startingLine);
      setCursorPos(startingLine.length);
      setStartingLine(null);
      setInlineError(null);
    }
  };

  const handleReset = () => {
    setStartingLine(null);
    setSteps([]);
    setInput('');
    setCursorPos(0);
    setInlineError(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleMoveCursor(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleMoveCursor(1);
      } else if (e.key.length === 1 && /[0-9a-zA-Z+\-*/^()=.,|\s]/.test(e.key)) {
        e.preventDefault();
        handleInsert(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackspace, handleInsert, handleMoveCursor, handleSubmit]);

  return (
    <div className="w-full max-w-6xl mx-auto px-0 sm:px-6 pt-5 pb-0 lg:pb-12 flex flex-col min-h-[calc(100dvh-56px)] lg:min-h-0">
      <div className="px-4 sm:px-0 mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-[28px] font-medium text-ink tracking-tight">
            Scratchpad
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Enter your own equation or expression and verify each line as you work.
          </p>
        </div>
        {(startingLine || steps.length > 0) && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 px-2.5 min-h-[38px] rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-linen transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 min-h-[38px] rounded-lg text-xs text-ink-muted hover:text-ink hover:bg-linen transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:gap-8 items-start">
        <div className="lg:col-span-7 px-4 sm:px-0 pb-6 lg:pb-0">
          <div className="paper-sheet rounded-2xl border border-hairline overflow-hidden divide-y divide-hairline/55">
            {startingLine ? (
              <>
                <div className="px-5 sm:px-7 py-5 flex items-baseline gap-4 bg-[#FAF8F4]">
                  <span className="font-mono text-xs text-ink-subtle tabular-nums w-6 shrink-0">
                    00
                  </span>
                  <MathDisplay expression={startingLine} size="xl" />
                </div>

                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`px-5 sm:px-7 py-4 flex items-start gap-4 ${
                      step.status === 'solved' ? 'bg-forest-soft/55' : 'bg-sheet'
                    }`}
                  >
                    <span className="font-mono text-xs text-ink-subtle tabular-nums w-6 pt-1.5 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <MathDisplay expression={step.raw} size="lg" />
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                        <Check className="w-3.5 h-3.5 text-forest shrink-0" />
                        <span
                          className={
                            step.status === 'solved' ? 'font-medium text-forest' : 'text-ink-muted'
                          }
                        >
                          {step.feedback}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {!isSolved ? (
                  <div className="px-5 sm:px-7 py-4 bg-sheet">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-xs text-forest font-medium tabular-nums w-6 pt-2.5 shrink-0">
                        {String(steps.length + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <MathInputDisplay
                            value={input}
                            cursorPos={cursorPos}
                            onCursorChange={setCursorPos}
                            placeholder="Write your next equivalent line…"
                            active
                          />
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!input.trim()}
                            className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover disabled:opacity-35 transition-colors whitespace-nowrap shrink-0"
                          >
                            Check line
                          </button>
                        </div>
                        {inlineError && (
                          <div
                            role="alert"
                            className="mt-2.5 flex items-start gap-2 rounded-lg bg-ochre-soft px-3 py-2 text-xs text-ochre"
                          >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{inlineError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 sm:px-7 py-5 bg-forest-soft/75 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-forest text-[#FCFBF8] flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-ink">
                        Solved in {steps.length} {steps.length === 1 ? 'line' : 'lines'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover transition-colors whitespace-nowrap shrink-0"
                    >
                      New problem
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="px-5 sm:px-7 py-6 space-y-5">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs text-forest font-medium tabular-nums w-6 pt-2.5 shrink-0">
                    00
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <MathInputDisplay
                        value={input}
                        cursorPos={cursorPos}
                        onCursorChange={setCursorPos}
                        placeholder="Type an equation, e.g. 4x − 9 = 2x + 7"
                        active
                      />
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!input.trim()}
                        className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover disabled:opacity-35 transition-colors whitespace-nowrap shrink-0"
                      >
                        Start
                      </button>
                    </div>
                    {inlineError && (
                      <div
                        role="alert"
                        className="mt-2.5 flex items-start gap-2 rounded-lg bg-ochre-soft px-3 py-2 text-xs text-ochre"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{inlineError}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-hairline/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
                  <span>Try an example:</span>
                  {STARTER_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setStartingLine(ex);
                        setInput('');
                        setCursorPos(0);
                        setInlineError(null);
                      }}
                      className="font-serif text-sm text-ink hover:text-forest transition-colors underline decoration-hairline underline-offset-4 hover:decoration-forest"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {!isSolved && (
          <div className="lg:col-span-5 sticky bottom-0 lg:top-20 z-20 w-full mt-auto lg:mt-0">
            <MathKeyboard
              variables={['x', 'y', 't']}
              canCopyPrevious={Boolean(lastValidLine)}
              onInsert={handleInsert}
              onBackspace={handleBackspace}
              onClear={handleClear}
              onMoveCursor={handleMoveCursor}
              onCopyPrevious={handleCopyPrevious}
              onSubmit={handleSubmit}
              submitDisabled={!input.trim()}
              submitLabel={startingLine ? 'Check line' : 'Start'}
            />
          </div>
        )}
      </div>
    </div>
  );
};
