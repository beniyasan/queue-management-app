# Supabase + Vercelで作る高機能順番待ち管理アプリ：固定ユーザー機能と24時間自動データ削除の実装

## はじめに

ゲームやイベントでの順番待ち管理は、参加者が多くなるほど複雑になります。今回は、リアルタイム同期機能を備えた順番待ち管理アプリに、「固定ユーザー機能」と「24時間自動データ削除機能」を実装しました。

この記事では、実際のコードと実装手順を交えながら、以下の技術要素について詳しく解説します：

- Supabase Realtime Database を使ったリアルタイム同期
- ユーザー固定機能の設計と実装
- Edge Functions を活用した自動データ削除システム
- PostgreSQL関数による効率的なバッチ処理

## 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **バックエンド**: Supabase (PostgreSQL + Realtime)
- **ホスティング**: Vercel
- **自動化**: Supabase Edge Functions + Cron

## アプリの基本構成

### データベース設計

まず、アプリケーションの基盤となるデータベース構造を確認しましょう。

```sql
-- セッション管理テーブル
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  session_code VARCHAR(8) UNIQUE NOT NULL,
  master_name VARCHAR(255) NOT NULL,
  party_size INTEGER NOT NULL,
  rotation_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ユーザー管理テーブル
CREATE TABLE session_users (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  position VARCHAR(20) NOT NULL, -- 'party' or 'queue'
  order_index INTEGER NOT NULL,
  is_fixed BOOLEAN DEFAULT FALSE, -- 固定ユーザーフラグ
  created_at TIMESTAMP DEFAULT NOW()
);
```

`is_fixed`フィールドが今回追加した固定ユーザー機能の核となる部分です。

### アプリケーション状態管理

JavaScript側では、以下の状態オブジェクトで全体を管理しています：

```javascript
let appState = {
    sessionCode: null,
    sessionId: null,
    partySize: 5,           // 5-6人パーティー
    rotationCount: 1,       // 1-3人ずつ交代
    party: [],              // パーティー参加者
    queue: [],              // 待機列
    isCreator: false,       // 管理者権限
    userIdCounter: 1        // ユーザーID採番
};
```

## 固定ユーザー機能の実装

### 1. 機能要件の定義

固定ユーザー機能では以下の要件を満たす必要がありました：

- **任意のユーザーを固定可能**: 主ユーザー以外も固定設定できる
- **固定数制限**: パーティーサイズ - 1 を上限とする
- **ローテーション除外**: 固定ユーザーは交代処理から除外
- **視覚的識別**: UIで固定ユーザーを明確に表示

### 2. 固定ユーザー数制限ロジック

最も重要な制限チェック機能から実装しました：

```javascript
// 固定ユーザー数の検証
function validateFixedUserCount(isAdding = false) {
    const maxFixed = appState.partySize - 1;
    const currentFixed = appState.party.filter(user => user.isFixed).length;
    
    if (isAdding) {
        return currentFixed < maxFixed;
    } else {
        return currentFixed <= maxFixed;
    }
}
```

この関数により、例えば5人パーティーでは最大4人まで固定可能となります。最低1人は非固定ユーザーを確保することで、ローテーション機能が破綻しないよう設計しています。

### 3. 固定状態切り替え機能

ユーザーの固定状態を安全に切り替える核となる関数：

```javascript
async function toggleUserFixed(userId) {
    if (userId === 0) {
        alert('主ユーザーの固定状態は変更できません');
        return;
    }
    
    const user = appState.party.find(u => u.id === userId);
    if (!user) {
        alert('ユーザーが見つかりません');
        return;
    }
    
    // 固定にする場合の制限チェック
    if (!user.isFixed && !validateFixedUserCount(true)) {
        const maxFixed = appState.partySize - 1;
        alert(`固定ユーザーは最大${maxFixed}人までです`);
        return;
    }
    
    // 固定状態を切り替え
    user.isFixed = !user.isFixed;
    
    // Supabaseに保存
    const saved = await saveUsersToSupabase();
    if (!saved) {
        // 失敗時は元に戻す
        user.isFixed = !user.isFixed;
        alert('固定状態の変更に失敗しました');
        return;
    }
    
    updateDisplay();
}
```

この実装のポイント：

