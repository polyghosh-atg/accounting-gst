'use client';

import { useEffect } from 'react';

export default function AutoPrint({ when }: { when: boolean }) {
  useEffect(() => {
    if (when) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [when]);
  return null;
}
