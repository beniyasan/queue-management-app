import React from 'react';
import { Box, Inline } from '@atlaskit/primitives';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { createPortal } from 'react-dom';
import { User } from '../types';

const DRAGGABLE_PORTAL_ID = 'rbd-portal';

const getAppState = () => {
  try {
    return (window as any).getAppState?.();
  } catch {
    return null;
  }
};

const normalizeUsers = (users?: any[]): User[] => (users || []).map((u) => ({ id: u.id, name: u.name, isFixed: !!u.isFixed }));

const hideLegacyList = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  const section = element.closest('.queue-section') as HTMLElement | null;
  (section || element).style.display = 'none';
};

const ensureDraggablePortal = (node: React.ReactNode) => {
  try {
    let portal = document.getElementById(DRAGGABLE_PORTAL_ID);
    if (!portal) {
      portal = document.createElement('div');
      portal.id = DRAGGABLE_PORTAL_ID;
      document.body.appendChild(portal);
    }
    return createPortal(node, portal);
  } catch {
    return node;
  }
};

const computePreview = (party: User[], queue: User[], rotationCount: number) => {
  try {
    const rotatable = party.filter((user) => !user.isFixed);
    const rotationAmount = Math.min(rotationCount || 1, rotatable.length);
    const available = Math.min(queue.length, rotationAmount);
    if (available <= 0) return { inIds: new Set<number>(), outIds: new Set<number>() };
    const nextLeaving = rotatable.slice(0, available);
    const nextJoining = queue.slice(0, available);
    return {
      inIds: new Set<number>(nextJoining.map((u) => u.id)),
      outIds: new Set<number>(nextLeaving.map((u) => u.id)),
    };
  } catch {
    return { inIds: new Set<number>(), outIds: new Set<number>() };
  }
};

function useInitialUsers() {
  const initialAppState = React.useMemo(() => getAppState(), []);
  const [party, setParty] = React.useState<User[]>(() => normalizeUsers(initialAppState?.party));
  const [queue, setQueue] = React.useState<User[]>(() => normalizeUsers(initialAppState?.queue));

  React.useEffect(() => {
    (window as any).useAtlaskitDnd = true;
    hideLegacyList('partyList');
    hideLegacyList('queueList');
  }, []);

  React.useEffect(() => {
    const refreshFromAppState = (state = getAppState()) => {
      if (!state) return;
      setParty(normalizeUsers(state.party));
      setQueue(normalizeUsers(state.queue));
    };

    (window as any).refreshDnd = () => refreshFromAppState();
    return () => {
      try {
        delete (window as any).refreshDnd;
      } catch {}
    };
  }, []);

  return { party, setParty, queue, setQueue } as const;
}

export function DndManager() {
  const { party, setParty, queue, setQueue } = useInitialUsers();

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const cloneUsers = (list: User[]) => list.map((user) => ({ ...user }));
    const newParty = cloneUsers(party);
    const newQueue = cloneUsers(queue);

    const partySize = getAppState()?.partySize ?? newParty.length;

    const moveWithin = (arr: User[], from: number, to: number) => {
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
    };

    const moveBetween = (fromArr: User[], toArr: User[], from: number, to: number) => {
      const [item] = fromArr.splice(from, 1);
      toArr.splice(to, 0, item);
    };

    const isMovingWithin = source.droppableId === destination.droppableId;
    if (isMovingWithin) {
      const targetArr = source.droppableId === 'party' ? newParty : newQueue;
      moveWithin(targetArr, source.index, destination.index);
    } else if (source.droppableId === 'party' && destination.droppableId === 'queue') {
      const movedUser = newParty[source.index];
      if (movedUser?.isFixed) return;
      moveBetween(newParty, newQueue, source.index, destination.index);
    } else if (source.droppableId === 'queue' && destination.droppableId === 'party') {
      if (newParty.length >= partySize) {
        try {
          (window as any).showFlag?.('パーティーが満員のため移動できません', 'warning');
        } catch {}
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

  const rotationCount = getAppState()?.rotationCount ?? 1;

  const preview = React.useMemo(
    () => computePreview(party, queue, rotationCount),
    [party, queue, rotationCount],
  );

  const renderList = (id: 'party' | 'queue', items: User[]) => (
    <Droppable
      droppableId={id}
      renderClone={(provided, _snapshot, rubric) => {
        const srcItems = id === 'party' ? party : queue;
        const u = srcItems[rubric.source.index];
        const node = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              background: 'var(--ads-color-surface)',
              border: '1px solid var(--ads-color-border)',
              borderRadius: 8,
              padding: 10,
              marginBottom: 8,
              boxShadow: 'var(--ads-elevation-shadow)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              ...provided.draggableProps.style,
            }}
          >
            <span>
              {u?.name}
              {u?.isFixed ? ' 👑' : ''}
              {u?.isFixed ? (
                <span className="lozenge loz-fixed" style={{ marginLeft: 8 }}>
                  固定
                </span>
              ) : null}
              {id === 'party' && u && preview.outIds.has(u.id) ? (
                <span className="lozenge loz-out" style={{ marginLeft: 8 }}>
                  次に退出
                </span>
              ) : null}
              {id === 'queue' && u && preview.inIds.has(u.id) ? (
                <span className="lozenge loz-in" style={{ marginLeft: 8 }}>
                  次に参加
                </span>
              ) : null}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#6B778C', fontSize: 12 }}>
                {id === 'party' ? rubric.source.index + 1 : `待機${rubric.source.index + 1}`}
              </span>
            </span>
          </div>
        );

        return ensureDraggablePortal(node);
      }}
    >
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {items.map((u, idx) => (
            <Draggable key={u.id} draggableId={`${id}-${u.id}`} index={idx} isDragDisabled={id === 'party' && !!u.isFixed}>
              {(prov) => (
                <div
                  ref={prov.innerRef}
                  {...prov.draggableProps}
                  {...prov.dragHandleProps}
                  style={{
                    background: 'var(--ads-color-surface)',
                    border: '1px solid var(--ads-color-border)',
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 8,
                    boxShadow: 'var(--ads-elevation-shadow)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    ...prov.draggableProps.style,
                  }}
                >
                  <span>
                    {u.name}
                    {u.isFixed ? ' 👑' : ''}
                    {u.isFixed ? (
                      <span className="lozenge loz-fixed" style={{ marginLeft: 8 }}>
                        固定
                      </span>
                    ) : null}
                    {id === 'party' && preview.outIds.has(u.id) ? (
                      <span className="lozenge loz-out" style={{ marginLeft: 8 }}>
                        次に退出
                      </span>
                    ) : null}
                    {id === 'queue' && preview.inIds.has(u.id) ? (
                      <span className="lozenge loz-in" style={{ marginLeft: 8 }}>
                        次に参加
                      </span>
                    ) : null}
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
                            onClick={() => {
                              try {
                                (window as any).toggleUserFixed && (window as any).toggleUserFixed(u.id);
                              } catch {}
                            }}
                          >
                            {u.isFixed ? '固定解除' : '固定'}
                          </button>
                          {!u.isFixed && (
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: '0.8em', padding: '6px 12px' }}
                              aria-label="削除"
                              title="削除"
                              onClick={() => {
                                try {
                                  (window as any).removeUser && (window as any).removeUser(u.id, true);
                                } catch {}
                              }}
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
                        onClick={() => {
                          try {
                            (window as any).removeUser && (window as any).removeUser(u.id, false);
                          } catch {}
                        }}
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

