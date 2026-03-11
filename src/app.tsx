import { useLaunch } from '@tarojs/taro'

import { ThemeProvider } from './contexts/ThemeContext'
import { AppServicesProvider } from './presentation/context/AppServicesContext'
import { getAppServices } from './infrastructure/bootstrap/appBootstrap'
import './app.scss'

export default function App({ children }: { children: React.ReactNode }) {
  useLaunch(async () => {
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
