import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabaseクライアントを初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🧹 Starting cleanup process...')
    
    // 24時間を超過したセッションのクリーンアップを実行
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_old_sessions')
    
    if (cleanupError) {
      console.error('❌ Cleanup error:', cleanupError)
      throw cleanupError
    }
    
    // クリーンアップログの削除も実行
    const { data: logCleanupResult, error: logCleanupError } = await supabase
      .rpc('cleanup_old_logs')
    
    if (logCleanupError) {
      console.error('❌ Log cleanup error:', logCleanupError)
      // ログクリーンアップのエラーは致命的ではないので続行
    }
    
    const result = cleanupResult?.[0] || { deleted_sessions: 0, deleted_users: 0 }
    const logResult = logCleanupResult || 0
    
    console.log('✅ Cleanup completed:', {
      deleted_sessions: result.deleted_sessions,
      deleted_users: result.deleted_users,
      deleted_logs: logResult,
      timestamp: result.cleanup_timestamp || new Date().toISOString()
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        deleted_sessions: result.deleted_sessions,
        deleted_users: result.deleted_users,
        deleted_logs: logResult,
        timestamp: result.cleanup_timestamp || new Date().toISOString(),
        message: `Cleanup completed: ${result.deleted_sessions} sessions, ${result.deleted_users} users, ${logResult} logs deleted`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})