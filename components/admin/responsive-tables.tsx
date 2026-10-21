'use client';
import { useEffect } from 'react';

export function ResponsiveTables() {
  useEffect(() => {
    let frame = 0;
    const label = () => {
      frame = 0;
      for (const table of document.querySelectorAll<HTMLTableElement>('table.admin-table:not(.admin-skeleton-table)')) {
        const headers: string[] = [];
        for (const th of table.querySelectorAll('thead tr:first-child th')) {
          const text = (th.textContent ?? '').trim();
          for (let i = 0; i < (th as HTMLTableCellElement).colSpan; i++) headers.push(text);
        }
        if (!headers.length) continue;
        for (const row of table.querySelectorAll('tbody tr')) {
          let col = 0;
          for (const cell of (row as HTMLTableRowElement).cells) {
            const text = headers[col] ?? '';
            if (cell.dataset.label !== text) cell.dataset.label = text;
            col += cell.colSpan;
          }
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(label);
    };
    label();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
