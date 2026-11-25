import React from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  ChevronRight,
} from 'lucide-react';
import { CURRICULUM } from '../data/curriculum';
import {
  MasteryMap,
  Problem,
  ProgressMap,
  Section,
  Subject,
} from '../types/math';
import { MathDisplay } from './MathDisplay';

interface CurriculumBrowserProps {
  selectedSubjectId: string | null;
  selectedSectionId: string | null;
  progress: ProgressMap;
  mastery: MasteryMap;
  onSelectSubject: (subjectId: string | null) => void;
  onSelectSection: (sectionId: string | null) => void;
  onSelectProblem: (subject: Subject, section: Section, problem: Problem) => void;
  onOpenLecture: (subject: Subject, section: Section) => void;
  onStartTestOut: (subject: Subject, section: Section) => void;
}

export const CurriculumBrowser: React.FC<CurriculumBrowserProps> = ({
  selectedSubjectId,
  selectedSectionId,
  progress,
  mastery,
  onSelectSubject,
  onSelectSection,
  onSelectProblem,
  onOpenLecture,
  onStartTestOut,
}) => {
  const selectedSubject =
    CURRICULUM.find((s) => s.id === selectedSubjectId) ?? null;
  const selectedSection =
    selectedSubject?.sections.find((sec) => sec.id === selectedSectionId) ?? null;

  const isSectionTestedOut = (sectionId: string) =>
    Boolean(mastery[sectionId]?.passed);

  const countCompletedInSection = (section: Section) => {
    if (isSectionTestedOut(section.id)) return section.problems.length;
    return section.problems.filter((p) => progress[p.id]?.solved).length;
  };

  const countCompletedInSubject = (subject: Subject) =>
    subject.sections.reduce((acc, sec) => acc + countCompletedInSection(sec), 0);

  const countTotalInSubject = (subject: Subject) =>
    subject.sections.reduce((acc, sec) => acc + sec.problems.length, 0);

  // -------------------------------------------------------------------------
  // Level 3: Section Hub (Lecture + Preemptive Test-Out + Nested Problems)
  // -------------------------------------------------------------------------
  if (selectedSubject && selectedSection) {
    const testedOut = isSectionTestedOut(selectedSection.id);
    const solvedCount = selectedSection.problems.filter(
      (p) => progress[p.id]?.solved
    ).length;
    const testCount = selectedSection.testOutProblems?.length ?? 0;

    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Editorial Context Column */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <button
              type="button"
              onClick={() => onSelectSection(null)}
              className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-[44px] -ml-1 px-1 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{selectedSubject.title}</span>
            </button>

            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted mb-2 tabular-nums">
              <span className="font-mono">{selectedSection.number}</span>
              <span aria-hidden="true">·</span>
              <span>
                {solvedCount} of {selectedSection.problems.length} practiced
              </span>
              {testedOut && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-forest font-medium">
                    <Check className="w-3.5 h-3.5" />
                    Tested out
                  </span>
                </>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-[30px] font-medium text-ink tracking-tight leading-snug text-balance">
              {selectedSection.title}
            </h1>

            <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
              {selectedSection.subtitle}
            </p>

            {/* Clean nested section gateways: Lecture & Test-Out */}
            <div className="mt-6 pt-5 border-t border-hairline divide-y divide-hairline/70">
              <button
                type="button"
                onClick={() => onOpenLecture(selectedSubject, selectedSection)}
                className="w-full py-3.5 flex items-center justify-between gap-3 text-left group min-h-[52px]"
              >
                <div className="flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-ink-muted group-hover:text-forest transition-colors mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-ink group-hover:text-forest transition-colors">
                      Lecture & concepts
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Intuition, key rules, and worked example
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink shrink-0" />
              </button>

              {testCount > 0 && (
                <button
                  type="button"
                  onClick={() => onStartTestOut(selectedSubject, selectedSection)}
                  className="w-full py-3.5 flex items-center justify-between gap-3 text-left group min-h-[52px]"
                >
                  <div className="flex items-start gap-3">
                    <Award className="w-4 h-4 text-ink-muted group-hover:text-forest transition-colors mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-ink group-hover:text-forest transition-colors">
                        {testedOut ? 'Retake section test' : 'Test out of section'}
                      </p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {testCount} questions · Skip practice if you pass
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* Right Nested Problem List */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between pb-3 text-xs text-ink-muted">
              <span>Practice set</span>
              <span className="tabular-nums">
                {selectedSection.problems.length} problems
              </span>
            </div>

            <div className="border-t border-hairline divide-y divide-hairline">
              {selectedSection.problems.map((problem, idx) => {
                const isSolved = Boolean(progress[problem.id]?.solved);
                const inProgress =
                  !isSolved && (progress[problem.id]?.savedSteps?.length ?? 0) > 0;
                const formatLabel =
                  problem.format === 'slots'
                    ? 'Fill entries'
                    : problem.format === 'concept_choice'
                      ? 'Concept check'
                      : null;

                return (
                  <button
                    key={problem.id}
                    type="button"
                    onClick={() =>
                      onSelectProblem(selectedSubject, selectedSection, problem)
                    }
                    className="w-full text-left py-5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl hover:bg-sheet/80 active:bg-linen/70 transition-colors flex items-center justify-between gap-4 min-h-[76px] group"
                  >
                    <div className="flex items-baseline gap-4 min-w-0">
                      <span className="font-mono text-xs text-ink-subtle tabular-nums w-6 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate">
                          <MathDisplay
                            expression={problem.displayGiven ?? problem.given}
                            size="md"
                            className="group-hover:text-forest transition-colors"
                          />
                        </div>
                        <p className="mt-1 text-xs text-ink-muted truncate">
                          {problem.title}
                          {formatLabel && (
                            <>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>{formatLabel}</span>
                            </>
                          )}
                          {inProgress && (
                            <>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span className="text-walnut">In progress</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isSolved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-forest">
                          <Check className="w-4 h-4" />
                          <span className="hidden sm:inline">Solved</span>
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Level 2: Sections inside a Subject
  // -------------------------------------------------------------------------
  if (selectedSubject) {
    const solved = countCompletedInSubject(selectedSubject);
    const total = countTotalInSubject(selectedSubject);

    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <button
              type="button"
              onClick={() => onSelectSubject(null)}
              className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-[44px] -ml-1 px-1 mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All subjects</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-ink-muted mb-2 tabular-nums">
              <span className="font-mono">{selectedSubject.number}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedSubject.level}</span>
              <span aria-hidden="true">·</span>
              <span>
                {solved} / {total}
              </span>
            </div>

            <h1 className="font-serif text-3xl font-medium text-ink tracking-tight leading-snug text-balance">
              {selectedSubject.title}
            </h1>

            <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
              {selectedSubject.description}
            </p>
          </div>

          <div className="lg:col-span-8">
            <div className="border-t border-hairline divide-y divide-hairline">
              {selectedSubject.sections.map((section) => {
                const testedOut = isSectionTestedOut(section.id);
                const secSolved = countCompletedInSection(section);
                const secTotal = section.problems.length;
                const allDone = secSolved === secTotal && secTotal > 0;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSelectSection(section.id)}
                    className="w-full text-left py-5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl hover:bg-sheet/80 active:bg-linen/70 transition-colors flex items-center justify-between gap-4 min-h-[76px] group"
                  >
                    <div className="flex items-baseline gap-4 min-w-0">
                      <span className="font-mono text-xs text-ink-subtle tabular-nums w-8 shrink-0">
                        {section.number}
                      </span>
                      <div className="min-w-0">
                        <h2 className="font-serif text-[19px] font-medium text-ink group-hover:text-forest transition-colors">
                          {section.title}
                        </h2>
                        <p className="mt-1 text-xs text-ink-muted line-clamp-1">
                          {section.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {testedOut ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-forest whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" />
                          <span>Tested out</span>
                        </span>
                      ) : (
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            allDone ? 'text-forest font-medium' : 'text-ink-muted'
                          }`}
                        >
                          {secSolved}/{secTotal}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Level 1: Top-Level Subjects Index (Clean, Nested, Uncluttered)
  // -------------------------------------------------------------------------
  const totalSolvedAll = CURRICULUM.reduce(
    (sum, s) => sum + countCompletedInSubject(s),
    0
  );
  const totalProblemsAll = CURRICULUM.reduce(
    (sum, s) => sum + countTotalInSubject(s),
    0
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <h1 className="font-serif text-3xl sm:text-[34px] font-medium text-ink tracking-tight leading-tight text-balance">
            Mathematics
          </h1>
          <p className="mt-3 text-sm text-ink-muted leading-relaxed">
            Read concise lectures, test out of what you already know, and work through algebra up to college math and statistics line by line.
          </p>
          <div className="mt-6 pt-5 border-t border-hairline flex items-center gap-2 text-xs text-ink-muted tabular-nums">
            <span>{CURRICULUM.length} subjects</span>
            <span aria-hidden="true">·</span>
            <span>
              {totalSolvedAll} of {totalProblemsAll} complete
            </span>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="border-t border-hairline divide-y divide-hairline">
            {CURRICULUM.map((subject) => {
              const solved = countCompletedInSubject(subject);
              const total = countTotalInSubject(subject);
              const allDone = solved === total && total > 0;

              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => onSelectSubject(subject.id)}
                  className="w-full text-left py-5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-xl hover:bg-sheet/80 active:bg-linen/70 transition-colors flex items-center justify-between gap-4 min-h-[76px] group"
                >
                  <div className="flex items-baseline gap-4 min-w-0">
                    <span className="font-mono text-xs text-ink-subtle tabular-nums w-6 shrink-0">
                      {subject.number}
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-serif text-[20px] font-medium text-ink group-hover:text-forest transition-colors">
                        {subject.title}
                      </h2>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                        <span>{subject.level}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {subject.sections.length}{' '}
                          {subject.sections.length === 1 ? 'section' : 'sections'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        allDone ? 'text-forest font-medium' : 'text-ink-muted'
                      }`}
                    >
                      {solved}/{total}
                    </span>
                    <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
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
