import { useCallback, useMemo, useState, useEffect } from "react";
import { Button, Text, View } from "@tarojs/components";
import { navigateBack, useDidShow } from "@tarojs/taro";

import type { EventItem } from "../../types/events";
import DataManager from "../../services/dataManager";
import { formatMinutes } from "../../utils/time";
import {
  buildGlobalEventContext,
  composeInsightPrompt,
  GLOBAL_INSIGHT_INSTRUCTION,
} from "../../utils/aiPrompt";
import AiInsightCard from "../../components/AiInsightCard";
import {
  fetchAiInsight,
  type AiInsightResult,
  isDeepSeekEnabled,
} from "../../services/aiClient";
import PageHeader from "../../components/PageHeader";
import HeaderMeta from "../../components/HeaderMeta";

export default function AiInsightsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [globalInsight, setGlobalInsight] = useState<AiInsightResult | null>(null);
  const deepSeekEnabled = isDeepSeekEnabled();

  // 在组件挂载时从数据管理器获取初始数据并监听变化
  useEffect(() => {
    // 获取当前所有事件
    const initialEvents = DataManager.getAllEvents();
    setEvents(initialEvents);

    // 订阅数据变化
    const unsubscribe = DataManager.subscribe(() => {
      const currentEvents = DataManager.getAllEvents();
      setEvents(currentEvents);
    });

    return () => unsubscribe(); // 清理订阅
  }, []);

  const { completedCount } = useMemo(() => {
    return {
      completedCount: events.length,
    };
  }, [events]);

  const globalContext = useMemo(() => buildGlobalEventContext(events), [events]);

  const globalSummaryChips = useMemo(() => {
    if (!globalContext.events.length) {
      return (
        <Text className="ai-card_hint">当前还没有事件，创建后即可召唤分析。</Text>
      );
    }
    return globalContext.events.map((event) => (
      <View key={event.id} className="ai-card_context-chip">
        <Text className="ai-chip_title">{event.title}</Text>
        <Text className="ai-chip_meta">
          {event.recordCount} 条记录 · {formatMinutes(event.totalMinutes)}
        </Text>
      </View>
    ));
  }, [globalContext]);

  const globalDisabledReason = useMemo(() => {
    if (!deepSeekEnabled) {
      return "未配置 DeepSeek API Key，请先完成配置";
    }
    if (!events.length) {
      return "暂无事件可分析";
    }
    return "";
  }, [events.length, deepSeekEnabled]);

  const handleGlobalInsight = useCallback(
    async (userPrompt: string) => {
      if (!events.length) {
        throw new Error("需要至少 1 个事件才能生成分析");
      }

      const prompt = composeInsightPrompt({
        baseInstruction: GLOBAL_INSIGHT_INSTRUCTION,
        context: globalContext,
        userPrompt,
      });
      return await fetchAiInsight({
        scope: "allEvents",
        prompt,
      });
    },
    [events.length, globalContext]
  );

  return (
    <View className="min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f5f5f0] text-[#1a1a1a] font-sans relative box-border flex flex-col gap-[24rpx]">
      <View className="absolute inset-0 bg-[#f5f5f0] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]" />

      <PageHeader
        className="px-[8rpx]"
        left={
          <View className="flex items-center gap-[12rpx]">
            <View className="w-[64rpx] h-[64rpx] rounded-[18rpx] border-[2rpx] border-[#1a1a1a] flex items-center justify-center text-[26rpx] font-bold bg-[#ffffff]">CP</View>
            <Text className="text-[32rpx] font-semibold">AI 洞察</Text>
          </View>
        }
        right={
          <View className="flex items-center gap-[12rpx]">
            <Button className="mr-0 border-[2rpx] rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] text-[26rpx] bg-transparent text-[#f6821f] outline-none border-[#f6821f]" onClick={() => navigateBack()}>
              返回
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

      <View className="relative z-[1] mt-[8rpx]">
        <AiInsightCard
          title="AI 洞察"
          description="分析所有事件方向，推测心情和偏好，并给出建议。"
          extraContent={globalSummaryChips}
          disabled={!deepSeekEnabled || !events.length}
          disabledReason={globalDisabledReason}
          initialResult={globalInsight}
          onGenerate={handleGlobalInsight}
          onResult={setGlobalInsight}
        />
      </View>
    </View>
  );
}
