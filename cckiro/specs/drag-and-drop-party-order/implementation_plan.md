# ドラッグ&ドロップによるパーティー参加者順番入れ替え機能 - 実装計画書

## 1. 実装概要

既存の `/mnt/c/docker/queue-management-app/public/index.html` ファイルに最小限の変更でドラッグ&ドロップ機能を追加する。

## 2. 実装ステップ

### Step 1: SortableJSライブラリの追加
**ファイル**: `public/index.html`
**場所**: `<head>` セクション（7行目のSupabaseスクリプト後）

```html
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
```

### Step 2: CSS追加
**ファイル**: `public/index.html`
**場所**: `<style>` セクション（既存のCSSの後）

追加するCSS:
```css
/* ドラッグ&ドロップ用スタイル */
.sortable-item {
    cursor: move;
    user-select: none;
}

.sortable-item:hover {
    cursor: grab;
}

.sortable-item.sortable-drag {
    opacity: 0.5;
    transform: rotate(2deg);
    z-index: 1000;
}

.sortable-item.sortable-ghost {
    opacity: 0.3;
    background: #e3f2fd !important;
}

.sortable-item.sortable-chosen {
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

/* ドラッグ中のプレースホルダー */
.sortable-fallback {
    background: #f0f0f0;
    border: 2px dashed #ccc;
    opacity: 0.5;
}
```

### Step 3: グローバル変数の追加
**ファイル**: `public/index.html`
**場所**: JavaScript開始部（701行目付近、既存のグローバル変数の後）

```javascript
// ドラッグ&ドロップ関連
let partySortable = null;
```

### Step 4: Sortable初期化関数の実装
**ファイル**: `public/index.html`
**場所**: JavaScript関数セクション（既存関数の後）

```javascript
// Sortable初期化
function initializePartySortable() {
    if (!appState.isCreator) return;
    
    const partyList = document.getElementById('partyList');
    if (!partyList) return;
    
    // 既存のSortableインスタンスを破棄
    if (partySortable) {
        partySortable.destroy();
        partySortable = null;
    }
    
    // 新しいSortableインスタンスを作成
    partySortable = new Sortable(partyList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        handle: '.user-item',
        onEnd: handlePartyReorder
    });
    
    console.log('✅ Party sortable initialized');
}
```

### Step 5: 順番変更ハンドラーの実装
**ファイル**: `public/index.html`
**場所**: initializePartySortable関数の後

```javascript
// パーティー順番変更ハンドラー
async function handlePartyReorder(evt) {
    const oldIndex = evt.oldIndex;
    const newIndex = evt.newIndex;
    
    console.log(`🔄 Reordering party: ${oldIndex} -> ${newIndex}`);
    
    if (oldIndex === newIndex) return;
    
    // 配列を更新（楽観的更新）
    const movedUser = appState.party.splice(oldIndex, 1)[0];
    appState.party.splice(newIndex, 0, movedUser);
    
    // order_indexを再計算
    appState.party.forEach((user, index) => {
        user.orderIndex = index;
    });
    
    // UIを即座に更新
    updateCreatorDisplay();
    
    // データベース更新
    try {
        await updatePartyOrderInDatabase();
        console.log('✅ Party order updated successfully');
    } catch (error) {
        console.error('❌ Failed to update party order:', error);
        // エラー時は元に戻す
        revertPartyOrder(oldIndex, newIndex);
        alert('順番の更新に失敗しました。元の順番に戻します。');
    }
}

// エラー時の順番復元
function revertPartyOrder(oldIndex, newIndex) {
    const movedUser = appState.party.splice(newIndex, 1)[0];
    appState.party.splice(oldIndex, 0, movedUser);
    
    // order_indexを再計算
    appState.party.forEach((user, index) => {
        user.orderIndex = index;
    });
    
    updateCreatorDisplay();
}
```

### Step 6: データベース更新関数の実装
**ファイル**: `public/index.html`
**場所**: handlePartyReorder関数の後

```javascript
// パーティー順番をデータベースに保存
async function updatePartyOrderInDatabase() {
    if (!supabase || !appState.sessionId) {
        throw new Error('Supabase not initialized or session ID missing');
    }
    
    // パーティーメンバーの順番情報を更新
    const updates = appState.party.map((user, index) => ({
        session_id: appState.sessionId,
        user_id: user.id,
        name: user.name,
        position: 'party',
        order_index: index,
        is_fixed: user.isFixed || false
    }));
    
    console.log('💾 Updating party order in database:', updates);
    
    // 既存のパーティーメンバーを削除
    const { error: deleteError } = await supabase
        .from('session_users')
        .delete()
        .eq('session_id', appState.sessionId)
        .eq('position', 'party');
    
    if (deleteError) {
        throw new Error(`Failed to delete existing party members: ${deleteError.message}`);
    }
    
    // 新しい順番で挿入
    if (updates.length > 0) {
        const { error: insertError } = await supabase
            .from('session_users')
            .insert(updates);
        
        if (insertError) {
            throw new Error(`Failed to insert updated party order: ${insertError.message}`);
        }
    }
}
```

### Step 7: updateCreatorDisplay関数の修正
**ファイル**: `public/index.html`
**場所**: 既存のupdateCreatorDisplay関数（1400行目付近）

既存の関数を以下のように修正:

1. パーティーリストの各ユーザー要素に `sortable-item` クラスと `data-user-id` 属性を追加
2. 関数の最後でSortableを初期化

**修正箇所1**: userDivのクラス名（1412行目付近）
```javascript
// 修正前
userDiv.className = 'user-item';

// 修正後
userDiv.className = 'user-item sortable-item';
userDiv.setAttribute('data-user-id', user.id);
```

**修正箇所2**: 関数の最後に初期化を追加（partyList.appendChild(userDiv)のループ後）
```javascript
// パーティーリストの描画後にSortableを初期化
setTimeout(() => {
    initializePartySortable();
}, 0);
```

### Step 8: その他の初期化ポイント
以下の関数でもSortableの初期化を呼び出す:

1. **startSession関数**（1129行目付近）- セッション作成時
2. **URL処理部分**（1774行目付近）- セッション読み込み時

それぞれの関数の最後に以下を追加:
```javascript
// 初期化後にSortableをセットアップ
setTimeout(() => {
    if (appState.isCreator) {
        initializePartySortable();
    }
}, 100);
```

## 3. 修正ファイル

- `public/index.html` のみ（1ファイル）

## 4. 修正行数見積もり

- CSS追加: 約30行
- JavaScript関数追加: 約100行  
- 既存関数修正: 約10行
- **合計**: 約140行

## 5. テスト項目

### 5.1 基本機能テスト
- [ ] ドラッグ&ドロップでの順番変更
- [ ] 固定ユーザーの移動
- [ ] データベースへの保存
- [ ] リアルタイム同期

### 5.2 エラーハンドリングテスト
- [ ] ネットワークエラー時の復元
- [ ] データベース保存失敗時の復元

### 5.3 デバイステスト
- [ ] デスクトップブラウザ
- [ ] モバイルブラウザ（タッチ操作）

## 6. 実装時の注意点

1. **既存コードへの影響最小化**: 既存の関数やデータ構造は可能な限り変更しない
2. **エラーハンドリング**: データベース更新失敗時は必ず元の状態に復元する
3. **パフォーマンス**: DOM操作は非同期で実行し、UIのブロックを避ける
4. **リアルタイム同期**: 既存の同期機能との競合を避ける

## 7. 実装順序

1. CSS追加
2. JavaScript関数追加
3. 既存関数修正
4. 初期化ポイント追加
5. テスト・デバッグ