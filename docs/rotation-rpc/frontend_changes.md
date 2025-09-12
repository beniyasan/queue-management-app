# フロントエンド変更詳細（計画）

対象: `public/index.html`

## 目的
- `nextRotation()` でローカル配列操作＋全削除/全挿入の保存をやめ、DB側RPCを呼び出す方式に変更
- 実行中は「次へ」ボタンを無効化し、連打による多重実行を防止

## 変更ポイント
- `nextRotation()` 本体を以下に置換
- 保存失敗時はセッションを再読込して整合を回復

## 変更差分（概略）

```diff
-        // 次の交代を実行
-        async function nextRotation() {
-            if (appState.party.length === 0) {
-                alert('パーティーにユーザーがいません');
-                return;
-            }
-            ...（ローカル配列の入替と saveUsersToSupabase）...
-            const saved = await saveUsersToSupabase();
-            if (!saved) { ... }
-            updateDisplay();
-        }
+        // 次の交代を実行（RPC版）
+        async function nextRotation() {
+            const nextBtn = document.getElementById('nextBtn');
+            if (nextBtn) nextBtn.disabled = true;
+            try {
+                const { data, error } = await supabase.rpc('rotate_session', {
+                    p_session_code: appState.sessionCode,
+                    p_creator_token: appState.creatorToken
+                });
+                if (error) throw error;
+                await loadSessionFromSupabase(appState.sessionCode);
+                updateDisplay();
+            } catch (e) {
+                console.error('rotate failed', e);
+                alert('交代処理に失敗しました。時間をおいて再度お試しください。');
+                await loadSessionFromSupabase(appState.sessionCode);
+                updateDisplay();
+            } finally {
+                if (nextBtn) nextBtn.disabled = false;
+            }
+        }
```

## 備考
- 交代プレビュー（ハイライト）は既存の `computeRotationPreview()` を表示用に維持可能
- DnD等、他の操作は現状踏襲（本PRでは交代の原子化のみ）

