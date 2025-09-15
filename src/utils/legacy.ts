/**
 * Hide legacy DOM controls while keeping them in the document
 * so that the existing host JS can keep querying values if needed.
 */
export function hideLegacyControls(ids: string[]) {
  try {
    document.body.classList.add('ak-mounted');
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const group = el.closest('.form-group, .setting-group') as HTMLElement | null;
      if (group) {
        group.style.display = 'none';
        group.setAttribute('aria-hidden', 'true');
      } else {
        (el as HTMLElement).style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    });
  } catch {
    // no-op for environments without DOM
  }
}

