import React from 'react';
import { ArrowLeft, ArrowRight, Award, Check } from 'lucide-react';
import { Section, SectionTestResult, Subject } from '../types/math';
import { MathDisplay } from './MathDisplay';

interface SectionLectureProps {
  subject: Subject;
  section: Section;
  testResult?: SectionTestResult;
  onBack: () => void;
  onStartPractice: () => void;
  onStartTestOut: () => void;
}

export const SectionLecture: React.FC<SectionLectureProps> = ({
  subject,
  section,
  testResult,
  onBack,
  onStartPractice,
  onStartTestOut,
}) => {
  const lecture = section.lecture;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-20">
      {/* Minimal top back bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors min-h-[44px] -ml-1 px-1 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {section.number} {section.title}
          </span>
        </button>

        <span className="text-xs text-ink-muted whitespace-nowrap">
          {subject.title} · Lecture
        </span>
      </div>

      {/* Editorial Lecture Header */}
      <header className="pb-8 border-b border-hairline">
        <div className="flex items-center gap-2 text-xs text-ink-muted mb-2.5 tabular-nums">
          <span className="font-mono">{section.number}</span>
          <span aria-hidden="true">·</span>
          <span>Lecture & Concepts</span>
          {testResult?.passed && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-forest font-medium">
                <Check className="w-3.5 h-3.5" />
                Tested out
              </span>
            </>
          )}
        </div>

        <h1 className="font-serif text-3xl sm:text-[36px] font-medium text-ink tracking-tight leading-tight text-balance">
          {section.title}
        </h1>
        <p className="mt-3 text-[15px] sm:text-base text-ink-muted leading-relaxed max-w-2xl">
          {section.subtitle}
        </p>
      </header>

      {lecture ? (
        <article className="divide-y divide-hairline">
          {/* 1. Core Intuition */}
          <section className="py-8">
            <h2 className="font-serif text-lg font-medium text-ink mb-4">
              Core intuition
            </h2>
            <div className="space-y-4 text-[15px] sm:text-base text-ink/90 leading-[1.75] max-w-[66ch]">
              {lecture.intuition.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* 2. Key Rules & Formal Statements */}
          <section className="py-8">
            <h2 className="font-serif text-lg font-medium text-ink mb-4">
              Key definitions & rules
            </h2>
            <div className="rounded-2xl bg-sheet border border-hairline divide-y divide-hairline/70 overflow-hidden">
              {lecture.keyRules.map((rule, idx) => (
                <div key={idx} className="px-5 sm:px-6 py-4 space-y-1.5">
                  <p className="text-xs font-medium text-ink-muted">{rule.label}</p>
                  <div className="pt-0.5">
                    <MathDisplay expression={rule.formula} size="md" />
                  </div>
                  {rule.note && (
                    <p className="text-xs text-ink-muted leading-relaxed pt-1">
                      {rule.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* 3. Line-by-Line Worked Example */}
          <section className="py-8">
            <h2 className="font-serif text-lg font-medium text-ink mb-1.5">
              Worked example
            </h2>
            <p className="text-sm text-ink-muted mb-4">
              {lecture.workedExample.prompt}
            </p>

            <div className="rounded-2xl bg-sheet border border-hairline overflow-hidden divide-y divide-hairline/60">
              <div className="px-5 sm:px-6 py-4 bg-[#FAF8F4] flex items-baseline gap-4">
                <span className="font-mono text-xs text-ink-subtle tabular-nums w-6 shrink-0">
                  00
                </span>
                <MathDisplay expression={lecture.workedExample.given} size="lg" />
              </div>

              {lecture.workedExample.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="px-5 sm:px-6 py-4 flex items-start gap-4"
                >
                  <span className="font-mono text-xs text-forest font-medium tabular-nums w-6 pt-1 shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <MathDisplay expression={step.math} size="md" />
                    <p className="text-xs sm:text-[13px] text-ink-muted leading-relaxed">
                      {step.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Common Pitfalls */}
          <section className="py-8">
            <h2 className="font-serif text-lg font-medium text-ink mb-4">
              What to watch out for
            </h2>
            <ul className="space-y-3 max-w-[66ch]">
              {lecture.pitfalls.map((pitfall, idx) => (
                <li
                  key={idx}
                  className="flex items-baseline gap-3 text-sm sm:text-[15px] text-ink/90 leading-relaxed"
                >
                  <span className="font-mono text-xs text-ochre tabular-nums shrink-0">
                    0{idx + 1}
                  </span>
                  <span>{pitfall}</span>
                </li>
              ))}
            </ul>
          </section>
        </article>
      ) : (
        <section className="py-8 space-y-4">
          <p className="text-[15px] text-ink/90 leading-relaxed max-w-[65ch]">
            {section.conceptNote.summary}
          </p>
          <div className="rounded-2xl bg-sheet border border-hairline px-5 py-4 space-y-2">
            <MathDisplay expression={section.conceptNote.keyRule} size="md" />
            <p className="font-mono text-xs text-ink-muted">
              {section.conceptNote.example}
            </p>
          </div>
        </section>
      )}

      {/* Calm Action Footer */}
      <footer className="pt-8 border-t border-hairline flex flex-wrap items-center justify-between gap-4">
        {section.testOutProblems && section.testOutProblems.length > 0 ? (
          <button
            type="button"
            onClick={onStartTestOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-hairline bg-sheet text-sm font-medium text-ink hover:border-forest hover:text-forest transition-colors min-h-[44px] whitespace-nowrap shrink-0"
          >
            <Award className="w-4 h-4" />
            <span>
              {testResult?.passed ? 'Retake section test' : 'Test out of section'}
            </span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onStartPractice}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest text-[#FCFBF8] text-sm font-medium hover:bg-forest-hover transition-colors min-h-[44px] whitespace-nowrap shrink-0"
        >
          <span>Begin practice</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
};
