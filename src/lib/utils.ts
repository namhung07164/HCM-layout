import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function standardizeDateToMMDDYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // YYYY-MM-DD matches
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = str.split('-');
    return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
  }

  // Slash or dash combinations
  if (str.includes('/') || str.includes('-')) {
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      let m, d, y;

      if (parts[2].length === 4) {
        // Always enforce incoming as MM/DD/YYYY if year is last
        m = parts[0];
        d = parts[1];
        y = parts[2];
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD
        y = parts[0];
        m = parts[1];
        d = parts[2];
      }
      
      if (m && d && y) {
        return `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
      }
    }
  }

  return str;
}
