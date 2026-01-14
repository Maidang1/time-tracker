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

import "./index.scss";

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
    <View className="ai-insights">
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

      <HeaderMeta
        items={[
          {
            key: "events",
            text: `${completedCount} 个事件`,
            tone: "completed",
          },
        ]}
      />

      <View className="panel ai-insights-panel">
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
