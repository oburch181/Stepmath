import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CURRICULUM } from '../data/curriculum';
import { MasteryMap, ProgressMap, Subject } from '../types/math';

interface ProgressViewProps {
  progress: ProgressMap;
  mastery: MasteryMap;
  onOpenSubject: (subject: Subject) => void;
  onResetProgress: () => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  progress,
  mastery,
  onOpenSubject,
  onResetProgress,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const totalSections = CURRICULUM.reduce((acc, s) => acc + s.sections.length, 0);
  const testedOutSections = Object.values(mastery).filter((m) => m.passed).length;

  const totalProblems = CURRICULUM.reduce(
    (acc, s) => acc + s.sections.reduce((a, sec) => a + sec.problems.length, 0),
    0
  );

  const totalCompleted = CURRICULUM.reduce(
    (acc, s) =>
      acc +
      s.sections.reduce(
        (a, sec) =>
          a +
          (mastery[sec.id]?.passed
            ? sec.problems.length
            : sec.problems.filter((p) => progress[p.id]?.solved).length),
        0
      ),
    0
  );

  const totalLinesWritten = Object.values(progress).reduce(
    (acc, p) => acc + (p.stepsCount || 0),
    0
  );

  const hasAnyRecord = totalCompleted > 0 || testedOutSections > 0 || totalLinesWritten > 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-4">
          <h1 className="font-serif text-3xl font-medium text-ink tracking-tight">
            Progress
          </h1>
          <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
            Your solved problems, section test-outs, and derivation steps are saved locally in this browser.
          </p>

          <div className="mt-6 pt-5 border-t border-hairline space-y-2.5 text-sm tabular-nums">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Problems completed</span>
              <span className="font-mono font-medium text-ink">
                {totalCompleted} / {totalProblems}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Sections tested out</span>
              <span className="font-mono font-medium text-ink">
                {testedOutSections} / {totalSections}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">Lines verified</span>
              <span className="font-mono font-medium text-ink">
                {totalLinesWritten}
              </span>
            </div>
          </div>

          {hasAnyRecord && (
            <div className="mt-8 pt-5 border-t border-hairline">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-xs text-ink-muted hover:text-ochre transition-colors"
                >
                  Clear saved progress
                </button>
              ) : (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-ink-muted">Reset all progress?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setConfirmReset(false);
                    }}
                    className="font-medium text-ochre hover:underline"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <div className="border-t border-hairline divide-y divide-hairline">
            {CURRICULUM.map((subject) => {
              const total = subject.sections.reduce(
                (a, sec) => a + sec.problems.length,
                0
              );
              const solved = subject.sections.reduce(
                (a, sec) =>
                  a +
                  (mastery[sec.id]?.passed
                    ? sec.problems.length
                    : sec.problems.filter((p) => progress[p.id]?.solved).length),
                0
              );
              const testedInSubject = subject.sections.filter(
                (sec) => mastery[sec.id]?.passed
              ).length;
              const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => onOpenSubject(subject)}
                  className="w-full text-left py-5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl hover:bg-sheet/80 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span className="font-mono text-xs text-ink-subtle tabular-nums">
                        {subject.number}
                      </span>
                      <span className="font-serif text-[18px] font-medium text-ink group-hover:text-forest transition-colors truncate">
                        {subject.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-ink-muted tabular-nums">
                        {solved} / {total}
                        {testedInSubject > 0 ? ` · ${testedInSubject} tested out` : ''}
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink" />
                    </div>
                  </div>
                  <div className="mt-3 h-1 w-full bg-linen rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forest transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
