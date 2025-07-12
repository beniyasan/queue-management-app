# 【実践】リアルタイム順番待ち管理アプリを作った話 - 固定ユーザー機能と自動データ削除で運用を楽にする

## きっかけ

ゲーム仲間との遊びで、「5人パーティーなんだけど、参加希望者が10人いる...」という状況になることがよくありました。Discord で手動管理していたのですが、

- 誰が今パーティーにいるか分からない
- 交代のタイミングが曖昧
- リアルタイムで状況が分からない

といった問題があり、「これ、アプリ作った方が早くない？」となったのが始まりです。

## 作ったもの

**順番待ち管理アプリ**

![アプリのスクリーンショット的な説明]

### 基本機能
- セッション作成・参加
- リアルタイム同期（複数人で同時閲覧可能）
- 1〜3人ずつの柔軟な交代システム
- 5人・6人パーティー対応

### 今回追加した機能
1. **固定ユーザー機能** - 特定の人を交代対象から除外
2. **24時間自動削除** - 古いデータを自動的にクリーンアップ

## 技術選定

### なぜ Supabase + Vercel？

**Supabase を選んだ理由：**
- PostgreSQL ベースで安心感
- リアルタイム機能が標準装備
- Edge Functions で自動化処理が書ける
- 無料枠が充実

**Vercel を選んだ理由：**
- GitHub 連携で自動デプロイ
- 環境変数の管理が楽
- 無料枠で十分

**フロントエンドが Vanilla JS な理由：**
- シンプルな機能なので React は大げさ
- 軽量で高速
- デプロイが簡単

## 実装で工夫したポイント

### 1. 固定ユーザー機能の設計

最初は「主催者だけ固定」の仕様でしたが、使っているうちに「この人も固定したい」というケースが出てきました。

**制約設計：**
```javascript
// パーティーサイズ - 1 が固定可能上限
const maxFixed = appState.partySize - 1;
```

5人パーティーなら最大4人まで固定可能。「最低1人は交代可能ユーザーを残す」ことで、ローテーション機能が破綻しないよう設計しました。

**UI/UX の工夫：**
- 固定ユーザーは金色背景 + 王冠アイコンで視覚的に分かりやすく
- 固定/解除ボタンをワンクリックで切り替え可能
- 上限に達したら警告メッセージで親切に案内

### 2. リアルタイム同期の実装

Supabase の Realtime 機能を使用。閲覧者は自動的に最新状態を受信します。

```javascript
subscription = supabase
    .channel(`session:${appState.sessionId}`)
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_users',
        filter: `session_id=eq.${appState.sessionId}`
    }, async (payload) => {
        // データ変更時に自動で画面更新
        await loadSessionFromSupabase(appState.sessionCode);
        updateDisplay();
    })
    .subscribe();
```

**良かった点：**
- 管理者が操作すると、閲覧者の画面もリアルタイム更新
- WebSocket ベースで軽量
- 接続状態も表示できる

### 3. 24時間自動削除システム

データが蓄積され続けるのは気持ち悪いので、自動削除機能を実装しました。

**PostgreSQL 関数での削除処理：**
```sql
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS TABLE(deleted_sessions INTEGER, deleted_users INTEGER, cleanup_timestamp TIMESTAMP)
AS $$
BEGIN
    -- 24時間を超過したデータを削除
    DELETE FROM session_users 
    WHERE session_id IN (
        SELECT id FROM sessions 
        WHERE created_at < NOW() - INTERVAL '24 hours'
    );
    
    DELETE FROM sessions 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- 結果をログに記録
    -- ...
END;
$$ LANGUAGE plpgsql;
```

**Edge Functions での自動実行：**
```typescript
// 毎日午前2時に実行される
serve(async (req) => {
    const { data, error } = await supabase.rpc('cleanup_old_sessions');
    // エラーハンドリング + ログ出力
});
```

**運用のメリット：**
- 完全に手動運用不要
- ストレージコストの削減
- 削除ログで実行状況を追跡可能

## ハマったポイント

### 1. 環境変数の注入

Vercel + Supabase の環境変数設定で最初ハマりました。

