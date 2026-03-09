import type { PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import type { AppState } from '../state/appStore'
import { getAppServices } from '../../infrastructure/bootstrap/appBootstrap'

const AppServicesContext = createContext(getAppServices())

export function AppServicesProvider({ children }: PropsWithChildren) {
  const services = useMemo(() => getAppServices(), [])
  return (
    <AppServicesContext.Provider value={services}>
      {children}
    </AppServicesContext.Provider>
  )
}

export const useAppServices = () => useContext(AppServicesContext)

export function useAppSelector<T>(selector: (state: AppState) => T) {
  const { store } = useAppServices()
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  )
}
