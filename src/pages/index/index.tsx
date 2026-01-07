import { useMemo, useState } from "react";
import { View, Text, Input, Button } from "@tarojs/components";
import { navigateTo, useDidShow } from "@tarojs/taro";

import type { EventItem } from "../../types/events";
import {
  createEvent,
  deleteEvent,
  loadEvents,
  persistEvents,
} from "../../utils/eventStore";

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

  useDidShow(() => {
    setEvents(loadEvents());
  });

  const { completedCount } = useMemo(() => {
    return {
      completedCount: events.length,
    };
  }, [events]);

  const handleCreateEvent = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const nextEvents = editingEventId
      ? events.map((event) =>
          event.id === editingEventId
            ? { ...event, title: trimmedTitle, description: description.trim() }
            : event
        )
      : [createEvent(trimmedTitle, description.trim()), ...events];
    persistEvents(nextEvents);
    setEvents(nextEvents);
    setTitle("");
    setDescription("");
    setShowCreateDialog(false);
    setEditingEventId(null);
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

  const confirmDeleteEvent = () => {
    if (!pendingDeleteEventId) return;
    deleteEvent(pendingDeleteEventId);
    setEvents((prev) => prev.filter((item) => item.id !== pendingDeleteEventId));
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

  return (
    <View className="index">
      <View className="blueprint-surface" />

      <PageHeader
        left={
          <View className="brand">
            <View className="brand-mark">TT</View>
            <Text className="brand-name">Time Track</Text>
          </View>
        }
        right={
          <View className="header-actions">
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
              <Button className="add-button" onClick={handleCreateEvent}>
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
              <Button className="add-button danger" onClick={confirmDeleteEvent}>
                删除
              </Button>
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
