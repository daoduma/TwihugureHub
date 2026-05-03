// lib/llmProviders.ts

export interface ModelMeta {
  id: string;
  name: string;
  contextWindow: number;
  modality: string;
  reasoning?: boolean;
}

export interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  models: ModelMeta[];
  hasLiveEndpoint: boolean;
  requiresBaseUrl?: boolean;
}

export const LLM_PROVIDERS: ProviderConfig[] = [
  {
    id: "OPENAI",
    name: "OpenAI",
    icon: "🤖",
    color: "#10a37f",
    hasLiveEndpoint: true,
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, modality: "text+vision" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, modality: "text+vision" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000, modality: "text+vision" },
      { id: "o1", name: "o1", contextWindow: 200000, modality: "text", reasoning: true },
      { id: "o1-mini", name: "o1-mini", contextWindow: 128000, modality: "text", reasoning: true },
      { id: "o3-mini", name: "o3-mini", contextWindow: 200000, modality: "text", reasoning: true },
    ],
  },
  {
    id: "ANTHROPIC",
    name: "Anthropic",
    icon: "⚡",
    color: "#cc785c",
    hasLiveEndpoint: false,
    models: [
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000, modality: "text+vision", reasoning: true },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, modality: "text+vision", reasoning: true },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", contextWindow: 200000, modality: "text+vision" },
      { id: "claude-opus-4-5-20251101", name: "Claude Opus 4.5", contextWindow: 200000, modality: "text+vision", reasoning: true },
      { id: "claude-sonnet-4-5-20251022", name: "Claude Sonnet 4.5", contextWindow: 200000, modality: "text+vision", reasoning: true },
    ],
  },
  {
    id: "GOOGLE",
    name: "Google Gemini",
    icon: "✨",
    color: "#4285f4",
    hasLiveEndpoint: false,
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, modality: "text+vision+audio", reasoning: true },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, modality: "text+vision+audio", reasoning: true },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000, modality: "text+vision" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2000000, modality: "text+vision" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1000000, modality: "text+vision" },
    ],
  },
  {
    id: "MISTRAL",
    name: "Mistral",
    icon: "🌊",
    color: "#fa7343",
    hasLiveEndpoint: true,
    models: [
      { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 131072, modality: "text" },
      { id: "mistral-small-latest", name: "Mistral Small", contextWindow: 131072, modality: "text" },
      { id: "codestral-latest", name: "Codestral", contextWindow: 256000, modality: "text" },
      { id: "open-mistral-nemo", name: "Mistral Nemo", contextWindow: 131072, modality: "text" },
    ],
  },
  {
    id: "COHERE",
    name: "Cohere",
    icon: "🔷",
    color: "#39594d",
    hasLiveEndpoint: false,
    models: [
      { id: "command-r-plus", name: "Command R+", contextWindow: 128000, modality: "text" },
      { id: "command-r", name: "Command R", contextWindow: 128000, modality: "text" },
      { id: "command-light", name: "Command Light", contextWindow: 4096, modality: "text" },
    ],
  },
  {
    id: "CUSTOM",
    name: "Custom / Self-Hosted",
    icon: "🔧",
    color: "#6b7280",
    hasLiveEndpoint: false,
    requiresBaseUrl: true,
    models: [],
  },
];

export function getProviderById(id: string): ProviderConfig | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}
