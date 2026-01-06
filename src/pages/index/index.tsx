import { useMemo, useState } from "react";
import { View, Text, Input, Button } from "@tarojs/components";
import { navigateTo, useDidShow } from "@tarojs/taro";

import type { EventItem } from "../../types/events";
import { createEvent, loadEvents, persistEvents } from "../../utils/eventStore";

import PageHeader from "../../components/PageHeader";
import HeaderMeta from "../../components/HeaderMeta";

import "./index.scss";

export default function Index() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

    const nextEvents = [
      createEvent(trimmedTitle, description.trim()),
      ...events,
    ];
    persistEvents(nextEvents);
    setEvents(nextEvents);
    setTitle("");
    setDescription("");
    setShowCreateDialog(false);
  };

  const goToDetail = (eventId: number) => {
    navigateTo({
      url: `/pages/event-detail/index?id=${eventId}`,
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
          <Button
            className="header-action"
            onClick={() => setShowCreateDialog(true)}
          >
            新建事件
          </Button>
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
          {events.map(event => {
            return (
              <View
                key={event.id}
                className="event-card"
                onClick={() => goToDetail(event.id)}
              >
                <View className="event-card_header">
                  <Text className="event-name">{event.title}</Text>
                  <Text className="event-chevron">›</Text>
                </View>
              </View>
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
                保存事件
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
