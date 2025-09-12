import React from 'react';
import { createRoot } from 'react-dom/client';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Checkbox from '@atlaskit/checkbox';
import { Box, Stack, Inline } from '@atlaskit/primitives';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

function SetupForm() {
  const [masterName, setMasterName] = React.useState<string>('');
  const [partySize, setPartySize] = React.useState<number>(5);
  const [rotationCount, setRotationCount] = React.useState<number>(1);
  const [approval, setApproval] = React.useState<boolean>(false);

  React.useEffect(() => {
    const nameEl = document.getElementById('masterName') as HTMLInputElement | null;
    if (nameEl) setMasterName(nameEl.value || '');
    const ps = document.getElementById('partySize') as HTMLSelectElement | null;
    if (ps) setPartySize(parseInt(ps.value, 10));
    const rc = document.getElementById('rotationCount') as HTMLSelectElement | null;
    if (rc) setRotationCount(parseInt(rc.value, 10));
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
    // trigger existing onchange
    (window as any).updateRotationOptions && (window as any).updateRotationOptions();
  }, [partySize]);
  React.useEffect(() => {
    const rc = document.getElementById('rotationCount') as HTMLSelectElement | null;
    if (rc) rc.value = String(rotationCount);
  }, [rotationCount]);
  React.useEffect(() => {
    const ap = document.getElementById('approvalRequired') as HTMLInputElement | null;
    if (ap) ap.checked = approval;
  }, [approval]);

  const partyOptions = [2,3,4,5,6,7,8,9,10].map(v => ({ label: `${v}人パーティー`, value: v }));
  const rotationOptions = [1,2,3].map(v => ({ label: `${v}人ずつ交代`, value: v }));

  return (
    <Box>
      <Stack space="space.200">
        <Box>
          <label htmlFor="ak-masterName">主ユーザーの名前</label>
          <Textfield id="ak-masterName" placeholder="主ユーザーの名前を入力 (省略可)" value={masterName} onChange={(e) => setMasterName((e.target as HTMLInputElement).value)} />
        </Box>
        <Inline space="space.200">
          <Box>
            <label>パーティー人数</label>
            <Select inputId="ak-partySize" options={partyOptions} value={partyOptions.find(o => o.value === partySize) as any} onChange={(opt: any) => setPartySize(opt?.value)} />
          </Box>
          <Box>
            <label>交代人数</label>
            <Select inputId="ak-rotationCount" options={rotationOptions} value={rotationOptions.find(o => o.value === rotationCount) as any} onChange={(opt: any) => setRotationCount(opt?.value)} />
          </Box>
        </Inline>
        <Box>
          <Checkbox label="参加登録に承認が必要" isChecked={approval} onChange={() => setApproval(v => !v)} />
        </Box>
      </Stack>
    </Box>
  );
}

function ManagementSettings() {
  const [partySize, setPartySize] = React.useState<number>(5);
  const [rotationCount, setRotationCount] = React.useState<number>(1);
  const [mode, setMode] = React.useState<'disabled'|'direct'|'approval'>('disabled');

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
      (window as any).updatePartySize && (window as any).updatePartySize();
    }
  }, [partySize]);
  React.useEffect(() => {
    const rc = document.getElementById('currentRotationCount') as HTMLSelectElement | null;
    if (rc) {
      rc.value = String(rotationCount);
      (window as any).updateRotationCount && (window as any).updateRotationCount();
    }
  }, [rotationCount]);
  React.useEffect(() => {
    const rm = document.getElementById('currentRegistrationMode') as HTMLSelectElement | null;
    if (rm) {
      rm.value = mode;
      (window as any).updateRegistrationMode && (window as any).updateRegistrationMode();
    }
  }, [mode]);

  const partyOptions = [2,3,4,5,6,7,8,9,10].map(v => ({ label: `${v}人パーティー`, value: v }));
  const rotationOptions = [1,2,3].map(v => ({ label: `${v}人ずつ交代`, value: v }));
  const modes = [
    { label: '登録無効', value: 'disabled' },
    { label: '自由参加', value: 'direct' },
    { label: '承認制', value: 'approval' },
  ];

  return (
    <Inline space="space.200">
      <Box>
        <label>パーティー人数</label>
        <Select inputId="ak-currentPartySize" options={partyOptions} value={partyOptions.find(o => o.value === partySize) as any} onChange={(opt: any) => setPartySize(opt?.value)} />
      </Box>
      <Box>
        <label>交代人数</label>
        <Select inputId="ak-currentRotationCount" options={rotationOptions} value={rotationOptions.find(o => o.value === rotationCount) as any} onChange={(opt: any) => setRotationCount(opt?.value)} />
      </Box>
      <Box>
        <label>閲覧者の参加登録</label>
        <Select inputId="ak-currentRegistrationMode" options={modes as any} value={(modes as any).find((o: any) => o.value === mode)} onChange={(opt: any) => setMode(opt?.value)} />
      </Box>
    </Inline>
  );
}

