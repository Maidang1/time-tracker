import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import DataManager from '../services/dataManager';

let syncFailureModalVisible = false;

const GlobalDataManager = () => {
  useEffect(() => {
    const syncBeforeHide = () => {
      console.log('小程序即将进入后台，尝试同步数据...');
      
      const pendingChanges = DataManager.hasChanges();
      if (!pendingChanges) {
        console.log('没有待同步的数据');
        return;
      }

      console.log(`有待同步的数据，同步队列长度: ${DataManager.getPendingChangesCount?.() || 'unknown'}`);

      DataManager.syncToRemote()
        .then((success) => {
          if (success) {
            console.log('数据同步成功');
          } else {
            console.log('数据同步部分失败或没有数据需要同步');
          }
        })
        .catch((error) => {
          console.error('数据同步失败:', error);
        });
    };

    Taro.eventCenter.on('onAppHide', syncBeforeHide);

    const beforeUnloadHandler = () => {
      syncBeforeHide();
    };

    window.addEventListener?.('beforeunload', beforeUnloadHandler);

    return () => {
      Taro.eventCenter.off('onAppHide', syncBeforeHide);
      window.removeEventListener?.('beforeunload', beforeUnloadHandler);
    };
  }, []);

  return null;
};

export default GlobalDataManager;