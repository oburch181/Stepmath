import { Problem, VerificationResult } from '../types/math';

// ---------------------------------------------------------------------------
// AST & Recursive-Descent Parser with Implicit Multiplication
// ---------------------------------------------------------------------------

export type ExprNode =
  | { type: 'number'; value: number }
  | { type: 'var'; name: string }
  | { type: 'unary'; op: '-'; arg: ExprNode }
  | { type: 'factorial'; arg: ExprNode }
  | { type: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: ExprNode; right: ExprNode }
  | { type: 'call'; fn: string; arg: ExprNode };

type TokenType =
  | 'num'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'pipe'
  | 'comma'
  | 'bang';

interface Token {
  type: TokenType;
  value: string;
}

const FUNCTIONS = new Set([
  'sqrt',
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'asin',
  'acos',
  'atan',
  'ln',
  'log',
  'exp',
  'abs',
]);

const MULTI_CHAR_SYMBOLS = [
  'sqrt',
  'asin',
  'acos',
  'atan',
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'exp',
  'abs',
  'log',
  'ln',
  'lambda',
  'theta',
  'pi',
];

export function normalizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/\u2212/g, '-') // Unicode minus
    .replace(/\u00d7|\u00b7|\u22c5/g, '*') // × · ⋅
    .replace(/\u00f7/g, '/') // ÷
    .replace(/\u2264/g, '<=') // ≤
    .replace(/\u2265/g, '>=') // ≥
    .replace(/\u03c0/g, 'pi') // π
    .replace(/\u03b8/g, 'theta') // θ
    .replace(/\u03bb/g, 'lambda') // λ
    .replace(/\u221a/g, 'sqrt') // √
    .replace(/\u00b1/g, '+-') // ±
    .replace(/\u00b2/g, '^2') // ²
    .replace(/\u00b3/g, '^3') // ³
    .replace(/\*\*/g, '^')
    .replace(/\s+/g, ' ');
}

/**
 * Strip optional derivative / function prefixes like "y' =", "f'(x) =", "dy/dx =", "f(x) ="
 * when verifying expression-type problems (derivatives, simplifications, integrals).
 */
function stripOptionalPrefix(input: string): string {
  const m = input.match(/^(?:f'\(x\)|f\(x\)|y'|dy\/dx|d\/dx\s*\([^)]*\)|[a-zA-Z]'\([a-zA-Z]\))\s*=\s*(.+)$/);
  if (m) return m[1].trim();
  return input;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = normalizeInput(expr);

  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ') {
      i++;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(s[i + 1] ?? ''))) {
      let num = '';
      let dotCount = 0;
      while (i < s.length && (/[0-9]/.test(s[i]) || (s[i] === '.' && dotCount === 0))) {
        if (s[i] === '.') dotCount++;
        num += s[i++];
      }
      tokens.push({ type: 'num', value: num });
      continue;
    }

    // Letters (check multi-char functions/constants first, else single-letter variables for implicit mult like 2xy)
    if (/[a-zA-Z]/.test(ch)) {
      let matched: string | null = null;
      const rest = s.slice(i);
      for (const sym of MULTI_CHAR_SYMBOLS) {
        if (rest.startsWith(sym)) {
          // Ensure "sinx" matches "sin", and "lambda" matches "lambda"
          // But don't match "e" inside "exp" (exp comes first in MULTI_CHAR_SYMBOLS)
          matched = sym;
          break;
        }
      }
      if (matched) {
        tokens.push({ type: 'ident', value: matched });
        i += matched.length;
      } else {
        tokens.push({ type: 'ident', value: ch });
        i++;
      }
      continue;
    }

    if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === '[') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }
    if (ch === ')' || ch === ']') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
      continue;
    }
    if (ch === '|') {
      tokens.push({ type: 'pipe', value: '|' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }
    if (ch === '!') {
      tokens.push({ type: 'bang', value: '!' });
      i++;
      continue;
    }

    throw new Error(`Unexpected character "${ch}"`);
  }

  // Insert implicit multiplication tokens where mathematically implied
  const out: Token[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const cur = tokens[idx];
    const prev = out[out.length - 1];
    if (prev) {
      const prevIsValue =
        prev.type === 'num' ||
        prev.type === 'rparen' ||
        prev.type === 'bang' ||
        (prev.type === 'ident' && !FUNCTIONS.has(prev.value));
      const curStartsValue =
        cur.type === 'num' ||
        cur.type === 'lparen' ||
        cur.type === 'ident';
      if (prevIsValue && curStartsValue) {
        out.push({ type: 'op', value: '*' });
      }
    }
    out.push(cur);
  }

  return out;
}

