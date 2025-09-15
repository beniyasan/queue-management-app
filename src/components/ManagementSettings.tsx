import React from 'react';
import Select from '@atlaskit/select';
import { Box, Inline } from '@atlaskit/primitives';

export function ManagementSettings() {
  const [partySize, setPartySize] = React.useState<number>(5);
  const [rotationCount, setRotationCount] = React.useState<number>(1);
  const [mode, setMode] = React.useState<'disabled' | 'direct' | 'approval'>('disabled');
  const initedParty = React.useRef(false);
  const initedRotation = React.useRef(false);
  const initedMode = React.useRef(false);

  React.useEffect(() => {
    const ps = document.getElementById('currentPartySize') as HTMLSelectElement | null;
    if (ps) setPartySize(parseInt(ps.value, 10));
    const rc = document.getElementById('currentRotationCount') as HTMLSelectElement | null;
    if (rc) setRotationCount(parseInt(rc.value, 10));
    const rm = document.getElementById('currentRegistrationMode') as HTMLSelectElement | null;
    if (rm) setMode((rm.value as any) || 'disabled');
  }, []);

  React.useEffect(() => {
    const ps = document.getElementById('currentPartySize') as HTMLSelectElement | null;
    if (ps) {
      ps.value = String(partySize);
      if (initedParty.current) {
        (window as any).updatePartySize && (window as any).updatePartySize();
      } else {
        initedParty.current = true;
      }
    }
  }, [partySize]);

  React.useEffect(() => {
    const rc = document.getElementById('currentRotationCount') as HTMLSelectElement | null;
    if (rc) {
      rc.value = String(rotationCount);
      if (initedRotation.current) {
        (window as any).updateRotationCount && (window as any).updateRotationCount();
      } else {
        initedRotation.current = true;
      }
    }
  }, [rotationCount]);

  React.useEffect(() => {
    const rm = document.getElementById('currentRegistrationMode') as HTMLSelectElement | null;
    if (rm) {
      rm.value = mode;
      if (initedMode.current) {
        (window as any).updateRegistrationMode && (window as any).updateRegistrationMode();
      } else {
        initedMode.current = true;
      }
    }
  }, [mode]);

  const partyOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => ({ label: `${v}人パーティー`, value: v }));
  const rotationOptions = [1, 2, 3].map((v) => ({ label: `${v}人ずつ交代`, value: v }));
  const modes = [
    { label: '登録無効', value: 'disabled' },
    { label: '自由参加', value: 'direct' },
    { label: '承認制', value: 'approval' },
  ];

  return (
    <Inline space="space.200">
      <Box>
        <label>パーティー人数</label>
        <Select
          inputId="ak-currentPartySize"
          options={partyOptions}
          value={partyOptions.find((o) => o.value === partySize) as any}
          onChange={(opt: any) => setPartySize(opt?.value)}
        />
      </Box>
      <Box>
        <label>交代人数</label>
        <Select
          inputId="ak-currentRotationCount"
          options={rotationOptions}
          value={rotationOptions.find((o) => o.value === rotationCount) as any}
          onChange={(opt: any) => setRotationCount(opt?.value)}
        />
      </Box>
      <Box>
        <label>閲覧者の参加登録</label>
        <Select
          inputId="ak-currentRegistrationMode"
          options={modes as any}
          value={(modes as any).find((o: any) => o.value === mode)}
          onChange={(opt: any) => setMode(opt?.value)}
        />
      </Box>
    </Inline>
  );
}

