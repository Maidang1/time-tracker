import { useCallback, useMemo, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import { navigateBack, useRouter } from "@tarojs/taro";

import { useEventData } from "../../hooks/useEventData";
import { formatMinutes } from "../../utils/time";
import {
  buildEventDetailContext,
  composeInsightPrompt,
  EVENT_INSIGHT_INSTRUCTION,
} from "../../utils/aiPrompt";
import AiInsightCard from "../../components/AiInsightCard";
import {
  fetchAiInsight,
  type AiInsightResult,
  isDeepSeekEnabled,
} from "../../services/aiClient";
import { getCachedEventInsight, setCachedEventInsight } from "../../utils/aiCache";
import PageHeader from "../../components/PageHeader";
import HeaderMeta from "../../components/HeaderMeta";

export default function EventAiInsightsPage() {
  const router = useRouter();
  const eventId = Number(router.params?.id || 0);

  const { eventData } = useEventData(eventId);
  const [eventInsight, setEventInsight] = useState<AiInsightResult | null>(() =>
    getCachedEventInsight(eventId)
  );
  const deepSeekEnabled = isDeepSeekEnabled();

  const eventContext = useMemo(() => {
    if (!eventData) return null;
    return buildEventDetailContext(eventData);
  }, [eventData, eventData?.records.length]);

  const eventSummaryChips = useMemo(() => {
    if (!eventData || !eventContext) {
      return null;
    }
    const stats = [
      { label: "记录数", value: `${eventData.records.length}` },
      { label: "总时长", value: formatMinutes(eventContext.totalMinutes) },
      {
        label: "平均",
        value: eventContext.averageMinutes ? formatMinutes(eventContext.averageMinutes) : "—",
      },
      {
        label: "最长",
        value: eventContext.longestMinutes ? formatMinutes(eventContext.longestMinutes) : "—",
      },
    ];
    return stats.map((stat) => (
      <View key={stat.label} className="ai-card_context-chip">
        <Text className="ai-chip_title">{stat.label}</Text>
        <Text className="ai-chip_meta">{stat.value}</Text>
      </View>
    ));
  }, [eventContext, eventData]);

  const eventDisabledReason = useMemo(() => {
    if (!deepSeekEnabled) {
      return "未配置 DeepSeek API Key，请先完成配置";
    }
    if (!eventData || !eventData.records.length) {
      return "至少添加 1 条记录后再请求分析";
    }
    return "";
  }, [eventData, deepSeekEnabled]);

  const handleEventInsight = useCallback(
    async (userPrompt: string) => {
      if (!eventData || !eventContext) {
        throw new Error("无法找到事件数据");
      }
      if (!eventData.records.length) {
        throw new Error("至少添加 1 条记录后再请求分析");
      }

      const prompt = composeInsightPrompt({
        baseInstruction: EVENT_INSIGHT_INSTRUCTION,
        context: eventContext,
        userPrompt,
      });
      return await fetchAiInsight({
        scope: "event",
        prompt,
      });
    },
    [eventContext, eventData]
  );

  if (!eventId) {
    return (
      <View className="min-h-screen w-full px-[24rpx] py-[32rpx] sm:px-[32rpx] sm:py-[40rpx] pb-[48rpx] sm:pb-[64rpx] bg-[#f5f5f0] text-[#1a1a1a] font-sans relative box-border flex flex-col gap-[24rpx]">
        <View className="absolute inset-0 bg-[#f5f5f0] opacity-70 z-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(90deg,transparent,transparent_60px,#dcdcdc_61px),repeating-linear-gradient(-45deg,transparent,transparent_3px,#0000001a_3px,#0000001a_4px)]" />
        <View className="border-[2rpx] dashed border-[#888888] rounded-[16rpx] p-[28rpx] text-[#4a4a4a] text-center bg-[#ffffff] text-[26rpx] leading-[1.5] relative z-[1]">
          <Text>缺少事件 ID，请返回上一页。</Text>
        </View>
      </View>
    );
  }

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
            <Button className="mr-0 border-[2rpx] border-solid rounded-[999px] px-[24rpx] h-[72rpx] leading-[72rpx] text-[26rpx] bg-transparent text-[#f6821f] outline-none border-[#f6821f]" onClick={() => navigateBack()}>
              返回
            </Button>
          </View>
        }
      />

      {eventData ? (
        <>
          <HeaderMeta
            className="px-[8rpx]"
            items={[
              {
                key: "records",
                text: `共 ${eventData.records.length} 条记录`,
                tone: "pending",
              },
            ]}
          />

          <View className="relative z-[1] mt-[8rpx]">
            <AiInsightCard
              title="AI 洞察投入程度"
              description="让 DeepSeek 根据该事件的记录趋势评估投入度与建议。"
              extraContent={eventSummaryChips}
              disabled={!deepSeekEnabled || !eventData.records.length}
              disabledReason={eventDisabledReason}
              initialResult={eventInsight}
              onGenerate={handleEventInsight}
              onResult={(result) => {
                setEventInsight(result);
                setCachedEventInsight(eventId, result);
              }}
            />
          </View>
        </>
      ) : (
        <View className="border-[2rpx] dashed border-[#888888] rounded-[16rpx] p-[28rpx] text-[#4a4a4a] text-center bg-[#ffffff] text-[26rpx] leading-[1.5] relative z-[1]">
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}
    </View>
  );
}
