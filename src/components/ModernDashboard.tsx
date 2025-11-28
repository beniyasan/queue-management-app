import React, { useState } from 'react';

// Mock Data
const MOCK_QUEUE = [
    { id: '1', name: 'Alice', time: '10:30' },
    { id: '2', name: 'Bob', time: '10:32' },
    { id: '3', name: 'Charlie', time: '10:35' },
    { id: '4', name: 'David', time: '10:40' },
];

const MOCK_PARTY = [
    { id: 'p1', name: 'Master', isFixed: true },
    { id: 'p2', name: 'Eve', isFixed: false },
    { id: 'p3', name: 'Frank', isFixed: false },
    { id: 'p4', name: 'Grace', isFixed: false },
    { id: 'p5', name: 'Heidi', isFixed: false },
];

export const ModernDashboard: React.FC = () => {
    const [queue] = useState(MOCK_QUEUE);
    const [party] = useState(MOCK_PARTY);

    return (
        <div className="modern-container">
            <header className="modern-header glass-panel">
                <div className="brand">
                    <div className="brand-title">Queue Party</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Modern Beta Preview</div>
                </div>
                <div className="actions">
                    <a href="/" className="btn-outline" style={{ textDecoration: 'none', display: 'inline-block' }}>
                        ← Back to Legacy
                    </a>
                </div>
            </header>

            <div className="grid-layout">
                {/* Queue Section */}
                <section>
                    <h2 className="section-title">Waiting Queue ({queue.length})</h2>
                    <div className="glass-panel" style={{ padding: '20px', minHeight: '400px' }}>
                        {queue.map((user, index) => (
                            <div key={user.id} className="user-card">
                                <div>
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-meta">Joined at {user.time}</div>
                                </div>
                                <span className="badge badge-queue">#{index + 1}</span>
                            </div>
                        ))}
                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <button className="btn-modern" style={{ width: '100%' }}>+ Join Queue</button>
                        </div>
                    </div>
                </section>

                {/* Party Section */}
                <section>
                    <h2 className="section-title">Active Party ({party.length}/5)</h2>
                    <div className="glass-panel" style={{ padding: '20px', minHeight: '400px' }}>
                        {party.map((user) => (
                            <div key={user.id} className={`user-card active`}>
                                <div>
                                    <div className="user-name">{user.name}</div>
                                    <div className="user-meta">{user.isFixed ? 'Fixed Member' : 'Guest'}</div>
                                </div>
                                <span className="badge badge-party">Active</span>
                            </div>
                        ))}
                        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                            <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>Next Rotation</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-outline" style={{ flex: 1 }}>Rotate 1</button>
                                <button className="btn-outline" style={{ flex: 1 }}>Rotate 2</button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
