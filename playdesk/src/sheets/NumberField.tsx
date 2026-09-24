import { useState } from 'react';

interface NumberFieldProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Whole numbers only (rows, panels, call numbers). */
  integer?: boolean;
  onChange: (value: number) => void;
}

/**
 * A number box you can clear and retype. Valid values are applied as you type;
 * leaving the box empty or out of range puts the last good value back.
 */
export function NumberField({ value, min, max, step = 1, integer, onChange }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className="input"
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        if (text.trim() === '') return;
        const n = Number(text);
        if (Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n)))
          onChange(n);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}
