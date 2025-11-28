# Queue Party - Application Specification

## 1. Overview

**Queue Party** is a lightweight, real-time web application for managing party/queue rotations. It enables administrators to manage participants (add, remove, fix, rotate) while viewers can monitor the status in real-time. The UI is inspired by Atlassian Design System with React Islands (Atlaskit) for progressive enhancement.

### Key Use Cases
- Online gaming party management with rotation system
- Event queue management with real-time updates
- Any scenario requiring ordered participant rotation with live synchronization

## 2. Feature Highlights

### 2.1 Session Management
- **Session Creation/Sharing**: Separate URLs for administrators and viewers
- **Session Code**: Unique identifier for each session
- **Creator Token**: Secret token for administrator authentication

### 2.2 Participant Management
- **Add/Remove Participants**: Administrators can manage the participant list
- **Fixed Participants**: Fixed members are excluded from rotation (e.g., the host/master)
- **Drag & Drop Reordering**: Using react-beautiful-dnd for intuitive list management
  - Fixed participants cannot be dragged
  - Cross-list movement (party <-> queue) with validation

### 2.3 Rotation System
- **Next Rotation Preview**: Shows who will join/leave in the next rotation
- **Configurable Rotation Count**: Default is 1, adjustable in management settings
- **Atomic Rotation Execution**: Server-side RPC ensures consistent state

### 2.4 Registration Modes
- **Disabled**: No viewer registration allowed
- **Direct**: Viewers can freely join the queue
- **Approval**: Viewers submit registration requests; administrators approve/reject

### 2.5 Real-time Synchronization
- **Supabase Realtime**: Instant updates to all viewers via WebSocket subscriptions
- **Connection Status Banner**: Visual indicator of connection state (connected, reconnecting, error)
- **Skeleton Loading**: Placeholder UI during data loading

### 2.6 YouTube Live Integration
- **Live Chat Monitoring**: Polls YouTube Live chat for trigger keywords
- **Auto-Registration**: Automatically adds commenters to party/queue when keyword detected
- **Configurable Keyword**: Default is `!join`, customizable per session
- **Registration Mode Integration**: Respects the session's registration mode (direct/approval/disabled)
- **Connection Status**: Visual indicator showing stream connection and processed message count

## 3. Architecture

### 3.1 Frontend Structure

```
src/
├── atlaskit-forms.tsx      # Main entry point for React Islands
├── types.ts                # TypeScript type definitions
├── components/
│   ├── SetupForm.tsx       # Initial session setup form
│   ├── ManagementSettings.tsx  # Admin settings panel
│   ├── DndManager.tsx      # Drag & Drop management component
│   ├── YouTubeSettings.tsx # YouTube Live integration settings
│   └── ModernDashboard.tsx # Modern UI variant
├── utils/
│   ├── mount.ts            # React Island mounting utilities
│   ├── legacy.ts           # Legacy DOM interop utilities
│   └── youtube.ts          # YouTube API utilities
└── styles/                 # CSS styles
```

### 3.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Base | Vanilla HTML/CSS/JavaScript |
| React Islands | React 18, Atlaskit components |
| Drag & Drop | react-beautiful-dnd |
| Backend/Database | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |
| Build Tool | Vite (IIFE bundle) |
| Deployment | Vercel |

### 3.3 Build Process

1. **Environment Configuration** (`build.js`):
   - Reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from environment
   - Generates `public/config.js` with embedded configuration
   - Injects configuration into `public/index.html`

2. **Vite Build** (`vite.config.ts`):
   - Bundles React Islands as IIFE
   - Output: `public/assets/atlaskit-forms.iife.js`
   - Target: ES2018

## 4. Database Schema

### 4.1 Tables

#### `sessions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_code | TEXT | Unique session identifier |
| master_name | TEXT | Name of the session host |
| party_size | INT | Maximum party members (2-10) |
| rotation_count | INT | Members rotated per cycle (default: 1) |
| creator_token | TEXT | Admin authentication token |
| approval_required | BOOLEAN | Legacy flag (deprecated) |
| registration_mode | TEXT | 'disabled', 'direct', or 'approval' |
| youtube_video_id | TEXT | YouTube Live video ID |
| youtube_chat_id | TEXT | YouTube Live chat ID for polling |
| youtube_keyword | TEXT | Trigger keyword (default: '!join') |
| youtube_enabled | BOOLEAN | Whether YouTube integration is active |
| updated_at | TIMESTAMP | Last update timestamp |

#### `session_users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | Foreign key to sessions |
| user_id | INT | Application-level user ID |
| name | TEXT | Participant name |
| position | TEXT | 'party' or 'queue' |
| order_index | INT | Position within the list |
| is_fixed | BOOLEAN | Whether excluded from rotation |
| created_at | TIMESTAMP | Creation timestamp |

#### `pending_registrations`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | Foreign key to sessions |
| name | TEXT | Applicant name |
| status | TEXT | 'pending', 'approved', or 'rejected' |
| requested_at | TIMESTAMP | Request timestamp |
| approved_at | TIMESTAMP | Approval timestamp (nullable) |

### 4.2 Remote Procedure Calls (RPCs)

#### `rotate_session(p_session_code, p_creator_token)`
Performs atomic rotation with advisory locking:
1. Validates creator token
2. Identifies rotation-eligible members (non-fixed party members)
3. Moves specified count from party tail to queue
4. Moves same count from queue head to party
5. Normalizes `order_index` values
6. Returns arrays of moved-in and moved-out user IDs