export function parseExpression(raw: string): ExprNode {
  const tokens = tokenize(raw);
  if (tokens.length === 0) {
    throw new Error('Empty expression');
  }

  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];

  function parseAddSub(): ExprNode {
    let left = parseMulDiv();
    while (peek()?.type === 'op' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = consume().value as '+' | '-';
      const right = parseMulDiv();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  function parseMulDiv(): ExprNode {
    let left = parseUnary();
    while (peek()?.type === 'op' && (peek()!.value === '*' || peek()!.value === '/')) {
      const op = consume().value as '*' | '/';
      const right = parseUnary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  function parseUnary(): ExprNode {
    if (peek()?.type === 'op' && peek()!.value === '-') {
      consume();
      const arg = parseUnary();
      return { type: 'unary', op: '-', arg };
    }
    if (peek()?.type === 'op' && peek()!.value === '+') {
      consume();
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): ExprNode {
    const base = parsePostfix();
    if (peek()?.type === 'op' && peek()!.value === '^') {
      consume();
      // Right-associative; exponent can be unary like e^-x
      const exp = parseUnary();
      return { type: 'binary', op: '^', left: base, right: exp };
    }
    return base;
  }

  function parsePostfix(): ExprNode {
    let node = parsePrimary();
    while (peek()?.type === 'bang') {
      consume();
      node = { type: 'factorial', arg: node };
    }
    return node;
  }

  function parsePrimary(): ExprNode {
    const tok = peek();
    if (!tok) {
      throw new Error('Incomplete expression');
    }

    if (tok.type === 'num') {
      consume();
      return { type: 'number', value: parseFloat(tok.value) };
    }

    if (tok.type === 'ident') {
      consume();
      if (FUNCTIONS.has(tok.value)) {
        // Support sin^2(x) shorthand
        let powerAfterFn: ExprNode | null = null;
        if (peek()?.type === 'op' && peek()!.value === '^') {
          consume();
          powerAfterFn = parsePrimary();
        }

        let arg: ExprNode;
        if (peek()?.type === 'lparen') {
          consume();
          arg = parseAddSub();
          if (peek()?.type !== 'rparen') {
            throw new Error('Missing closing parenthesis');
          }
          consume();
        } else {
          // Allow sqrt x, sin x, ln x without parentheses
          arg = parsePower();
        }
        const callNode: ExprNode = { type: 'call', fn: tok.value, arg };
        if (powerAfterFn) {
          return { type: 'binary', op: '^', left: callNode, right: powerAfterFn };
        }
        return callNode;
      }
      return { type: 'var', name: tok.value };
    }

    if (tok.type === 'lparen') {
      consume();
      const inner = parseAddSub();
      if (peek()?.type !== 'rparen') {
        throw new Error('Missing closing parenthesis');
      }
      consume();
      return inner;
    }

    if (tok.type === 'pipe') {
      consume();
      const inner = parseAddSub();
      if (peek()?.type !== 'pipe') {
        throw new Error('Missing closing absolute value bar');
      }
      consume();
      return { type: 'call', fn: 'abs', arg: inner };
    }

    throw new Error(`Unexpected token "${tok.value}"`);
  }

  const ast = parseAddSub();
  if (pos < tokens.length) {
    throw new Error(`Unexpected token "${tokens[pos].value}"`);
  }
  return ast;
}

export function evaluateAST(node: ExprNode, env: Record<string, number>): number {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'var': {
      if (node.name === 'pi') return Math.PI;
      if (node.name === 'e') return Math.E;
      if (node.name in env) return env[node.name];
      return NaN;
    }
    case 'unary':
      return -evaluateAST(node.arg, env);
    case 'factorial': {
      const v = evaluateAST(node.arg, env);
      if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v) || v > 170) return NaN;
      let res = 1;
      for (let k = 2; k <= v; k++) res *= k;
      return res;
    }
    case 'binary': {
      const l = evaluateAST(node.left, env);
      const r = evaluateAST(node.right, env);
      switch (node.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return l / r;
        case '^':
          return Math.pow(l, r);
      }
    }
    case 'call': {
      const v = evaluateAST(node.arg, env);
      switch (node.fn) {
        case 'sqrt':
          return Math.sqrt(v);
        case 'sin':
          return Math.sin(v);
        case 'cos':
          return Math.cos(v);
        case 'tan':
          return Math.tan(v);
        case 'sec':
          return 1 / Math.cos(v);
        case 'csc':
          return 1 / Math.sin(v);
        case 'cot':
          return 1 / Math.tan(v);
        case 'asin':
          return Math.asin(v);
        case 'acos':
          return Math.acos(v);
        case 'atan':
          return Math.atan(v);
        case 'ln':
          return Math.log(v);
        case 'log':
          return Math.log10(v);
        case 'exp':
          return Math.exp(v);
        case 'abs':
          return Math.abs(v);
        default:
          return NaN;
      }
    }
  }
}

export function collectVars(node: ExprNode, out = new Set<string>()): Set<string> {
  if (node.type === 'var') {
    if (node.name !== 'pi' && node.name !== 'e') {
      out.add(node.name);
    }
  } else if (node.type === 'unary' || node.type === 'call' || node.type === 'factorial') {
    collectVars(node.arg, out);
  } else if (node.type === 'binary') {
    collectVars(node.left, out);
    collectVars(node.right, out);
  }
  return out;
}

function countOps(node: ExprNode): number {
  switch (node.type) {
    case 'number':
    case 'var':
      return 0;
    case 'unary':
    case 'factorial':
    case 'call':
      return 1 + countOps(node.arg);
    case 'binary':
      return 1 + countOps(node.left) + countOps(node.right);
  }
}

function hasUnreducedNumericArithmetic(node: ExprNode): boolean {
  if (node.type === 'binary') {
    // Allow simple reduced fraction a/b (like 1/2, 3/4, pi/3) and e^3
    if (node.op === '/') {
      if (node.left.type === 'number' && node.right.type === 'number') {
        const a = node.left.value;
        const b = node.right.value;
        if (b === 1 || b === 0) return true;
        if (Number.isInteger(a) && Number.isInteger(b)) {
          const g = gcd(Math.abs(a), Math.abs(b));
          return g > 1; // e.g., 15/3 or 2/4 is unreduced
        }
        return true;
      }
    } else if (node.op === '^') {
      // Allow e^3, pi^2, but flag 2^3 as reducible
      if (node.left.type === 'number' && node.right.type === 'number') {
        return true;
      }
    } else {
      // +, -, * on two raw numbers like 22 - 7, 4 * 3, 6 + 2
      if (node.left.type === 'number' && node.right.type === 'number') {
        return true;
      }
      // Adding/subtracting 0 or multiplying by 1 or 0
      if ((node.op === '+' || node.op === '-') && ((node.right.type === 'number' && node.right.value === 0) || (node.left.type === 'number' && node.left.value === 0))) {
        return true;
      }
      if (node.op === '*' && ((node.right.type === 'number' && (node.right.value === 1 || node.right.value === 0)) || (node.left.type === 'number' && (node.left.value === 1 || node.left.value === 0)))) {
        return true;
      }
    }
    return hasUnreducedNumericArithmetic(node.left) || hasUnreducedNumericArithmetic(node.right);
  }
  if (node.type === 'unary') {
    if (node.arg.type === 'unary') return true; // --x
    return hasUnreducedNumericArithmetic(node.arg);
  }
  if (node.type === 'factorial') {
    if (node.arg.type === 'number') return true; // 5! should be evaluated to 120
    return hasUnreducedNumericArithmetic(node.arg);
  }
  if (node.type === 'call') {
    return hasUnreducedNumericArithmetic(node.arg);
  }
  return false;
}

function gcd(a: number, b: number): number {
  let x = Math.round(a);
  let y = Math.round(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

// Deterministic pseudo-random test samples covering positive, negative, fractional domains
const SAMPLE_POINTS = [
  0.37, 0.73, 1.19, 1.61, 2.13, 2.87, 3.41, 4.29, 5.17, 6.43,
  -0.41, -0.89, -1.37, -2.23, -3.11, -4.57, 0.15, 0.52, 0.91, 1.44,
  2.55, 3.78, 7.12, 9.34,
];

function buildSampleEnvs(vars: string[]): Record<string, number>[] {
  if (vars.length === 0) return [{}];
  return SAMPLE_POINTS.map((base, idx) => {
    const env: Record<string, number> = {};
    vars.forEach((v, vIdx) => {
      env[v] = SAMPLE_POINTS[(idx + vIdx * 5) % SAMPLE_POINTS.length];
    });
    return env;
  });
}

export function expressionsEquivalent(
  a: ExprNode,
  b: ExprNode,
  ignoreConstantDiff = false
): boolean {
  const vars = Array.from(new Set([...collectVars(a), ...collectVars(b)]));
  const envs = buildSampleEnvs(vars);

  let validSamples = 0;
  let constantOffset: number | null = null;

  for (const env of envs) {
    const va = evaluateAST(a, env);
    const vb = evaluateAST(b, env);
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;
    validSamples++;

    if (ignoreConstantDiff) {
      const diff = va - vb;
      if (constantOffset === null) {
        constantOffset = diff;
      } else {
        const scale = Math.max(1, Math.abs(va), Math.abs(vb), Math.abs(constantOffset));
        if (Math.abs(diff - constantOffset) > 1e-4 * scale) {
          return false;
        }
      }
    } else {
      const scale = Math.max(1, Math.abs(va), Math.abs(vb));
      if (Math.abs(va - vb) > 1e-4 * scale) {
        return false;
      }
    }
  }

  return validSamples >= (vars.length === 0 ? 1 : 4);
}

/**
 * Check if two equations (LHS1 - RHS1 = 0) and (LHS2 - RHS2 = 0) have a constant non-zero ratio
 */
function equationsConstantRatio(
  diff1: ExprNode,
  diff2: ExprNode
): boolean {
  const vars = Array.from(new Set([...collectVars(diff1), ...collectVars(diff2)]));
  const envs = buildSampleEnvs(vars);

  let ratio: number | null = null;
  let validCount = 0;

  for (const env of envs) {
    const v1 = evaluateAST(diff1, env);
    const v2 = evaluateAST(diff2, env);
    if (!Number.isFinite(v1) || !Number.isFinite(v2)) continue;
    if (Math.abs(v1) < 1e-6 && Math.abs(v2) < 1e-6) continue;
    if (Math.abs(v1) < 1e-6 || Math.abs(v2) < 1e-6) return false;

    const r = v2 / v1;
    validCount++;
    if (ratio === null) {
      ratio = r;
    } else {
      const scale = Math.max(1, Math.abs(ratio), Math.abs(r));
      if (Math.abs(r - ratio) > 1e-4 * scale) {
        return false;
      }
    }
  }

  return validCount >= 3 && ratio !== null && Math.abs(ratio) > 1e-7;
}

function isIdenticallyZero(node: ExprNode): boolean {
  const vars = Array.from(collectVars(node));
  const envs = buildSampleEnvs(vars);
  let valid = 0;
  for (const env of envs) {
    const v = evaluateAST(node, env);
    if (!Number.isFinite(v)) continue;
    valid++;
    if (Math.abs(v) > 1e-5) return false;
  }
  return valid > 0;
}

function isAstStructurallySame(a: string, b: string): boolean {
  return normalizeInput(a).replace(/\s+/g, '') === normalizeInput(b).replace(/\s+/g, '');
}

// ---------------------------------------------------------------------------
// Inequality Parsing & Verification
// ---------------------------------------------------------------------------

type RelOp = '<' | '>' | '<=' | '>=';

function parseInequality(raw: string): { lhs: ExprNode; op: RelOp; rhs: ExprNode } | null {
  const s = normalizeInput(raw);
  const match = s.match(/^(.+?)(<=|>=|<|>)(.+)$/);
  if (!match) return null;
  const lhs = parseExpression(match[1]);
  const op = match[2] as RelOp;
  const rhs = parseExpression(match[3]);
  return { lhs, op, rhs };
}

function evalRelation(l: number, op: RelOp, r: number): boolean {
  const eps = 1e-7;
  switch (op) {
    case '<':
      return l < r - eps;
    case '>':
      return l > r + eps;
    case '<=':
      return l <= r + eps;
    case '>=':
      return l >= r - eps;
  }
}

function flipOp(op: RelOp): RelOp {
  switch (op) {
    case '<':
      return '>';
    case '>':
      return '<';
    case '<=':
      return '>=';
    case '>=':
      return '<=';
  }
}

function verifyInequalityStep(
  rawInput: string,
  prevRaw: string,
  problem: Problem
): VerificationResult {
  if (isAstStructurallySame(rawInput, prevRaw)) {
    return { status: 'error', feedback: 'Identical to the previous line — try simplifying or isolating the variable.' };
  }

  let curr;
  let prev;
  try {
    curr = parseInequality(rawInput);
    prev = parseInequality(prevRaw);
  } catch {
    return { status: 'error', feedback: 'Incomplete inequality — check your symbols and parentheses.' };
  }

  if (!curr) {
    return { status: 'error', feedback: 'Include an inequality symbol (<, >, ≤, or ≥).' };
  }
  if (!prev) {
    return { status: 'error', feedback: 'Could not compare with the previous line.' };
  }

  const target = problem.inequalityTarget!;
  const variable = target.variable;
  const b = target.value;

  // Build test points tightly bracketing the boundary and spread across the number line
  const testPoints = [
    b - 10, b - 4.3, b - 1.5, b - 0.5, b - 0.05, b - 0.002,
    b,
    b + 0.002, b + 0.05, b + 0.5, b + 1.5, b + 4.3, b + 10,
  ];

  let allMatch = true;
  let flippedMatch = true;

  for (const x of testPoints) {
    const env = { [variable]: x };
    const pVal = evalRelation(evaluateAST(prev.lhs, env), prev.op, evaluateAST(prev.rhs, env));
    const cVal = evalRelation(evaluateAST(curr.lhs, env), curr.op, evaluateAST(curr.rhs, env));
    const fVal = evalRelation(evaluateAST(curr.lhs, env), flipOp(curr.op), evaluateAST(curr.rhs, env));

    if (pVal !== cVal) allMatch = false;
    if (pVal !== fVal) flippedMatch = false;
  }

  if (!allMatch) {
    if (flippedMatch) {
      return {
        status: 'error',
        feedback: 'Inequality direction is reversed — remember to flip the sign when dividing or multiplying by a negative.',
      };
    }
    return {
      status: 'error',
      feedback: 'Not equivalent to the previous line. Double-check your arithmetic on both sides.',
    };
  }

  // Check if solved: variable isolated on LHS or RHS and other side simplified
  const lhsIsVar = curr.lhs.type === 'var' && curr.lhs.name === variable && collectVars(curr.rhs).size === 0;
  const rhsIsVar = curr.rhs.type === 'var' && curr.rhs.name === variable && collectVars(curr.lhs).size === 0;

  if (lhsIsVar || rhsIsVar) {
    const numSide = lhsIsVar ? curr.rhs : curr.lhs;
    if (hasUnreducedNumericArithmetic(numSide)) {
      return { status: 'valid', feedback: 'Valid step — simplify the number on the right.' };
    }
    return { status: 'solved', feedback: 'Solved' };
  }

  return { status: 'valid', feedback: 'Valid step' };
}

// ---------------------------------------------------------------------------
// Multi-Root Parsing (e.g. "x = 2, 3" | "x = 2 or x = 3" | "x = ±2")
// ---------------------------------------------------------------------------

function parseMultiRootSolution(raw: string, variable: string): { values: number[]; simplified: boolean } | null {
  const s = normalizeInput(raw);

  // Match "x = +-3"
  const pmMatch = s.match(new RegExp(`^${variable}\\s*=\\s*\\+-\\s*(.+)$`));
  if (pmMatch) {
    try {
      const ast = parseExpression(pmMatch[1]);
      if (collectVars(ast).size > 0) return null;
      const v = evaluateAST(ast, {});
      if (!Number.isFinite(v)) return null;
      return {
        values: [-v, v].sort((a, b) => a - b),
        simplified: !hasUnreducedNumericArithmetic(ast),
      };
    } catch {
      return null;
    }
  }

  // Match "x = 2, 3" or "x = 2, x = 3" or "x = 2 or x = 3" or "x = 2 or 3"
  if (s.includes(',') || /\bor\b/i.test(s)) {
    const parts = s.split(/,|\bor\b/i).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;

    const values: number[] = [];
    let allSimplified = true;

    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      const eqMatch = part.match(new RegExp(`^${variable}\\s*=\\s*(.+)$`));
      if (eqMatch) {
        part = eqMatch[1];
      } else if (i === 0) {
        // First item must mention variable = ...
        return null;
      }
      try {
        const ast = parseExpression(part);
        if (collectVars(ast).size > 0) return null;
        const val = evaluateAST(ast, {});
        if (!Number.isFinite(val)) return null;
        if (hasUnreducedNumericArithmetic(ast)) allSimplified = false;
        values.push(val);
      } catch {
        return null;
      }
    }

    return { values: values.sort((a, b) => a - b), simplified: allSimplified };
  }

  return null;
}

function arraysMatch(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => Math.abs(v - sb[i]) < 1e-4);
}

// ---------------------------------------------------------------------------
// Main Step Verifier
// ---------------------------------------------------------------------------

export function verifyStep(
  rawInput: string,
  previousLines: string[],
  problem: Problem
): VerificationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { status: 'error', feedback: 'Write your next line before checking.' };
  }

  const hasPriorStudentLine = previousLines.length > 0;
  const prevRaw = hasPriorStudentLine
    ? previousLines[previousLines.length - 1]
    : problem.displayGiven
      ? ''
      : problem.given;

  // 1. Inequality problems
  if (problem.kind === 'inequality') {
    return verifyInequalityStep(trimmed, prevRaw || problem.given, problem);
  }

  // 2. Equation problems (single-variable numeric solutions)
  if (problem.kind === 'equation') {
    return verifyEquationStep(trimmed, prevRaw, problem);
  }

  // 3. Symbolic equations (e.g. solving y = 2x + 6 for x, or ODE y = x^2 + 3)
  if (problem.kind === 'symbolic_equation') {
    return verifySymbolicEquationStep(trimmed, prevRaw, problem);
  }

  // 4. Expression problems (factor, expand, simplify, derivative, antiderivative, numeric)
  return verifyExpressionStep(trimmed, prevRaw, problem);
}

