import { useMemo, useState, useCallback } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, Button } from "@tarojs/components";
import { navigateTo, useDidShow } from "@tarojs/taro";

import type { EventItem, EventType } from "../../types/events";
import DataManager from "../../services/dataManager";

import PageHeader from "../../components/PageHeader";
import HeaderMeta from "../../components/HeaderMeta";
import SwipeableItem from "../../components/SwipeableItem";
import { useTheme } from "../../hooks/useTheme";

export default function Index() {
  const { actualTheme } = useTheme();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("time");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState<
    number | null
  >(null);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [syncError, setSyncError] = useState<{
    type: string;
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshEvents = () => {
    const currentEvents = DataManager.getAllEvents();
    console.log(
      "[Index] refreshEvents called, events count:",
      currentEvents.length,
    );
    console.log("[Index] events data:", JSON.stringify(currentEvents, null, 2));
    setEvents(currentEvents);
  };

  const showSyncError = useCallback(
    (error: { type: string; message: string; retry?: () => Promise<void> }) => {
      setSyncError(error);
      Taro.showModal({
        title: "同步失败",
        content: error.message,
        confirmText: "重试",
        cancelText: "忽略",
        success: async (res) => {
          if (res.confirm && error.retry) {
            Taro.showLoading({ title: "重试中..." });
            try {
              await error.retry();
              Taro.showToast({ title: "重试请求已提交", icon: "none" });
            } catch (e) {
              console.error("Retry failed:", e);
            } finally {
              Taro.hideLoading();
            }
          }
        },
      });
    },
    [],
  );

  useDidShow(async () => {
    console.log("[Index] useDidShow called");

    DataManager.setSyncErrorCallback(showSyncError);

    try {
      console.log("[Index] waiting for DataManager initialization...");
      await DataManager.waitForInitialization();
      console.log("[Index] DataManager initialized, refreshing events...");
      refreshEvents();
    } catch (error) {
      console.error("[Index] DataManager initialization failed:", error);
      refreshEvents();
    }

    const unsubscribe = DataManager.subscribe(() => {
      console.log("[Index] DataManager subscription triggered");
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
            description: description.trim(),
          };
          await DataManager.updateEvent(updatedEvent);
          refreshEvents();
        }
      } else {
        await DataManager.createEvent(
          trimmedTitle,
          description.trim(),
          eventType,
        );
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
    setEventType("time");
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
    Taro.showLoading({ title: "删除中..." });

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

  // 根据主题动态生成样式
  const themeStyles = {
    container:
      actualTheme === "dark"
        ? "min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#0f0f0f] text-[#ffffff] font-sans relative box-border flex flex-col gap-[24rpx]"
        : "min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f5f5f0] text-[#1a1a1a] font-sans relative box-border flex flex-col gap-[24rpx]",
    background:
      actualTheme === "dark"
        ? "absolute inset-0 bg-[#0f0f0f] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#2a2a2a_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#2a2a2a_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]"
        : "absolute inset-0 bg-[#f5f5f0] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]",
    logo:
      actualTheme === "dark"
        ? "w-[64rpx] h-[64rpx] rounded-[18rpx] border-[2rpx] border-[#333333] flex items-center justify-center text-[26rpx] font-bold bg-[#1a1a1a] text-[#ffffff]"
        : "w-[64rpx] h-[64rpx] rounded-[18rpx] border-[2rpx] border-[#1a1a1a] flex items-center justify-center text-[26rpx] font-bold bg-[#ffffff] text-[#1a1a1a]",
    aboutButton:
      actualTheme === "dark"
        ? "mr-0 border-[2rpx] border-solid border-[#333333] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#1a1a1a] text-[#ffffff] text-[26rpx]"
        : "mr-0 border-[2rpx] border-solid border-[#1a1a1a] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#ffffff] text-[#1a1a1a] text-[26rpx]",
    createButton:
      actualTheme === "dark"
        ? "mr-0 border-[2rpx] border-solid border-[#333333] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#ff8c42] text-[#ffffff] text-[26rpx]"
        : "mr-0 border-[2rpx] border-solid border-[#1a1a1a] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#f6821f] text-[#ffffff] text-[26rpx]",
    eventCard:
      actualTheme === "dark"
        ? "border-[2rpx] border-[#333333] rounded-[18rpx] p-[30rpx] px-[24rpx] bg-[#1a1a1a] flex items-center justify-between shadow-[0_16rpx_32rpx_#00000010] cursor-pointer"
        : "border-[2rpx] border-[#1a1a1a] rounded-[18rpx] p-[30rpx] px-[24rpx] bg-[#ffffff] flex items-center justify-between shadow-[0_16rpx_32rpx_#00000010] cursor-pointer",
    arrowText:
      actualTheme === "dark"
        ? "text-[40rpx] text-[#888888] translate-y-[-2px]"
        : "text-[40rpx] text-[#888888] translate-y-[-2px]",
    eventTypeTag:
      actualTheme === "dark"
        ? "h-[44rpx] px-[14rpx] rounded-[999px] text-[22rpx] leading-[44rpx] border-[2rpx]"
        : "h-[44rpx] px-[14rpx] rounded-[999px] text-[22rpx] leading-[44rpx] border-[2rpx]",
    timeTag:
      actualTheme === "dark"
        ? "bg-[#2a2a2a] border-[#444444] text-[#cccccc]"
        : "bg-[#f5f5f0] border-[#cccccc] text-[#4a4a4a]",
    todoTag:
      actualTheme === "dark"
        ? "bg-[#ff8c4222] border-[#ff8c42] text-[#ffb27f]"
        : "bg-[#f6821f1a] border-[#f6821f] text-[#f6821f]",
    emptyState:
      actualTheme === "dark"
        ? "border-[2rpx] dashed border-[#888888] rounded-[18rpx] p-[28rpx] text-[#cccccc] text-center text-[26rpx] leading-[1.5] bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]"
        : "border-[2rpx] dashed border-[#888888] rounded-[18rpx] p-[28rpx] text-[#4a4a4a] text-center text-[26rpx] leading-[1.5] bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]",
    // 对话框样式
    dialog:
      actualTheme === "dark"
        ? "relative w-[min(90vw,480px)] bg-[#1a1a1a] border-[2rpx] border-[#333333] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11]"
        : "relative w-[min(90vw,480px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11]",
    dialogTitle:
      actualTheme === "dark"
        ? "text-[36rpx] font-semibold text-[#ffffff]"
        : "text-[36rpx] font-semibold text-[#1a1a1a]",
    dialogCloseButton:
      actualTheme === "dark"
        ? "border-[2rpx] border-solid border-[#333333] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0 text-[#ffffff]"
        : "border-[2rpx] border-solid border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0 text-[#1a1a1a]",
    dialogBorder:
      actualTheme === "dark"
        ? "border-t-[2rpx] border-[#333333]"
        : "border-t-[2rpx] border-[#f1f1e6]",
    input:
      actualTheme === "dark"
        ? "h-[96rpx] border-[2rpx] border-[#333333] rounded-[16rpx] px-[24rpx] text-[30rpx] leading-[1.35] bg-[#0f0f0f] text-[#ffffff]"
        : "h-[96rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[24rpx] text-[30rpx] leading-[1.35] bg-[#f5f5f0] text-[#1a1a1a]",
    primaryButton:
      actualTheme === "dark"
        ? "bg-[#ff8c42] text-[#ffffff] rounded-[16rpx] text-[30rpx] h-[96rpx] leading-[96rpx] w-full shadow-[0_16rpx_28rpx_#ff8c4240]"
        : "bg-[#f6821f] text-[#ffffff] rounded-[16rpx] text-[30rpx] h-[96rpx] leading-[96rpx] w-full shadow-[0_16rpx_28rpx_#f6821f40]",
    secondaryButton:
      actualTheme === "dark"
        ? "bg-[#2a2a2a] text-[#ffffff] border-[2rpx] border-[#444444]"
        : "bg-[#f5f5f0] text-[#1a1a1a] border-[2rpx] border-[#cccccc]",
    dialogText:
      actualTheme === "dark"
        ? "text-[28rpx] text-[#cccccc] leading-[1.5]"
        : "text-[28rpx] text-[#4a4a4a] leading-[1.5]",
    dangerButton:
      actualTheme === "dark"
        ? "flex-1 h-[72rpx] leading-[72rpx] rounded-[999px] bg-[#ff6b6b] shadow-[0_12rpx_24rpx_#ff6b6b40] text-[#ffffff]"
        : "flex-1 h-[72rpx] leading-[72rpx] rounded-[999px] bg-[#f4333c] shadow-[0_12rpx_24rpx_#f4333c40] text-[#ffffff]",
    aboutText:
      actualTheme === "dark"
        ? "text-[26rpx] leading-[1.5] text-[#cccccc]"
        : "text-[26rpx] leading-[1.5] text-[#4a4a4a]",
    aboutHighlight:
      actualTheme === "dark"
        ? "mt-[8rpx] font-semibold text-[#ffffff]"
        : "mt-[8rpx] font-semibold text-[#1a1a1a]",
  };

  return (
    <View className={themeStyles.container}>
      <View className={themeStyles.background} />

      <PageHeader
        className="px-[8rpx]"
        left={
          <View className="flex items-center gap-[12rpx]">
            <View className={themeStyles.logo}>CP</View>
            <Text className="text-[32rpx] font-semibold">Chrono Pulse</Text>
          </View>
        }
        right={
          <View className="flex items-center gap-[12rpx]">
            <Button
              className={themeStyles.aboutButton}
              onClick={() => setShowAboutDialog(true)}
            >
              关于
            </Button>
            <Button
              className={themeStyles.createButton}
              onClick={openCreateDialog}
            >
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
          <Text className="text-[36rpx] font-semibold leading-[1.35]">
            进行中的事件
          </Text>
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
                  className={themeStyles.eventCard}
                  onClick={() => goToDetail(event.id)}
                >
                  <View className="flex items-center justify-between gap-[12rpx] w-full">
                    <Text className="flex-1 text-[32rpx] font-semibold leading-[1.35]">
                      {event.title}
                    </Text>
                    <View className="flex items-center gap-[12rpx]">
                      <Text
                        className={`${themeStyles.eventTypeTag} ${
                          event.type === "todo"
                            ? themeStyles.todoTag
                            : themeStyles.timeTag
                        }`}
                      >
                        {event.type === "todo" ? "待办" : "时间"}
                      </Text>
                      <Text className={themeStyles.arrowText}>›</Text>
                    </View>
                  </View>
                </View>
              </SwipeableItem>
            );
          })}

          {!events.length && (
            <View className={themeStyles.emptyState}>
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
          <View className={themeStyles.dialog}>
            <View className="flex items-center justify-between">
              <Text className={themeStyles.dialogTitle}>记录新事件</Text>
              <Button
                className={themeStyles.dialogCloseButton}
                onClick={() => setShowCreateDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View
              className={`flex flex-col gap-[16rpx] p-[28rpx] ${themeStyles.dialogBorder}`}
            >
              {/* 类型选择器 - 仅在创建模式显示 */}
              {!editingEventId && (
                <View className="flex gap-[16rpx]">
                  <Button
                    className={`flex-1 h-[96rpx] rounded-[16rpx] text-[30rpx] ${
                      eventType === "time"
                        ? themeStyles.primaryButton
                        : themeStyles.secondaryButton
                    }`}
                    onClick={() => setEventType("time")}
                  >
                    时间
                  </Button>
                  <Button
                    className={`flex-1 h-[96rpx] rounded-[16rpx] text-[30rpx] ${
                      eventType === "checkin"
                        ? themeStyles.primaryButton
                        : themeStyles.secondaryButton
                    }`}
                    onClick={() => setEventType("checkin")}
                  >
                    打卡
                  </Button>
                  <Button
                    className={`flex-1 h-[96rpx] rounded-[16rpx] text-[30rpx] ${
                      eventType === "todo"
                        ? themeStyles.primaryButton
                        : themeStyles.secondaryButton
                    }`}
                    onClick={() => setEventType("todo")}
                  >
                    待办
                  </Button>
                </View>
              )}

              <Input
                value={title}
                placeholder="事件标题（如：外场测试）"
                className={themeStyles.input}
                onInput={(event) => setTitle(event.detail.value)}
              />
              <Input
                value={description}
                placeholder="简要描述"
                className={themeStyles.input}
                onInput={(event) => setDescription(event.detail.value)}
              />
              <Button
                className={themeStyles.primaryButton}
                onClick={handleCreateEvent}
                loading={isLoading}
              >
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
          <View className={themeStyles.dialog}>
            <View className="flex items-center justify-between">
              <Text className={themeStyles.dialogTitle}>删除事件</Text>
              <Button
                className={themeStyles.dialogCloseButton}
                onClick={() => setPendingDeleteEventId(null)}
              >
                关闭
              </Button>
            </View>
            <View className={`py-[8rpx] ${themeStyles.dialogText}`}>
              <Text>确定要删除该事件吗？删除后无法恢复。</Text>
            </View>
            <View className="flex gap-[16rpx] mt-[8rpx]">
              <Button
                className="flex-1 h-[72rpx] leading-[72rpx] text-[26rpx] rounded-[999px] border-none outline-none"
                onClick={() => setPendingDeleteEventId(null)}
              >
                取消
              </Button>
              <Button
                className={themeStyles.dangerButton}
                onClick={confirmDeleteEvent}
                loading={isLoading}
              >
                删除
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
          <View className={`${themeStyles.dialog} gap-[20rpx]`}>
            <View className="flex items-center justify-between">
              <Text className={themeStyles.dialogTitle}>关于小程序</Text>
              <Button
                className={themeStyles.dialogCloseButton}
                onClick={() => setShowAboutDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View
              className={`flex flex-col gap-[12rpx] ${themeStyles.aboutText}`}
            >
              <Text>作者: madinah</Text>
              <Text>
                代码开源地址： https://github.com/Maidang1/chrono-pulse
              </Text>
              <Text>
                意见 bug 反馈地址：
                https://github.com/Maidang1/chrono-pulse/issues
              </Text>
              <Text className={themeStyles.aboutHighlight}>
                本程序永久免费，Open Source, Free Forever~~。
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
