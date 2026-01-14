import Taro from '@tarojs/taro'

const USER_INFO_KEY = 'user_info'

export interface UserInfo {
  openid: string
  nickName?: string
  avatarUrl?: string
}

// 获取用户 openid
export const getUserOpenId = async (): Promise<string> => {
  try {
    // 先从缓存读取
    const cached = Taro.getStorageSync(USER_INFO_KEY)
    if (cached && cached.openid) {
      return cached.openid
    }

    // 确认云开发已初始化
    // @ts-ignore - Taro.cloud 在小程序环境中可用
    if (typeof Taro.cloud === 'undefined') {
      throw new Error('云开发未初始化，请先调用 initCloud()')
    }

    // 尝试调用云函数获取 openid
    const result = await Taro.cloud.callFunction({
      name: 'login',
      data: {}
    })

    console.log("result init openid", result)

    const openid = (result.result as any)?.userInfo.openId
    if (openid) {
      // 缓存用户信息
      const userInfo: UserInfo = { openid }
      Taro.setStorageSync(USER_INFO_KEY, userInfo)
      return openid
    }

    throw new Error('无法获取用户 openid')
  } catch (error) {
    console.error('获取 openid 失败:', error)
    // 如果云函数调用失败，可以尝试其他方式获取或提示错误
    if ((error as any).errMsg) {
      console.error('云开发错误详情:', (error as any).errMsg)
    }
    throw error
  }
}

// 获取完整用户信息
export const getUserInfo = async (): Promise<UserInfo | null> => {
  try {
    const cached = Taro.getStorageSync(USER_INFO_KEY)
    if (cached) {
      return cached
    }

    const openid = await getUserOpenId()
    return { openid }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

// 清除用户信息（用于登出）
export const clearUserInfo = () => {
  Taro.removeStorageSync(USER_INFO_KEY)
}