- **主ユーザー保護**: ID=0の主ユーザーは変更不可
- **制限チェック**: 固定前に上限チェック実行
- **ロールバック**: データベース保存失敗時の状態復旧
- **エラーハンドリング**: 各段階での適切なエラー処理

### 4. UIの実装

管理者画面では、各ユーザーに固定切り替えボタンを追加：

```javascript
userDiv.innerHTML = `
    <div>
        <span class="user-name">${user.name}${user.isFixed ? ' 👑' : ''}</span>
        <span class="user-number">${index + 1}</span>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
        ${user.id === 0 ? 
            '<span style="color: #666; font-size: 0.9em;">主（固定）</span>' : 
            `<button class="btn ${user.isFixed ? 'btn-warning' : ''}" 
                     onclick="toggleUserFixed(${user.id})" 
                     style="font-size: 0.8em; padding: 6px 12px;">
                ${user.isFixed ? '固定解除' : '固定'}
             </button>
             ${!user.isFixed ? 
                `<button class="btn btn-danger" 
                         onclick="removeUser(${user.id}, true)" 
                         style="font-size: 0.8em; padding: 6px 12px;">
                    削除
                 </button>` : ''}`
        }
    </div>
`;
```

### 5. パーティーサイズ変更時の制限

パーティーサイズを変更する際も、固定ユーザー数との整合性をチェック：

```javascript
async function updatePartySize() {
    const newSize = parseInt(document.getElementById('currentPartySize').value);
    const oldSize = appState.partySize;
    
    // 固定ユーザ数の制限チェック
    const currentFixedCount = appState.party.filter(user => user.isFixed).length;
    const newMaxFixed = newSize - 1;
    
    if (currentFixedCount > newMaxFixed) {
        alert(`パーティーサイズ${newSize}人では固定ユーザーは最大${newMaxFixed}人までです。\n現在の固定ユーザー数: ${currentFixedCount}人\n\n先に固定ユーザーを解除してください。`);
        document.getElementById('currentPartySize').value = oldSize;
        return;
    }
    
    appState.partySize = newSize;
    // ... 以下、パーティーサイズ変更処理
}
```

## 24時間“非活動”自動データ削除システムの実装（updated_at基準）

### 1. PostgreSQL関数による削除処理

データベース層で効率的な削除処理を実装：

```sql
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS TABLE(
    deleted_sessions INTEGER,
    deleted_users INTEGER,
    cleanup_timestamp TIMESTAMP
) AS $$
DECLARE
    session_count INTEGER := 0;
    user_count INTEGER := 0;
BEGIN
    -- 24時間“非活動”のセッションのユーザーを先に削除（updated_at基準）
    WITH old_sessions AS (
        SELECT id FROM sessions 
        WHERE updated_at < NOW() - INTERVAL '24 hours'
    )
    DELETE FROM session_users 
    WHERE session_id IN (SELECT id FROM old_sessions);
    
    GET DIAGNOSTICS user_count = ROW_COUNT;
    
    -- 24時間“非活動”のセッションを削除
    DELETE FROM sessions 
    WHERE updated_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS session_count = ROW_COUNT;
    
    -- クリーンアップログを記録
    INSERT INTO cleanup_logs (
        deleted_sessions, 
        deleted_users, 
        cleanup_timestamp
    ) VALUES (
        session_count,
        user_count,
        NOW()
    );
    
    RETURN QUERY SELECT 
        session_count as deleted_sessions,
        user_count as deleted_users,
        NOW() as cleanup_timestamp;
END;
$$ LANGUAGE plpgsql;
```

この実装のポイント：

- **外部キー制約対応**: 子テーブル（session_users）を先に削除
- **処理結果の記録**: 削除件数とタイムスタンプをログに保存
- **原子性保証**: 単一トランザクション内での実行

### 2. Supabase Edge Functionによる自動実行

TypeScriptで記述したサーバーレス関数：

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        console.log('🧹 Starting cleanup process...')
        
        // PostgreSQL関数を呼び出し
        const { data: cleanupResult, error } = await supabase
            .rpc('cleanup_old_sessions')
        
        if (error) throw error
        
        const result = cleanupResult?.[0] || { deleted_sessions: 0, deleted_users: 0 }
        
        return new Response(JSON.stringify({
            success: true,
            deleted_sessions: result.deleted_sessions,
            deleted_users: result.deleted_users,
            timestamp: result.cleanup_timestamp,
            message: `Cleanup completed: ${result.deleted_sessions} sessions, ${result.deleted_users} users deleted`
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('❌ Function error:', error)
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
        })
    }
})
```

### 3. Cronジョブによる定期実行

Supabaseのcron機能を使用して毎日午前2時（UTC）に自動実行：

```yaml
# cron.yaml
schedule: "0 2 * * *"
timezone: "UTC"
function: cleanup-sessions
description: "Delete sessions and users older than 24 hours"

