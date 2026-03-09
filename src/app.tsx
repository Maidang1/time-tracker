import Taro, { useLaunch } from '@tarojs/taro'

import { ThemeProvider } from './contexts/ThemeContext'
import { AppServicesProvider } from './presentation/context/AppServicesContext'
import { getAppServices } from './infrastructure/bootstrap/appBootstrap'
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
      await getAppServices().eventService.initialize()
      console.log('应用服务初始化成功')
    } catch (error) {
      console.error('应用服务初始化失败:', error)
    }
  })

  return (
    <AppServicesProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AppServicesProvider>
  )
}
