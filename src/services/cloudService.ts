import Taro from '@tarojs/taro'

import type { EventItem } from '../types/events'

// 云开发环境 ID（需要在微信开发者工具中创建）
// @ts-ignore - CLOUD_ENV_ID 由 Taro 配置注入
const ENV_ID = typeof CLOUD_ENV_ID !== 'undefined' ? CLOUD_ENV_ID : 'madinah-6gmlaixt1cd742c3'

// 初始化云开发
export const initCloud = () => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (typeof Taro.cloud !== 'undefined') {
    try {
      Taro.cloud.init({
        env: ENV_ID,
        traceUser: true
      })
      console.log('云开发初始化成功')
    } catch (error) {
      console.error('云开发初始化失败:', error)
    }
  }
}

// 获取云数据库实例
const getDB = () => {
  // @ts-ignore - Taro.cloud 在小程序环境中可用
  if (typeof Taro.cloud === 'undefined') {
    throw new Error('云开发仅支持微信小程序环境')
  }
  return Taro.cloud.database()
}

// 集合名称
const COLLECTION_NAME = 'events'

// 获取所有事件（按用户过滤）
export const fetchEventsFromCloud = async (): Promise<EventItem[]> => {
  try {
    const db = getDB()
    
    // 不需要手动过滤 _openid，云开发会自动只返回当前用户的数据
    const result = await db.collection(COLLECTION_NAME)
      .orderBy('createdAt', 'desc')
      .get()
    
    return result.data as EventItem[]
  } catch (error) {
    console.error('获取云端事件失败:', error)
    throw error
  }
}

// 获取单个事件（按用户过滤）
export const fetchEventFromCloud = async (eventId: number): Promise<EventItem | null> => {
  try {
    const db = getDB()
    
    // 云开发会自动过滤，只返回当前用户的数据
    const result = await db.collection(COLLECTION_NAME)
      .where({
        id: eventId
      })
      .get()
    
    return result.data.length > 0 ? result.data[0] as EventItem : null
  } catch (error) {
    console.error('获取云端事件失败:', error)
    return null
  }
}

// 创建事件（云开发会自动添加 _openid）
export const createEventInCloud = async (event: EventItem): Promise<string> => {
  try {
    const db = getDB()
    
    // 不需要手动添加 _openid，云开发会自动添加
    const result = await db.collection(COLLECTION_NAME).add({
      data: event
    })
    
    return result._id as string
  } catch (error) {
    console.error('创建云端事件失败:', error)
    throw error
  }
}

// 更新事件（云开发会自动验证权限）
export const updateEventInCloud = async (event: EventItem): Promise<void> => {
  try {
    const db = getDB()
    
    // 先查找文档 _id（云开发会自动只返回当前用户的数据）
    const findResult = await db.collection(COLLECTION_NAME)
      .where({
        id: event.id
      })
      .get()
    
    if (findResult.data.length === 0) {
      throw new Error('事件不存在或无权限')
    }
    
    const docId = findResult.data[0]._id as string
    
    // 过滤掉云开发的保留字段
    const { _id, _openid, ...eventData } = event as any
    
    // 更新文档
    await db.collection(COLLECTION_NAME).doc(docId).update({
      data: eventData
    })
  } catch (error) {
    console.error('更新云端事件失败:', error)
    throw error
  }
}

// 删除事件（云开发会自动验证权限）
export const deleteEventInCloud = async (eventId: number): Promise<void> => {
  try {
    const db = getDB()
    
    // 先查找文档 _id（云开发会自动只返回当前用户的数据）
    const findResult = await db.collection(COLLECTION_NAME)
      .where({
        id: eventId
      })
      .get()
    
    if (findResult.data.length === 0) {
      throw new Error('事件不存在或无权限')
    }
    
    const docId = findResult.data[0]._id as string
    
    // 删除文档
    await db.collection(COLLECTION_NAME).doc(docId).remove({})
  } catch (error) {
    console.error('删除云端事件失败:', error)
    throw error
  }
}

// 批量创建事件（用于数据迁移，云开发会自动添加 _openid）
export const batchCreateEventsInCloud = async (events: EventItem[]): Promise<void> => {
  try {
    const db = getDB()
    
    // 云开发批量操作限制为 20 条
    const batchSize = 20
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      // 不需要手动添加 _openid，云开发会自动添加
      const promises = batch.map(event => 
        db.collection(COLLECTION_NAME).add({ data: event })
      )
      await Promise.all(promises)
    }
    
    console.log(`成功迁移 ${events.length} 条数据到云端`)
  } catch (error) {
    console.error('批量创建事件失败:', error)
    throw error
  }
}

// 调用云函数示例
export const callCloudFunction = async (name: string, data: any) => {
  try {
    const result = await Taro.cloud.callFunction({
      name,
      data
    })
    return result.result
  } catch (error) {
    console.error('调用云函数失败:', error)
    throw error
  }
}

// 上传文件到云存储
export const uploadToCloud = async (filePath: string, cloudPath: string) => {
  try {
    const result = await Taro.cloud.uploadFile({
      cloudPath,
      filePath
    })
    return result.fileID
  } catch (error) {
    console.error('上传文件失败:', error)
    throw error
  }
}

// 从云存储下载文件
export const downloadFromCloud = async (fileID: string) => {
  try {
    const result = await Taro.cloud.downloadFile({
      fileID
    })
    return result.tempFilePath
  } catch (error) {
    console.error('下载文件失败:', error)
    throw error
  }
}