retry_policy:
  max_retry_count: 3
  min_backoff_duration: "1m"
  max_backoff_duration: "10m"
```

## リアルタイム同期機能

Supabaseのリアルタイム機能により、複数の閲覧者が同時に最新状態を確認できます：

```javascript
function setupRealtimeSubscription() {
    if (!supabase || !appState.sessionId || appState.isCreator) return;

    subscription = supabase
        .channel(`session:${appState.sessionId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'session_users',
            filter: `session_id=eq.${appState.sessionId}`
        }, async (payload) => {
            console.log('Realtime update:', payload);
            await loadSessionFromSupabase(appState.sessionCode);
            updateDisplay();
        })
        .subscribe();
}
```

## パフォーマンス最適化

### 1. データベースインデックス

頻繁にアクセスされるカラムにインデックスを設定：

```sql
-- セッションコードでの検索最適化
CREATE INDEX idx_sessions_session_code ON sessions(session_code);

-- 削除処理最適化
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_session_users_session_id ON session_users(session_id);
```

### 2. クライアント側最適化

- **バッチ更新**: 複数の状態変更を一度に処理
- **最小限の再描画**: 変更された要素のみ更新
- **デバウンス処理**: 連続操作の制御

## セキュリティ対策

### 1. Row Level Security (RLS)

Supabaseの行レベルセキュリティで適切なアクセス制御：

```sql
-- 全ユーザーが読み取り可能、作成者のみ変更可能
CREATE POLICY "Sessions are viewable by everyone" 
ON sessions FOR SELECT 
USING (true);

CREATE POLICY "Sessions are editable by creator" 
ON sessions FOR ALL 
USING (auth.uid() = creator_id);
```

### 2. Edge Function認証

Service Role Keyを使用した適切な権限管理：

```typescript
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)
```

## 運用・監視

### 1. ログ監視

削除処理の実行状況を追跡：

```sql
-- 最近のクリーンアップ履歴
SELECT 
    deleted_sessions,
    deleted_users,
    cleanup_timestamp
FROM cleanup_logs 
ORDER BY cleanup_timestamp DESC 
LIMIT 10;

-- 日別削除統計
SELECT 
    DATE(cleanup_timestamp) as cleanup_date,
    SUM(deleted_sessions) as total_sessions,
    SUM(deleted_users) as total_users
FROM cleanup_logs 
WHERE cleanup_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(cleanup_timestamp)
ORDER BY cleanup_date DESC;
```

### 2. アラート設定

異常な削除数や実行失敗時の通知設定を推奨します。

## 今後の拡張可能性

### 1. 追加機能案

- **ユーザーのドラッグ&ドロップ並び替え**
- **固定ユーザーのグループ管理**
- **セッション設定での固定ユーザー上限カスタマイズ**
- **プッシュ通知機能**

### 2. スケーラビリティ対応

- **Redis キャッシュの導入**
- **CDN 配信の最適化**
- **読み取り専用レプリカの活用**

## まとめ

今回実装した固定ユーザー機能と24時間自動削除機能により、以下を実現しました：

1. **柔軟な順番待ち管理**: 固定ユーザーによる柔軟な交代ルール
2. **自動データ管理**: 手動運用不要の完全自動化
3. **コスト最適化**: ストレージ使用量の自動制御
4. **運用効率化**: ログ機能による監視・分析基盤

特に、PostgreSQL関数とEdge Functionsを組み合わせた自動削除システムは、サーバーレス環境での効率的なバッチ処理の良い例となります。

Supabase + Vercelの組み合わせにより、インフラ運用の負荷を最小限に抑えながら、エンタープライズレベルの機能を実現できることが実証されました。

## 参考リンク

- [プロジェクトリポジトリ](https://github.com/beniyasan/queue-management-app)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

---

*この記事で紹介したコードは実際のプロダクション環境で動作確認済みです。詳細な実装については、GitHubリポジトリをご確認ください。*
