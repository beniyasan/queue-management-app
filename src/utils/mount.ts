import { createRoot } from 'react-dom/client';
import React from 'react';

export function mountIfPresent(id: string, node: React.ReactNode) {
  const el = document.getElementById(id);
  if (!el) return;
  const root = createRoot(el);
  root.render(node);
}

