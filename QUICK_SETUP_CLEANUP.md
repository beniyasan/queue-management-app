# 📋 24時間自動削除機能 - クイックセットアップ

最短手順で24時間自動削除機能を有効化する方法です。

## ⚡ 5分でセットアップ

### 1. SQLファイルを実行（2分）
```bash
# Supabaseダッシュボード → SQL Editor → New query
# 以下のファイル内容をコピー&ペーストして実行
```
📁 `database/cleanup_old_sessions.sql` の内容を実行

### 2. Edge Functionをデプロイ（2分）
```bash
# ターミナルで実行
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy cleanup-sessions
```

### 3. Cronジョブを設定（1分）
**Supabaseダッシュボード**
1. Edge Functions → cleanup-sessions
2. Cron Jobs → Create Cron Job
3. 設定値：
   ```
   名前: daily-cleanup
   スケジュール: 0 2 * * *
   タイムゾーン: UTC
   ```

## ✅ 動作確認

```bash
# 手動実行テスト
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-sessions' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

```sql
-- ログ確認
SELECT * FROM cleanup_logs ORDER BY cleanup_timestamp DESC LIMIT 5;
```

## 🎯 完了！

- ✅ 毎日午前2時（UTC）に自動実行
- ✅ 24時間を超過したデータを削除
- ✅ 削除ログを7日間保持

---

詳細な設定は `SETUP_CLEANUP.md` を参照してください。