function verifyEquationStep(
  rawInput: string,
  prevRaw: string,
  problem: Problem
): VerificationResult {
  const variable = problem.solveFor ?? problem.variables[0] ?? 'x';
  const solutions = problem.solutions ?? [];

  if (isAstStructurallySame(rawInput, prevRaw)) {
    return { status: 'error', feedback: 'Same as the previous line — try simplifying or isolating a term.' };
  }

  // Check multi-root solution format first (e.g. "x = 2, 3" or "x = ±2")
  const multi = parseMultiRootSolution(rawInput, variable);
  if (multi) {
    if (arraysMatch(multi.values, solutions)) {
      if (!multi.simplified) {
        return { status: 'valid', feedback: 'Valid solutions — simplify each value.' };
      }
      return { status: 'solved', feedback: 'Solved' };
    }
    return {
      status: 'error',
      feedback: 'Check your roots — substitute them back into the original equation to verify.',
    };
  }

  // Standard single equation LHS = RHS
  const norm = normalizeInput(rawInput);
  const eqParts = norm.split('=');
  if (eqParts.length !== 2 || !eqParts[0].trim() || !eqParts[1].trim()) {
    return { status: 'error', feedback: 'Write a complete equation with "=" (e.g. 3x = 15).' };
  }

  let lhs: ExprNode;
  let rhs: ExprNode;
  try {
    lhs = parseExpression(eqParts[0]);
    rhs = parseExpression(eqParts[1]);
  } catch (err) {
    return {
      status: 'error',
      feedback: err instanceof Error ? err.message : 'Check syntax and parentheses.',
    };
  }

  const diffNode: ExprNode = { type: 'binary', op: '-', left: lhs, right: rhs };

  // Reject tautologies like 0 = 0 or x = x
  if (isIdenticallyZero(diffNode)) {
    return {
      status: 'error',
      feedback: 'That is an identity (always true) and loses the constraint on the variable.',
    };
  }

  // Check that every true root satisfies the student's equation
  let satisfiedCount = 0;
  for (const r of solutions) {
    const val = evaluateAST(diffNode, { [variable]: r });
    if (Number.isFinite(val) && Math.abs(val) < 1e-4) {
      satisfiedCount++;
    }
  }

  if (satisfiedCount !== solutions.length) {
    if (solutions.length > 1 && satisfiedCount > 0) {
      return {
        status: 'error',
        feedback: `That captures ${satisfiedCount} of ${solutions.length} solutions. Keep all roots (e.g. ${variable} = a, b).`,
      };
    }
    return {
      status: 'error',
      feedback: 'Not equivalent — this step changes the solution. Check your signs and arithmetic.',
    };
  }

  // Also ensure the student didn't introduce blatantly bogus extra roots when transforming
  // (compare against previous equation if previous equation was a single equation)
  const prevNorm = normalizeInput(prevRaw);
  const prevParts = prevNorm.split('=');
  if (prevParts.length === 2) {
    try {
      const prevDiff: ExprNode = {
        type: 'binary',
        op: '-',
        left: parseExpression(prevParts[0]),
        right: parseExpression(prevParts[1]),
      };
      // If constant ratio holds, guaranteed equivalent!
      const exactRatio = equationsConstantRatio(prevDiff, diffNode);
      if (!exactRatio) {
        // Check for spurious extra roots at test points away from true solutions
        // (Allows inverse operations like squaring sqrt(x+4)=5 -> x+4=25 or 2^(x+1)=16 -> x+1=4)
        const probePoints = [-10, -5, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 8, 10, 12];
        for (const p of probePoints) {
          if (solutions.some((r) => Math.abs(r - p) < 0.05)) continue;
          const vCurr = evaluateAST(diffNode, { [variable]: p });
          const vPrev = evaluateAST(prevDiff, { [variable]: p });
          if (Number.isFinite(vCurr) && Math.abs(vCurr) < 1e-5 && Number.isFinite(vPrev) && Math.abs(vPrev) > 1e-3) {
            return {
              status: 'error',
              feedback: `This equation introduces an extraneous root (${variable} = ${p}) not in the original problem.`,
            };
          }
        }
      }
    } catch {
      // ignore if previous wasn't standard
    }
  }

  // Check if solved: isolated variable = simplified constant (for 1-solution equations)
  if (solutions.length === 1) {
    const lhsIsVar = lhs.type === 'var' && lhs.name === variable && collectVars(rhs).size === 0;
    const rhsIsVar = rhs.type === 'var' && rhs.name === variable && collectVars(lhs).size === 0;
    if (lhsIsVar || rhsIsVar) {
      const valueNode = lhsIsVar ? rhs : lhs;
      if (hasUnreducedNumericArithmetic(valueNode)) {
        return { status: 'valid', feedback: 'Valid step — simplify the final value.' };
      }
      return { status: 'solved', feedback: 'Solved' };
    }
  }

  return { status: 'valid', feedback: 'Valid step' };
}

