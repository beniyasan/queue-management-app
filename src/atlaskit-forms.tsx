import React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import Textfield from '@atlaskit/textfield';
import Select from '@atlaskit/select';
import Checkbox from '@atlaskit/checkbox';
import { Box, Stack, Inline } from '@atlaskit/primitives';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

function SetupForm() {
  const [masterName, setMasterName] = React.useState<string>('');
  const [partySize, setPartySize] = React.useState<number>(5);
  // rotation count is fixed to 1 at setup; selector removed
  const [approval, setApproval] = React.useState<boolean>(false);

  React.useEffect(() => {
    const nameEl = document.getElementById('masterName') as HTMLInputElement | null;
    if (nameEl) setMasterName(nameEl.value || '');
    const ps = document.getElementById('partySize') as HTMLSelectElement | null;
    if (ps) setPartySize(parseInt(ps.value, 10));
    // rotation count no-op
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
  // rotation count no-op
  React.useEffect(() => {
    const ap = document.getElementById('approvalRequired') as HTMLInputElement | null;
    if (ap) ap.checked = approval;
  }, [approval]);

  const partyOptions = [2,3,4,5,6,7,8,9,10].map(v => ({ label: `${v}人パーティー`, value: v }));
  // rotation options removed for setup

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
          <Textfield id="ak-masterName" placeholder="主ユーザーの名前を入力 (省略可)" value={masterName} onChange={(e) => setMasterName((e.target as HTMLInputElement).value)} />
        </Box>
        <Inline space="space.200">
          <Box>
            <label>パーティー人数</label>
            <Select inputId="ak-partySize" options={partyOptions} value={partyOptions.find(o => o.value === partySize) as any} onChange={(opt: any) => setPartySize(opt?.value)} />
          </Box>
          {/* 交代人数の選択は初回画面では非表示（デフォルト1人） */}
        </Inline>
        <Box>
          <Checkbox label="参加登録に承認が必要" isChecked={approval} onChange={() => setApproval(v => !v)} />
        </Box>
      </Stack>
    </Box>
  );
}

// expose live setup values for host to consume safely
(function exposeSetupGetter(){
  const obj: any = {};
  (window as any).getSetupValues = () => obj.values || null;
  (window as any).setSetupValues = (v: any) => { obj.values = v; };
})();

function ManagementSettings() {
  const [partySize, setPartySize] = React.useState<number>(5);
  const [rotationCount, setRotationCount] = React.useState<number>(1);
  const [mode, setMode] = React.useState<'disabled'|'direct'|'approval'>('disabled');
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
      // hide legacy sections entirely to avoid duplicate headings
      const hideSection = (el: HTMLElement | null) => {
        if (!el) return;
        const section = el.closest('.queue-section') as HTMLElement | null;
        if (section) section.style.display = 'none'; else el.style.display = 'none';
      };
      hideSection(partyList as HTMLElement | null);
      hideSection(queueList as HTMLElement | null);
    } catch {}
  }, []);

  // allow host to refresh lists after external changes
  React.useEffect(() => {
    (window as any).refreshDnd = () => {
      const s = (window as any).getAppState ? (window as any).getAppState() : null;
      if (!s) return;
      setParty((s.party || []).map((x: any) => ({ id: x.id, name: x.name, isFixed: !!x.isFixed })));
      setQueue((s.queue || []).map((x: any) => ({ id: x.id, name: x.name, isFixed: !!x.isFixed })));
    };
    return () => { try { delete (window as any).refreshDnd; } catch {} };
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const clone = (arr: User[]) => arr.map(x => ({ ...x }));
    let newParty = clone(party);
    let newQueue = clone(queue);

    // party size constraint from host state (fallback to current length)
    const partySize = (() => {
      try { return (window as any).getAppState ? (window as any).getAppState().partySize : newParty.length; } catch { return newParty.length; }
    })();

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
      // prevent exceeding party capacity
      if (newParty.length >= partySize) {
        try { (window as any).showFlag && (window as any).showFlag('パーティーが満員のため移動できません', 'warning'); } catch {}
        return;
      }
      moveBetween(newQueue, newParty, source.index, destination.index);
    }

    setParty(newParty);
    setQueue(newQueue);
    if ((window as any).applyDnD) {
      await (window as any).applyDnD(newParty, newQueue);
    }
  };

  // compute preview (next in/out)
  const rotationCount = (() => {
    try { return (window as any).getAppState ? (window as any).getAppState().rotationCount : 1; } catch { return 1; }
  })();
  const preview = React.useMemo(() => {
    try {
      const rotatable = party.filter(u => !u.isFixed);
      const rotationAmount = Math.min(rotationCount || 1, rotatable.length);
      const available = Math.min(queue.length, rotationAmount);
      if (available <= 0) return { inIds: new Set<number>(), outIds: new Set<number>() };
      const nextLeaving = rotatable.slice(0, available);
      const nextJoining = queue.slice(0, available);
      return {
        inIds: new Set<number>(nextJoining.map(u => u.id)),
        outIds: new Set<number>(nextLeaving.map(u => u.id)),
      };
    } catch { return { inIds: new Set<number>(), outIds: new Set<number>() }; }
  }, [party, queue, rotationCount]);

  const renderList = (id: 'party'|'queue', items: User[]) => (
    <Droppable
      droppableId={id}
      renderClone={(provided, snapshot, rubric) => {
        const srcItems = id === 'party' ? party : queue;
        const u = srcItems[rubric.source.index];
        const node = (
          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{
            background: 'var(--ads-color-surface)', border: '1px solid var(--ads-color-border)', borderRadius: 8,
            padding: 10, marginBottom: 8, boxShadow: 'var(--ads-elevation-shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            ...provided.draggableProps.style
          }}>
            <span>
              {u?.name}{u?.isFixed ? ' 👑' : ''}
              {u?.isFixed ? <span className="lozenge loz-fixed" style={{ marginLeft: 8 }}>固定</span> : null}
              {id === 'party' && u && preview.outIds.has(u.id) ? <span className="lozenge loz-out" style={{ marginLeft: 8 }}>次に退出</span> : null}
              {id === 'queue' && u && preview.inIds.has(u.id) ? <span className="lozenge loz-in" style={{ marginLeft: 8 }}>次に参加</span> : null}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#6B778C', fontSize: 12 }}>{id === 'party' ? (rubric.source.index + 1) : `待機${rubric.source.index + 1}`}</span>
            </span>
          </div>
        );
        try {
          const portalId = 'rbd-portal';
          let portal = document.getElementById(portalId);
          if (!portal) {
            portal = document.createElement('div');
            portal.id = portalId;
            document.body.appendChild(portal);
          }
          return createPortal(node, portal);
        } catch {
          return node;
        }
      }}
    >
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {items.map((u, idx) => (
            <Draggable key={u.id} draggableId={`${id}-${u.id}`} index={idx} isDragDisabled={id==='party' && !!u.isFixed}>
              {(prov) => (
                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} style={{
                  background: 'var(--ads-color-surface)', border: '1px solid var(--ads-color-border)', borderRadius: 8,
                  padding: 10, marginBottom: 8, boxShadow: 'var(--ads-elevation-shadow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  ...prov.draggableProps.style
                }}>
                  <span>
                    {u.name}{u.isFixed ? ' 👑' : ''}
                    {u.isFixed ? <span className="lozenge loz-fixed" style={{ marginLeft: 8 }}>固定</span> : null}
                    {id === 'party' && preview.outIds.has(u.id) ? <span className="lozenge loz-out" style={{ marginLeft: 8 }}>次に退出</span> : null}
                    {id === 'queue' && preview.inIds.has(u.id) ? <span className="lozenge loz-in" style={{ marginLeft: 8 }}>次に参加</span> : null}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#6B778C', fontSize: 12 }}>{id === 'party' ? idx + 1 : `待機${idx + 1}`}</span>
                    {id === 'party' ? (
                      u.id === 0 ? (
                        <span className="hint">主（固定）</span>
                      ) : (
                        <>
                          <button
                            className={`btn ${u.isFixed ? 'btn-warning' : ''}`}
                            style={{ fontSize: '0.8em', padding: '6px 12px' }}
                            aria-label={u.isFixed ? '固定解除' : '固定'}
                            title={u.isFixed ? '固定解除' : '固定'}
                            onClick={() => { try { (window as any).toggleUserFixed && (window as any).toggleUserFixed(u.id); } catch {} }}
                          >
                            {u.isFixed ? '固定解除' : '固定'}
                          </button>
                          {!u.isFixed && (
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: '0.8em', padding: '6px 12px' }}
                              aria-label="削除"
                              title="削除"
                              onClick={() => { try { (window as any).removeUser && (window as any).removeUser(u.id, true); } catch {} }}
                            >
                              削除
                            </button>
                          )}
                        </>
                      )
                    ) : (
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: '0.8em', padding: '6px 12px' }}
                        aria-label="削除"
                        title="削除"
                        onClick={() => { try { (window as any).removeUser && (window as any).removeUser(u.id, false); } catch {} }}
                      >
                        削除
                      </button>
                    )}
                  </span>
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
