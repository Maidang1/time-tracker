import { useEffect, useState } from 'react';
import { useAppHide, useAppShow } from '@tarojs/taro';
import DataManager from '../services/dataManager';
import { showModal } from '@tarojs/taro';

const SyncNotification = () => {
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);

  // 监听应用前后台切换
  useAppHide(async () => {
    // 应用进入后台时尝试同步数据
    console.log('应用进入后台，尝试同步数据...');
    try {
      const success = await DataManager.syncToRemote();
      if (!success) {
        console.error('数据同步失败，需要用户手动同步');
        // 在应用返回前台时显示同步失败提醒
        setShowSyncPrompt(true);
      }
    } catch (error) {
      console.error('数据同步过程中抛出异常:', error);
      setShowSyncPrompt(true);
    }
  });

  // 应用从前台回到后台
  useAppShow(() => {
    // 检查是否有未同步的更改，如果有则提醒用户
    if (DataManager.hasChanges()) {
      console.log('检测到有未同步的数据更改');
      setShowSyncPrompt(true);
    }
  });

  // 同步失败模态框
  useEffect(() => {
    if (showSyncPrompt && DataManager.hasChanges()) {
      showModal({
        title: '数据同步提醒',
        content: '检测到有未同步的数据，是否立即同步到云端？',
        confirmText: '立即同步',
        cancelText: '稍后同步',
        success: async (res) => {
          if (res.confirm) {
            try {
              const success = await DataManager.syncToRemote();
              if (success) {
                setShowSyncPrompt(false);
                // 这里可以显示成功提示
              } else {
                // 同步失败，继续显示提醒
              }
            } catch (error) {
              console.error('手动同步失败:', error);
            }
          } else {
            // 用户选择稍后同步，继续显示小红点或其他提醒
          }
        },
        fail: (err) => {
          console.error('显示同步提醒失败:', err);
        }
      });
    }
  }, [showSyncPrompt]);

  return null;
};

export default SyncNotification;