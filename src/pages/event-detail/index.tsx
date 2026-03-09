import { useMemo, useState, useEffect, useCallback } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro, { useRouter, useDidShow } from "@tarojs/taro";

import type { EventRecord } from "../../types/events";
import { formatMinutes } from "../../utils/time";
import PageHeader from "../../components/PageHeader";
import HeaderMeta from "../../components/HeaderMeta";
import SwipeableItem from "../../components/SwipeableItem";
import CheckinHeatmap from "../../components/CheckinHeatmap";
import DataManager from "../../services/dataManager";
import { useTheme } from "../../hooks/useTheme";

export default function EventDetail() {
  const router = useRouter();
  const eventId = Number(router.params?.id || 0);
  const { actualTheme } = useTheme();

  const [eventData, setEventData] = useState<any>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");
  const [todoDescription, setTodoDescription] = useState("");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [pendingDeleteRecordId, setPendingDeleteRecordId] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  // 打卡热力图当前显示的月份
  const [checkinMonth, setCheckinMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const showSyncError = useCallback(
    (error: { type: string; message: string; retry?: () => Promise<void> }) => {
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

  // 页面加载时获取事件数据
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadEvent = async () => {
      try {
        await DataManager.waitForInitialization();
      } catch (error) {
        console.error('DataManager initialization failed:', error);
      }

      const event = DataManager.getEventById(eventId);
      if (event) {
        setEventData(event);
      }
      setIsPageLoading(false);

      unsubscribe = DataManager.subscribe(() => {
        const currentEvent = DataManager.getEventById(eventId);
        if (currentEvent) {
          setEventData(currentEvent);
        }
      });
    };

    loadEvent();

    return () => unsubscribe?.();
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

  // 计算打卡统计
  const checkinStats = useMemo(() => {
    if (!eventData || eventData.type !== 'checkin') {
      return { totalDays: 0, consecutiveDays: 0 };
    }

    const records = eventData.records || [];
    if (records.length === 0) {
      return { totalDays: 0, consecutiveDays: 0 };
    }

    // 获取所有打卡日期，去重并排序（倒序）
    const rawDates = records
      .map((r: EventRecord) => r.startDate || r.date)
      .filter((d): d is string => !!d);
    const checkinDates = Array.from(new Set(rawDates)).sort().reverse();

    const totalDays = checkinDates.length;

    // 计算连续打卡天数
    let consecutiveDays = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // 检查最近一次打卡是否是今天或昨天（允许今天还没打卡但昨天打了卡）
    const firstDate = checkinDates[0];
    if (firstDate === today || firstDate === yesterday) {
      consecutiveDays = 1;
      let prevDate: string = firstDate;

      for (let i = 1; i < checkinDates.length; i++) {
        const currentDate = checkinDates[i] as string;
        const prev = new Date(prevDate);
        const curr = new Date(currentDate);
        const diffDays = (prev.getTime() - curr.getTime()) / 86400000;

        if (diffDays === 1) {
          // 连续
          consecutiveDays++;
          prevDate = currentDate;
        } else {
          // 断开
          break;
        }
      }
    }

    return { totalDays, consecutiveDays };
  }, [eventData]);

  // 打卡功能：直接记录今天
  const handleCheckin = async () => {
    if (!eventData) return;

    const today = new Date().toISOString().slice(0, 10);

    // 检查今天是否已经打卡
    const alreadyCheckedIn = eventData.records?.some(
      (r: EventRecord) => (r.startDate || r.date) === today
    );

    if (alreadyCheckedIn) {
      Taro.showToast({ title: '今天已经打卡了', icon: 'none' });
      return;
    }

    setIsLoading(true);
    Taro.showLoading({ title: '打卡中...' });

    try {
      await DataManager.createRecord(eventId, {
        startDate: today,
        endDate: today,
        startTime: '',
        endTime: '',
        durationMinutes: 0,
        note: '',
        date: today,
      });
      Taro.showToast({ title: '打卡成功', icon: 'success' });
    } catch (error) {
      Taro.showToast({ title: '打卡失败', icon: 'none' });
    } finally {
      setIsLoading(false);
      Taro.hideLoading();
    }
  };

  const openRecordDialog = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (eventData?.type === 'time') {
      setStartDate(today);
      setEndDate(today);
      setStartTime("");
      setEndTime("");
      setNote("");
    } else if (eventData?.type === 'checkin') {
      setStartDate(today);
      setNote("");
    } else {
      setTodoDescription("");
    }
    setEditingRecordId(null);
    setShowRecordDialog(true);
  };

  const openEditRecordDialog = (record: EventRecord) => {
    if (eventData?.type === 'time') {
      // 兼容旧数据格式
      setStartDate(record.startDate || record.date || "");
      setEndDate(record.endDate || record.date || "");
      setStartTime(record.startTime || "");
      setEndTime(record.endTime || "");
      setNote(record.note);
    } else if (eventData?.type === 'checkin') {
      setStartDate(record.startDate || record.date || "");
      setNote(record.note);
    } else {
      setTodoDescription(record.note);
    }
    setEditingRecordId(record.id);
    setShowRecordDialog(true);
  };

  const handleSaveRecord = async () => {
    if (!eventData) return;

    // 根据类型验证
    if (eventData.type === 'time') {
      if (!startDate || !startTime || !endDate || !endTime) return;
    } else if (eventData.type === 'checkin') {
      if (!startDate) return;
    } else if (eventData.type === 'todo') {
      if (!todoDescription.trim()) return;
    }

    setIsLoading(true);

    try {
      if (editingRecordId) {
        const recordToUpdate = eventData.records.find((r) => r.id === editingRecordId);
        if (recordToUpdate) {
          let updatedRecord;
          if (eventData.type === 'time') {
            updatedRecord = {
              ...recordToUpdate,
              startDate,
              endDate,
              startTime,
              endTime,
              durationMinutes: pendingDuration,
              note: note.trim(),
              date: startDate,
            };
          } else if (eventData.type === 'checkin') {
            updatedRecord = {
              ...recordToUpdate,
              startDate,
              endDate: startDate,
              startTime: '',
              endTime: '',
              durationMinutes: 0,
              note: note.trim(),
              date: startDate,
            };
          } else {
            updatedRecord = {
              ...recordToUpdate,
              note: todoDescription.trim(),
            };
          }
          await DataManager.updateRecord(eventId, updatedRecord);
        }
      } else {
        let recordData;
        if (eventData.type === 'time') {
          recordData = {
            startDate,
            endDate,
            startTime,
            endTime,
            durationMinutes: pendingDuration,
            note: note.trim(),
            date: startDate,
          };
        } else if (eventData.type === 'checkin') {
          recordData = {
            startDate,
            endDate: startDate,
            startTime: '',
            endTime: '',
            durationMinutes: 0,
            note: note.trim(),
            date: startDate,
          };
        } else {
          recordData = {
            note: todoDescription.trim(),
            completed: false,
          };
        }
        await DataManager.createRecord(eventId, recordData);
      }

      // 重置表单
      if (eventData.type === 'time-tracking') {
        setStartDate("");
        setEndDate("");
        setStartTime("");
        setEndTime("");
        setNote("");
      } else {
        setTodoDescription("");
      }
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
    Taro.showLoading({ title: "删除中..." });

    try {
      await DataManager.deleteRecord(eventId, pendingDeleteRecordId);
    } finally {
      setIsLoading(false);
      Taro.hideLoading();
    }

    setPendingDeleteRecordId(null);
  };

  const handleToggleComplete = async (recordId: number) => {
    if (!eventData) return;
    await DataManager.toggleRecordComplete(eventData.id, recordId);
  };

  const goToAnalysis = () => {
    if (!eventId) return;
    Taro.navigateTo({
      url: `/pages/event-analysis/index?id=${eventId}`,
    });
  };

  // 根据主题动态生成样式
  const isDark = actualTheme === 'dark';
  const themeStyles = {
    container: isDark
      ? "min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#08090c] text-[#fff8ec] font-sans relative box-border flex flex-col gap-[24rpx]"
      : "min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f2e8d8] text-[#18130d] font-sans relative box-border flex flex-col gap-[24rpx]",
    background: isDark
      ? "absolute inset-0 bg-[#08090c] opacity-85 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#1f232a_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#1f232a_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#ffffff0d_3px,#ffffff0d_4px)]"
      : "absolute inset-0 bg-[#f2e8d8] opacity-62 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#cdbda5_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#cdbda5_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#00000010_3px,#00000010_4px)]",
    logo: isDark
      ? "w-[64rpx] h-[64rpx] rounded-[18rpx] border-[2rpx] border-[#4b5563] flex items-center justify-center text-[26rpx] font-bold bg-[#12151b] text-[#fff8ec] shadow-[0_8rpx_18rpx_#00000035]"
      : "w-[64rpx] h-[64rpx] rounded-[18rpx] border-[2rpx] border-[#2f1e10] flex items-center justify-center text-[26rpx] font-bold bg-[#ffffff] text-[#18130d] shadow-[0_10rpx_20rpx_#7a4d2416]",
    button: isDark
      ? "mr-0 border-solid border-[2rpx] border-[#4b5563] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#12151b] text-[#fff8ec] text-[26rpx] shadow-[0_8rpx_18rpx_#00000028]"
      : "mr-0 border-solid border-[2rpx] border-[#2f1e10] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#ffffff] text-[#18130d] text-[26rpx] shadow-[0_10rpx_20rpx_#7a4d2414]",
    primaryButton: isDark
      ? "mr-0 border-solid border-[2rpx] border-[#fbbf24] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#f59e0b] text-[#1b1205] text-[26rpx] font-medium shadow-[0_12rpx_24rpx_#f59e0b38]"
      : "mr-0 border-solid border-[2rpx] border-[#a94d08] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] bg-[#f6821f] text-[#ffffff] text-[26rpx] font-medium shadow-[0_14rpx_28rpx_#f6821f36]",
    description: isDark ? "text-[26rpx] text-[#c7ccd5] ml-[76rpx]" : "text-[26rpx] text-[#4d3b2a] ml-[76rpx]",
    sectionTitle: isDark ? "text-[36rpx] font-semibold leading-[1.35] text-[#fff8ec]" : "text-[36rpx] font-semibold leading-[1.35] text-[#18130d]",
    sectionSubtitle: isDark ? "text-[26rpx] text-[#9ca3af]" : "text-[26rpx] text-[#5c4b3a]",
    timelineLine: isDark ? "absolute left-[13rpx] top-[48rpx] bottom-[48rpx] w-[2rpx] border-l-[2rpx] border-dashed border-[#4b5563] z-[0]" : "absolute left-[13rpx] top-[48rpx] bottom-[48rpx] w-[2rpx] border-l-[2rpx] border-dashed border-[#b89874] z-[0]",
    recordCard: isDark
      ? "relative z-[1] ml-[24rpx] border-[2rpx] border-[#4b5563] rounded-[18rpx] p-[24rpx] bg-[#12151b] flex flex-col gap-[12rpx] shadow-[0_16rpx_32rpx_#00000038]"
      : "relative z-[1] ml-[24rpx] border-[2rpx] border-[#2f1e10] rounded-[18rpx] p-[24rpx] bg-[#ffffff] flex flex-col gap-[12rpx] shadow-[0_18rpx_36rpx_#7a4d2415]",
    timelineDot: isDark
      ? "absolute left-[-29rpx] top-[50%] translate-y-[-50%] w-[12rpx] h-[12rpx] rounded-full bg-[#f59e0b] border-[2rpx] border-[#08090c] shadow-[0_0_0_4rpx_#f59e0b33]"
      : "absolute left-[-29rpx] top-[50%] translate-y-[-50%] w-[12rpx] h-[12rpx] rounded-full bg-[#f6821f] border-[2rpx] border-[#ffffff] shadow-[0_0_0_4rpx_#f6821f30]",
    recordTime: isDark ? "text-[30rpx] font-medium text-[#fff8ec]" : "text-[30rpx] font-medium text-[#18130d]",
    recordDateTitle: isDark ? "text-[34rpx] font-semibold text-[#fff8ec]" : "text-[34rpx] font-semibold text-[#18130d]",
    recordDuration: isDark ? "text-[28rpx] font-bold text-[#fbbf24]" : "text-[28rpx] font-bold text-[#bf5409]",
    recordStatusTag: isDark
      ? "px-[18rpx] py-[8rpx] rounded-[999px] border-[2rpx] border-[#fbbf24] bg-[#f59e0b22] text-[24rpx] font-semibold text-[#fbbf24]"
      : "px-[18rpx] py-[8rpx] rounded-[999px] border-[2rpx] border-[#bf5409] bg-[#f6821f14] text-[24rpx] font-semibold text-[#bf5409]",
    recordNote: isDark ? "text-[28rpx] text-[#c7ccd5] leading-[1.5]" : "text-[28rpx] text-[#4d3b2a] leading-[1.5]",
    emptyState: isDark
      ? "ml-[24rpx] border-[2rpx] dashed border-[#6b7280] rounded-[18rpx] p-[28rpx] text-[#c7ccd5] text-center text-[26rpx] leading-[1.5] bg-[repeating-linear-gradient(-45deg,transparent,transparent_3px,#ffffff08_3px,#ffffff08_4px)]"
      : "ml-[24rpx] border-[2rpx] dashed border-[#9d7a53] rounded-[18rpx] p-[28rpx] text-[#4d3b2a] text-center text-[26rpx] leading-[1.5] bg-[#fffaf2]",
    errorState: isDark ? "relative z-[1] flex items-center justify-center min-h-[60vh] text-[#c7ccd5] text-[30rpx]" : "relative z-[1] flex items-center justify-center min-h-[60vh] text-[#4d3b2a] text-[30rpx]",
    // 对话框样式
    dialog: isDark
      ? "relative w-[80vw] bg-[#12151b] border-[2rpx] border-[#4b5563] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000066] p-[28rpx] flex flex-col gap-[16rpx] z-[11]"
      : "relative w-[80vw] bg-[#ffffff] border-[2rpx] border-[#2f1e10] rounded-[20rpx] shadow-[0_32rpx_64rpx_#7a4d2422] p-[28rpx] flex flex-col gap-[16rpx] z-[11]",
    dialogTitle: isDark ? "text-[36rpx] font-semibold text-[#fff8ec]" : "text-[36rpx] font-semibold text-[#18130d]",
    dialogCloseButton: isDark
      ? "border-[2rpx] border-solid border-[#4b5563] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0 text-[#c7ccd5]"
      : "border-[2rpx] border-solid border-[#2f1e10] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0 text-[#18130d]",
    dialogBorder: isDark ? "flex flex-col gap-[16rpx] p-[28rpx] border-t-[2rpx] border-[#1f232a]" : "flex flex-col gap-[16rpx] p-[28rpx] border-t-[2rpx] border-[#dcc8ad]",
    pickerView: isDark
      ? "h-[80rpx] border-[2rpx] border-[#4b5563] rounded-[16rpx] px-[20rpx] flex items-center bg-[#08090c] text-[28rpx] text-[#fff8ec]"
      : "h-[80rpx] border-[2rpx] border-[#2f1e10] rounded-[16rpx] px-[20rpx] flex items-center bg-[#fffaf2] text-[28rpx] text-[#18130d]",
    input: isDark
      ? "h-[96rpx] border-[2rpx] border-[#4b5563] rounded-[16rpx] px-[24rpx] text-[30rpx] leading-[1.35] bg-[#08090c] text-[#fff8ec]"
      : "h-[96rpx] border-[2rpx] border-[#2f1e10] rounded-[16rpx] px-[24rpx] text-[30rpx] leading-[1.35] bg-[#fffaf2] text-[#18130d]",
    durationText: isDark ? "flex items-center justify-between text-[28rpx] text-[#c7ccd5] px-[8rpx]" : "flex items-center justify-between text-[28rpx] text-[#4d3b2a] px-[8rpx]",
    durationValue: isDark ? "font-bold text-[#fff8ec]" : "font-bold text-[#18130d]",
    saveButton: isDark
      ? "bg-[#f59e0b] text-[#1b1205] rounded-[16rpx] text-[30rpx] font-medium h-[96rpx] leading-[96rpx] w-full shadow-[0_16rpx_28rpx_#f59e0b38]"
      : "bg-[#f6821f] text-[#fffdf8] rounded-[16rpx] text-[30rpx] font-medium h-[96rpx] leading-[96rpx] w-full shadow-[0_16rpx_28rpx_#f6821f40]",
    deleteText: isDark ? "py-[8rpx] text-[28rpx] text-[#c7ccd5] leading-[1.5]" : "py-[8rpx] text-[28rpx] text-[#4d3b2a] leading-[1.5]",
    deleteButton: isDark
      ? "flex-1 h-[72rpx] leading-[72rpx] rounded-[999px] bg-[#f59e0b] shadow-[0_12rpx_24rpx_#f59e0b38] text-[#1b1205] font-medium"
      : "flex-1 h-[72rpx] leading-[72rpx] rounded-[999px] bg-[#f6821f] shadow-[0_12rpx_24rpx_#f6821f40] text-[#fffdf8] font-medium",
  };

  if (!eventId) {
    return (
      <View className={themeStyles.container}>
        <View className={themeStyles.background} />
        <View className={themeStyles.errorState}>
          <Text>缺少事件 ID，请返回上一页。</Text>
        </View>
      </View>
    );
  }

  if (isPageLoading) {
    return (
      <View className={themeStyles.container}>
        <View className={themeStyles.background} />
        <View className={themeStyles.errorState}>
          <Text>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={themeStyles.container}>
      <View className={themeStyles.background} />

      {eventData ? (
        <>
          <PageHeader
            className="px-[8rpx]"
            left={
              <View className="flex flex-col gap-[4rpx]">
                <View className="flex items-center gap-[12rpx]">
                  <View className={themeStyles.logo}>
                    CP
                  </View>
                  <Text className="text-[32rpx] font-semibold">
                    {eventData.title}
                  </Text>
                </View>
                {eventData.description && (
                  <Text className={themeStyles.description}>
                    {eventData.description}
                  </Text>
                )}
              </View>
            }
            right={
              <View className="flex items-center gap-[12rpx]">
                <Button
                  className={themeStyles.button}
                  onClick={goToAnalysis}
                >
                  分析
                </Button>
                <Button
                  className={themeStyles.primaryButton}
                  onClick={eventData.type === 'checkin' ? handleCheckin : openRecordDialog}
                >
                  {eventData.type === 'checkin' ? '打卡' : '新建'}
                </Button>
              </View>
            }
          />

          <HeaderMeta
            className="px-[8rpx]"
            items={[
              {
                key: "records",
                text: eventData.type === 'checkin'
                  ? `共 ${checkinStats.totalDays} 天打卡`
                  : `共 ${eventData.records?.length || 0} 条记录`,
                tone: "pending",
              },
            ]}
          />

          {/* 打卡统计展示区 */}
          {eventData.type === 'checkin' && (
            <View className="px-[8rpx] py-[24rpx] relative z-[1]">
              {/* 统计卡片 */}
              <View className={`${isDark
                ? "flex gap-[24rpx] p-[24rpx] rounded-[18rpx] bg-[#12151b] border-[2rpx] border-[#4b5563] mb-[24rpx] shadow-[0_16rpx_32rpx_#00000038]"
                : "flex gap-[24rpx] p-[24rpx] rounded-[18rpx] bg-[#ffffff] border-[2rpx] border-[#2f1e10] mb-[24rpx] shadow-[0_18rpx_36rpx_#7a4d2415]"} relative z-[1]`}>
                <View className="flex-1 flex flex-col items-center">
                  <Text className={isDark ? "text-[48rpx] font-bold text-[#fbbf24]" : "text-[48rpx] font-bold text-[#bf5409]"}>
                    {checkinStats.consecutiveDays}
                  </Text>
                  <Text className={isDark ? "text-[24rpx] text-[#9ca3af] mt-[8rpx]" : "text-[24rpx] text-[#5c4b3a] mt-[8rpx]"}>
                    连续打卡
                  </Text>
                </View>
                <View className={isDark ? "w-[2rpx] bg-[#4b5563]" : "w-[2rpx] bg-[#c19b6f]"} />
                <View className="flex-1 flex flex-col items-center">
                  <Text className={isDark ? "text-[48rpx] font-bold text-[#fff8ec]" : "text-[48rpx] font-bold text-[#18130d]"}>
                    {checkinStats.totalDays}
                  </Text>
                  <Text className={isDark ? "text-[24rpx] text-[#9ca3af] mt-[8rpx]" : "text-[24rpx] text-[#5c4b3a] mt-[8rpx]"}>
                    总打卡天数
                  </Text>
                </View>
              </View>

              {/* 月度打卡热力图 */}
              <CheckinHeatmap
                records={eventData.records || []}
                currentMonth={checkinMonth}
                onMonthChange={setCheckinMonth}
                actualTheme={actualTheme}
              />
            </View>
          )}

          {eventData.type !== 'checkin' && (
            <View className="mt-[16rpx] border-none rounded-0 bg-transparent shadow-none relative z-[1]">
              <View className="flex flex-col items-start gap-[8rpx] pt-[28rpx] px-[0rpx] sm:flex-row sm:items-center sm:justify-between">
                <Text className={themeStyles.sectionTitle}>
                  记录日志
                </Text>
                <Text className={themeStyles.sectionSubtitle}>
                  记录按倒序展示
                </Text>
              </View>

              <View className="flex flex-col gap-[16rpx] py-[24rpx] pb-[32rpx] pl-[12rpx] relative">
                {(eventData.records?.length || 0) > 1 && (
                  <View className={themeStyles.timelineLine} />
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
                    {eventData.type === 'time' ? (
                      <View className={themeStyles.recordCard}>
                        <View className={themeStyles.timelineDot} />
                        <View className="flex items-center justify-between">
                          <Text className={themeStyles.recordTime}>
                            {record.startDate || record.date} {record.startTime}
                            {record.endDate &&
                            record.endDate !== (record.startDate || record.date)
                              ? ` — ${record.endDate} ${record.endTime}`
                              : ` — ${record.endTime}`}
                          </Text>
                          <Text className={themeStyles.recordDuration}>
                            {formatMinutes(record.durationMinutes)}
                          </Text>
                        </View>
                        <Text className={themeStyles.recordNote}>
                          {record.note || "暂无备注"}
                        </Text>
                      </View>
                    ) : (
                      <View
                        className={`${themeStyles.recordCard} ${record.completed ? 'opacity-60' : ''}`}
                        onClick={() => handleToggleComplete(record.id)}
                      >
                        <View className={themeStyles.timelineDot} />
                        <View className="flex items-center gap-[16rpx]">
                          <Text className="text-[40rpx]">
                            {record.completed ? '☑' : '☐'}
                          </Text>
                          <Text className={`${themeStyles.recordNote} ${record.completed ? 'line-through' : ''}`}>
                            {record.note}
                          </Text>
                        </View>
                        <Text className={themeStyles.recordTime}>
                          创建：{new Date(record.createdAt).toLocaleString('zh-CN')}
                        </Text>
                        {record.completedAt && (
                          <Text className={themeStyles.recordTime}>
                            完成：{new Date(record.completedAt).toLocaleString('zh-CN')}
                          </Text>
                        )}
                      </View>
                    )}
                  </SwipeableItem>
                ))}

                {!eventData.records?.length && (
                  <View className={themeStyles.emptyState}>
                    <Text>暂无记录，请先在上方添加。</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </>
      ) : (
        <View className={themeStyles.errorState}>
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}

      {showRecordDialog && (
        <View className="fixed inset-0 flex items-center justify-center z-[10]">
          <View
            className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]"
            onClick={() => setShowRecordDialog(false)}
          />
          <View className={themeStyles.dialog}>
            <View className="flex items-center justify-between">
              <Text className={themeStyles.dialogTitle}>
                {editingRecordId ? "编辑记录" : "新增记录"}
              </Text>
              <Button
                className={themeStyles.dialogCloseButton}
                onClick={() => setShowRecordDialog(false)}
              >
                关闭
              </Button>
            </View>
            <View className={themeStyles.dialogBorder}>
              {eventData?.type === 'time' ? (
                <>
                  <View className="flex gap-[16rpx]">
                    <Picker
                      mode="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.detail.value)}
                      className="flex-1"
                    >
                      <View className={themeStyles.pickerView}>
                        <Text>{startDate || "开始日期"}</Text>
                      </View>
                    </Picker>
                    <Picker
                      mode="time"
                      value={startTime}
                      onChange={(event) => setStartTime(event.detail.value)}
                      className="flex-1"
                    >
                      <View className={themeStyles.pickerView}>
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
                      <View className={themeStyles.pickerView}>
                        <Text>{endDate || "结束日期"}</Text>
                      </View>
                    </Picker>
                    <Picker
                      mode="time"
                      value={endTime}
                      onChange={(event) => setEndTime(event.detail.value)}
                      className="flex-1"
                    >
                      <View className={themeStyles.pickerView}>
                        <Text>{endTime || "结束时间"}</Text>
                      </View>
                    </Picker>
                  </View>

                  <Input
                    value={note}
                    placeholder="备注或观察"
                    className={themeStyles.input}
                    onInput={(event) => setNote(event.detail.value)}
                  />
                  <View className={themeStyles.durationText}>
                    <Text>时长：</Text>
                    <Text className={themeStyles.durationValue}>
                      {pendingDuration ? formatMinutes(pendingDuration) : "—"}
                    </Text>
                  </View>
                </>
              ) : eventData?.type === 'checkin' ? (
                <>
                  <Picker
                    mode="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.detail.value)}
                  >
                    <View className={themeStyles.pickerView}>
                      <Text>{startDate || "选择打卡日期"}</Text>
                    </View>
                  </Picker>

                  <Input
                    value={note}
                    placeholder="打卡备注（可选）"
                    className={themeStyles.input}
                    onInput={(event) => setNote(event.detail.value)}
                  />
                </>
              ) : (
                <Input
                  value={todoDescription}
                  placeholder="输入待办事项描述"
                  className={themeStyles.input}
                  onInput={(event) => setTodoDescription(event.detail.value)}
                />
              )}
              <Button
                className={themeStyles.saveButton}
                onClick={handleSaveRecord}
                loading={isLoading}
              >
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
          <View className={themeStyles.dialog}>
            <View className="flex items-center justify-between">
              <Text className={themeStyles.dialogTitle}>删除记录</Text>
              <Button
                className={themeStyles.dialogCloseButton}
                onClick={() => setPendingDeleteRecordId(null)}
              >
                关闭
              </Button>
            </View>
            <View className={themeStyles.deleteText}>
              <Text>确定要删除这条记录吗？</Text>
            </View>
            <View className="flex gap-[16rpx] mt-[8rpx]">
              <Button
                className="flex-1 h-[72rpx] leading-[72rpx] text-[26rpx] rounded-[999px] border-none outline-none"
                onClick={() => setPendingDeleteRecordId(null)}
              >
                取消
              </Button>
              <Button
                className={themeStyles.deleteButton}
                onClick={confirmDeleteRecord}
                loading={isLoading}
              >
                删除
              </Button>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}
