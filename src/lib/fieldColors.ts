/**
 * Central Reusable Field Color System
 *
 * Visual Standard:
 * - Auto-populated / system-filled: Light Blue (#FDE7E6)
 * - Normal manual input: White (#FFFFFF)
 * - Mandatory / required: Light Red (#FDE7E6)
 *
 * Priority Rule:
 * Mandatory (Light Red) takes precedence if a field is both mandatory and auto-populated.
 */

export const FIELD_COLORS = {
  AUTO: '#FDE7E6',
  MANDATORY: '#FDE7E6',
  MANUAL: '#FFFFFF',
} as const;

export const FIELD_BORDER_COLORS = {
  AUTO: '#BFDBFE',
  MANDATORY: '#FCA5A5',
  MANUAL: '#D1D5DB',
} as const;

export const FIELD_TEXT_COLORS = {
  AUTO: '#1E3A8A',
  MANDATORY: '#1F2937',
  MANUAL: '#1F2937',
} as const;

export interface FieldColorOptions {
  isRequired?: boolean;
  isAutoPopulated?: boolean;
  disabled?: boolean;
  isInvalid?: boolean;
  compact?: boolean;
  className?: string;
}

export function getFieldColorType({
  isRequired = false,
  isAutoPopulated = false,
}: {
  isRequired?: boolean;
  isAutoPopulated?: boolean;
}): 'mandatory' | 'auto' | 'manual' {
  if (isRequired) return 'mandatory';
  if (isAutoPopulated) return 'auto';
  return 'manual';
}

export function getFieldBackgroundColor({
  isRequired = false,
  isAutoPopulated = false,
}: {
  isRequired?: boolean;
  isAutoPopulated?: boolean;
}): string {
  if (isRequired) return FIELD_COLORS.MANDATORY;
  if (isAutoPopulated) return FIELD_COLORS.AUTO;
  return FIELD_COLORS.MANUAL;
}

export function getFieldClasses({
  isRequired = false,
  isAutoPopulated = false,
  disabled = false,
  isInvalid = false,
  compact = false,
  className = '',
}: FieldColorOptions): string {
  const baseClasses = 'outline-none transition-all shadow-2xs font-semibold';
  
  if (isInvalid) {
    return `${baseClasses} bg-[#FDE7E6] border-2 border-rose-500 text-slate-900 ring-2 ring-rose-200 placeholder:text-rose-400 ${className}`;
  }

  // Priority 1: Mandatory / Required -> Light Red (#FDE7E6)
  if (isRequired) {
    const sizeClasses = compact ? 'rounded-lg px-2.5 py-1 text-xs' : 'rounded-xl px-3.5 py-2 text-xs';
    return `${baseClasses} ${sizeClasses} bg-[#FDE7E6] border-2 border-rose-300 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 placeholder:text-rose-400/70 ${
      disabled ? 'cursor-not-allowed opacity-90' : ''
    } ${className}`;
  }

  // Priority 2: Auto-populated -> Light Blue (#FDE7E6)
  if (isAutoPopulated) {
    const sizeClasses = compact ? 'rounded-lg px-2.5 py-1 text-xs font-bold' : 'rounded-xl px-3.5 py-2 text-xs font-bold';
    return `${baseClasses} ${sizeClasses} bg-[#FDE7E6] border border-sky-300 text-sky-950 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 placeholder:text-sky-400 ${
      disabled ? 'cursor-default' : ''
    } ${className}`;
  }

  // Priority 3: Normal Manual -> White (#FFFFFF)
  const sizeClasses = compact ? 'rounded-lg px-2.5 py-1 text-xs' : 'rounded-xl px-3.5 py-2 text-xs';
  return `${baseClasses} ${sizeClasses} bg-white border border-[#FBCFCB] text-slate-800 focus:border-[#FBCFCB] focus:ring-2 focus:ring-[#FBCFCB]/20 placeholder:text-slate-400 ${
    disabled ? 'bg-slate-50 cursor-not-allowed opacity-80' : ''
  } ${className}`;
}

export const CLASS_FIELD_AUTO = 'bg-[#FDE7E6] border border-sky-300 text-sky-950 font-bold';
export const CLASS_FIELD_MANDATORY = 'bg-[#FDE7E6] border-2 border-rose-300 text-slate-900 font-semibold';
export const CLASS_FIELD_MANUAL = 'bg-white border border-[#FBCFCB] text-slate-800 font-semibold';
