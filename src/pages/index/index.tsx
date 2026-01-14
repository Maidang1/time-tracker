import { useMemo, useState, useCallback } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, Button } from "@tarojs/components";
import { navigateTo, useDidShow } from "@tarojs/taro";

import type { EventItem } from "../../types/events";
import DataManager, { type SyncErrorCallback } from "../../services/dataManager";

import PageHeader from "../../components/PageHeader";
import HeaderMeta from "../../components/HeaderMeta";
import SwipeableItem from "../../components/SwipeableItem";
import DeepSeekConfigDialog from "../../components/DeepSeekConfigDialog";
import {
  getDeepSeekConfig,
  isDeepSeekConfigured,
  saveDeepSeekConfig,
} from "../../utils/aiConfig";

import "./index.scss";

export default function Index() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<number | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configSnapshot, setConfigSnapshot] = useState(getDeepSeekConfig());
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [syncError, setSyncError] = useState<{ type: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshEvents = () => {
    const currentEvents = DataManager.getAllEvents();
    console.log('[Index] refreshEvents called, events count:', currentEvents.length);
    console.log('[Index] events data:', JSON.stringify(currentEvents, null, 2));
    setEvents(currentEvents);
  };

  const showSyncError = useCallback((error: { type: string; message: string }) => {
    setSyncError(error);
    Taro.showToast({
      title: error.message,
      icon: 'none',
      duration: 3000
    });
  }, []);

  useDidShow(async () => {
    console.log('[Index] useDidShow called');
    
    DataManager.setSyncErrorCallback(showSyncError);
    
    try {
      console.log('[Index] waiting for DataManager initialization...');
      await DataManager.waitForInitialization();
      console.log('[Index] DataManager initialized, refreshing events...');
      refreshEvents();
    } catch (error) {
      console.error('[Index] DataManager initialization failed:', error);
      refreshEvents();
    }
    
    const unsubscribe = DataManager.subscribe(() => {
      console.log('[Index] DataManager subscription triggered');
      refreshEvents();
    });
    return unsubscribe;
  });

  const { completedCount } = useMemo(() => {
    return {
      completedCount: events.length,
    };
  }, [events]);

  const handleCreateEvent = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsLoading(true);

    try {
      if (editingEventId) {
        const eventToUpdate = DataManager.getEventById(editingEventId);
        if (eventToUpdate) {
          const updatedEvent = {
            ...eventToUpdate,
            title: trimmedTitle,
            description: description.trim()
          };
          await DataManager.updateEvent(updatedEvent);
          refreshEvents();
        }
      } else {
        await DataManager.createEvent(trimmedTitle, description.trim());
        refreshEvents();
      }

      setTitle("");
      setDescription("");
      setShowCreateDialog(false);
      setEditingEventId(null);
    } finally {
      setIsLoading(false);
      Taro.hideLoading();
    }
  };

  const openCreateDialog = () => {
    setTitle("");
    setDescription("");
    setEditingEventId(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (event: EventItem) => {
    setTitle(event.title);
    setDescription(event.description);
    setEditingEventId(event.id);
    setShowCreateDialog(true);
  };

  const handleDeleteEvent = (eventId: number) => {
    setPendingDeleteEventId(eventId);
  };

  const confirmDeleteEvent = async () => {
    if (!pendingDeleteEventId) return;

    setIsLoading(true);
    Taro.showLoading({ title: '删除中...' });

    try {
      await DataManager.deleteEvent(pendingDeleteEventId);
      refreshEvents();
    } finally {
      setIsLoading(false);
      Taro.hideLoading();
    }

    setPendingDeleteEventId(null);
  };

  const goToDetail = (eventId: number) => {
    navigateTo({
      url: `/pages/event-detail/index?id=${eventId}`,
    });
  };

  const openGlobalInsight = () => {
    if (!isDeepSeekConfigured()) {
      setConfigSnapshot(getDeepSeekConfig());
      setShowConfigDialog(true);
      return;
    }
    navigateTo({
      url: "/pages/ai-insights/index",
    });
  };

  const openSettingsDialog = () => {
    setShowSettingsDialog(true);
  };

  const openDeepSeekSettings = () => {
    setConfigSnapshot(getDeepSeekConfig());
    setShowSettingsDialog(false);
    setShowConfigDialog(true);
  };

  const openAboutDialog = () => {
    setShowSettingsDialog(false);
    setShowAboutDialog(true);
  };

  return (
    <View className="index">
      <View className="blueprint-surface" />

      <PageHeader
        left={
          <View className="brand">
            <View className="brand-mark">CP</View>
            <Text className="brand-name">Chrono Pulse</Text>
          </View>
        }
        right={
          <View className="header-actions">
            <Button className="header-action ghost" onClick={openSettingsDialog}>
              设置
            </Button>
            <Button
              className="header-action outline"
              onClick={openGlobalInsight}
            >
              AI 洞察
            </Button>
            <Button className="header-action" onClick={openCreateDialog}>
              新建
            </Button>
          </View>
        }
      />

      <HeaderMeta
        items={[
          {
            key: "events",
            text: `${completedCount} 个事件`,
            tone: "completed",
          },
        ]}
      />

      <View className="panel event-list-panel">
        <View className="panel-header">
          <Text className="panel-title">进行中的事件</Text>
        </View>

        <View className="event-list">
          {events.map((event) => {
            return (
              <SwipeableItem
                key={event.id}
                actions={[
                  { text: "编辑", onClick: () => openEditDialog(event) },
                  {
                    text: "删除",
                    type: "danger",
                    onClick: () => handleDeleteEvent(event.id),
                  },
                ]}
              >
                <View
                  className="event-card"
                  onClick={() => goToDetail(event.id)}
                >
                  <View className="event-card_header">
                    <Text className="event-name">{event.title}</Text>
                    <Text className="event-chevron">›</Text>
                  </View>
                </View>
              </SwipeableItem>
            );
          })}

          {!events.length && (
            <View className="empty-state diagonal">
              <Text>暂无事件，先创建一个开始记录吧。</Text>
            </View>
          )}
        </View>
      </View>
      {showCreateDialog && (
        <View className="create-dialog">
          <View
            className="dialog-mask"
            onClick={() => setShowCreateDialog(false)}
          />
          <View className="dialog-card">
            <View className="dialog-header">
              <Text className="dialog-title">记录新事件</Text>
              <Button
                className="dialog-close"
                onClick={() => setShowCreateDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="event-form">
              <Input
                value={title}
                placeholder="事件标题（如：外场测试）"
                className="text-field"
                onInput={(event) => setTitle(event.detail.value)}
              />
              <Input
                value={description}
                placeholder="简要描述"
                className="text-field"
                onInput={(event) => setDescription(event.detail.value)}
              />
              <Button className="add-button" onClick={handleCreateEvent} loading={isLoading}>
                {editingEventId ? "保存修改" : "保存事件"}
              </Button>
            </View>
          </View>
        </View>
      )}

      {pendingDeleteEventId && (
        <View className="create-dialog">
          <View
            className="dialog-mask"
            onClick={() => setPendingDeleteEventId(null)}
          />
          <View className="dialog-card">
            <View className="dialog-header">
              <Text className="dialog-title">删除事件</Text>
              <Button
                className="dialog-close"
                onClick={() => setPendingDeleteEventId(null)}
              >
                关闭
              </Button>
            </View>
            <View className="confirm-body">
              <Text>确定要删除该事件吗？删除后无法恢复。</Text>
            </View>
            <View className="confirm-actions">
              <Button
                className="ghost-button"
                onClick={() => setPendingDeleteEventId(null)}
              >
                取消
              </Button>
              <Button className="add-button danger" onClick={confirmDeleteEvent} loading={isLoading}>
                删除
              </Button>
            </View>
          </View>
        </View>
      )}

      {showSettingsDialog && (
        <View className="create-dialog">
          <View
            className="dialog-mask"
            onClick={() => setShowSettingsDialog(false)}
          />
          <View className="dialog-card settings-dialog">
            <View className="dialog-header">
              <Text className="dialog-title">设置</Text>
              <Button
                className="dialog-close"
                onClick={() => setShowSettingsDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="settings-options">
              <Button
                className="settings-option primary"
                onClick={openDeepSeekSettings}
              >
                修改 DeepSeek 配置
              </Button>
              <Button className="settings-option" onClick={openAboutDialog}>
                关于小程序
              </Button>
            </View>
          </View>
        </View>
      )}

      {showAboutDialog && (
        <View className="create-dialog">
          <View
            className="dialog-mask"
            onClick={() => setShowAboutDialog(false)}
          />
          <View className="dialog-card about-dialog">
            <View className="dialog-header">
              <Text className="dialog-title">关于小程序</Text>
              <Button
                className="dialog-close"
                onClick={() => setShowAboutDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="about-content">
              <Text>作者: madinah</Text>
              <Text>代码开源地址： https://github.com/Maidang1/time-tracker</Text>
              <Text>
                意见 bug 反馈地址： https://github.com/Maidang1/time-tracker/issues
              </Text>
              <Text className="about-note">
                本程序永久免费，Open Source, Free Forever~~。
              </Text>
            </View>
          </View>
        </View>
      )}

      <DeepSeekConfigDialog
        open={showConfigDialog}
        initialConfig={configSnapshot}
        onClose={() => setShowConfigDialog(false)}
        onSave={(nextConfig) => {
          const saved = saveDeepSeekConfig(nextConfig);
          setConfigSnapshot(saved);
          setShowConfigDialog(false);
        }}
      />
    </View>
  );
}
