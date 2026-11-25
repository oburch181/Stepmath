import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Lightbulb,
} from 'lucide-react';
import { Problem, Section, StepLine } from '../types/math';
import { MathDisplay } from './MathDisplay';
import { ProblemSolverCore } from './ProblemSolverCore';

interface ProblemWorkspaceProps {
  section: Section;
  problem: Problem;
  problemIndex: number;
  totalProblems: number;
  savedSteps?: StepLine[];
  isAlreadySolved?: boolean;
  onBack: () => void;
  onOpenLecture: () => void;
  onStartSectionTest?: () => void;
  onSolved: (problemId: string, steps: StepLine[]) => void;
  onStepsChange: (problemId: string, steps: StepLine[], solved: boolean) => void;
  onNextProblem?: () => void;
}

export const ProblemWorkspace: React.FC<ProblemWorkspaceProps> = ({
  section,
  problem,
  problemIndex,
  totalProblems,
  savedSteps,
  onBack,
  onOpenLecture,
  onStartSectionTest,
  onSolved,
  onStepsChange,
  onNextProblem,
}) => {
  const [hintsOpen, setHintsOpen] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [lastStepsCount, setLastStepsCount] = useState(savedSteps?.length ?? 0);

  useEffect(() => {
    setHintsOpen(false);
    setRevealedHints(0);
    setShowSolution(false);
    setLastStepsCount(savedSteps?.length ?? 0);
  }, [problem.id]);

  const toggleHints = () => {
    if (!hintsOpen) {
      setHintsOpen(true);
      if (revealedHints === 0 && problem.hints.length > 0) {
        setRevealedHints(1);
      }
    } else {
      setHintsOpen(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] lg:min-h-0">
      {/* Compact Workspace Sub-header */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-[44px] pr-2 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="truncate max-w-[170px] sm:max-w-xs">
            {section.number} {section.title}
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="font-mono text-xs text-ink-muted tabular-nums whitespace-nowrap pr-1">
            {problemIndex + 1} / {totalProblems}
          </span>
          <button
            type="button"
            onClick={onOpenLecture}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 min-h-[38px] rounded-lg text-ink-muted hover:text-ink hover:bg-linen transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lecture</span>
          </button>
          {problem.hints.length > 0 && (
            <button
              type="button"
              onClick={toggleHints}
              aria-expanded={hintsOpen}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 min-h-[38px] rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                hintsOpen
                  ? 'bg-walnut-soft text-walnut'
                  : 'text-ink-muted hover:text-ink hover:bg-linen'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Hint</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Hint Drawer */}
      {hintsOpen && (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 mb-4">
          <div className="lg:max-w-[58%] rounded-xl bg-walnut-soft/75 border border-[#E5DAC8] px-4 py-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-walnut">Guidance</span>
              <button
                type="button"
                onClick={() => setHintsOpen(false)}
                className="text-xs text-ink-muted hover:text-ink transition-colors px-1.5 py-0.5"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {problem.hints.slice(0, revealedHints).map((hint, idx) => (
                <p key={idx} className="text-sm text-ink leading-relaxed">
                  {problem.hints.length > 1 ? `${idx + 1}. ` : ''}
                  {hint}
                </p>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
              {revealedHints < problem.hints.length && (
                <button
                  type="button"
                  onClick={() => setRevealedHints((n) => n + 1)}
                  className="font-medium text-walnut hover:underline"
                >
                  Reveal next hint
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSolution((s) => !s)}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                {showSolution ? 'Hide worked lines' : 'Show worked lines'}
              </button>
            </div>

            {showSolution && (
              <div className="pt-2.5 border-t border-[#E5DAC8] space-y-1.5">
                {problem.exampleSteps.map((line, i) => (
                  <div key={i} className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] text-ink-subtle tabular-nums w-5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <MathDisplay expression={line} size="sm" className="text-ink" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Multi-Format Problem Solver */}
      <ProblemSolverCore
        key={problem.id}
        problem={problem}
        mode="practice"
        initialSteps={savedSteps}
        onStepsChange={(steps, solved) => {
          setLastStepsCount(steps.length);
          onStepsChange(problem.id, steps, solved);
        }}
        onSolved={(steps) => {
          setLastStepsCount(steps.length);
          onSolved(problem.id, steps);
        }}
        onEnterAfterSolved={onNextProblem}
        solvedFooter={
          <div className="px-5 sm:px-7 py-5 bg-forest-soft/75 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-forest text-[#FCFBF8] flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Problem complete</p>
                {(!problem.format || problem.format === 'line_by_line') && (
                  <p className="text-xs text-ink-muted tabular-nums">
                    Solved in {Math.max(1, lastStepsCount)}{' '}
                    {lastStepsCount === 1 ? 'line' : 'lines'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onNextProblem ? (
                <button
                  type="button"
                  onClick={onNextProblem}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                >
                  <span>Next problem</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <>
                  {onStartSectionTest && (
                    <button
                      type="button"
                      onClick={onStartSectionTest}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-forest/30 bg-sheet text-forest text-xs font-medium hover:bg-forest-soft transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Take section test</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
                  >
                    <span>Back to section</span>
                  </button>
                </>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
};
