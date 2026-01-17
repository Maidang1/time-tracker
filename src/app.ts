import Taro, { useLaunch } from '@tarojs/taro'

import DataManager from './services/dataManager'
import './app.scss'

export default function App({ children }: { children: React.ReactNode }) {
  useLaunch(async () => {
    if (!Taro.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      Taro.cloud.init({
        traceUser: true,
      })
    }

    try {
      await DataManager.initialize()
      console.log('数据管理器初始化成功')
    } catch (error) {
      console.error('数据管理器初始化失败:', error)
    }
  })

  return children
}
