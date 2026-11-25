import React from 'react';

const FUNCTION_WORDS = new Set([
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'ln',
  'log',
  'exp',
  'lim',
  'det',
  'abs',
]);

interface RenderSegment {
  type: 'text' | 'var' | 'fn' | 'op' | 'sup' | 'rad';
  content: string;
}

/**
 * Lightweight math pretty-printer that turns raw expression strings
 * into scholarly serif/upright typographic React elements.
 */
function parsePrettySegments(raw: string): RenderSegment[] {
  const s = raw
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/\+-/g, '±')
    .replace(/->/g, '→')
    .replace(/\bsqrt\b/g, '√')
    .replace(/\bpi\b/g, 'π')
    .replace(/\blambda\b/g, 'λ')
    .replace(/\btheta\b/g, 'θ');

  const segments: RenderSegment[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    // Exponent: ^(expr) or ^token
    if (ch === '^') {
      i++;
      if (s[i] === '(') {
        let depth = 1;
        let j = i + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === '(') depth++;
          else if (s[j] === ')') depth--;
          j++;
        }
        const inner = s.slice(i + 1, depth === 0 ? j - 1 : j);
        segments.push({ type: 'sup', content: inner });
        i = j;
        continue;
      } else {
        let j = i;
        if (s[j] === '-') j++;
        while (j < s.length && /[0-9a-zA-Z]/.test(s[j])) {
          j++;
        }
        const expText = s.slice(i, j);
        if (expText) {
          segments.push({ type: 'sup', content: expText });
          i = j;
          continue;
        }
      }
    }

    // Words (function names or variables)
    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const word = s.slice(i, j);
      if (FUNCTION_WORDS.has(word)) {
        segments.push({ type: 'fn', content: word });
      } else if (word === 'dx' || word === 'dy' || word === 'dt') {
        segments.push({ type: 'text', content: ' d' });
        segments.push({ type: 'var', content: word[1] });
      } else {
        // Split individual math variables cleanly (e.g. 2xy -> x, y)
        for (const c of word) {
          segments.push({ type: 'var', content: c });
        }
      }
      i = j;
      continue;
    }

    // Greek / special variables
    if (ch === 'π' || ch === 'λ' || ch === 'θ') {
      segments.push({ type: 'var', content: ch });
      i++;
      continue;
    }

    // Radical symbol
    if (ch === '√') {
      segments.push({ type: 'rad', content: '√' });
      i++;
      continue;
    }

    // Binary / relation operators with balanced thin spacing
    if ('=<>≤≥±→'.includes(ch)) {
      segments.push({ type: 'op', content: ` ${ch} ` });
      i++;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '−') {
      // Detect unary minus vs binary minus
      const prevNonSpace = s.slice(0, i).trimEnd();
      const prevChar = prevNonSpace[prevNonSpace.length - 1];
      const isUnary = !prevChar || '(=<>,≤≥[+−-*·/÷^→'.includes(prevChar);
      const glyph = ch === '+' ? '+' : '−';
      segments.push({
        type: 'op',
        content: isUnary ? glyph : ` ${glyph} `,
      });
      i++;
      continue;
    }

    if (ch === '*' || ch === '×') {
      segments.push({ type: 'op', content: ' · ' });
      i++;
      continue;
    }

    if (ch === ' ') {
      // Collapse duplicate spaces around operators
      const prev = segments[segments.length - 1];
      if (!prev || (!prev.content.endsWith(' ') && prev.type !== 'op')) {
        segments.push({ type: 'text', content: ' ' });
      }
      i++;
      continue;
    }

    segments.push({ type: 'text', content: ch });
    i++;
  }

  return segments;
}

