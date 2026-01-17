import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro, { useRouter, useDidShow } from "@tarojs/taro";

import type { EventRecord } from "../../types/events";
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
import DataManager, { type SyncErrorCallback } from "../../services/dataManager";

export default function EventDetail() {
  const router = useRouter();
  const eventId = Number(router.params?.id || 0);

  const [eventData, setEventData] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [pendingDeleteRecordId, setPendingDeleteRecordId] = useState<number | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [configSnapshot, setConfigSnapshot] = useState(getDeepSeekConfig());
  const [isLoading, setIsLoading] = useState(false);

  const showSyncError = useCallback((error: { type: string; message: string; retry?: () => Promise<void> }) => {
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

  // 页面加载时获取事件数据
  useEffect(() => {
    const event = DataManager.getEventById(eventId);
    if (event) {
      setEventData(event);
    }

    const unsubscribe = DataManager.subscribe(() => {
      const currentEvent = DataManager.getEventById(eventId);
      if (currentEvent) {
        setEventData(currentEvent);
      }
    });

    return () => unsubscribe();
  }, [eventId]);

  useDidShow(() => {
    DataManager.setSyncErrorCallback(showSyncError);
  });

  const pendingDuration = useMemo(() => {
    if (!startDate || !startTime || !endDate || !endTime) return 0;

    // 计算跨天时长
    const start = new Date(`${startDate} ${startTime}`).getTime();
    const end = new Date(`${endDate} ${endTime}`).getTime();
    const diffMs = end - start;

    if (diffMs < 0) return 0;

    return Math.floor(diffMs / 1000 / 60); // 转换为分钟
  }, [startDate, startTime, endDate, endTime]);


  const openRecordDialog = () => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setStartTime("");
    setEndTime("");
    setNote("");
    setEditingRecordId(null);
    setShowRecordDialog(true);
  };

  const openEditRecordDialog = (record: EventRecord) => {
    // 兼容旧数据格式
    setStartDate(record.startDate || record.date || "");
    setEndDate(record.endDate || record.date || "");
    setStartTime(record.startTime);
    setEndTime(record.endTime);
    setNote(record.note);
    setEditingRecordId(record.id);
    setShowRecordDialog(true);
  };

  const handleSaveRecord = async () => {
    if (!eventData || !startDate || !startTime || !endDate || !endTime) return;

    setIsLoading(true);

    try {
      if (editingRecordId) {
        const recordToUpdate = {
          id: editingRecordId,
          startDate,
          endDate,
          startTime,
          endTime,
          durationMinutes: pendingDuration,
          note: note.trim(),
          createdAt: eventData.records.find(r => r.id === editingRecordId)?.createdAt || new Date().toISOString(),
          date: startDate,
        };

        await DataManager.updateRecord(eventId, recordToUpdate);
      } else {
        const recordData = {
          startDate,
          endDate,
          startTime,
          endTime,
          durationMinutes: pendingDuration,
          note: note.trim(),
          date: startDate,
        };

        await DataManager.createRecord(eventId, recordData);
      }

      setStartDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
      setNote("");
      setShowRecordDialog(false);
      setEditingRecordId(null);
    } finally {
      setIsLoading(false);
      Taro.hideLoading();
    }
  };

  const handleDeleteRecord = (recordId: number) => {
    setPendingDeleteRecordId(recordId);
  };

  const confirmDeleteRecord = async () => {
    if (!eventData || !pendingDeleteRecordId) return;

    setIsLoading(true);
    Taro.showLoading({ title: '删除中...' });

    try {
      await DataManager.deleteRecord(eventId, pendingDeleteRecordId);
    } finally {
      setIsLoading(false);
      Taro.hideLoading();
    }

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
    <View className="min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f5f5f0] text-[#1a1a1a] font-sans relative box-border flex flex-col gap-[24rpx]">
      <View className="absolute inset-0 bg-[#f5f5f0] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]" />

      {eventData ? (
        <>
          <PageHeader
            className="px-[8rpx]"
            left={
              <View className="flex flex-col gap-[4rpx]">
                <View className="flex items-center gap-[12rpx]">
                  <View className="w-[64rpx] h-[64rpx] rounded-[18rpx] border-[2rpx] border-[#1a1a1a] flex items-center justify-center text-[26rpx] font-bold bg-[#ffffff]">CP</View>
                  <Text className="text-[32rpx] font-semibold">{eventData.title}</Text>
                </View>
                {eventData.description && <Text className="text-[26rpx] text-[#666666] ml-[76rpx]">{eventData.description}</Text>}
              </View>
            }
            right={
              <View className="flex items-center gap-[12rpx]">
                <Button className="mr-0 border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#ffffff] text-[#1a1a1a] text-[26rpx]" onClick={goToEventInsight}>
                  AI 洞察
                </Button>
                <Button className="mr-0 border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#ffffff] text-[#1a1a1a] text-[26rpx]" onClick={goToAnalysis}>
                  分析
                </Button>
                <Button className="mr-0 border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#f6821f] text-[#ffffff] text-[26rpx]" onClick={openRecordDialog}>
                  新建
                </Button>
              </View>
            }
          />

          <HeaderMeta
            className="px-[8rpx]"
            items={[
              {
                key: "records",
                text: `共 ${eventData.records?.length || 0} 条记录`,
                tone: "pending",
              },
            ]}
          />

          <View className="mt-[16rpx] border-none rounded-0 bg-transparent shadow-none relative z-[1]">
            <View className="flex flex-col items-start gap-[8rpx] pt-[28rpx] px-[0rpx] sm:flex-row sm:items-center sm:justify-between">
              <Text className="text-[36rpx] font-semibold leading-[1.35]">记录日志</Text>
              <Text className="text-[26rpx] text-[#888888]">记录按倒序展示</Text>
            </View>

            <View className="flex flex-col gap-[16rpx] py-[24rpx] pb-[32rpx] pl-[12rpx] relative">
              {(eventData.records?.length || 0) > 1 && (
                <View className="absolute left-[13rpx] top-[48rpx] bottom-[48rpx] w-[2rpx] border-l-[2rpx] border-dashed border-[#cccccc] z-[0]" />
              )}
              {(eventData.records || []).map((record) => (
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
                  <View className="relative z-[1] ml-[24rpx] border-[2rpx] border-[#1a1a1a] rounded-[18rpx] p-[24rpx] bg-[#ffffff] flex flex-col gap-[12rpx] shadow-[0_16rpx_32rpx_#00000010]">
                    <View className="absolute left-[-29rpx] top-[50%] translate-y-[-50%] w-[12rpx] h-[12rpx] rounded-full bg-[#f6821f] border-[2rpx] border-[#ffffff] shadow-[0_0_0_2rpx_#f6821f]" />
                    <View className="flex items-center justify-between">
                      <Text className="text-[30rpx] font-medium text-[#1a1a1a]">
                        {record.startDate || record.date} {record.startTime}
                        {(record.endDate && record.endDate !== (record.startDate || record.date))
                          ? ` — ${record.endDate} ${record.endTime}`
                          : ` — ${record.endTime}`
                        }
                      </Text>
                      <Text className="text-[28rpx] font-bold text-[#f6821f]">
                        {formatMinutes(record.durationMinutes)}
                      </Text>
                    </View>
                    <Text className="text-[28rpx] text-[#4a4a4a] leading-[1.5]">
                      {record.note || "暂无备注"}
                    </Text>
                  </View>
                </SwipeableItem>
              ))}

              {!(eventData.records?.length) && (
                <View className="ml-[24rpx] border-[2rpx] dashed border-[#888888] rounded-[18rpx] p-[28rpx] text-[#4a4a4a] text-center text-[26rpx] leading-[1.5] bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]">
                  <Text>暂无记录，请先在上方添加。</Text>
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        <View className="flex items-center justify-center min-h-[60vh] text-[#666666] text-[30rpx]">
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}

      {showRecordDialog && (
        <View className="fixed inset-0 flex items-center justify-center z-[10]">
          <View
            className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]"
            onClick={() => setShowRecordDialog(false)}
          />
          <View className="relative w-[min(90vw,480px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11]">
            <View className="flex items-center justify-between">
              <Text className="text-[36rpx] font-semibold">
                {editingRecordId ? "编辑记录" : "新增记录"}
              </Text>
              <Button
                className="border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0"
                onClick={() => setShowRecordDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className="flex flex-col gap-[16rpx] p-[28rpx] border-t-[2rpx] border-[#f1f1e6]">
              <View className="flex gap-[16rpx]">
                <Picker
                  mode="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.detail.value)}
                  className="flex-1"
                >
                  <View className="h-[80rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[20rpx] flex items-center bg-[#f5f5f0] text-[28rpx]">
                    <Text>{startDate || "开始日期"}</Text>
                  </View>
                </Picker>
                <Picker
                  mode="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.detail.value)}
                  className="flex-1"
                >
                  <View className="h-[80rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[20rpx] flex items-center bg-[#f5f5f0] text-[28rpx]">
                    <Text>{startTime || "开始时间"}</Text>
                  </View>
                </Picker>
              </View>
              
              <View className="flex gap-[16rpx]">
                <Picker
                  mode="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.detail.value)}
                  className="flex-1"
                >
                  <View className="h-[80rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[20rpx] flex items-center bg-[#f5f5f0] text-[28rpx]">
                    <Text>{endDate || "结束日期"}</Text>
                  </View>
                </Picker>
                <Picker
                  mode="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.detail.value)}
                  className="flex-1"
                >
                  <View className="h-[80rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[20rpx] flex items-center bg-[#f5f5f0] text-[28rpx]">
                    <Text>{endTime || "结束时间"}</Text>
                  </View>
                </Picker>
              </View>

              <Input
                value={note}
                placeholder="备注或观察"
                className="h-[96rpx] border-[2rpx] border-[#1a1a1a] rounded-[16rpx] px-[24rpx] text-[30rpx] leading-[1.35] bg-[#f5f5f0]"
                onInput={(event) => setNote(event.detail.value)}
              />
              <View className="flex items-center justify-between text-[28rpx] text-[#4a4a4a] px-[8rpx]">
                <Text>时长：</Text>
                <Text className="font-bold text-[#1a1a1a]">
                  {pendingDuration ? formatMinutes(pendingDuration) : "—"}
                </Text>
              </View>
              <Button className="bg-[#f6821f] text-[#ffffff] rounded-[16rpx] text-[30rpx] h-[96rpx] leading-[96rpx] w-full shadow-[0_16rpx_28rpx_#f6821f40]" onClick={handleSaveRecord} loading={isLoading}>
                {editingRecordId ? "保存修改" : "保存记录"}
              </Button>
            </View>
          </View>
        </View>
      )}

      {pendingDeleteRecordId && (
        <View className="fixed inset-0 flex items-center justify-center z-[10]">
          <View
            className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]"
            onClick={() => setPendingDeleteRecordId(null)}
          />
          <View className="relative w-[min(90vw,480px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[16rpx] z-[11]">
            <View className="flex items-center justify-between">
              <Text className="text-[36rpx] font-semibold">删除记录</Text>
              <Button
                className="border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0"
                onClick={() => setPendingDeleteRecordId(null)}
              >
                关闭
              </Button>
            </View>
            <View className="py-[8rpx] text-[28rpx] text-[#4a4a4a] leading-[1.5]">
              <Text>确定要删除这条记录吗？</Text>
            </View>
            <View className="flex gap-[16rpx] mt-[8rpx]">
              <Button
                className="flex-1 h-[72rpx] leading-[72rpx] text-[26rpx] rounded-[999px] border-none outline-none"
                onClick={() => setPendingDeleteRecordId(null)}
              >
                取消
              </Button>
              <Button className="flex-1 h-[72rpx] leading-[72rpx] rounded-[999px] bg-[#f6821f] shadow-[0_12rpx_24rpx_#f6821f40] text-[#ffffff]" onClick={confirmDeleteRecord} loading={isLoading}>
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
