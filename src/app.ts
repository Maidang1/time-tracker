import { useLaunch } from '@tarojs/taro'

import DataManager from './services/dataManager'
import './app.scss'

export default function App({ children }: { children: React.ReactNode }) {
  useLaunch(async () => {
    try {
      await DataManager.initialize()
      console.log('数据管理器初始化成功')
    } catch (error) {
      console.error('数据管理器初始化失败:', error)
    }
  })

  return children
}
