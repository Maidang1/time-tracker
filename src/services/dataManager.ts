import type { EventItem, EventRecord } from '../types/events';
import { loadAllEventsWithRecords } from '../utils/eventStoreCloud';
import { createEventInCloud, updateEventInCloud, deleteEventInCloud, createRecordInCloud, updateRecordInCloud, deleteRecordInCloud } from '../services/databaseService';

type DataChangeListener = () => void;

export type SyncErrorCallback = (error: { type: string; message: string; details?: any }) => void;

class DataManager {
  private static instance: DataManager;
  private events: EventItem[] = [];
  private listeners: DataChangeListener[] = [];
  private syncErrorCallback: SyncErrorCallback | null = null;
  private initializationPromise: Promise<void> | null = null;
  private isInitialized: boolean = false;

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
        console.error('通知监听器时出错:', error);
      }
    });
  }

  private notifySyncError(type: string, message: string, details?: any): void {
    console.error(`同步错误 [${type}]: ${message}`, details);
    if (this.syncErrorCallback) {
      this.syncErrorCallback({ type, message, details });
    }
  }

  public async waitForInitialization(): Promise<void> {
    if (this.isInitialized) {
      return Promise.resolve();
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    return Promise.reject(new Error('DataManager not initialized'));
  }

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = (async () => {
      try {
        this.events = await loadAllEventsWithRecords();
        this.isInitialized = true;
        console.log(`数据管理器初始化完成，加载了 ${this.events.length} 个事件`);
      } catch (error) {
        console.error('初始化数据管理器失败:', error);
        throw error;
      }
    })();
    
    return this.initializationPromise;
  }

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
      records: [],
      updatedAt: now.toISOString()
    };

    try {
      await createEventInCloud(newEvent);
      console.log('数据库写入成功，创建事件:', newEvent.id);
      
      this.events = [newEvent, ...this.events];
      this.notifyListeners();
      
      return newEvent;
    } catch (error) {
      this.notifySyncError('CREATE_EVENT', '事件创建失败', error);
      return null;
    }
  }

  async updateEvent(event: EventItem): Promise<boolean> {
    const updatedEvent = { ...event, updatedAt: new Date().toISOString() };

    try {
      await updateEventInCloud(updatedEvent);
      console.log('数据库写入成功，更新事件:', event.id);
      
      const index = this.events.findIndex(e => e.id === event.id);
      if (index !== -1) {
        this.events[index] = updatedEvent;
        this.notifyListeners();
      }
      
      return true;
    } catch (error) {
      this.notifySyncError('UPDATE_EVENT', '事件更新失败', error);
      return false;
    }
  }

  async deleteEvent(eventId: number): Promise<boolean> {
    try {
      await deleteEventInCloud(eventId);
      console.log('数据库写入成功，删除事件:', eventId);
      
      const index = this.events.findIndex(e => e.id === eventId);
      if (index !== -1) {
        this.events.splice(index, 1);
        this.notifyListeners();
      }
      
      return true;
    } catch (error) {
      this.notifySyncError('DELETE_EVENT', '事件删除失败', error);
      return false;
    }
  }

  async createRecord(eventId: number, recordData: Omit<EventRecord, 'id' | 'createdAt'>): Promise<EventRecord | null> {
    const newRecord: EventRecord = {
      ...recordData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    try {
      await createRecordInCloud({ ...recordData, eventId });
      console.log('数据库写入成功，创建记录:', newRecord.id);
      
      const eventIndex = this.events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        this.events[eventIndex].records = [newRecord, ...this.events[eventIndex].records];
        this.notifyListeners();
      }
      
      return newRecord;
    } catch (error) {
      this.notifySyncError('CREATE_RECORD', '记录创建失败', error);
      return null;
    }
  }

  async updateRecord(eventId: number, record: EventRecord): Promise<boolean> {
    try {
      await updateRecordInCloud({ ...record, eventId });
      console.log('数据库写入成功，更新记录:', record.id);
      
      const eventIndex = this.events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        const recordIndex = this.events[eventIndex].records.findIndex(r => r.id === record.id);
        if (recordIndex !== -1) {
          this.events[eventIndex].records[recordIndex] = record;
          this.notifyListeners();
        }
      }
      
      return true;
    } catch (error) {
      this.notifySyncError('UPDATE_RECORD', '记录更新失败', error);
      return false;
    }
  }

  async deleteRecord(eventId: number, recordId: number): Promise<boolean> {
    try {
      await deleteRecordInCloud(recordId, eventId);
      console.log('数据库写入成功，删除记录:', recordId);
      
      const eventIndex = this.events.findIndex(e => e.id === eventId);
      if (eventIndex !== -1) {
        const recordIndex = this.events[eventIndex].records.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
          this.events[eventIndex].records.splice(recordIndex, 1);
          this.notifyListeners();
        }
      }
      
      return true;
    } catch (error) {
      this.notifySyncError('DELETE_RECORD', '记录删除失败', error);
      return false;
    }
  }

  hasChanges(): boolean {
    return false;
  }

  getPendingChangesCount(): number {
    return 0;
  }

  async syncToRemote(): Promise<boolean> {
    console.log('syncToRemote 调用 - 当前为即时同步模式，无需批量同步');
    return true;
  }

  clear(): void {
    this.events = [];
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

export default DataManager.getInstance();
