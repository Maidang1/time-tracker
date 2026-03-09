import { AnalyticsService } from '../../application/services/analyticsService'
import { EventApplicationService } from '../../application/services/eventApplicationService'
import { TaroCloudSyncGateway } from '../gateways/taroCloudSyncGateway'
import { LocalEventRepository, LocalSyncTaskRepository } from '../repositories/localStorageRepositories'
import { AppStore } from '../../presentation/state/appStore'

export type AppServices = ReturnType<typeof createAppServices>

export const createAppServices = () => {
  const store = new AppStore()
  const eventRepository = new LocalEventRepository()
  const syncTaskRepository = new LocalSyncTaskRepository()
  const syncGateway = new TaroCloudSyncGateway()
  const eventService = new EventApplicationService(
    eventRepository,
    syncTaskRepository,
    syncGateway,
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
