import { useCallback, useEffect, useMemo, useState } from 'react';
import { CURRICULUM, getAllProblems } from './data/curriculum';
import {
  MasteryMap,
  Problem,
  ProgressMap,
  Section,
  SectionTestResult,
  StepLine,
  Subject,
} from './types/math';
import { CurriculumBrowser } from './components/CurriculumBrowser';
import { ProblemWorkspace } from './components/ProblemWorkspace';
import { SectionLecture } from './components/SectionLecture';
import { SectionTestWorkspace } from './components/SectionTestWorkspace';
import { ScratchpadWorkspace } from './components/ScratchpadWorkspace';
import { ProgressView } from './components/ProgressView';
import { InstallModal } from './components/InstallModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { usePWAInstall } from './hooks/usePWAInstall';

type TopView = 'curriculum' | 'scratchpad' | 'progress';
type NestedMode = 'browse' | 'lecture' | 'problem' | 'test_out';

const PROGRESS_STORAGE_KEY = 'folio_math_progress_v1';
const MASTERY_STORAGE_KEY = 'folio_math_mastery_v1';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [topView, setTopView] = useState<TopView>('curriculum');
  const [nestedMode, setNestedMode] = useState<NestedMode>('browse');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressMap>(() =>
    loadJSON<ProgressMap>(PROGRESS_STORAGE_KEY, {})
  );
  const [mastery, setMastery] = useState<MasteryMap>(() =>
    loadJSON<MasteryMap>(MASTERY_STORAGE_KEY, {})
  );
  const [installOpen, setInstallOpen] = useState(false);
  const pwa = usePWAInstall();

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage quota errors
    }
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(mastery));
    } catch {
      // ignore storage quota errors
    }
  }, [mastery]);

  const allProblems = useMemo(() => getAllProblems(), []);

  const selectedSubject = useMemo(
    () => CURRICULUM.find((s) => s.id === selectedSubjectId) ?? null,
    [selectedSubjectId]
  );

  const selectedSection = useMemo(
    () =>
      selectedSubject?.sections.find((sec) => sec.id === selectedSectionId) ??
      null,
    [selectedSectionId, selectedSubject]
  );

  const activeEntry = useMemo(
    () =>
      allProblems.find((entry) => entry.problem.id === activeProblemId) ?? null,
    [activeProblemId, allProblems]
  );

  // Next unsolved problem in a non-tested-out section
  const nextUnsolved = useMemo(() => {
    return (
      allProblems.find(
        (entry) =>
          !mastery[entry.section.id]?.passed &&
          !progress[entry.problem.id]?.solved
      ) ?? allProblems[0]
    );
  }, [allProblems, mastery, progress]);

  const hasStartedAny = useMemo(
    () => Object.keys(progress).length > 0 || Object.keys(mastery).length > 0,
    [mastery, progress]
  );

  const openProblem = useCallback(
    (subject: Subject, section: Section, problem: Problem) => {
      setTopView('curriculum');
      setSelectedSubjectId(subject.id);
      setSelectedSectionId(section.id);
      setActiveProblemId(problem.id);
      setNestedMode('problem');
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    []
  );

  const openLecture = useCallback((subject: Subject, section: Section) => {
    setTopView('curriculum');
    setSelectedSubjectId(subject.id);
    setSelectedSectionId(section.id);
    setActiveProblemId(null);
    setNestedMode('lecture');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const openTestOut = useCallback((subject: Subject, section: Section) => {
    setTopView('curriculum');
    setSelectedSubjectId(subject.id);
    setSelectedSectionId(section.id);
    setActiveProblemId(null);
    setNestedMode('test_out');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleStepsChange = useCallback(
    (problemId: string, steps: StepLine[], solved: boolean) => {
      setProgress((prev) => ({
        ...prev,
        [problemId]: {
          solved: solved || Boolean(prev[problemId]?.solved && steps.length > 0),
          stepsCount: steps.length,
          lastUpdated: Date.now(),
          savedSteps: steps,
        },
      }));
    },
    []
  );

  const handleSolved = useCallback((problemId: string, steps: StepLine[]) => {
    setProgress((prev) => ({
      ...prev,
      [problemId]: {
        solved: true,
        stepsCount: steps.length,
        lastUpdated: Date.now(),
        savedSteps: steps,
      },
    }));
  }, []);

  const handleTestComplete = useCallback(
    (sectionId: string, result: SectionTestResult) => {
      setMastery((prev) => ({
        ...prev,
        [sectionId]: {
          // Keep passed = true once earned even if retaken later
          passed: result.passed || Boolean(prev[sectionId]?.passed),
          score: Math.max(result.score, prev[sectionId]?.score ?? 0),
          total: result.total,
          completedAt: result.completedAt,
        },
      }));
    },
    []
  );

  const handleContinue = () => {
    if (!nextUnsolved) return;
    openProblem(nextUnsolved.subject, nextUnsolved.section, nextUnsolved.problem);
  };

  const handleNavClick = (view: TopView) => {
    setTopView(view);
    setNestedMode('browse');
    setActiveProblemId(null);
    if (view === 'curriculum') {
      setSelectedSectionId(null);
      setSelectedSubjectId(null);
    }
  };

  // Next problem within active section
  const nextInSection = useMemo(() => {
    if (!activeEntry) return null;
    const idx = activeEntry.section.problems.findIndex(
      (p) => p.id === activeEntry.problem.id
    );
    if (idx === -1 || idx + 1 >= activeEntry.section.problems.length) {
      return null;
    }
    return activeEntry.section.problems[idx + 1];
  }, [activeEntry]);

  // Next section within selected subject (for post-test-out progression)
  const nextSectionInSubject = useMemo(() => {
    if (!selectedSubject || !selectedSection) return null;
    const idx = selectedSubject.sections.findIndex(
      (sec) => sec.id === selectedSection.id
    );
    if (idx === -1 || idx + 1 >= selectedSubject.sections.length) return null;
    return selectedSubject.sections[idx + 1];
  }, [selectedSection, selectedSubject]);

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-paper/92 backdrop-blur-md border-b border-hairline">
        <div className="w-full max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => handleNavClick('curriculum')}
            className="font-serif text-[20px] font-semibold tracking-tight text-ink whitespace-nowrap shrink-0 hover:text-forest transition-colors"
          >
            Folio
          </button>

          <nav
            aria-label="Primary"
            className="flex items-center gap-4 sm:gap-7 text-sm font-medium"
          >
            {(
              [
                { id: 'curriculum', label: 'Curriculum' },
                { id: 'scratchpad', label: 'Scratchpad' },
                { id: 'progress', label: 'Progress' },
              ] as const
            ).map((item) => {
              const active = topView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-[1.5px] ${
                    active
                      ? 'text-ink border-forest'
                      : 'text-ink-muted border-transparent hover:text-ink'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            {!pwa.isInstalled && (
              <button
                type="button"
                onClick={() => setInstallOpen(true)}
                className="py-1 transition-colors whitespace-nowrap shrink-0 border-b-[1.5px] border-transparent text-ink-muted hover:text-ink"
              >
                Install
              </button>
            )}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleContinue}
              className="px-3.5 sm:px-4 py-2 rounded-lg bg-forest text-[#FCFBF8] text-xs font-medium hover:bg-forest-hover active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
            >
              {hasStartedAny ? 'Continue' : 'Practice'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {topView === 'curriculum' && nestedMode === 'problem' && activeEntry ? (
          <ProblemWorkspace
            section={activeEntry.section}
            problem={activeEntry.problem}
            problemIndex={activeEntry.section.problems.findIndex(
              (p) => p.id === activeEntry.problem.id
            )}
            totalProblems={activeEntry.section.problems.length}
            savedSteps={progress[activeEntry.problem.id]?.savedSteps}
            isAlreadySolved={Boolean(progress[activeEntry.problem.id]?.solved)}
            onBack={() => {
              setActiveProblemId(null);
              setNestedMode('browse');
            }}
            onOpenLecture={() =>
              openLecture(activeEntry.subject, activeEntry.section)
            }
            onStartSectionTest={
              activeEntry.section.testOutProblems?.length
                ? () => openTestOut(activeEntry.subject, activeEntry.section)
                : undefined
            }
            onSolved={handleSolved}
            onStepsChange={handleStepsChange}
            onNextProblem={
              nextInSection
                ? () =>
                    openProblem(
                      activeEntry.subject,
                      activeEntry.section,
                      nextInSection
                    )
                : undefined
            }
          />
        ) : topView === 'curriculum' &&
          nestedMode === 'lecture' &&
          selectedSubject &&
          selectedSection ? (
          <SectionLecture
            subject={selectedSubject}
            section={selectedSection}
            testResult={mastery[selectedSection.id]}
            onBack={() => setNestedMode('browse')}
            onStartPractice={() => {
              const first = selectedSection.problems[0];
              if (first) openProblem(selectedSubject, selectedSection, first);
            }}
            onStartTestOut={() => openTestOut(selectedSubject, selectedSection)}
          />
        ) : topView === 'curriculum' &&
          nestedMode === 'test_out' &&
          selectedSubject &&
          selectedSection ? (
          <SectionTestWorkspace
            subject={selectedSubject}
            section={selectedSection}
            onExit={() => setNestedMode('browse')}
            onComplete={handleTestComplete}
            onOpenLecture={() => openLecture(selectedSubject, selectedSection)}
            onStartPractice={() => {
              const first = selectedSection.problems[0];
              if (first) openProblem(selectedSubject, selectedSection, first);
            }}
            onNextSection={
              nextSectionInSubject
                ? () => {
                    setSelectedSectionId(nextSectionInSubject.id);
                    setNestedMode('browse');
                  }
                : undefined
            }
          />
        ) : topView === 'scratchpad' ? (
          <ScratchpadWorkspace />
        ) : topView === 'progress' ? (
          <ProgressView
            progress={progress}
            mastery={mastery}
            onOpenSubject={(subject) => {
              setSelectedSubjectId(subject.id);
              setSelectedSectionId(null);
              setNestedMode('browse');
              setTopView('curriculum');
            }}
            onResetProgress={() => {
              setProgress({});
              setMastery({});
            }}
          />
        ) : (
          <CurriculumBrowser
            selectedSubjectId={selectedSubjectId}
            selectedSectionId={selectedSectionId}
            progress={progress}
            mastery={mastery}
            onSelectSubject={(id) => {
              setSelectedSubjectId(id);
              setSelectedSectionId(null);
              setNestedMode('browse');
            }}
            onSelectSection={(id) => {
              setSelectedSectionId(id);
              setNestedMode('browse');
            }}
            onSelectProblem={openProblem}
            onOpenLecture={openLecture}
            onStartTestOut={openTestOut}
          />
        )}
      </main>

      <InstallModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        apkUrl={pwa.apkUrl}
        apkVersion={pwa.apkVersion}
        isInstallable={pwa.isInstallable}
        isIOS={pwa.isIOS}
        onInstallPWA={pwa.installPWA}
      />

      <OfflineIndicator />
    </div>
  );
}
