# 24時間自動削除機能 セットアップガイド

このガイドでは、順番待ち管理アプリで24時間を超過したデータを自動削除する機能の設定方法を説明します。

## 📋 概要

この機能により、以下が自動化されます：
- 24時間を超過したセッションデータの削除
- 関連するユーザーデータの削除
- 削除処理のログ記録（7日間保持）
- 毎日午前2時（UTC）の自動実行

## 🛠️ 前提条件

- Supabaseプロジェクトが作成済み
- Supabase CLI がインストール済み
- プロジェクトがSupabaseにリンク済み

### Supabase CLI インストール（未インストールの場合）
```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
curl -fsSL https://supabase.com/install.sh | sh
```

## 📝 セットアップ手順

### ステップ1: データベース関数の作成

1. **Supabaseダッシュボードにアクセス**
   - [supabase.com](https://supabase.com)にログイン
   - 対象プロジェクトを選択

2. **SQLエディタを開く**
   - 左メニューから「SQL Editor」を選択
   - 「New query」をクリック

3. **SQLファイルの内容を実行**
   ```sql
   -- database/cleanup_old_sessions.sql の内容をコピー&ペーストして実行
   ```
   または、以下のコマンドで直接実行：
   ```bash
   supabase db push
   ```

4. **実行結果を確認**
   - エラーがないことを確認
   - `cleanup_logs`テーブルが作成されていることを確認

### ステップ2: Edge Functionのデプロイ

1. **プロジェクトルートディレクトリで実行**
   ```bash
   # Supabaseにログイン（初回のみ）
   supabase login
   
   # プロジェクトにリンク（初回のみ）
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Edge Functionをデプロイ
   supabase functions deploy cleanup-sessions
   ```

2. **デプロイ結果を確認**
   ```bash
   # 関数の一覧を確認
   supabase functions list
   
   # 特定の関数の詳細を確認
   supabase functions describe cleanup-sessions
   ```

### ステップ3: 環境変数の設定

1. **Supabaseダッシュボードで設定**
   - 「Settings」→「API」→「Project API keys」
   - `service_role`キーをコピー

2. **Edge Function用の環境変数を設定**
   ```bash
   # Service Role Keyを設定
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

### ステップ4: Cronジョブの設定

1. **Supabaseダッシュボードにアクセス**
   - 「Edge Functions」セクションに移動
   - 「cleanup-sessions」関数を選択

2. **Cronジョブを作成**
   - 「Cron Jobs」タブをクリック
   - 「Create Cron Job」をクリック

3. **設定値を入力**
   ```
   名前: daily-cleanup
   関数: cleanup-sessions
   スケジュール: 0 2 * * *
   タイムゾーン: UTC
   説明: Delete sessions and users older than 24 hours
   ```

4. **リトライポリシーを設定**
   ```
   最大リトライ回数: 3
   最小バックオフ期間: 1m
   最大バックオフ期間: 10m
   ```

## 🧪 動作テスト

### 手動実行テスト

1. **Edge Functionを直接呼び出し**
   ```bash
   # 関数URLを確認
   supabase functions list
   
   # cURLで実行
   curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-sessions' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json'
   ```

2. **Supabaseダッシュボードから実行**
   - 「Edge Functions」→「cleanup-sessions」
   - 「Invoke Function」ボタンをクリック

### データベース確認

1. **クリーンアップログを確認**
   ```sql
   SELECT * FROM cleanup_logs ORDER BY cleanup_timestamp DESC LIMIT 10;
   ```

2. **古いセッション数を確認**
   ```sql
   -- 24時間を超過したセッション数
   SELECT COUNT(*) as old_sessions 
   FROM sessions 
   WHERE created_at < NOW() - INTERVAL '24 hours';
   
   -- 対応するユーザー数
   SELECT COUNT(*) as old_users 
   FROM session_users su
   JOIN sessions s ON su.session_id = s.id
   WHERE s.created_at < NOW() - INTERVAL '24 hours';
   ```

## 📊 監視・メンテナンス

### ログの確認方法

1. **Edge Functionのログ**
   ```bash
   # リアルタイムログを確認
   supabase functions logs cleanup-sessions
   
   # 過去のログを確認
   supabase functions logs cleanup-sessions --since=1h
   ```

2. **データベースログ**
   ```sql
   -- 最近のクリーンアップ履歴
   SELECT 
       deleted_sessions,
       deleted_users,
       cleanup_timestamp,
       created_at
   FROM cleanup_logs 
   ORDER BY cleanup_timestamp DESC 
   LIMIT 20;
   
   -- 日別削除統計
   SELECT 
       DATE(cleanup_timestamp) as cleanup_date,
       SUM(deleted_sessions) as total_sessions,
       SUM(deleted_users) as total_users,
       COUNT(*) as executions
   FROM cleanup_logs 
   WHERE cleanup_timestamp >= NOW() - INTERVAL '30 days'
   GROUP BY DATE(cleanup_timestamp)
   ORDER BY cleanup_date DESC;
   ```

### アラート設定（推奨）

1. **Cronジョブ失敗時の通知**
   - Supabaseダッシュボードでwebhook設定
   - Slack/Discord/メール通知の設定

2. **異常な削除数の検知**
   ```sql
   -- 異常に多くのデータが削除された場合のクエリ例
   SELECT * FROM cleanup_logs 
   WHERE deleted_sessions > 100 OR deleted_users > 500
   ORDER BY cleanup_timestamp DESC;
   ```

## ⚠️ 注意事項

### セキュリティ
- `SUPABASE_SERVICE_ROLE_KEY`は機密情報です
- Edge Functionは適切な認証を実装済みです
- 手動実行時は十分注意してください

### データ保護
- 削除されたデータは復旧できません
- 重要なデータは事前にバックアップを取得してください
- テスト環境で十分動作確認してから本番適用してください

### パフォーマンス
- 大量のデータがある場合、初回実行に時間がかかる可能性があります
- 必要に応じてバッチサイズの調整を検討してください

## 🔧 カスタマイズ

### 削除期間の変更
`database/cleanup_old_sessions.sql`で期間を変更：
```sql
-- 48時間に変更する場合
WHERE created_at < NOW() - INTERVAL '48 hours'
```

### 実行頻度の変更
Cronジョブのスケジュール変更：
```
# 6時間ごとに実行
0 */6 * * *

# 週1回（日曜日の午前2時）
0 2 * * 0
```

### ログ保持期間の変更
```sql
-- 30日間保持に変更
WHERE created_at < NOW() - INTERVAL '30 days'
```

## 📞 サポート

問題が発生した場合：
1. Edge Functionのログを確認
2. データベースのエラーログを確認
3. Cronジョブの実行履歴を確認
4. GitHub Issuesで報告

---

このセットアップガイドに従って設定することで、データベースの自動メンテナンスが実現され、ストレージコストの最適化とパフォーマンス維持が可能になります。