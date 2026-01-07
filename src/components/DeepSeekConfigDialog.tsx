import { useEffect, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";

import type { DeepSeekConfig } from "../utils/aiConfig";

import "./DeepSeekConfigDialog.scss";

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
    <View className="config-dialog">
      <View className="config-dialog_mask" onClick={onClose} />
      <View className="config-dialog_card">
        <View className="config-dialog_header">
          <Text className="config-dialog_title">配置 DeepSeek</Text>
          <Button className="config-dialog_close" onClick={onClose}>
            关闭
          </Button>
        </View>
        <View className="config-dialog_body">
          <View className="config-field">
            <Text className="config-label">API Key</Text>
            <Input
              value={apiKey}
              placeholder="请输入 DeepSeek API Key"
              className="config-input"
              onInput={(event) => setApiKey(event.detail.value)}
            />
          </View>
          <View className="config-field">
            <Text className="config-label">API Base</Text>
            <Input
              value={apiBase}
              placeholder="https://api.deepseek.com"
              className="config-input"
              onInput={(event) => setApiBase(event.detail.value)}
            />
          </View>
          <View className="config-field">
            <Text className="config-label">Model</Text>
            <Input
              value={model}
              placeholder="deepseek-chat"
              className="config-input"
              onInput={(event) => setModel(event.detail.value)}
            />
          </View>
        </View>
        <View className="config-dialog_actions">
          <Button
            className="config-dialog_save"
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