function verifySymbolicEquationStep(
  rawInput: string,
  prevRaw: string,
  problem: Problem
): VerificationResult {
  const solveFor = problem.solveFor ?? 'y';
  if (isAstStructurallySame(rawInput, prevRaw)) {
    return { status: 'error', feedback: 'Same as the previous line — try isolating the target variable.' };
  }

  const norm = normalizeInput(rawInput);
  const parts = norm.split('=');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
    return { status: 'error', feedback: 'Write an equation with "=".' };
  }

  let lhs: ExprNode;
  let rhs: ExprNode;
  let targetRHS: ExprNode;
  try {
    lhs = parseExpression(parts[0]);
    rhs = parseExpression(parts[1]);
    targetRHS = parseExpression(problem.targetExpr ?? '0');
  } catch (err) {
    return {
      status: 'error',
      feedback: err instanceof Error ? err.message : 'Check syntax and parentheses.',
    };
  }

  const studentDiff: ExprNode = { type: 'binary', op: '-', left: lhs, right: rhs };
  if (isIdenticallyZero(studentDiff)) {
    return { status: 'error', feedback: 'That is an identity — isolate the target variable.' };
  }

  // If student writes an intermediate general solution with "+ C" (e.g. y = x^2 + C)
  const studentVars = collectVars(studentDiff);
  if ((studentVars.has('C') || studentVars.has('c')) && !collectVars(targetRHS).has('C')) {
    const lhsIsolated = lhs.type === 'var' && lhs.name === solveFor && !collectVars(rhs).has(solveFor);
    if (lhsIsolated && expressionsEquivalent(replaceVarWithZero(rhs, 'C'), targetRHS, true)) {
      return {
        status: 'valid',
        feedback: 'Valid general solution — now use the initial condition to find C.',
      };
    }
  }

  // Evaluate studentDiff along the true solution curve solveFor = targetRHS(otherVars)
  const otherVars = Array.from(collectVars(targetRHS));
  const envs = buildSampleEnvs(otherVars);
  let validChecks = 0;

  for (const env of envs) {
    const expectedSolveVal = evaluateAST(targetRHS, env);
    if (!Number.isFinite(expectedSolveVal)) continue;
    const fullEnv = { ...env, [solveFor]: expectedSolveVal };
    const residual = evaluateAST(studentDiff, fullEnv);
    if (!Number.isFinite(residual)) continue;
    validChecks++;
    if (Math.abs(residual) > 1e-4 * Math.max(1, Math.abs(expectedSolveVal))) {
      return {
        status: 'error',
        feedback: 'Not equivalent — double-check your algebraic steps.',
      };
    }
  }

  if (validChecks < 3) {
    return { status: 'error', feedback: 'Could not verify this step — check variable names.' };
  }

  // Check if isolated
  const lhsIsolated = lhs.type === 'var' && lhs.name === solveFor && !collectVars(rhs).has(solveFor);
  const rhsIsolated = rhs.type === 'var' && rhs.name === solveFor && !collectVars(lhs).has(solveFor);

  if (lhsIsolated || rhsIsolated) {
    const exprSide = lhsIsolated ? rhs : lhs;
    if (hasUnreducedNumericArithmetic(exprSide)) {
      return { status: 'valid', feedback: 'Valid step — simplify the expression further.' };
    }
    return { status: 'solved', feedback: 'Solved' };
  }

  return { status: 'valid', feedback: 'Valid step' };
}

