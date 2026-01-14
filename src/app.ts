import { useEffect } from 'react'
import { useLaunch } from '@tarojs/taro'

import { initCloud } from './services/databaseService'
import DataManager from './services/dataManager'
import './app.scss'

export default function App({ children }: { children: React.ReactNode }) {
  useLaunch(async () => {
    console.log('App launched.')
    initCloud()

    try {
      await DataManager.initialize()
      console.log('数据管理器初始化成功')
    } catch (error) {
      console.error('数据管理器初始化失败:', error)
    }
  })

  return children
}