#### `sync_session_snapshot(p_session_code, p_creator_token, p_party, p_queue, ...)`
Synchronizes frontend state to database:
1. Validates creator token
2. Performs UPSERT for incoming party/queue data
3. Deletes removed participants
4. Normalizes `order_index` values
5. Optionally updates session settings

## 5. User Interface

### 5.1 Setup Screen
- Master name input (optional, defaults to "主")
- Party size selector (2-10 members)
- Registration mode checkbox (approval required)
- "Start Session" button

### 5.2 Management Screen (Admin)

**Statistics Dashboard**:
- Party member count
- Queue waiting count
- Total participant count

**Controls**:
- Add user input and button
- "Next" button (execute rotation)
- "Open Overlay" button (streaming overlay window)
- "Reset Session" button

**Settings Panel**:
- Party size adjustment
- Rotation count adjustment
- Registration mode selector

**Participant Lists** (Drag & Drop enabled):
- Party members with fix/unfix and delete actions
- Queue members with delete action
- Visual indicators: "Fixed", "Next to Leave", "Next to Join"

**URL Sharing**:
- Viewer-only URL (publicly shareable)
- Admin URL (collapsible, with warning message)

### 5.3 Viewer Screen
- Real-time connection status banner
- Statistics dashboard (read-only)
- Self-registration form (when enabled)
- Participant lists (read-only)

### 5.4 Streaming Overlay
- Separate popup window for OBS/streaming integration
- Transparent background with hideable sections
- Real-time synchronization with main application

## 6. URL Structure

| URL Pattern | Description |
|-------------|-------------|
| `/?code=<session_code>` | Viewer-only access |
| `/?code=<session_code>&creator=<token>` | Admin access |

## 7. State Management

### 7.1 Application State (`appState`)
```javascript
{
  sessionCode: string,
  sessionId: string,
  partySize: number,           // 2-10
  rotationCount: number,       // 1-3
  party: User[],               // { id, name, isFixed }
  queue: User[],               // { id, name }
  isCreator: boolean,
  userIdCounter: number,
  registrationMode: 'disabled' | 'direct' | 'approval',
  pendingRegistrations: [],
  creatorToken: string,
  isRotating: boolean          // Prevents concurrent rotations
}
```

### 7.2 Interop with React Islands
- `window.getAppState()`: Returns current application state
- `window.applyDnD(newParty, newQueue)`: Applies drag & drop changes
- `window.refreshDnd()`: Refreshes DnD component with current state
- `window.toggleUserFixed(userId)`: Toggles fixed status
- `window.removeUser(userId, isParty)`: Removes a user

## 8. Real-time Subscriptions

The application subscribes to:
1. `session_users` table: Party/queue member changes
2. `sessions` table: Session settings changes
3. `pending_registrations` table: Registration request changes

Connection states handled:
- `SUBSCRIBED`: Connected and receiving updates
- `CHANNEL_ERROR`: Error state with auto-reconnect
- `CLOSED`/`TIMED_OUT`: Disconnected states

## 9. Theming

### 9.1 Design Tokens (CSS Variables)
```css
--ads-color-text: #172B4D;
--ads-color-surface: #FFFFFF;
--ads-color-surface-subtle: #F4F5F7;
--ads-color-border: #DFE1E6;
--ads-color-success: #36B37E;
--ads-color-danger: #FF5630;
--ads-color-warning: #FFAB00;
--ads-color-info: #2684FF;
--ads-elevation-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
--ads-radius: 10px;
```

### 9.2 Visual Style
- Background: Multi-layer gradient inspired by `base.png`
- Cards: High-transparency white with blur and soft shadow
- Header: White background with dark text
- Buttons: Purple gradient with hover effects

## 10. Internationalization

Currently Japanese-only with i18n scaffolding in place:
```javascript
const MESSAGES = {
  ja: {
    viewer_hint: 'このセッションは閲覧専用です...',
    conn_ok: 'リアルタイム接続中',
    // ... more messages
  }
};
```

## 11. Error Handling

### 11.1 Common Error Scenarios
- Missing/invalid environment variables
- Session not found
- Invalid creator token
- Database connection errors
- Real-time subscription failures

### 11.2 User Feedback
- Flag notifications (toast-like) for success/error messages
- Connection status banner for real-time status
- Loading spinners for async operations

## 12. Deployment

### 12.1 Environment Variables (Vercel)
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
YOUTUBE_API_KEY=your_youtube_data_api_key  # Optional, for YouTube Live integration
```

### 12.2 Build Commands
```bash
pnpm install
pnpm run build     # node build.js && vite build
```

### 12.3 Vercel Configuration (`vercel.json`)
- Build command: `pnpm run build`
- Output directory: `public/`

## 13. Security Considerations

1. **Creator Token**: Admin operations require valid creator token
2. **RLS (Row Level Security)**: Database-level access control
3. **SECURITY DEFINER RPCs**: Bypass RLS with restricted search_path
4. **Advisory Locks**: Prevent race conditions during rotation/sync
5. **URL Separation**: Admin URL should be kept secret

## 14. Future Considerations

- Multi-language support (i18n infrastructure exists)
- Additional UI themes
- Historical rotation tracking
- Export/import session data
- Mobile-optimized views

## 15. License

MIT License

## 16. Repository

GitHub: https://github.com/beniyasan/queue-management-app
