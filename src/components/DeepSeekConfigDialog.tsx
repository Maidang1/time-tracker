import { useEffect, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";

import type { DeepSeekConfig } from "../utils/aiConfig";

type DeepSeekConfigDialogProps = {
  open: boolean;
  initialConfig: DeepSeekConfig;
  onClose: () => void;
  onSave: (config: DeepSeekConfig) => void;
};

export default function DeepSeekConfigDialog({
  open,
  initialConfig,
  onClose,
  onSave,
}: DeepSeekConfigDialogProps) {
  const [apiKey, setApiKey] = useState(initialConfig.apiKey);
  const [apiBase, setApiBase] = useState(initialConfig.apiBase);
  const [model, setModel] = useState(initialConfig.model);

  useEffect(() => {
    if (open) {
      setApiKey(initialConfig.apiKey);
      setApiBase(initialConfig.apiBase);
      setModel(initialConfig.model);
    }
  }, [open, initialConfig.apiKey, initialConfig.apiBase, initialConfig.model]);

  if (!open) return null;

  return (
    <View className="fixed inset-0 flex items-center justify-center z-[999]">
      <View className="absolute inset-0 bg-[#00000060] backdrop-blur-[2px]" onClick={onClose} />
      <View className="relative w-[min(90vw,520px)] bg-[#ffffff] border-[2rpx] border-[#1a1a1a] rounded-[20rpx] shadow-[0_30rpx_60rpx_#00000025] p-[28rpx] flex flex-col gap-[20rpx] z-[1]">
        <View className="flex items-center justify-between">
          <Text className="text-[36rpx] font-semibold">配置 DeepSeek</Text>
          <Button className="border-[2rpx] border-[#1a1a1a] rounded-[999px] px-[20rpx] h-[64rpx] leading-[64rpx] bg-transparent text-[26rpx] mr-0" onClick={onClose}>
            关闭
          </Button>
        </View>
        <View className="flex flex-col gap-[16rpx]">
          <View className="flex flex-col gap-[10rpx]">
            <Text className="text-[24rpx] text-[#4a4a4a]">API Key</Text>
            <Input
              value={apiKey}
              placeholder="请输入 DeepSeek API Key"
              className="border-[2rpx] border-[#1a1a1a] rounded-[14rpx] px-[18rpx] py-[14rpx] text-[26rpx] bg-[#f5f5f0]"
              password
              onInput={(event) => setApiKey(event.detail.value)}
            />
          </View>
          <View className="flex flex-col gap-[10rpx]">
            <Text className="text-[24rpx] text-[#4a4a4a]">API Base</Text>
            <Input
              value={apiBase}
              placeholder="https://api.deepseek.com"
              className="border-[2rpx] border-[#1a1a1a] rounded-[14rpx] px-[18rpx] py-[14rpx] text-[26rpx] bg-[#f5f5f0]"
              onInput={(event) => setApiBase(event.detail.value)}
            />
          </View>
          <View className="flex flex-col gap-[10rpx]">
            <Text className="text-[24rpx] text-[#4a4a4a]">Model</Text>
            <Input
              value={model}
              placeholder="deepseek-chat"
              className="border-[2rpx] border-[#1a1a1a] rounded-[14rpx] px-[18rpx] py-[14rpx] text-[26rpx] bg-[#f5f5f0]"
              onInput={(event) => setModel(event.detail.value)}
            />
          </View>
        </View>
        <View className="flex justify-end">
          <Button
            className="rounded-[999px] h-[72rpx] leading-[72rpx] px-[28rpx] text-[26rpx] border-[2rpx] border-[#1a1a1a] bg-[#f6821f] text-[#ffffff]"
            onClick={() =>
              onSave({
                apiKey,
                apiBase,
                model,
              })
            }
          >
            保存配置
          </Button>
        </View>
      </View>
    </View>
  );
}
