import { AnalyticsService } from '../../application/services/analyticsService'
import { EventApplicationService } from '../../application/services/eventApplicationService'
import Taro from '@tarojs/taro'
import { NoopRemoteEventStore } from '../gateways/noopRemoteEventStore'
import { TaroCloudEventStore } from '../gateways/taroCloudEventStore'
import { LocalEventRepository, LocalSyncTaskRepository } from '../repositories/localStorageRepositories'
import { AppStore } from '../../presentation/state/appStore'

export type AppServices = ReturnType<typeof createAppServices>

const createRemoteEventStore = () => {
  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP && Taro.cloud) {
    return new TaroCloudEventStore()
  }

  return new NoopRemoteEventStore()
}

export const createAppServices = () => {
  const store = new AppStore()
  const eventRepository = new LocalEventRepository()
  const syncTaskRepository = new LocalSyncTaskRepository()
  const remoteEventStore = createRemoteEventStore()
  const eventService = new EventApplicationService(
    eventRepository,
    syncTaskRepository,
    remoteEventStore,
    store,
  )
  const analyticsService = new AnalyticsService()

  return {
    store,
    eventService,
    analyticsService,
  }
}

let services: AppServices | null = null

export const getAppServices = () => {
  if (!services) {
    services = createAppServices()
  }
  return services
}
