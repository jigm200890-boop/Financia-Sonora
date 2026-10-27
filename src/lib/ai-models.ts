export type AIModelOption = {
  label: string;
  provider: string;
  model: string;
  protocol: string;
};

/** Models already included in the portal plan. Raw model ids stay in code only. */
export const AI_MODEL_OPTIONS: AIModelOption[] = [
  {
    label: "GPT 5.5",
    provider: "OpenAI",
    model: "openai/gpt-5.5",
    protocol: "openai_responses",
  },
  {
    label: "Claude Sonnet 4.5",
    provider: "Anthropic",
    model: "anthropic/claude-sonnet-4.5",
    protocol: "anthropic_messages",
  },
  {
    label: "GLM 5.2",
    provider: "GLM",
    model: "z-ai/glm-5.2",
    protocol: "openai_chat_completions",
  },
  {
    label: "Qwen 3.7 Plus",
    provider: "Qwen",
    model: "alibaba/qwen-3.7-plus",
    protocol: "openai_chat_completions",
  },
];

export function modelLabel(model: string) {
  return AI_MODEL_OPTIONS.find((option) => option.model === model)?.label ?? "Modelo del portal";
}

export function modelOption(model: string) {
  return AI_MODEL_OPTIONS.find((option) => option.model === model) ?? AI_MODEL_OPTIONS[0];
}
