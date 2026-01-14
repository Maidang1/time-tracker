import { View, Text, Button } from '@tarojs/components';
import { navigateBack, reLaunch } from '@tarojs/taro';
import { useEffect, useState } from 'react';
import DataManager from '../../services/dataManager';

import './index.scss';

export default function SyncStatusPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    
    try {
      const success = await DataManager.syncToRemote();
      if (success) {
        setSyncSuccess(true);
        // 可以设置一个计时器自动返回上一页
        setTimeout(() => {
          navigateBack();
        }, 1500);
      } else {
        setSyncError('数据同步失败，请检查网络后重试');
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '同步时发生未知错误');
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = () => {
    setSyncSuccess(false);
    setSyncError(null);
  };

  const handleGoHome = () => {
    // 返回首页
    reLaunch({
      url: '/pages/index/index'
    });
  };

  return (
    <View className="sync-status-page">
      <View className="sync-content">
        {!syncSuccess && !syncing && (
          <View className="sync-prompt">
            <Text className="sync-title">数据同步提醒</Text>
            <Text className="sync-message">
              检测到本地有未同步的数据更改
            </Text>
            <Button 
              className="sync-button primary" 
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? '同步中...' : '立即同步'}
            </Button>
            <Button 
              className="sync-button secondary" 
              onClick={handleGoHome}
            >
              稍后同步
            </Button>
          </View>
        )}

        {syncing && (
          <View className="sync-progress">
            <Text className="sync-message">正在同步数据...</Text>
          </View>
        )}

        {syncSuccess && (
          <View className="sync-success">
            <Text className="sync-title">✓</Text>
            <Text className="sync-message">数据同步成功！</Text>
          </View>
        )}

        {syncError && (
          <View className="sync-error">
            <Text className="sync-title">同步失败</Text>
            <Text className="sync-message error-message">{syncError}</Text>
            <Button 
              className="sync-button primary" 
              onClick={handleRetry}
            >
              重试
            </Button>
            <Button 
              className="sync-button secondary" 
              onClick={handleGoHome}
            >
              稍后处理
            </Button>
          </View>
        )}

        <View className="sync-info">
          <Text className="info-text">
            {DataManager.hasChanges() 
              ? '仍有未同步的更改' 
              : '所有数据均已同步'}
          </Text>
        </View>
      </View>
    </View>
  );
}