interface MathDisplayProps {
  expression: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES: Record<NonNullable<MathDisplayProps['size']>, string> = {
  sm: 'text-[15px] leading-snug',
  md: 'text-[18px] leading-snug',
  lg: 'text-[22px] sm:text-[24px] leading-snug',
  xl: 'text-[24px] sm:text-[28px] leading-tight',
};

export const MathDisplay: React.FC<MathDisplayProps> = ({
  expression,
  className = '',
  size = 'lg',
}) => {
  const segments = parsePrettySegments(expression);

  return (
    <span
      className={`font-serif tracking-[0.01em] text-ink inline-flex flex-wrap items-baseline ${SIZE_CLASSES[size]} ${className}`}
    >
      {segments.map((seg, idx) => {
        if (seg.type === 'var') {
          return (
            <span key={idx} className="italic font-normal pr-[0.04em]">
              {seg.content}
            </span>
          );
        }
        if (seg.type === 'fn') {
          return (
            <span key={idx} className="not-italic font-normal tracking-tight pr-[0.06em]">
              {seg.content}
            </span>
          );
        }
        if (seg.type === 'sup') {
          return (
            <sup
              key={idx}
              className="text-[0.68em] leading-none -top-[0.45em] relative pl-[0.04em]"
            >
              <MathDisplay expression={seg.content} size="sm" className="!text-[1em] !leading-none" />
            </sup>
          );
        }
        if (seg.type === 'rad') {
          return (
            <span key={idx} className="not-italic font-normal pr-[0.03em]">
              √
            </span>
          );
        }
        if (seg.type === 'op') {
          return (
            <span key={idx} className="not-italic whitespace-pre">
              {seg.content}
            </span>
          );
        }
        return (
          <span key={idx} className="not-italic whitespace-pre-wrap">
            {seg.content}
          </span>
        );
      })}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Live Interactive Math Input Display with Tap-to-Position Cursor
// ---------------------------------------------------------------------------

interface MathInputDisplayProps {
  value: string;
  cursorPos: number;
  onCursorChange: (pos: number) => void;
  placeholder?: string;
  active?: boolean;
}

function formatGlyph(ch: string): { text: string; italic: boolean } {
  if (ch === '-') return { text: '−', italic: false };
  if (ch === '*') return { text: '·', italic: false };
  if (/[a-zA-Z]/.test(ch)) return { text: ch, italic: true };
  if ('πλθ'.includes(ch)) return { text: ch, italic: true };
  return { text: ch, italic: false };
}

export const MathInputDisplay: React.FC<MathInputDisplayProps> = ({
  value,
  cursorPos,
  onCursorChange,
  placeholder = 'Write your next line…',
  active = true,
}) => {
  const chars = Array.from(value);

  // Detect function word spans so "sin", "cos", "ln", "sqrt" render upright
  const uprightIndices = new Set<number>();
  const wordRegex = /\b(sqrt|sin|cos|tan|sec|csc|cot|ln|log|exp|abs)\b/g;
  let m: RegExpExecArray | null;
  while ((m = wordRegex.exec(value)) !== null) {
    for (let k = m.index; k < m.index + m[0].length; k++) {
      uprightIndices.add(k);
    }
  }

  return (
    <div
      role="textbox"
      aria-label="Math line input"
      onClick={() => onCursorChange(value.length)}
      className="min-h-[44px] w-full flex flex-wrap items-center font-serif text-[22px] sm:text-[24px] leading-snug text-ink cursor-text select-none py-1"
    >
      {chars.length === 0 ? (
        <span className="inline-flex items-center">
          {active && (
            <span
              aria-hidden="true"
              className="math-caret inline-block w-[2px] h-[26px] bg-forest mr-1.5 rounded-full"
            />
          )}
          <span className="font-sans text-[15px] text-ink-subtle font-normal">
            {placeholder}
          </span>
        </span>
      ) : (
        <>
          {chars.map((ch, idx) => {
            const glyph = formatGlyph(ch);
            const isUpright = uprightIndices.has(idx) || !glyph.italic;
            const displayChar = ch === ' ' ? '\u00A0' : glyph.text;
            const showCaretBefore = active && cursorPos === idx;

            // Gentle visual spacing around = and binary operators
            const isSpacedOp = '=<>≤≥±'.includes(ch);

            return (
              <React.Fragment key={idx}>
                {showCaretBefore && (
                  <span
                    aria-hidden="true"
                    className="math-caret inline-block w-[2px] h-[26px] bg-forest -mx-[1px] rounded-full"
                  />
                )}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickedRightHalf = e.clientX > rect.left + rect.width / 2;
                    onCursorChange(clickedRightHalf ? idx + 1 : idx);
                  }}
                  className={`inline-block transition-colors ${
                    isUpright ? 'not-italic' : 'italic pr-[0.03em]'
                  } ${isSpacedOp ? 'px-1.5' : ''}`}
                >
                  {displayChar}
                </span>
              </React.Fragment>
            );
          })}
          {active && cursorPos >= chars.length && (
            <span
              aria-hidden="true"
              className="math-caret inline-block w-[2px] h-[26px] bg-forest ml-[1px] rounded-full"
            />
          )}
        </>
      )}
    </div>
  );
};