function mountIfPresent(id: string, node: React.ReactNode) {
  const el = document.getElementById(id);
  if (!el) return;
  const root = createRoot(el);
  root.render(node);
}

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

type User = { id: number; name: string; isFixed?: boolean };

function DndManager() {
  const initialParty: User[] = (window as any).getAppState ? (window as any).getAppState().party : [];
  const initialQueue: User[] = (window as any).getAppState ? (window as any).getAppState().queue : [];
  const [party, setParty] = React.useState<User[]>(initialParty);
  const [queue, setQueue] = React.useState<User[]>(initialQueue);

  React.useEffect(() => {
    (window as any).useAtlaskitDnd = true;
    try {
      const partyList = document.getElementById('partyList');
      const queueList = document.getElementById('queueList');
      if (partyList) partyList.style.display = 'none';
      if (queueList) queueList.style.display = 'none';
    } catch {}
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const clone = (arr: User[]) => arr.map(x => ({ ...x }));
    let newParty = clone(party);
    let newQueue = clone(queue);

    const moveWithin = (arr: User[], from: number, to: number) => {
      const item = arr.splice(from, 1)[0];
      arr.splice(to, 0, item);
    };
    const moveBetween = (fromArr: User[], toArr: User[], from: number, to: number) => {
      const item = fromArr.splice(from, 1)[0];
      toArr.splice(to, 0, item);
    };

    if (source.droppableId === 'party' && destination.droppableId === 'party') {
      moveWithin(newParty, source.index, destination.index);
    } else if (source.droppableId === 'queue' && destination.droppableId === 'queue') {
      moveWithin(newQueue, source.index, destination.index);
    } else if (source.droppableId === 'party' && destination.droppableId === 'queue') {
      // prevent moving fixed
      const u = newParty[source.index];
      if (u && u.isFixed) return;
      moveBetween(newParty, newQueue, source.index, destination.index);
    } else if (source.droppableId === 'queue' && destination.droppableId === 'party') {
      moveBetween(newQueue, newParty, source.index, destination.index);
    }

    setParty(newParty);
    setQueue(newQueue);
    if ((window as any).applyDnD) {
      await (window as any).applyDnD(newParty, newQueue);
    }
  };

  const renderList = (id: 'party'|'queue', items: User[]) => (
    <Droppable droppableId={id}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {items.map((u, idx) => (
            <Draggable key={u.id} draggableId={`${id}-${u.id}`} index={idx}>
              {(prov) => (
                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} style={{
                  background: 'var(--ads-color-surface)', border: '1px solid var(--ads-color-border)', borderRadius: 8,
                  padding: 10, marginBottom: 8, boxShadow: 'var(--ads-elevation-shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  ...prov.draggableProps.style
                }}>
                  <span>{u.name}{u.isFixed ? ' 👑' : ''}</span>
                  <span style={{ color: '#6B778C', fontSize: 12 }}>{id === 'party' ? idx + 1 : `待機${idx + 1}`}</span>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Inline space="space.200">
        <Box style={{ minWidth: 280 }}>
          <h3>🎮 パーティー参加者</h3>
          {renderList('party', party)}
        </Box>
        <Box style={{ minWidth: 280 }}>
          <h3>⏳ キュー待機者</h3>
          {renderList('queue', queue)}
        </Box>
      </Inline>
    </DragDropContext>
  );
}

export function initDnd() {
  const mount = document.getElementById('dndMount');
  if (!mount) return;
  const root = createRoot(mount);
  root.render(<DndManager />);
}

(window as any).FormsMount = { init, initDnd, mountManagement };

// Expose init on window for non-module script
(window as any).FormsMount = { init };
