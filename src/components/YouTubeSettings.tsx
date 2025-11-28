import React from 'react';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import { Box, Stack, Inline } from '@atlaskit/primitives';

interface YouTubeState {
  enabled: boolean;
  videoUrl: string;
  keyword: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  streamTitle: string;
  processedCount: number;
  errorMessage: string;
}

export function YouTubeSettings() {
  const [state, setState] = React.useState<YouTubeState>({
    enabled: false,
    videoUrl: '',
    keyword: '!参加',
    status: 'disconnected',
    streamTitle: '',
    processedCount: 0,
    errorMessage: ''
  });

  // Sync with global app state
  React.useEffect(() => {
    const syncFromGlobal = () => {
      try {
        const appState = (window as any).getAppState?.();
        if (appState?.youtube) {
          setState(prev => ({
            ...prev,
            enabled: appState.youtube.enabled || false,
            videoUrl: appState.youtube.videoUrl || '',
            keyword: appState.youtube.keyword || '!参加',
            status: appState.youtube.status || 'disconnected',
            streamTitle: appState.youtube.streamTitle || '',
            processedCount: appState.youtube.processedCount || 0,
            errorMessage: appState.youtube.errorMessage || ''
          }));
        }
      } catch {}
    };

    syncFromGlobal();
    
    // Listen for updates from main app
    (window as any).refreshYouTubeSettings = syncFromGlobal;
    
    return () => {
      delete (window as any).refreshYouTubeSettings;
    };
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const videoUrl = e.target.value;
    setState(prev => ({ ...prev, videoUrl }));
    
    // Sync to legacy DOM element if exists
    const urlInput = document.getElementById('youtubeUrl') as HTMLInputElement;
    if (urlInput) urlInput.value = videoUrl;
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setState(prev => ({ ...prev, keyword }));
    
    // Sync to legacy DOM element if exists
    const keywordInput = document.getElementById('youtubeKeyword') as HTMLInputElement;
    if (keywordInput) keywordInput.value = keyword;
  };

  const handleEnabledChange = () => {
    const newEnabled = !state.enabled;
    
    // Trigger the main app's toggle function
    try {
      if (newEnabled) {
        setState(prev => ({ ...prev, enabled: true }));
        (window as any).startYouTubeIntegration?.(state.videoUrl, state.keyword);
      } else {
        // 即座にUIを更新
        setState(prev => ({ ...prev, enabled: false, status: 'disconnected' }));
        (window as any).stopYouTubeIntegration?.();
      }
    } catch (e) {
      console.error('YouTube toggle error:', e);
      // エラー時は状態をリセット
      setState(prev => ({ ...prev, enabled: false, status: 'disconnected' }));
    }
  };

  const handleConnect = () => {
    try {
      (window as any).connectYouTube?.(state.videoUrl, state.keyword);
    } catch {}
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'connected': return '#22c55e';
      case 'connecting': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case 'connected': return `接続中: ${state.streamTitle || '配信'}`;
      case 'connecting': return '接続中...';
      case 'error': return `エラー: ${state.errorMessage}`;
      default: return '未接続';
    }
  };

  // Check if YouTube API key is configured
  const hasApiKey = !!(window as any).APP_CONFIG?.youtubeApiKey;

  if (!hasApiKey) {
    return (
      <Box padding="space.200" backgroundColor="color.background.warning">
        <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
          YouTube API キーが設定されていません。環境変数 YOUTUBE_API_KEY を設定してください。
        </p>
      </Box>
    );
  }

  return (
    <Box>
      <Stack space="space.150">
        <Box>
          <label htmlFor="yt-url" style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '14px' }}>
            YouTube Live URL
          </label>
          <Inline space="space.100" alignBlock="center">
            <Box style={{ flex: 1 }}>
              <Textfield
                id="yt-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={state.videoUrl}
                onChange={handleUrlChange}
                isDisabled={state.enabled}
              />
            </Box>
            <button
              type="button"
              className="btn"
              onClick={handleConnect}
              disabled={state.enabled || !state.videoUrl}
              style={{ padding: '8px 16px', fontSize: '14px' }}
            >
              接続テスト
            </button>
          </Inline>
        </Box>

        <Box>
          <label htmlFor="yt-keyword" style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '14px' }}>
            トリガーキーワード
          </label>
          <Textfield
            id="yt-keyword"
            placeholder="!参加"
            value={state.keyword}
            onChange={handleKeywordChange}
            isDisabled={state.enabled}
            width="medium"
          />
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '12px' }}>
            視聴者がこのキーワードをコメントすると自動的に参加登録されます
          </p>
        </Box>

        <Box>
          <Checkbox
            label="YouTube Live 連携を有効にする"
            isChecked={state.enabled}
            onChange={handleEnabledChange}
            isDisabled={!state.videoUrl || state.status === 'connecting'}
          />
        </Box>

        <Box
          padding="space.100"
          backgroundColor="color.background.neutral"
          style={{ borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              display: 'inline-block'
            }}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>
            {getStatusText()}
          </span>
          {state.status === 'connected' && (
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>
              処理済み: {state.processedCount} メッセージ
            </span>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
