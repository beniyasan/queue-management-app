import React from 'react';
import { SetupForm } from './components/SetupForm';
import { ManagementSettings } from './components/ManagementSettings';
import { DndManager } from './components/DndManager';
import { mountIfPresent } from './utils/mount';
import { hideLegacyControls } from './utils/legacy';

// expose live setup values for host to consume safely
(function exposeSetupGetter(){
  const obj: any = {};
  (window as any).getSetupValues = () => obj.values || null;
  (window as any).setSetupValues = (v: any) => { obj.values = v; };
})();

export function init() {
  mountIfPresent('setupFormMount', <SetupForm />);

  // Hide legacy form controls to avoid duplicate UI, but keep them in DOM for compatibility
  hideLegacyControls([
    'masterName',
    'partySize',
    'rotationCount',
    'approvalRequired',
    'currentPartySize',
    'currentRotationCount',
    'currentRegistrationMode',
  ]);
}

export function mountManagement() {
  mountIfPresent('managementSettingsMount', <ManagementSettings />);
}

export function initDnd() {
  mountIfPresent('dndMount', <DndManager />);
}

// Keep the global override aligned with current behavior
// Expose mounting helpers to window.FormsMount (index.html checks existence for optional features)
const existingMounts = (window as any).FormsMount || {};
(window as any).FormsMount = { ...existingMounts, init, initDnd, mountManagement };
