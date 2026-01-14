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

import "./index.scss";

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
      <View className="event-ai-insights">
        <View className="blueprint-surface" />
        <View className="empty-state">
          <Text>缺少事件 ID，请返回上一页。</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="event-ai-insights">
      <View className="blueprint-surface" />

      <PageHeader
        left={
          <View className="brand">
            <View className="brand-mark">CP</View>
            <Text className="brand-name">AI 洞察</Text>
          </View>
        }
        right={
          <View className="header-actions">
            <Button className="header-action outline" onClick={() => navigateBack()}>
              返回
            </Button>
          </View>
        }
      />

      {eventData ? (
        <>
          <HeaderMeta
            items={[
              {
                key: "records",
                text: `共 ${eventData.records.length} 条记录`,
                tone: "pending",
              },
            ]}
          />

          <View className="panel event-ai-panel">
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
        <View className="empty-state">
          <Text>未找到事件或已被删除。</Text>
        </View>
      )}
    </View>
  );
}
