import Taro from '@tarojs/taro'
import type { EventItem, EventRecord } from '../types/events'
import { getUserOpenId } from './userService'

// 云开发环境 ID
// @ts-ignore - CLOUD_ENV_ID 由 Taro 配置注入
const ENV_ID = typeof CLOUD_ENV_ID !== 'undefined' ? CLOUD_ENV_ID : ''

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
const EVENTS_COLLECTION = 'events'
const RECORDS_COLLECTION = 'records'

// 获取所有事件（按用户过滤）
export const fetchEventsFromCloud = async (): Promise<EventItem[]> => {
  try {
    // 确保云开发已初始化
    // @ts-ignore - Taro.cloud 在小程序环境中可用
    if (typeof Taro.cloud === 'undefined' || !Taro.cloud) {
      console.error('云开发未初始化，返回空数组')
      return []
    }

    const db = getDB()
    const openid = await getUserOpenId()

    // 查询用户的所有事件
    const result = await db.collection(EVENTS_COLLECTION)
      .where({
        _openid: openid
      })
      .orderBy('createdAt', 'desc')
      .get()

    const events = result.data as EventItem[]

    // 为每个事件添加记录数等统计信息（如果需要）
    return events
  } catch (error: any) {
    // 如果是集合不存在的错误，则返回空数组
    if (error.errMsg && error.errMsg.includes('collection not exists')) {
      console.warn(`事件集合 ${EVENTS_COLLECTION} 不存在，返回空数组`)
      return []
    }
    console.error('获取云端事件失败:', error)
    throw error
  }
}

// 获取单个事件基本信息（不包含记录）
export const fetchEventFromCloud = async (eventId: number): Promise<EventItem | null> => {
  try {
    // 确保云开发已初始化
    // @ts-ignore - Taro.cloud 在小程序环境中可用
    if (typeof Taro.cloud === 'undefined' || !Taro.cloud) {
      console.error('云开发未初始化，返回空结果')
      return null
    }

    const db = getDB()
    const openid = await getUserOpenId()

    const result = await db.collection(EVENTS_COLLECTION)
      .where({
        id: eventId,
        _openid: openid
      })
      .get()

    return result.data.length > 0 ? result.data[0] as EventItem : null
  } catch (error: any) {
    // 如果是集合不存在的错误，则返回null
    if (error.errMsg && error.errMsg.includes('collection not exists')) {
      console.warn(`事件集合 ${EVENTS_COLLECTION} 不存在，返回空结果`)
      return null
    }
    console.error('获取云端事件失败:', error)
    return null
  }
}

// 获取事件及其记录
export const fetchEventWithRecords = async (eventId: number): Promise<EventItem | null> => {
  try {
    // 获取事件基本信息
    const event = await fetchEventFromCloud(eventId)
    if (!event) {
      return null
    }

    // 获取相关的记录
    let records: EventRecord[] = []
    try {
      records = await fetchRecordsByEventId(eventId)
    } catch (recordsError: any) {
      // 如果是集合不存在的错误，返回事件但没有记录
      if (recordsError.errMsg && recordsError.errMsg.includes('collection not exists')) {
        console.warn(`记录集合 ${RECORDS_COLLECTION} 不存在，返回事件但没有记录`)
      } else {
        console.error('获取事件记录失败:', recordsError)
        throw recordsError
      }
    }

    // 组装完整的事件对象
    return {
      ...event,
      records: records
    }
  } catch (error) {
    console.error('获取事件及记录失败:', error)
    return null
  }
}

// 获取特定事件的记录（带分页支持）
export const fetchRecordsByEventId = async (
  eventId: number,
  page: number = 1,
  pageSize: number = 50
): Promise<EventRecord[]> => {
  try {
    const db = getDB()
    const openid = await getUserOpenId()

    const result = await db.collection(RECORDS_COLLECTION)
      .where({
        eventId,
        _openid: openid
      })
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return result.data as EventRecord[]
  } catch (error: any) {
    // 如果是集合不存在的错误，则返回空数组
    if (error.errMsg && error.errMsg.includes('collection not exists')) {
      console.warn(`记录集合 ${RECORDS_COLLECTION} 不存在，返回空数组`)
      return []
    }
    console.error('获取事件记录失败:', error)
    throw error
  }
}

// 创建事件
export const createEventInCloud = async (event: EventItem): Promise<string> => {
  try {
    const db = getDB()

    // 准备事件数据，确保不包含records数组到主文档
    const { records, _id, _openid, ...eventData } = event as any

    const result = await db.collection(EVENTS_COLLECTION).add({
      data: eventData
    })

    return result._id as string
  } catch (error) {
    console.error('创建云端事件失败:', error)
    throw error
  }
}

// 创建记录
export const createRecordInCloud = async (record: Omit<EventRecord, 'id'> & { eventId: number }): Promise<string> => {
  try {
    const db = getDB()

    const recordWithMetadata = {
      ...record,
      id: Date.now(), // 生成唯一ID
      createdAt: new Date().toISOString()
    }

    const result = await db.collection(RECORDS_COLLECTION).add({
      data: recordWithMetadata
    })

    return result._id as string
  } catch (error) {
    console.error('创建云端记录失败:', error)
    throw error
  }
}

