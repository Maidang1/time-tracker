import Taro from "@tarojs/taro";

export type DeepSeekConfig = {
  apiKey: string;
  apiBase: string;
  model: string;
};

const CONFIG_KEY = "deepseek_config";

const DEFAULT_CONFIG: DeepSeekConfig = {
  apiKey: "",
  apiBase: "https://api.deepseek.com",
  model: "deepseek-chat",
};

const normalizeConfig = (config: Partial<DeepSeekConfig>): DeepSeekConfig => {
  return {
    apiKey: (config.apiKey ?? "").trim(),
    apiBase: (config.apiBase ?? DEFAULT_CONFIG.apiBase).trim() || DEFAULT_CONFIG.apiBase,
    model: (config.model ?? DEFAULT_CONFIG.model).trim() || DEFAULT_CONFIG.model,
  };
};

export const getDeepSeekConfig = (): DeepSeekConfig => {
  try {
    const stored = Taro.getStorageSync<Partial<DeepSeekConfig>>(CONFIG_KEY);
    if (stored && typeof stored === "object") {
      return normalizeConfig(stored);
    }
  } catch (error) {
    console.warn("Unable to read DeepSeek config", error);
  }
  return { ...DEFAULT_CONFIG };
};

export const saveDeepSeekConfig = (config: DeepSeekConfig) => {
  const normalized = normalizeConfig(config);
  try {
    Taro.setStorageSync(CONFIG_KEY, normalized);
  } catch (error) {
    console.warn("Unable to persist DeepSeek config", error);
  }
  return normalized;
};

export const isDeepSeekConfigured = () => {
  return Boolean(getDeepSeekConfig().apiKey);
};
