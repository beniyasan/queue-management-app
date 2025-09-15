import React from 'react';
import { SetupForm } from './components/SetupForm';
import { ManagementSettings } from './components/ManagementSettings';
import { DndManager } from './components/DndManager';
import { mountIfPresent } from './utils/mount';

// expose live setup values for host to consume safely
(function exposeSetupGetter(){
  const obj: any = {};
  (window as any).getSetupValues = () => obj.values || null;
  (window as any).setSetupValues = (v: any) => { obj.values = v; };
})();

export function init() {
  mountIfPresent('setupFormMount', <SetupForm />);

  // Hide legacy form controls to avoid duplicate UI, but keep them in DOM for compatibility
  try {
    document.body.classList.add('ak-mounted');
    const toHideIds = [
      'masterName',
      'partySize',
      'rotationCount',
      'approvalRequired',
      'currentPartySize',
      'currentRotationCount',
      'currentRegistrationMode',
    ];
    toHideIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        const group = el.closest('.form-group, .setting-group') as HTMLElement | null;
        if (group) {
          group.style.display = 'none';
          group.setAttribute('aria-hidden', 'true');
        } else {
          // as a fallback, hide the element itself
          (el as HTMLElement).style.display = 'none';
          el.setAttribute('aria-hidden', 'true');
        }
      }
    });
  } catch (e) {
    // no-op
  }
}

export function mountManagement() {
  mountIfPresent('managementSettingsMount', <ManagementSettings />);
}

export function initDnd() {
  mountIfPresent('dndMount', <DndManager />);
}

// Keep the global override aligned with current behavior
// Only expose init to window.FormsMount (index.html checks existence for optional features)
(window as any).FormsMount = { init };
