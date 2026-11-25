import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  RotateCcw,
  SkipForward,
} from 'lucide-react';
import { Section, SectionTestResult, StepLine, Subject } from '../types/math';
import { MathDisplay } from './MathDisplay';
import { ProblemSolverCore } from './ProblemSolverCore';

interface SectionTestWorkspaceProps {
  subject: Subject;
  section: Section;
  onExit: () => void;
  onComplete: (sectionId: string, result: SectionTestResult) => void;
  onOpenLecture: () => void;
  onStartPractice: () => void;
  onNextSection?: () => void;
}

type QuestionOutcome = 'pending' | 'passed' | 'skipped' | 'incorrect';

export const SectionTestWorkspace: React.FC<SectionTestWorkspaceProps> = ({
  subject,
  section,
  onExit,
  onComplete,
  onOpenLecture,
  onStartPractice,
  onNextSection,
}) => {
  const questions = section.testOutProblems ?? section.problems.slice(0, 3);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, QuestionOutcome>>({});
  const [finished, setFinished] = useState(false);

  const currentQuestion = questions[currentIdx];
  const currentOutcome = currentQuestion
    ? outcomes[currentQuestion.id] ?? 'pending'
    : 'pending';

  const finalizeTest = (nextOutcomes: Record<string, QuestionOutcome>) => {
    const score = questions.filter((q) => nextOutcomes[q.id] === 'passed').length;
    const total = questions.length;
    const passed = score === total;
    setFinished(true);
    onComplete(section.id, {
      passed,
      score,
      total,
      completedAt: Date.now(),
    });
  };

  const advance = (updatedOutcomes: Record<string, QuestionOutcome>) => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
    } else {
      finalizeTest(updatedOutcomes);
    }
  };

  const handleQuestionSolved = (_steps: StepLine[]) => {
    if (!currentQuestion) return;
    setOutcomes((prev) => ({
      ...prev,
      [currentQuestion.id]: 'passed',
    }));
  };

  const handleIncorrectChoice = () => {
    if (!currentQuestion) return;
    setOutcomes((prev) => ({
      ...prev,
      [currentQuestion.id]: 'incorrect',
    }));
  };

  const handleSkip = () => {
    if (!currentQuestion) return;
    const nextOutcomes: Record<string, QuestionOutcome> = {
      ...outcomes,
      [currentQuestion.id]: 'skipped',
    };
    setOutcomes(nextOutcomes);
    advance(nextOutcomes);
  };

  const handleRetake = () => {
    setCurrentIdx(0);
    setOutcomes({});
    setFinished(false);
  };

  // -------------------------------------------------------------------------
  // Diagnostic Summary Screen
  // -------------------------------------------------------------------------
  if (finished) {
    const score = questions.filter((q) => outcomes[q.id] === 'passed').length;
    const total = questions.length;
    const passed = score === total;

    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-[44px] -ml-1 px-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{subject.title}</span>
        </button>

        <div className="rounded-2xl bg-sheet border border-hairline overflow-hidden">
          <div
            className={`px-6 sm:px-8 py-7 border-b border-hairline ${
              passed ? 'bg-forest-soft/60' : 'bg-[#FAF8F4]'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-ink-muted mb-2 tabular-nums">
              <span className="font-mono">{section.number}</span>
              <span aria-hidden="true">·</span>
              <span>Section Test-Out</span>
              <span aria-hidden="true">·</span>
              <span className={passed ? 'text-forest font-medium' : 'text-walnut font-medium'}>
                {score} / {total}
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink tracking-tight">
              {passed
                ? `You tested out of ${section.title}`
                : 'Recommended: review this section'}
            </h1>
            <p className="mt-2 text-sm text-ink-muted leading-relaxed max-w-xl">
              {passed
                ? 'You solved every assessment question without hints. This section is now marked as mastered—you can still open its lecture or practice problems anytime.'
                : 'A few concepts in this section tripped you up. Read the lecture notes for intuition and work through the guided line-by-line practice set, then retake whenever ready.'}
            </p>
          </div>

          {/* Per-question diagnostic breakdown */}
          <div className="divide-y divide-hairline/70">
            {questions.map((q, idx) => {
              const status = outcomes[q.id] ?? 'skipped';
              const ok = status === 'passed';

              return (
                <div
                  key={q.id}
                  className="px-6 sm:px-8 py-4 flex items-start justify-between gap-4"
                >
                  <div className="flex items-baseline gap-3.5 min-w-0">
                    <span className="font-mono text-xs text-ink-subtle tabular-nums w-5 shrink-0">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-ink">{q.title}</p>
                      <MathDisplay
                        expression={q.displayGiven ?? q.given}
                        size="sm"
                        className="text-ink-muted"
                      />
                      {!ok && q.exampleSteps.length > 0 && (
                        <p className="text-xs text-ink-muted pt-1">
                          Reference:{' '}
                          <span className="font-serif text-ink">
                            {q.exampleSteps[q.exampleSteps.length - 1]}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 pt-0.5 ${
                      ok ? 'text-forest' : 'text-ochre'
                    }`}
                  >
                    {ok ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Passed</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{status === 'incorrect' ? 'Missed' : 'Skipped'}</span>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Next Actions */}
          <div className="px-6 sm:px-8 py-5 bg-[#FAF8F4] border-t border-hairline flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake test</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              {!passed && (
                <>
                  <button
                    type="button"
                    onClick={onOpenLecture}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-hairline bg-sheet text-xs font-medium text-ink hover:border-forest hover:text-forest transition-colors min-h-[42px] whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read lecture</span>
                  </button>
                  <button
                    type="button"
                    onClick={onStartPractice}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover transition-colors min-h-[42px] whitespace-nowrap"
                  >
                    <span>Start practice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {passed && (
                <>
                  <button
                    type="button"
                    onClick={onExit}
                    className="px-4 py-2 rounded-xl border border-hairline bg-sheet text-xs font-medium text-ink hover:border-forest transition-colors min-h-[42px] whitespace-nowrap"
                  >
                    Back to {subject.title}
                  </button>
                  {onNextSection && (
                    <button
                      type="button"
                      onClick={onNextSection}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover transition-colors min-h-[42px] whitespace-nowrap"
                    >
                      <span>Next section</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Active Multi-Question Assessment Flow
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] lg:min-h-0">
      {/* Compact Exam Header */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-[44px] pr-2 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="truncate max-w-[180px] sm:max-w-xs">
            Test out · {section.number} {section.title}
          </span>
        </button>

        <div className="flex items-center gap-4 shrink-0">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted tabular-nums whitespace-nowrap">
            <Award className="w-3.5 h-3.5 text-forest" />
            <span>
              {currentIdx + 1} / {questions.length}
            </span>
          </span>

          {currentOutcome === 'pending' && (
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink px-2.5 min-h-[38px] rounded-lg hover:bg-linen transition-colors whitespace-nowrap shrink-0"
            >
              <span>Skip</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Subtle Progress Hairline */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 mb-3">
        <div className="h-[2px] w-full bg-hairline rounded-full overflow-hidden">
          <div
            className="h-full bg-forest transition-all duration-200"
            style={{ width: `${((currentIdx + (currentOutcome !== 'pending' ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {currentQuestion && (
        <ProblemSolverCore
          key={currentQuestion.id}
          problem={currentQuestion}
          mode="exam"
          onSolved={handleQuestionSolved}
          onExamIncorrectSubmit={handleIncorrectChoice}
          onEnterAfterSolved={() => advance(outcomes)}
          solvedFooter={
            <div className="px-5 sm:px-7 py-5 bg-forest-soft/75 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-forest text-[#FCFBF8] flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-ink">
                  Question {currentIdx + 1} passed
                </span>
              </div>

              <button
                type="button"
                onClick={() => advance(outcomes)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
              >
                <span>
                  {currentIdx + 1 < questions.length ? 'Next question' : 'View results'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
      )}

      {/* Continue footer if an exam concept_choice was answered incorrectly */}
      {currentOutcome === 'incorrect' && (
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-10 flex justify-end">
          <button
            type="button"
            onClick={() => advance(outcomes)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink text-[#FCFBF8] text-xs font-medium hover:bg-ink/90 transition-colors min-h-[42px]"
          >
            <span>
              {currentIdx + 1 < questions.length ? 'Continue to next question' : 'View results'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
