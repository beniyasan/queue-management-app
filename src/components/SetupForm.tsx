import React from 'react';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Checkbox from '@atlaskit/checkbox';
import { Box, Stack, Inline } from '@atlaskit/primitives';

export function SetupForm() {
  const [masterName, setMasterName] = React.useState<string>('');
  const [partySize, setPartySize] = React.useState<number>(5);
  const [approval, setApproval] = React.useState<boolean>(false);

  React.useEffect(() => {
    const nameEl = document.getElementById('masterName') as HTMLInputElement | null;
    if (nameEl) setMasterName(nameEl.value || '');
    const ps = document.getElementById('partySize') as HTMLSelectElement | null;
    if (ps) setPartySize(parseInt(ps.value, 10));
    const ap = document.getElementById('approvalRequired') as HTMLInputElement | null;
    if (ap) setApproval(ap.checked);
  }, []);

  // Sync back to existing DOM controls so current app logic continues to work.
  React.useEffect(() => {
    const nameEl = document.getElementById('masterName') as HTMLInputElement | null;
    if (nameEl) nameEl.value = masterName;
  }, [masterName]);

  React.useEffect(() => {
    const ps = document.getElementById('partySize') as HTMLSelectElement | null;
    if (ps) ps.value = String(partySize);
    (window as any).updateRotationOptions && (window as any).updateRotationOptions();
  }, [partySize]);

  React.useEffect(() => {
    const ap = document.getElementById('approvalRequired') as HTMLInputElement | null;
    if (ap) ap.checked = approval;
  }, [approval]);

  const partyOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => ({ label: `${v}人パーティー`, value: v }));

  // publish values for host (rotationCount fixed at 1)
  React.useEffect(() => {
    try {
      (window as any).setSetupValues && (window as any).setSetupValues({ masterName, partySize, approval });
    } catch {}
  }, [masterName, partySize, approval]);

  return (
    <Box>
      <Stack space="space.200">
        <Box>
          <label htmlFor="ak-masterName">主ユーザーの名前</label>
          <Textfield
            id="ak-masterName"
            placeholder="主ユーザーの名前を入力 (省略可)"
            value={masterName}
            onChange={(e) => setMasterName((e.target as HTMLInputElement).value)}
          />
        </Box>
        <Inline space="space.200">
          <Box>
            <label>パーティー人数</label>
            <Select
              inputId="ak-partySize"
              options={partyOptions}
              value={partyOptions.find((o) => o.value === partySize) as any}
              onChange={(opt: any) => setPartySize(opt?.value)}
            />
          </Box>
        </Inline>
        <Box>
          <Checkbox label="参加登録に承認が必要" isChecked={approval} onChange={() => setApproval((v) => !v)} />
        </Box>
      </Stack>
    </Box>
  );
}