function isFactoredForm(node: ExprNode): boolean {
  if (node.type === 'binary' && (node.op === '*' || node.op === '^')) {
    return true;
  }
  if (node.type === 'unary' && node.arg.type === 'binary' && (node.arg.op === '*' || node.arg.op === '^')) {
    return true;
  }
  return false;
}

function hasParenthesizedSumProduct(node: ExprNode): boolean {
  if (node.type === 'binary') {
    if (node.op === '*') {
      const leftIsSum = node.left.type === 'binary' && (node.left.op === '+' || node.left.op === '-');
      const rightIsSum = node.right.type === 'binary' && (node.right.op === '+' || node.right.op === '-');
      if (leftIsSum || rightIsSum) return true;
    }
    if (node.op === '^') {
      const baseIsSum = node.left.type === 'binary' && (node.left.op === '+' || node.left.op === '-');
      if (baseIsSum) return true;
    }
    return hasParenthesizedSumProduct(node.left) || hasParenthesizedSumProduct(node.right);
  }
  if (node.type === 'unary' || node.type === 'call' || node.type === 'factorial') {
    return hasParenthesizedSumProduct(node.arg);
  }
  return false;
}

function verifyExpressionStep(
  rawInput: string,
  prevRaw: string,
  problem: Problem
): VerificationResult {
  const cleaned = stripOptionalPrefix(rawInput);

  if (isAstStructurallySame(cleaned, stripOptionalPrefix(prevRaw))) {
    return { status: 'error', feedback: 'Same as the previous line — try simplifying further.' };
  }

  if (cleaned.includes('=')) {
    return { status: 'error', feedback: 'Enter an expression here (no "=" sign needed).' };
  }

  let studentAst: ExprNode;
  let targetAst: ExprNode;
  try {
    studentAst = parseExpression(cleaned);
    targetAst = parseExpression(problem.targetExpr ?? '0');
  } catch (err) {
    return {
      status: 'error',
      feedback: err instanceof Error ? err.message : 'Check syntax and parentheses.',
    };
  }

  // Antiderivative check (allows + C and checks constant difference)
  if (problem.kind === 'antiderivative') {
    const vars = collectVars(studentAst);
    const hasC = vars.has('C') || vars.has('c');

    // Compare ignoring additive constant
    const evalStudent = hasC ? studentAst : studentAst;
    // Set C = 0 when comparing numerically up to constant
    const matchesUpToConst = expressionsEquivalent(
      replaceVarWithZero(evalStudent, 'C'),
      replaceVarWithZero(targetAst, 'C'),
      true
    );

    if (!matchesUpToConst) {
      return {
        status: 'error',
        feedback: 'Check your antiderivative — differentiating your line should return the integrand.',
      };
    }

    if (hasUnreducedNumericArithmetic(studentAst)) {
      return { status: 'valid', feedback: 'Valid step — simplify the coefficients.' };
    }

    if (problem.requireConstantC && !hasC) {
      return {
        status: 'valid',
        feedback: 'Right antiderivative — add + C for the indefinite integral.',
      };
    }

    const targetOps = countOps(targetAst);
    const studentOps = countOps(studentAst);
    if (studentOps > (problem.maxSimplifiedOps ?? targetOps + 3)) {
      return { status: 'valid', feedback: 'Valid step — simplify your expression further.' };
    }

    return { status: 'solved', feedback: 'Solved' };
  }

  // Standard equivalence against target expression
  const equiv = expressionsEquivalent(studentAst, targetAst, false);
  if (!equiv) {
    if (problem.kind === 'derivative') {
      return { status: 'error', feedback: 'Not equivalent to the derivative — check your differentiation rules.' };
    }
    if (problem.kind === 'numeric') {
      return { status: 'error', feedback: 'This evaluates to a different value. Check your arithmetic.' };
    }
    return { status: 'error', feedback: 'Not algebraically equivalent to the expression. Check signs and terms.' };
  }

  // Now we know the student's line IS mathematically equivalent!
  // Determine whether it's an intermediate valid step or the final solved form.
  if (problem.kind === 'factor') {
    if (isFactoredForm(studentAst) && !hasUnreducedNumericArithmetic(studentAst)) {
      return { status: 'solved', feedback: 'Solved' };
    }
    return { status: 'valid', feedback: 'Valid step — continue factoring into a product.' };
  }

  if (problem.kind === 'expand') {
    if (!hasParenthesizedSumProduct(studentAst) && !hasUnreducedNumericArithmetic(studentAst)) {
      const targetOps = countOps(targetAst);
      if (countOps(studentAst) <= (problem.maxSimplifiedOps ?? targetOps + 1)) {
        return { status: 'solved', feedback: 'Solved' };
      }
    }
    return { status: 'valid', feedback: 'Valid step — expand and combine like terms.' };
  }

  if (problem.kind === 'numeric') {
    if (collectVars(studentAst).size === 0 && !hasUnreducedNumericArithmetic(studentAst)) {
      const ops = countOps(studentAst);
      const maxAllowed = problem.maxSimplifiedOps ?? Math.max(1, countOps(targetAst));
      if (ops <= maxAllowed) {
        return { status: 'solved', feedback: 'Solved' };
      }
    }
    return { status: 'valid', feedback: 'Valid step — simplify to a single value.' };
  }

  // simplify & derivative
  if (hasUnreducedNumericArithmetic(studentAst)) {
    return { status: 'valid', feedback: 'Valid step — simplify the arithmetic.' };
  }

  const targetOps = countOps(targetAst);
  const maxOps = problem.maxSimplifiedOps ?? targetOps + 2;
  if (countOps(studentAst) <= maxOps) {
    return { status: 'solved', feedback: 'Solved' };
  }

  return { status: 'valid', feedback: 'Valid step — simplify further.' };
}

