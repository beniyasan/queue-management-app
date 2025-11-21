import React from 'react';
import ReactDOM from 'react-dom/client';
import { ModernDashboard } from './components/ModernDashboard';
import './styles/modern.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ModernDashboard />
    </React.StrictMode>
);
