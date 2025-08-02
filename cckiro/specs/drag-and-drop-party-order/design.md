# ドラッグ&ドロップによるパーティー参加者順番入れ替え機能 - 設計書

## 1. アーキテクチャ概要

既存のHTML/CSS/JavaScriptベースのアプリケーションに、HTML5 Drag and Drop APIとSortableJSライブラリを組み合わせたソリューションを実装する。

## 2. 技術選択

### 2.1 ドラッグ&ドロップライブラリ
- **SortableJS** を使用
  - 軽量で高性能
  - タッチデバイス対応済み
  - カスタマイズ性が高い
  - CDNから直接読み込み可能

### 2.2 実装方針
- 既存のコードベースに最小限の変更で統合
- 既存のデータ構造（`appState.party`）をそのまま利用
- 既存のSupabase同期機能を活用

## 3. コンポーネント設計

### 3.1 HTML構造の拡張

既存の構造:
```html
<div id="partyList" class="user-list">
  <div class="user-item">...</div>
</div>
```

拡張後:
```html
<div id="partyList" class="user-list sortable-list">
  <div class="user-item sortable-item" data-user-id="123">...</div>
</div>
```

### 3.2 CSS設計

新規追加するスタイル:
```css
.sortable-list {
  /* ドラッグ&ドロップ対応のベーススタイル */
}

.sortable-item {
  cursor: move;
  user-select: none;
}

.sortable-item:hover {
  cursor: grab;
}

.sortable-item.sortable-drag {
  opacity: 0.5;
  transform: rotate(5deg);
}

.sortable-item.sortable-ghost {
  opacity: 0.3;
}

.sortable-placeholder {
  background: #e3f2fd;
  border: 2px dashed #2196f3;
  margin: 10px 0;
  height: 60px;
  border-radius: 10px;
}
```

## 4. JavaScript設計

### 4.1 Sortable初期化

```javascript
let partySortable = null;

function initializePartySortable() {
  const partyList = document.getElementById('partyList');
  
  if (partySortable) {
    partySortable.destroy();
  }
  
  partySortable = new Sortable(partyList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: handlePartyReorder
  });
}
```

### 4.2 順番変更ハンドラー

```javascript
async function handlePartyReorder(evt) {
  const oldIndex = evt.oldIndex;
  const newIndex = evt.newIndex;
  
  if (oldIndex === newIndex) return;
  
  // 配列を更新
  const movedUser = appState.party.splice(oldIndex, 1)[0];
  appState.party.splice(newIndex, 0, movedUser);
  
  // order_indexを再計算
  appState.party.forEach((user, index) => {
    user.orderIndex = index;
  });
  
  // データベース更新
  try {
    await updatePartyOrderInDatabase();
    updateCreatorDisplay();
  } catch (error) {
    console.error('順番更新エラー:', error);
    // エラー時は元に戻す
    revertPartyOrder(oldIndex, newIndex);
    alert('順番の更新に失敗しました');
  }
}
```

### 4.3 データベース更新機能

```javascript
async function updatePartyOrderInDatabase() {
  const updates = appState.party.map((user, index) => ({
    user_id: user.id,
    session_id: appState.sessionId,
    order_index: index,
    position: 'party'
  }));
  
  const { error } = await supabase
    .from('users')
    .upsert(updates, { 
      onConflict: 'session_id,user_id'
    });
    
  if (error) throw error;
}
```

### 4.4 表示更新機能の拡張

既存の`updateCreatorDisplay()`関数を拡張:

```javascript
function updateCreatorDisplay() {
  // 既存のコード...
  
  // パーティーリストの描画
  const partyList = document.getElementById('partyList');
  partyList.innerHTML = '';
  appState.party.forEach((user, index) => {
    const userDiv = createPartyUserElement(user, index);
    partyList.appendChild(userDiv);
  });
  
  // Sortableを再初期化
  if (appState.isCreator) {
    initializePartySortable();
  }
}

function createPartyUserElement(user, index) {
  const userDiv = document.createElement('div');
  userDiv.className = 'user-item sortable-item';
  userDiv.setAttribute('data-user-id', user.id);
  
  // 既存のスタイル適用
  if (user.isFixed) {
    userDiv.style.background = 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)';
    userDiv.style.border = '2px solid #ffd700';
  }
  
  // 既存のHTML構造を維持
  userDiv.innerHTML = `...`;
  
  return userDiv;
}
```

## 5. ライブラリ読み込み

HTML `<head>` セクションに追加:

```html
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
```

## 6. 初期化とライフサイクル

### 6.1 初期化タイミング
- セッション作成時
- セッション読み込み時
- パーティーリスト更新時

### 6.2 破棄タイミング
- ページ離脱時
- 管理者権限失効時

## 7. エラーハンドリング

### 7.1 ネットワークエラー
- データベース更新失敗時は元の順番に復元
- ユーザーにエラーメッセージを表示

### 7.2 状態不整合
- リアルタイム同期でのデータ競合を考慮
- 最新データでの再描画機能

## 8. パフォーマンス最適化

### 8.1 DOM操作の最適化
- バッチ更新による再描画回数の削減
- 仮想スクロール（将来拡張）

### 8.2 ネットワーク最適化
- デバウンス処理によるAPI呼び出し制限
- 楽観的更新による応答性向上

## 9. アクセシビリティ

### 9.1 キーボード操作（オプション）
- Arrow Key + Space での移動
- フォーカス管理

### 9.2 スクリーンリーダー対応
- ARIA属性の追加
- ライブリージョンでの変更通知

## 10. テスト方針

### 10.1 ユニットテスト
- 順番変更ロジック
- データベース更新ロジック

### 10.2 統合テスト
- リアルタイム同期
- エラー時の復旧

### 10.3 E2Eテスト
- ドラッグ&ドロップ操作
- マルチデバイステスト