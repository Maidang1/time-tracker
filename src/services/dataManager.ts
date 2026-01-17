import Taro from '@tarojs/taro';
import type { EventItem, EventRecord } from '../types/events';

type DataChangeListener = () => void;

export type SyncErrorCallback = (error: { type: string; message: string; details?: any; retry?: () => Promise<void> }) => void;

interface SyncTask {
  id: string; // UUID or timestamp
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any; // EventItem or id
  timestamp: number;
}

const STORAGE_KEY_EVENTS = 'time-track-events';
const STORAGE_KEY_QUEUE = 'time-track-queue';
const COLLECTION_NAME = 'events';
const COLLECTION_RECORDS = 'records';

class DataManager {
  private static instance: DataManager;
  private events: EventItem[] = [];
  private queue: SyncTask[] = [];
  private listeners: DataChangeListener[] = [];
  private syncErrorCallback: SyncErrorCallback | null = null;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;
  private isProcessingQueue: boolean = false;

  private constructor() {}

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  public setSyncErrorCallback(callback: SyncErrorCallback): void {
    this.syncErrorCallback = callback;
  }

  subscribe(listener: DataChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Notify listener error:', error);
      }
    });
  }

  private notifySyncError(type: string, message: string, details?: any, retry?: () => Promise<void>): void {
    console.error(`Sync error [${type}]: ${message}`, details);
    if (this.syncErrorCallback) {
      this.syncErrorCallback({ type, message, details, retry });
    }
  }

  public async waitForInitialization(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    if (this.initializationPromise) return this.initializationPromise;
    return this.initialize();
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // 1. Load from Local Storage (Fast)
        const storedEvents = Taro.getStorageSync(STORAGE_KEY_EVENTS);
        const storedQueue = Taro.getStorageSync(STORAGE_KEY_QUEUE);

        if (storedEvents) {
          // Sanitize loaded events to ensure records array exists
          this.events = storedEvents.map((e: EventItem) => ({
            ...e,
            records: Array.isArray(e.records) ? e.records : []
          }));
          // Notify immediately to show data
          this.notifyListeners();
        }

        if (storedQueue) {
          this.queue = storedQueue;
        }

        this.isInitialized = true;
        console.log('DataManager initialized locally.');

        // 2. Process Queue (Background)
        if (this.queue.length > 0) {
          this.processQueue();
        }

        // 3. Sync from Cloud (Background)
        this.syncFromCloud();

      } catch (error) {
        console.error('DataManager initialization failed:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  // --- Persistence ---

  private saveToStorage(): void {
    try {
      Taro.setStorageSync(STORAGE_KEY_EVENTS, this.events);
      Taro.setStorageSync(STORAGE_KEY_QUEUE, this.queue);
    } catch (e) {
      console.error('Failed to save to storage', e);
    }
  }

  // --- Queue Processing ---

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    if (this.queue.length === 0) return;

    this.isProcessingQueue = true;
    console.log(`Starting queue processing. Items: ${this.queue.length}`);

    try {
      // Check network
      const networkType = await Taro.getNetworkType();
      if (networkType.networkType === 'none') {
        console.log('No network, pausing queue processing.');
        this.isProcessingQueue = false;
        return;
      }

      const db = Taro.cloud.database();
      const collection = db.collection(COLLECTION_NAME);

      // Process items one by one
      while (this.queue.length > 0) {
        const task = this.queue[0]; // Peek
        console.log(`Processing task: ${task.type} - ${task.id}`);

        try {
          if (task.type === 'CREATE') {
            const event = task.payload as EventItem;
            // Check existence using business ID
            const { data } = await collection.where({ id: event.id }).get();
            
            if (data.length > 0) {
              // Exists, update it
              const docId = data[0]._id as string;
              // delete _id from event to avoid updating it
              const { _id, ...eventData } = event;
              await collection.doc(docId).update({ data: eventData });
            } else {
              // New
              const res = await collection.add({ data: event });
              // Update local event with _id
              const localEvent = this.events.find(e => e.id === event.id);
              if (localEvent) {
                // @ts-ignore
                localEvent._id = res._id;
                this.saveToStorage();
              }
            }

          } else if (task.type === 'UPDATE') {
            const event = task.payload as EventItem;
            // Find _id
            const { data } = await collection.where({ id: event.id }).get();
            
            if (data.length > 0) {
                const docId = data[0]._id as string;
                await collection.doc(docId).update({
                    data: {
                        title: event.title,
                        description: event.description,
                        records: event.records,
                        updatedAt: event.updatedAt
                    }
                });
            } else {
                // Warning: Update target not found. Maybe create it?
                // For now, ignore or log.
                console.warn(`Update target ${event.id} not found in cloud.`);
            }

          } else if (task.type === 'DELETE') {
            const id = task.payload as number;
            // Find _id
            const { data } = await collection.where({ id: id }).get();
            
            if (data.length > 0) {
                const docId = data[0]._id as string;
                // @ts-ignore
                await collection.doc(docId).remove();
            }
          }

          // Success: Remove from queue
          this.queue.shift();
          this.saveToStorage();

        } catch (error: any) {
            console.error('Task failed:', error);
            // Check if it's a network error
            if (error.errMsg && (error.errMsg.includes('timeout') || error.errMsg.includes('network'))) {
                // Network error, stop processing, keep in queue
                console.log('Network error detected, stopping queue.');
                break;
            } else {
                // Logic error (e.g. validation, permission)
                // For now, we remove it to avoid blocking, OR we notify user.
                // Given "Retry Button" requirement, we might want to notify.
                // But for "Best Practice", we shouldn't block.
                // Let's notify and REMOVE it from queue? Or keep it?
                // If we keep it, we block everything else.
                // Let's Notify and Pause.
                this.notifySyncError(task.type, '同步失败，请重试', error, async () => {
                    // Retry function: Trigger processQueue again
                    this.processQueue();
                });
                break; // Stop processing to let user decide or wait
            }
        }
      }

    } catch (e) {
      console.error('Queue processing fatal error:', e);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // --- Cloud Sync ---

  private async syncFromCloud(): Promise<void> {
    console.log('Starting cloud sync...');
    try {
        const db = Taro.cloud.database();
        const eventCollection = db.collection(COLLECTION_NAME);
        const recordCollection = db.collection(COLLECTION_RECORDS);
        const MAX_LIMIT = 20;

        let allCloudEvents: EventItem[] = [];
        let allCloudRecords: EventRecord[] = [];

        // 1. Fetch all events (Pagination)
        let page = 0;
        while (true) {
            const res = await eventCollection.skip(page * MAX_LIMIT).limit(MAX_LIMIT).get();
            const data = res.data as EventItem[];
            if (data.length === 0) break;
            allCloudEvents = allCloudEvents.concat(data);
            page++;
            if (data.length < MAX_LIMIT) break;
        }

        // 2. Fetch all records (Pagination)
        // Note: For large datasets, fetching ALL records might be slow. 
        // Ideally we should filter by eventIds, but for now we sync all as requested.
        page = 0;
        while (true) {
            const res = await recordCollection.skip(page * MAX_LIMIT).limit(MAX_LIMIT).get();
            const data = res.data as any[]; // Cloud record has extra fields like eventId
            if (data.length === 0) break;
            allCloudRecords = allCloudRecords.concat(data);
            page++;
            if (data.length < MAX_LIMIT) break;
        }

        console.log(`Fetched ${allCloudEvents.length} events and ${allCloudRecords.length} records from cloud.`);

        // 3. Associate Records with Events
        const recordsByEventId = new Map<number, EventRecord[]>();
        allCloudRecords.forEach((r: any) => {
            if (!recordsByEventId.has(r.eventId)) {
                recordsByEventId.set(r.eventId, []);
            }
            recordsByEventId.get(r.eventId)?.push(r as EventRecord);
        });

        allCloudEvents.forEach(event => {
            event.records = recordsByEventId.get(event.id) || [];
            // Sort records by date/time desc if needed
            event.records.sort((a, b) => {
                 const timeA = new Date(`${a.startDate || a.date} ${a.startTime}`).getTime();
                 const timeB = new Date(`${b.startDate || b.date} ${b.startTime}`).getTime();
                 return timeB - timeA;
            });
        });

        // 4. Merge with Local
        let hasChanges = false;
        
        // Map for fast lookup
        const cloudMap = new Map(allCloudEvents.map(e => [e.id, e]));
        const localMap = new Map(this.events.map(e => [e.id, e]));

        // Update/Add from Cloud
        allCloudEvents.forEach(cloudEvent => {
            const localEvent = localMap.get(cloudEvent.id);
            if (!localEvent) {
                // New from cloud
                this.events.push(cloudEvent);
                hasChanges = true;
            } else {
                // Conflict Resolution: Cloud Wins if newer
                const cloudTime = cloudEvent.updatedAt ? new Date(cloudEvent.updatedAt).getTime() : 0;
                const localTime = localEvent.updatedAt ? new Date(localEvent.updatedAt).getTime() : 0;

                // Check if this event is currently in the queue (pending local modification)
                const isPending = this.queue.some(t => {
                   if (t.type === 'DELETE' && t.payload === cloudEvent.id) return true;
                   if ((t.type === 'CREATE' || t.type === 'UPDATE') && t.payload.id === cloudEvent.id) return true;
                   return false;
                });

                if (!isPending && cloudTime > localTime) {
                    // Overwrite local
                    Object.assign(localEvent, cloudEvent);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            this.events.sort((a, b) => b.id - a.id); // Sort by created (id is timestamp)
            this.saveToStorage();
            this.notifyListeners();
            console.log('Local data updated from cloud.');
        }

    } catch (error) {
        console.error('Cloud sync failed:', error);
        // Silent fail for background sync
    }
  }

  // --- CRUD Operations ---

  getAllEvents(): EventItem[] {
    return [...this.events];
  }

  getEventById(id: number): EventItem | undefined {
    return this.events.find(event => event.id === id);
  }

  getRecordsByEventId(eventId: number): EventRecord[] {
    const event = this.events.find(e => e.id === eventId);
    return event ? [...event.records] : [];
  }

  async createEvent(title: string, description: string): Promise<EventItem | null> {
    const now = new Date();
    const newEvent: EventItem = {
      id: Date.now(),
      title,
      description,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      records: []
    };

    // 1. Optimistic Update
    this.events = [newEvent, ...this.events];
    this.notifyListeners();

    // 2. Queue
    this.queue.push({
        id: `${Date.now()}-${Math.random()}`,
        type: 'CREATE',
        payload: newEvent,
        timestamp: Date.now()
    });
    this.saveToStorage();

    // 3. Process
    this.processQueue();

    return newEvent;
  }

  async updateEvent(event: EventItem): Promise<boolean> {
    const updatedEvent = { ...event, updatedAt: new Date().toISOString() };

    const index = this.events.findIndex(e => e.id === event.id);
    if (index !== -1) {
        // 1. Optimistic
        this.events[index] = updatedEvent;
        this.notifyListeners();

        // 2. Queue
        this.queue.push({
            id: `${Date.now()}-${Math.random()}`,
            type: 'UPDATE',
            payload: updatedEvent,
            timestamp: Date.now()
        });
        this.saveToStorage();

        // 3. Process
        this.processQueue();
        return true;
    }
    return false;
  }

  async deleteEvent(eventId: number): Promise<boolean> {
    const index = this.events.findIndex(e => e.id === eventId);
    if (index !== -1) {
        // 1. Optimistic
        this.events.splice(index, 1);
        this.notifyListeners();

        // 2. Queue
        this.queue.push({
            id: `${Date.now()}-${Math.random()}`,
            type: 'DELETE',
            payload: eventId,
            timestamp: Date.now()
        });
        this.saveToStorage();

        // 3. Process
        this.processQueue();
        return true;
    }
    return false;
  }

  // --- Records Operations (Delegates to updateEvent) ---

  async createRecord(eventId: number, recordData: Omit<EventRecord, 'id' | 'createdAt'>): Promise<EventRecord | null> {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return null;

    const newRecord: EventRecord = {
      ...recordData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    // Construct updated event
    const updatedEvent = {
        ...event,
        records: [newRecord, ...event.records]
    };

    await this.updateEvent(updatedEvent);
    return newRecord;
  }

  async updateRecord(eventId: number, record: EventRecord): Promise<boolean> {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;

    const records = event.records.map(r => r.id === record.id ? record : r);
    const updatedEvent = { ...event, records };

    return await this.updateEvent(updatedEvent);
  }

  async deleteRecord(eventId: number, recordId: number): Promise<boolean> {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;

    const records = event.records.filter(r => r.id !== recordId);
    const updatedEvent = { ...event, records };

    return await this.updateEvent(updatedEvent);
  }

  // --- Misc ---

  hasChanges(): boolean {
    return this.queue.length > 0;
  }

  getPendingChangesCount(): number {
    return this.queue.length;
  }

  async syncToRemote(): Promise<boolean> {
    await this.processQueue();
    return this.queue.length === 0;
  }

  clear(): void {
    this.events = [];
    this.queue = [];
    this.isInitialized = false;
    this.initializationPromise = null;
    try {
        Taro.removeStorageSync(STORAGE_KEY_EVENTS);
        Taro.removeStorageSync(STORAGE_KEY_QUEUE);
    } catch (e) {}
  }
}

export default DataManager.getInstance();
