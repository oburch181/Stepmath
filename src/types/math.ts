export type ProblemKind =
  | 'equation'
  | 'inequality'
  | 'factor'
  | 'expand'
  | 'simplify'
  | 'derivative'
  | 'antiderivative'
  | 'numeric'
  | 'symbolic_equation';

export type ProblemFormat = 'line_by_line' | 'slots' | 'concept_choice';

export interface SlotSpec {
  id: string;
  /** Label shown beside or above the slot, e.g. "c₀", "x² coeff", "P(X = 2)" */
  label: string;
  /** Optional inline suffix rendered right after the input box, e.g. "x²" or "x³" */
  suffix?: string;
  /** Exact expected numeric/expression answer (evaluated via math engine, e.g. "1/6" or "-1/2") */
  expected: string;
  placeholder?: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** Optional mathematical expression displayed in serif math notation */
  math?: string;
  explanation: string;
}

export interface Problem {
  id: string;
  sectionId: string;
  title: string;
  instruction: string;
  /** Defaults to 'line_by_line' when omitted */
  format?: ProblemFormat;
  /** The initial expression or equation displayed on Line 0 */
  given: string;
  /** Optional secondary display for Line 0 (e.g. "lim_{x -> 2} (x^2 - 4)/(x - 2)") */
  displayGiven?: string;
  kind: ProblemKind;
  /** Primary variable(s) to surface in the keyboard quick-bar */
  variables: string[];
  /** For equations/inequalities: variable being solved for */
  solveFor?: string;
  /** For numeric/equation problems: exact root(s) or value */
  solutions?: number[];
  /** For inequality problems: boundary value & expected operator when variable is on LHS */
  inequalityTarget?: {
    variable: string;
    operator: '<' | '>' | '<=' | '>=';
    value: number;
  };
  /** Canonical target expression for comparison */
  targetExpr?: string;
  /** Whether an indefinite integral expects + C */
  requireConstantC?: boolean;
  /** Allowed complexity ceiling (character/operator threshold) to consider simplified */
  maxSimplifiedOps?: number;
  /** For format === 'slots': structured coefficient / entry blanks */
  slots?: SlotSpec[];
  /** Optional layout hint for slots: 'series' (inline sum) or 'grid' (labeled boxes) */
  slotLayout?: 'series' | 'grid';
  /** For format === 'concept_choice': conceptual/interpretation options */
  choices?: ChoiceOption[];
  correctChoiceId?: string;
  /** Progressive hints revealed only when requested */
  hints: string[];
  /** Example worked solution lines for reference */
  exampleSteps: string[];
}

export interface LectureRule {
  label: string;
  formula: string;
  note?: string;
}

export interface LectureWorkedStep {
  math: string;
  explanation: string;
}

export interface LectureNote {
  /** 2–3 clear lecture paragraphs introducing intuition and why it matters */
  intuition: string[];
  /** Formal statements / identities rendered as clean math formulas */
  keyRules: LectureRule[];
  /** Step-by-step annotated derivation demonstrating line-by-line thinking */
  workedExample: {
    prompt: string;
    given: string;
    steps: LectureWorkedStep[];
  };
  /** Concise warnings about subtle traps and common mistakes */
  pitfalls: string[];
}

export interface Section {
  id: string;
  subjectId: string;
  number: string;
  title: string;
  subtitle: string;
  /** Concise summary retained for quick reference */
  conceptNote: {
    summary: string;
    keyRule: string;
    example: string;
  };
  /** Deeper lecture-style explanation for the section */
  lecture?: LectureNote;
  problems: Problem[];
  /** Dedicated fresh multi-question assessment for testing out of the section */
  testOutProblems?: Problem[];
}

export interface Subject {
  id: string;
  number: string;
  title: string;
  level: string;
  description: string;
  sections: Section[];
}

export type StepStatus = 'valid' | 'solved' | 'error' | 'note';

export interface StepLine {
  id: string;
  raw: string;
  status: StepStatus;
  feedback: string;
}

export interface VerificationResult {
  status: StepStatus;
  feedback: string;
}

export interface ProblemProgress {
  solved: boolean;
  stepsCount: number;
  lastUpdated: number;
  savedSteps?: StepLine[];
}

export type ProgressMap = Record<string, ProblemProgress>;

export interface SectionTestResult {
  passed: boolean;
  score: number;
  total: number;
  completedAt: number;
}

export type MasteryMap = Record<string, SectionTestResult>;

export type KeyboardTab = 'primary' | 'functions' | 'variables';