function replaceVarWithZero(node: ExprNode, varName: string): ExprNode {
  if (node.type === 'var' && (node.name === varName || node.name === varName.toLowerCase())) {
    return { type: 'number', value: 0 };
  }
  if (node.type === 'unary' || node.type === 'factorial') {
    return { ...node, arg: replaceVarWithZero(node.arg, varName) };
  }
  if (node.type === 'call') {
    return { ...node, arg: replaceVarWithZero(node.arg, varName) };
  }
  if (node.type === 'binary') {
    return {
      ...node,
      left: replaceVarWithZero(node.left, varName),
      right: replaceVarWithZero(node.right, varName),
    };
  }
  return node;
}

// ---------------------------------------------------------------------------
// Free Scratchpad Verifier (User enters their own equation & solves line by line)
// ---------------------------------------------------------------------------

export function verifyScratchpadStep(
  rawInput: string,
  previousEquation: string
): VerificationResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { status: 'error', feedback: 'Write your next line first.' };
  }
  if (isAstStructurallySame(trimmed, previousEquation)) {
    return { status: 'error', feedback: 'Identical to the previous line.' };
  }

  const normCurr = normalizeInput(trimmed);
  const normPrev = normalizeInput(previousEquation);

  // Check if both are equations
  const currParts = normCurr.split('=');
  const prevParts = normPrev.split('=');

  if (currParts.length === 2 && prevParts.length === 2) {
    try {
      const cL = parseExpression(currParts[0]);
      const cR = parseExpression(currParts[1]);
      const pL = parseExpression(prevParts[0]);
      const pR = parseExpression(prevParts[1]);

      const cDiff: ExprNode = { type: 'binary', op: '-', left: cL, right: cR };
      const pDiff: ExprNode = { type: 'binary', op: '-', left: pL, right: pR };

      if (isIdenticallyZero(cDiff)) {
        return { status: 'error', feedback: 'This reduces to an identity (0 = 0).' };
      }

      if (equationsConstantRatio(pDiff, cDiff)) {
        // Check if single variable isolated = simplified number
        const allVars = collectVars(cDiff);
        if (allVars.size === 1) {
          const [v] = Array.from(allVars);
          const lhsIsolated = cL.type === 'var' && cL.name === v && collectVars(cR).size === 0;
          const rhsIsolated = cR.type === 'var' && cR.name === v && collectVars(cL).size === 0;
          if (lhsIsolated || rhsIsolated) {
            const valNode = lhsIsolated ? cR : cL;
            if (!hasUnreducedNumericArithmetic(valNode)) {
              return { status: 'solved', feedback: `Solved for ${v}` };
            }
          }
        }
        return { status: 'valid', feedback: 'Equivalent step' };
      }

      return { status: 'error', feedback: 'Not algebraically equivalent to the previous line.' };
    } catch (err) {
      return {
        status: 'error',
        feedback: err instanceof Error ? err.message : 'Check syntax.',
      };
    }
  }

  // Otherwise compare as expressions
  if (!normCurr.includes('=') && !normPrev.includes('=')) {
    try {
      const cAst = parseExpression(normCurr);
      const pAst = parseExpression(normPrev);
      if (expressionsEquivalent(cAst, pAst, false)) {
        return { status: 'valid', feedback: 'Equivalent expression' };
      }
      return { status: 'error', feedback: 'Not equivalent to the previous expression.' };
    } catch (err) {
      return {
        status: 'error',
        feedback: err instanceof Error ? err.message : 'Check syntax.',
      };
    }
  }

  return { status: 'error', feedback: 'Keep the same format (equation or expression) as your starting line.' };
}

/**
 * Verify an individual slot entry (e.g. a Taylor coefficient, matrix entry, or probability value)
 * against its expected mathematical value.
 */
export function verifySlotValue(
  studentRaw: string,
  expectedRaw: string
): { ok: boolean; message?: string } {
  const trimmed = studentRaw.trim();
  if (!trimmed) {
    return { ok: false, message: 'Empty' };
  }
  try {
    const studentAst = parseExpression(trimmed);
    const expectedAst = parseExpression(expectedRaw);
    if (expressionsEquivalent(studentAst, expectedAst, false)) {
      return { ok: true };
    }
    return { ok: false, message: 'Check value' };
  } catch {
    return { ok: false, message: 'Check syntax' };
  }
}