**問題：**
静的サイトなので、ビルド時に環境変数を JavaScript ファイルに埋め込む必要がある

**解決策：**
```javascript
// build.js でビルド時に環境変数を config.js に出力
const configContent = `
window.APP_CONFIG = {
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseKey: '${process.env.SUPABASE_ANON_KEY}'
};`;
```

### 2. 固定ユーザーとパーティーサイズ変更の競合

パーティーサイズを小さくしたときに固定ユーザーが上限を超える問題。

**解決策：**
```javascript
if (currentFixedCount > newMaxFixed) {
    alert(`先に固定ユーザーを解除してください`);
    document.getElementById('currentPartySize').value = oldSize;
    return; // 変更をキャンセル
}
```

事前チェックで競合を防止し、ユーザーに分かりやすくガイドしました。

### 3. Edge Functions のデバッグ

Edge Functions のログ確認方法が最初分からず...

**解決策：**
```bash
# リアルタイムでログを確認
supabase functions logs cleanup-sessions

# 手動実行でテスト
supabase functions invoke cleanup-sessions
```

CLI でログ確認できることを知ってからデバッグが楽になりました。

## 使ってみた感想

### 良かった点
- **リアルタイム同期が想像以上に便利**：みんなが同じ画面を見れるので混乱が一切ない
- **固定ユーザー機能が予想以上に重宝**：「この人は抜けないで」という場面で大活躍
- **運用が完全に楽**：24時間後に自動削除されるので、データ管理を気にしなくて良い

### 改善点
- スマホでの操作性をもう少し良くしたい
- 通知機能があると更に便利そう
- ユーザーのドラッグ&ドロップ並び替えも欲しい

## 技術的な学び

### Supabase の威力

- **PostgreSQL の機能がフルに使える**：関数、トリガー、インデックスなど
- **Edge Functions が強力**：Deno ベースで TypeScript が使える
- **Realtime 機能が秀逸**：WebSocket の面倒を見てくれる

### サーバーレスアーキテクチャの恩恵

- **インフラ運用ゼロ**：サーバー管理不要
- **スケーラビリティ**：アクセス数に応じて自動スケール
- **コスト効率**：使った分だけ課金

### Vanilla JS の意外な良さ

- **ビルド不要**：デプロイが超シンプル
- **デバッグしやすい**：ブラウザで直接確認可能
- **軽量**：初期ロードが高速

## コスト

**現在の運用コスト：月額 0円**

- Supabase: 無料枠内（500MB ストレージ、50K MAU）
- Vercel: 無料枠内（100GB 帯域、100 回ビルド）

24時間自動削除により、データ量が一定に保たれるため、長期運用でも無料枠内で収まりそうです。

## 今後やりたいこと

### 機能拡張
- **プッシュ通知**: 交代タイミングの通知
- **チャット機能**: 簡単なコミュニケーション
- **履歴機能**: 過去のセッション記録

### 技術的改善
- **PWA 対応**: スマホアプリっぽく使えるように
- **オフライン対応**: 一時的な接続断でも使える
- **パフォーマンス最適化**: より大規模な利用に対応

## まとめ

「ちょっとした不便を解決したい」から始まったプロジェクトでしたが、Supabase + Vercel の組み合わせで想像以上にリッチな機能を実現できました。

特に印象的だったのは：

1. **Supabase のリアルタイム機能**：複雑な WebSocket 処理を書かずに済んだ
2. **Edge Functions の威力**：サーバーレスでバッチ処理が簡単に実装できた
3. **完全自動化の快適さ**：一度設定すれば運用作業ゼロ

個人開発でも、工夫次第でエンタープライズレベルの機能を実現できる良い時代になったなあ、と実感しています。

同じような課題を抱えている方の参考になれば幸いです！

---

## リンク

- **GitHub**: [queue-management-app](https://github.com/beniyasan/queue-management-app)
- **デモサイト**: [実際のアプリはこちら](実際のVercelURL)
- **技術詳細**: より詳しい実装は ARTICLE.md をご覧ください

## 使用技術

`Supabase` `Vercel` `PostgreSQL` `Edge Functions` `WebSocket` `Vanilla JavaScript` `リアルタイム` `サーバーレス`