// 更新事件（不包含记录）
export const updateEventInCloud = async (event: EventItem): Promise<void> => {
  try {
    const db = getDB()
    const openid = await getUserOpenId()

    // 查找文档 _id
    const findResult = await db.collection(EVENTS_COLLECTION)
      .where({
        id: event.id,
        _openid: openid
      })
      .get()

    if (findResult.data.length === 0) {
      throw new Error('事件不存在或无权限')
    }

    const docId = findResult.data[0]._id as string

    // 分离事件数据和记录数据，不更新记录部分
    const { records, _id, _openid, ...eventData } = event as any

    // 更新事件文档
    await db.collection(EVENTS_COLLECTION).doc(docId).update({
      data: eventData
    })
  } catch (error) {
    console.error('更新云端事件失败:', error)
    throw error
  }
}

// 更新特定记录
export const updateRecordInCloud = async (record: EventRecord & { eventId: number }): Promise<void> => {
  try {
    const db = getDB()
    const openid = await getUserOpenId()

    // 查找记录文档 _id
    const findResult = await db.collection(RECORDS_COLLECTION)
      .where({
        id: record.id,
        eventId: record.eventId,
        _openid: openid
      })
      .get()

    if (findResult.data.length === 0) {
      throw new Error('记录不存在或无权限')
    }

    const docId = findResult.data[0]._id as string

    // 准备要更新的数据，排除云开发保留字段
    const { _id, _openid, ...recordData } = record as any

    // 更新记录文档
    await db.collection(RECORDS_COLLECTION).doc(docId).update({
      data: recordData
    })
  } catch (error) {
    console.error('更新云端记录失败:', error)
    throw error
  }
}

// 删除事件（同时删除其关联的所有记录）
export const deleteEventInCloud = async (eventId: number): Promise<void> => {
  try {
    const db = getDB()
    const openid = await getUserOpenId()

    // 先查找事件文档 _id
    const eventFindResult = await db.collection(EVENTS_COLLECTION)
      .where({
        id: eventId,
        _openid: openid
      })
      .get()

    if (eventFindResult.data.length === 0) {
      throw new Error('事件不存在或无权限')
    }

    const eventDocId = eventFindResult.data[0]._id as string

    // 删除关联的所有记录
    await db.collection(RECORDS_COLLECTION)
      .where({
        eventId,
        _openid: openid
      })
      .remove()

    // 删除事件本身
    await db.collection(EVENTS_COLLECTION).doc(eventDocId).remove({})
  } catch (error) {
    console.error('删除云端事件失败:', error)
    throw error
  }
}

// 删除特定记录
export const deleteRecordInCloud = async (recordId: number, eventId: number): Promise<void> => {
  try {
    const db = getDB()
    const openid = await getUserOpenId()

    // 查找记录文档 _id
    const findResult = await db.collection(RECORDS_COLLECTION)
      .where({
        id: recordId,
        eventId,
        _openid: openid
      })
      .get()

    if (findResult.data.length === 0) {
      throw new Error('记录不存在或无权限')
    }

    const docId = findResult.data[0]._id as string

    // 删除记录文档
    await db.collection(RECORDS_COLLECTION).doc(docId).remove({})
  } catch (error) {
    console.error('删除云端记录失败:', error)
    throw error
  }
}

// 批量创建事件
export const batchCreateEventsInCloud = async (events: EventItem[]): Promise<void> => {
  try {
    const db = getDB()

    // 云开发批量操作限制为 20 条
    const batchSize = 20
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      const promises = batch.map(event => {
        const { records, _id, _openid, ...eventData } = event as any
        return db.collection(EVENTS_COLLECTION).add({
          data: eventData
        })
      })
      await Promise.all(promises)
    }

    console.log(`成功迁移 ${events.length} 条事件数据到云端`)
  } catch (error) {
    console.error('批量创建事件失败:', error)
    throw error
  }
}

// 通过ID列表获取事件
export const fetchEventsByIds = async (eventIds: number[]): Promise<EventItem[]> => {
  try {
    const db = getDB()
    const openid = await getUserOpenId()

    const result = await db.collection(EVENTS_COLLECTION)
      .where({
        id: db.command.in(eventIds),
        _openid: openid
      })
      .get()

    return result.data as EventItem[]
  } catch (error) {
    console.error('批量获取事件失败:', error)
    throw error
  }
}

// 数据迁移功能：将旧格式的事件数据（包含内嵌记录）转换为新格式（记录独立存储）
export const migrateEventRecordsToSeparateCollection = async (): Promise<void> => {
  try {
    const db = getDB()
    const openid = await getUserOpenId()

    // 获取所有旧格式的事件（包含记录）
    const result = await db.collection(EVENTS_COLLECTION)
      .where({
        _openid: openid
      })
      .get()

    const events = result.data as EventItem[]

    // 为每个事件处理其内嵌的记录
    for (const event of events) {
      if (event.records && event.records.length > 0) {
        // 将每条记录插入到单独的records集合中
        for (const record of event.records) {
          await db.collection(RECORDS_COLLECTION).add({
            data: {
              ...record,
              eventId: event.id
            }
          })
        }

        // 从事件文档中移除记录数组（保留其他元数据）
        const { records, ...eventWithoutRecords } = event
        await db.collection(EVENTS_COLLECTION).doc(event._id!).update({
          data: eventWithoutRecords
        })
      }
    }

    console.log(`完成迁移 ${events.length} 个事件的记录`)
  } catch (error) {
    console.error('迁移事件记录失败:', error)
    throw error
  }
}