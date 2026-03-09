import Taro from '@tarojs/taro'
import type { RemoteSyncGateway, SyncTask } from '../../application/contracts'
import { normalizeEvents } from '../../domain/events'

const COLLECTION_NAME = 'events'

const toCloudPayload = (payload: SyncTask['payload']) => {
  if (!payload) {
    throw new Error('同步任务缺少 payload')
  }

  const { _id, _openid, ...cloudPayload } = payload
  return cloudPayload
}

export class TaroCloudSyncGateway implements RemoteSyncGateway {
  private getCollection() {
    if (!Taro.cloud) {
      throw new Error('当前环境不支持云开发')
    }
    return Taro.cloud.database().collection(COLLECTION_NAME)
  }

  async pullEvents() {
    const collection = this.getCollection()
    const limit = 20
    const chunks: any[] = []
    let page = 0

    while (true) {
      const response = await collection.skip(page * limit).limit(limit).get()
      const batch = Array.isArray(response.data) ? response.data : []
      chunks.push(...batch)
      if (batch.length < limit) {
        break
      }
      page += 1
    }

    return normalizeEvents(chunks)
  }

  async pushTask(task: SyncTask) {
    const collection = this.getCollection()

    if (task.type === 'delete') {
      const { data } = await collection.where({ id: task.eventId }).get()
      if (data.length > 0) {
        const docId = data[0]._id as string
        await collection.doc(docId).remove({})
      }
      return
    }

    if (!task.payload) {
      throw new Error('同步任务缺少 payload')
    }

    const payload = toCloudPayload(task.payload)
    const { data } = await collection.where({ id: task.payload.id }).get()
    if (data.length > 0) {
      const docId = data[0]._id as string
      await collection.doc(docId).update({ data: payload })
      return
    }

    await collection.add({ data: payload })
  }
}
