import Taro from '@tarojs/taro'
import type { RemoteEventStore } from '../../application/contracts'
import type { EventItem } from '../../domain/events'
import { normalizeEvents } from '../../domain/events'

const COLLECTION_NAME = 'events'

type CloudEventDocument = EventItem & {
  _id?: string
  _openid?: string
}

const toCloudEventDocument = (event: EventItem): Omit<CloudEventDocument, '_id' | '_openid'> => {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    records: event.records,
  }
}

export class TaroCloudEventStore implements RemoteEventStore {
  async initialize() {
    if (!Taro.cloud) {
      throw new Error('当前环境不支持云开发')
    }

    try {
      Taro.cloud.init({
        traceUser: true,
      })
    } catch (error) {
      throw new Error(
        error instanceof Error ? `云开发初始化失败: ${error.message}` : '云开发初始化失败',
      )
    }
  }

  private getCollection() {
    if (!Taro.cloud) {
      throw new Error('当前环境不支持云开发')
    }

    return Taro.cloud.database().collection(COLLECTION_NAME)
  }

  async pullEvents() {
    const collection = this.getCollection()
    const limit = 20
    const chunks: CloudEventDocument[] = []
    let page = 0

    while (true) {
      const response = await collection.skip(page * limit).limit(limit).get()
      const batch = Array.isArray(response.data) ? (response.data as CloudEventDocument[]) : []
      chunks.push(...batch)
      if (batch.length < limit) {
        break
      }
      page += 1
    }

    return normalizeEvents(chunks)
  }

  async upsertEvent(event: EventItem) {
    const collection = this.getCollection()
    const payload = toCloudEventDocument(event)
    const { data } = await collection.where({ id: event.id }).get()

    if (data.length > 0) {
      const docId = data[0]._id as string
      await collection.doc(docId).update({ data: payload })
      return
    }

    await collection.add({ data: payload })
  }

  async deleteEvent(eventId: number) {
    const collection = this.getCollection()
    const { data } = await collection.where({ id: eventId }).get()

    if (data.length > 0) {
      const docId = data[0]._id as string
      await collection.doc(docId).remove({})
    }
  }
}
