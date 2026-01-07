import { useMemo, useState } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";

import { calculateDurationMinutes, createRecord, updateEvent } from "../../utils/eventStore";
import type { EventRecord } from "../../types/events";
import { useEventData } from "../../hooks/useEventData";
import { formatMinutes } from "../../utils/time";
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

export default function EventDetail() {
  const router = useRouter();
  const eventId = Number(router.params?.id || 0);

  const { eventData, setEventData } = useEventData(eventId);
  const [recordDate, setRecordDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [pendingDeleteRecordId, setPendingDeleteRecordId] = useState<number | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configSnapshot, setConfigSnapshot] = useState(getDeepSeekConfig());

  const pendingDuration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return calculateDurationMinutes(startTime, endTime);
  }, [startTime, endTime]);


  const openRecordDialog = () => {
    const today = new Date().toISOString().slice(0, 10);
    setRecordDate(today);
    setStartTime("");
    setEndTime("");
    setNote("");
    setEditingRecordId(null);
    setShowRecordDialog(true);
  };

  const openEditRecordDialog = (record: EventRecord) => {
    setRecordDate(record.date);
    setStartTime(record.startTime);
    setEndTime(record.endTime);
    setNote(record.note);
    setEditingRecordId(record.id);
    setShowRecordDialog(true);
  };

  const handleSaveRecord = () => {
    if (!eventData || !recordDate || !startTime || !endTime) return;
    const durationMinutes = calculateDurationMinutes(startTime, endTime);
    const trimmedNote = note.trim();
    const record = editingRecordId
      ? {
          id: editingRecordId,
          date: recordDate,
          startTime,
          endTime,
          durationMinutes,
          note: trimmedNote,
        }
      : createRecord(recordDate, startTime, endTime, trimmedNote);
    const updated = {
      ...eventData,
      records: editingRecordId
        ? eventData.records.map((item) =>
            item.id === editingRecordId ? record : item
          )
        : [record, ...eventData.records],
    };
    updateEvent(updated);
    setEventData(updated);
    setStartTime("");
    setEndTime("");
    setNote("");
    setShowRecordDialog(false);
    setEditingRecordId(null);
  };

  const handleDeleteRecord = (recordId: number) => {
    setPendingDeleteRecordId(recordId);
  };

  const confirmDeleteRecord = () => {
    if (!eventData || !pendingDeleteRecordId) return;
    const updated = {
      ...eventData,
      records: eventData.records.filter((item) => item.id !== pendingDeleteRecordId),
    };
    updateEvent(updated);
    setEventData(updated);
    setPendingDeleteRecordId(null);
  };

  const goToEventInsight = () => {
    if (!eventId) return;
    if (!isDeepSeekConfigured()) {
      setConfigSnapshot(getDeepSeekConfig());
      setShowConfigDialog(true);
      return;
    }
    Taro.navigateTo({
      url: `/pages/event-ai-insights/index?id=${eventId}`,
    });
  };

  const goToAnalysis = () => {
    if (!eventId) return;
    Taro.navigateTo({
      url: `/pages/event-analysis/index?id=${eventId}`,
    });
  };

  if (!eventId) {
    return (
      <View className="event-detail">
        <View className="blueprint-surface" />
        <View className="empty-state">
          <Text>缺少事件 ID，请返回上一页。</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="event-detail">
      <View className="blueprint-surface" />

      {eventData ? (
        <>
          <PageHeader
            left={
              <View className="brand">
                <View className="brand-mark">TT</View>
                <Text className="brand-name">{eventData.title}</Text>
              </View>
            }
            right={
              <View className="header-actions">
                <Button
                  className="icon-button outline"
                  onClick={goToEventInsight}
                >
                  <Text>AI 洞察</Text>
                </Button>
                <Button
                  className="icon-button outline"
                  onClick={goToAnalysis}
                >
                  <Text>分析</Text>
                </Button>
                <Button
                  className="icon-button solid"
                  onClick={openRecordDialog}
                >
                  <Text>新建</Text>
                </Button>
              </View>
            }
          />

          <HeaderMeta
            items={[
              {
                key: "records",
                text: `共 ${eventData.records.length} 条记录`,
                tone: "pending",
              },
            ]}
          />

          <View className="panel record-log-panel">
            <View className="panel-header">
              <Text className="panel-title">记录日志</Text>
              <Text className="panel-hint">记录按倒序展示</Text>
            </View>

            <View className="record-list timeline">
              {eventData.records.map((record) => (
                <SwipeableItem
                  key={record.id}
                  actions={[
                    {
                      text: "编辑",
                      onClick: () => openEditRecordDialog(record),
                    },
                    {
                      text: "删除",
                      type: "danger",
                      onClick: () => handleDeleteRecord(record.id),
                    },
                  ]}
                >
                  <View className="record-card timeline-item">
                    <View className="record-dot" />
                    <View className="record-row">
                      <Text className="record-time">
                        {record.date ? `${record.date} ` : ""}
                        {record.startTime} — {record.endTime}
                      </Text>
                      <Text className="record-duration">
                        {formatMinutes(record.durationMinutes)}
                      </Text>
                    </View>
                    <Text className="record-note">
                      {record.note || "暂无备注"}
                    </Text>
                  </View>
                </SwipeableItem>
              ))}

              {!eventData.records.length && (
                <View className="empty-state diagonal">
                  <Text>暂无记录，请先在上方添加。</Text>
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        <View className="empty-state">
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}

      {showRecordDialog && (
        <View className="record-dialog">
          <View
            className="dialog-mask"
            onClick={() => setShowRecordDialog(false)}
          />
          <View className="dialog-card">
            <View className="dialog-header">
              <Text className="dialog-title">
                {editingRecordId ? "编辑记录" : "新增记录"}
              </Text>
              <Button
                className="dialog-close"
                onClick={() => setShowRecordDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="record-form">
              <Picker
                mode="date"
                value={recordDate}
                onChange={(event) => setRecordDate(event.detail.value)}
              >
                <View className="picker-field">
                  <Text>{recordDate || "选择日期"}</Text>
                </View>
              </Picker>
              <Picker
                mode="time"
                value={startTime}
                onChange={(event) => setStartTime(event.detail.value)}
              >
                <View className="picker-field">
                  <Text>{startTime || "开始时间 08:30"}</Text>
                </View>
              </Picker>
              <Picker
                mode="time"
                value={endTime}
                onChange={(event) => setEndTime(event.detail.value)}
              >
                <View className="picker-field">
                  <Text>{endTime || "结束时间 10:00"}</Text>
                </View>
              </Picker>
              <Input
                value={note}
                placeholder="备注或观察"
                className="text-field"
                onInput={(event) => setNote(event.detail.value)}
              />
              <View className="duration-preview">
                时长：
                <Text className="duration-strong">
                  {pendingDuration ? formatMinutes(pendingDuration) : "—"}
                </Text>
              </View>
              <Button className="add-button" onClick={handleSaveRecord}>
                {editingRecordId ? "保存修改" : "保存记录"}
              </Button>
            </View>
          </View>
        </View>
      )}

      {pendingDeleteRecordId && (
        <View className="record-dialog">
          <View
            className="dialog-mask"
            onClick={() => setPendingDeleteRecordId(null)}
          />
          <View className="dialog-card">
            <View className="dialog-header">
              <Text className="dialog-title">删除记录</Text>
              <Button
                className="dialog-close"
                onClick={() => setPendingDeleteRecordId(null)}
              >
                关闭
              </Button>
            </View>
            <View className="confirm-body">
              <Text>确定要删除这条记录吗？</Text>
            </View>
            <View className="confirm-actions">
              <Button
                className="ghost-button"
                onClick={() => setPendingDeleteRecordId(null)}
              >
                取消
              </Button>
              <Button className="add-button danger" onClick={confirmDeleteRecord}>
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
