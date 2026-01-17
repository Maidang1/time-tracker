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

  const showSyncError = useCallback((error: { type: string; message: string; retry?: () => Promise<void> }) => {
    setSyncError(error);
    Taro.showModal({
      title: '同步失败',
      content: error.message,
      confirmText: '重试',
      cancelText: '忽略',
      success: async (res) => {
        if (res.confirm && error.retry) {
          Taro.showLoading({ title: '重试中...' });
          try {
            await error.retry();
            Taro.showToast({ title: '重试请求已提交', icon: 'none' });
          } catch (e) {
            console.error('Retry failed:', e);
          } finally {
            Taro.hideLoading();
          }
        }
      }
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
    <View className="min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f5f5f0] text-[#1a1a1a] font-sans relative box-border flex flex-col gap-[24rpx]">
      <View className="absolute inset-0 bg-[#f5f5f0] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]" />

      <PageHeader
        className="px-[8rpx]"
        left={
          <View className="flex items-center gap-[12rpx]">
            <View className="w-[64rpx] h-[64rpx] rounded-[18rpx] border-[2rpx] border-[#1a1a1a] flex items-center justify-center text-[26rpx] font-bold bg-[#ffffff]">CP</View>
            <Text className="text-[32rpx] font-semibold">Chrono Pulse</Text>
          </View>
        }
        right={
          <View className="flex items-center gap-[12rpx]">
            <Button className="mr-0 border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#ffffff] text-[#1a1a1a] text-[26rpx]" onClick={openSettingsDialog}>
              设置
            </Button>
            <Button
              className="mr-0 border-[2rpx] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] text-[26rpx] bg-transparent text-[#f6821f] outline-none border-[#f6821f]"
              onClick={openGlobalInsight}
            >
              AI 洞察
            </Button>
            <Button className="mr-0 border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#f6821f] text-[#ffffff] text-[26rpx]" onClick={openCreateDialog}>
              新建
            </Button>
          </View>
        }
      />

      <HeaderMeta
        className="px-[8rpx]"
        items={[
          {
            key: "events",
            text: `${completedCount} 个事件`,
            tone: "completed",
          },
        ]}
      />

      <View className="mt-[16rpx] border-none rounded-0 bg-transparent shadow-none relative z-[1]">
        <View className="flex flex-col items-start gap-[8rpx] pt-[28rpx] px-[0rpx] sm:flex-row sm:items-center sm:justify-between">
          <Text className="text-[36rpx] font-semibold leading-[1.35]">进行中的事件</Text>
        </View>

        <View className="flex flex-col gap-[16rpx] py-[24rpx] pb-[32rpx]">
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
                  className="border-[2rpx] border-[#1a1a1a] rounded-[18rpx] p-[20rpx] px-[24rpx] bg-[#ffffff] flex items-center justify-between shadow-[0_16rpx_32rpx_#00000010] cursor-pointer transition-transform duration-200"
                  onClick={() => goToDetail(event.id)}
                >
                  <View className="flex items-center justify-between gap-[12px] w-full">
                    <Text className="text-[32rpx] font-semibold leading-[1.35]">{event.title}</Text>
                    <Text className="text-[32rpx] text-[#888888] translate-y-[-1px]">›</Text>
                  </View>
                </View>
              </SwipeableItem>
            );
          })}

          {!events.length && (
            <View className="border-[2rpx] dashed border-[#888888] rounded-[18rpx] p-[28rpx] text-[#4a4a4a] text-center text-[26rpx] leading-[1.5] bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]">
              <Text>暂无事件，先创建一个开始记录吧。</Text>
            </View>
          )}
        </View>
      </View>
      {showCreateDialog && (
        <View className="fixed inset-0 flex items-center justify-center z-[10]">
          <View
            className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]"
            onClick={() => setShowCreateDialog(false)}
          />
          <View className="relative w-[min(90vw,480px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11]">
            <View className="flex items-center justify-between">
              <Text className="text-[36rpx] font-semibold">记录新事件</Text>
              <Button
                className="border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0"
                onClick={() => setShowCreateDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="flex flex-col gap-[16rpx] p-[28rpx] border-t-[2rpx] border-[#f1f1e6]">
              <Input
                value={title}
                placeholder="事件标题（如：外场测试）"
                className="h-[96rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[24rpx] text-[30rpx] leading-[1.35] bg-[#f5f5f0]"
                onInput={(event) => setTitle(event.detail.value)}
              />
              <Input
                value={description}
                placeholder="简要描述"
                className="h-[96rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[24rpx] text-[30rpx] leading-[1.35] bg-[#f5f5f0]"
                onInput={(event) => setDescription(event.detail.value)}
              />
              <Button className="bg-[#f6821f] text-[#ffffff] rounded-[16rpx] text-[30rpx] h-[96rpx] leading-[96rpx] w-full shadow-[0_16rpx_28rpx_#f6821f40]" onClick={handleCreateEvent} loading={isLoading}>
                {editingEventId ? "保存修改" : "保存事件"}
              </Button>
            </View>
          </View>
        </View>
      )}

      {pendingDeleteEventId && (
        <View className="fixed inset-0 flex items-center justify-center z-[10]">
          <View
            className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]"
            onClick={() => setPendingDeleteEventId(null)}
          />
          <View className="relative w-[min(90vw,480px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11]">
            <View className="flex items-center justify-between">
              <Text className="text-[36rpx] font-semibold">删除事件</Text>
              <Button
                className="border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0"
                onClick={() => setPendingDeleteEventId(null)}
              >
                关闭
              </Button>
            </View>
            <View className="py-[8rpx] text-[28rpx] text-[#4a4a4a] leading-[1.5]">
              <Text>确定要删除该事件吗？删除后无法恢复。</Text>
            </View>
            <View className="flex gap-[16rpx] mt-[8rpx]">
              <Button
                className="flex-1 h-[72rpx] leading-[72rpx] text-[26rpx] rounded-[999px] border-none outline-none"
                onClick={() => setPendingDeleteEventId(null)}
              >
                取消
              </Button>
              <Button className="flex-1 h-[72rpx] leading-[72rpx] rounded-[999px] bg-[#f6821f] shadow-[0_12rpx_24rpx_#f6821f40] text-[#ffffff]" onClick={confirmDeleteEvent} loading={isLoading}>
                删除
              </Button>
            </View>
          </View>
        </View>
      )}

      {showSettingsDialog && (
        <View className="fixed inset-0 flex items-center justify-center z-[10]">
          <View
            className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]"
            onClick={() => setShowSettingsDialog(false)}
          />
          <View className="relative w-[min(90vw,480px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11] gap-[20rpx]">
            <View className="flex items-center justify-between">
              <Text className="text-[36rpx] font-semibold">设置</Text>
              <Button
                className="border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0"
                onClick={() => setShowSettingsDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="flex flex-col gap-[12rpx]">
              <Button
                className="border-[2rpx] rounded-[16rpx] h-[88rpx] leading-[88rpx] text-[28rpx] bg-[#f6821f] border-[#f6821f] text-[#ffffff] shadow-[0_12rpx_24rpx_#f6821f40]"
                onClick={openDeepSeekSettings}
              >
                修改 DeepSeek 配置
              </Button>
              <Button className="border-[2rpx] border-[#1a1a1a] rounded-[16rpx] h-[88rpx] leading-[88rpx] bg-[#ffffff] text-[#1a1a1a] text-[28rpx]" onClick={openAboutDialog}>
                关于小程序
              </Button>
            </View>
          </View>
        </View>
      )}

      {showAboutDialog && (
        <View className="fixed inset-0 flex items-center justify-center z-[10]">
          <View
            className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]"
            onClick={() => setShowAboutDialog(false)}
          />
          <View className="relative w-[min(90vw,480px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11] gap-[20rpx]">
            <View className="flex items-center justify-between">
              <Text className="text-[36rpx] font-semibold">关于小程序</Text>
              <Button
                className="border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0"
                onClick={() => setShowAboutDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="flex flex-col gap-[12rpx] text-[26rpx] leading-[1.5] text-[#4a4a4a]">
              <Text>作者: madinah</Text>
              <Text>代码开源地址： https://github.com/Maidang1/time-tracker</Text>
              <Text>
                意见 bug 反馈地址： https://github.com/Maidang1/time-tracker/issues
              </Text>
              <Text className="mt-[8rpx] font-semibold text-[#1a1a1a]">
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
