"use client";
// app/(dashboard)/admin/ai-settings/page.tsx

import { useState, useEffect } from "react";

interface ModelMeta {
  id: string;
  name: string;
  contextWindow: number;
  modality: string;
  reasoning?: boolean;
}

interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  models: ModelMeta[];
  requiresBaseUrl?: boolean;
}

interface CurrentConfig {
  provider: string;
  modelId: string;
  fallbackModelId?: string;
  baseUrl?: string;
  apiKeyMasked: string;
  validatedAt?: string;
  isActive: boolean;
}

type Step = "provider" | "model" | "key";

const STEP_LABELS: Record<Step, string> = {
  provider: "1. Choose Provider",
  model: "2. Select Model",
  key: "3. Enter API Key",
};

function formatCtx(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M tokens`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K tokens`;
  return `${n} tokens`;
}


export default function AISettingsPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<CurrentConfig | null>(null);
  const [step, setStep] = useState<Step>("provider");
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [primaryModel, setPrimaryModel] = useState("");
  const [fallbackModel, setFallbackModel] = useState("");
  const [customModelId, setCustomModelId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/llm/providers").then(r => r.json()).then(d => setProviders(d.providers ?? []));
    fetch("/api/admin/llm/config").then(r => r.json()).then(d => setCurrentConfig(d.config));
  }, []);

  const selectProvider = async (provider: ProviderConfig) => {
    setSelectedProvider(provider);
    setModels([]);
    setPrimaryModel("");
    setFallbackModel("");
    setValidationResult(null);
    setLoadingModels(true);
    setStep("model");

    const res = await fetch("/api/admin/llm/fetch-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: provider.id, apiKey: "" }),
    });
    const data = await res.json();
    setModels(data.models ?? provider.models);
    setLoadingModels(false);
  };

  const handleValidateAndSave = async () => {
    const modelToUse = selectedProvider?.id === "CUSTOM" ? customModelId : primaryModel;
    if (!apiKey || !modelToUse) return;

    setValidating(true);
    setValidationResult(null);
    const res = await fetch("/api/admin/llm/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: selectedProvider?.id, modelId: modelToUse, apiKey, baseUrl }),
    });
    const data = await res.json();
    setValidationResult(data);
    setValidating(false);

    if (data.valid) {
      setSaving(true);
      await fetch("/api/admin/llm/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider?.id,
          modelId: modelToUse,
          apiKey,
          baseUrl: baseUrl || undefined,
          fallbackModelId: fallbackModel || undefined,
          validated: true,
        }),
      });
      setSaving(false);
      setSaved(true);
      const configRes = await fetch("/api/admin/llm/config");
      const configData = await configRes.json();
      setCurrentConfig(configData.config);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleTestConnection = async () => {
    if (!currentConfig) return;
    setValidating(true);
    setValidationResult(null);
    // Re-validate using stored config – just trigger a minimal test
    const res = await fetch("/api/admin/llm/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: currentConfig.provider, modelId: currentConfig.modelId, apiKey: "_stored_", baseUrl: currentConfig.baseUrl }),
    });
    const data = await res.json();
    setValidationResult(data);
    setValidating(false);
  };

  const providerById = (id: string) => providers.find(p => p.id === id);

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          AI / LLM Settings 🤖
        </h1>
        <p className="text-sm text-gray-500 mt-1">Configure the AI model that powers translations and intelligent features.</p>
      </div>

      {/* Current Config Status Card */}
      {currentConfig && (
        <div className="card p-5 border-l-4 border-purple-500">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 mb-2">Current Configuration</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div>
                  <span className="text-gray-500">Provider:</span>{" "}
                  <span className="font-medium">{providerById(currentConfig.provider)?.name ?? currentConfig.provider}</span>
                </div>
                <div>
                  <span className="text-gray-500">Model:</span>{" "}
                  <span className="font-medium font-mono text-xs">{currentConfig.modelId}</span>
                </div>
                <div>
                  <span className="text-gray-500">API Key:</span>{" "}
                  <span className="font-mono text-xs">{currentConfig.apiKeyMasked}</span>
                </div>
                <div>
                  <span className="text-gray-500">Validated:</span>{" "}
                  <span className="font-medium">
                    {currentConfig.validatedAt ? new Date(currentConfig.validatedAt).toLocaleDateString() : "Never"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleTestConnection}
                disabled={validating}
                className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap"
              >
                {validating ? "Testing…" : "Test Connection"}
              </button>
              <button
                onClick={() => { setStep("provider"); setValidationResult(null); }}
                className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap"
              >
                Rotate / Change
              </button>
            </div>
          </div>
          {validationResult && (
            <div className={`mt-3 rounded-lg p-2.5 text-sm ${validationResult.valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {validationResult.valid ? "✅ Connection validated successfully" : `❌ ${validationResult.error ?? "Validation failed"}`}
            </div>
          )}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["provider", "model", "key"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => { if (s === "provider" || (s === "model" && selectedProvider) || s === step) setStep(s); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                step === s ? "bg-brand-600 text-white" : s < step || (s === "model" && selectedProvider) ? "bg-brand-100 text-brand-700 hover:bg-brand-200" : "bg-gray-100 text-gray-400"
              }`}
            >
              {STEP_LABELS[s]}
            </button>
            {i < 2 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Provider Selection */}
      {step === "provider" && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Choose a Provider</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {providers.map(provider => (
              <button
                key={provider.id}
                onClick={() => selectProvider(provider)}
                className={`card p-4 text-left hover:shadow-md transition-all border-2 ${
                  currentConfig?.provider === provider.id
                    ? "border-purple-400 bg-purple-50"
                    : "border-transparent hover:border-brand-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{provider.icon}</span>
                  {currentConfig?.provider === provider.id && (
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-100 rounded px-1.5 py-0.5">ACTIVE</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800">{provider.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {provider.models.length > 0 ? `${provider.models.length} models` : "Custom endpoint"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Model Selection */}
      {step === "model" && selectedProvider && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedProvider.icon}</span>
            <h2 className="text-base font-semibold text-gray-800">Select Model — {selectedProvider.name}</h2>
          </div>

          {selectedProvider.id === "CUSTOM" ? (
            <div className="card p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Model ID</label>
              <input
                className="input w-full"
                placeholder="e.g. llama-3.1-70b-instruct"
                value={customModelId}
                onChange={e => setCustomModelId(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Enter the exact model ID for your self-hosted endpoint.</p>
            </div>
          ) : (
            <>
              {loadingModels && <p className="text-sm text-gray-400">Loading models…</p>}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Primary Model</h3>
                  <div className="space-y-2">
                    {models.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setPrimaryModel(model.id)}
                        className={`w-full text-left rounded-xl border p-3 transition-all ${
                          primaryModel === model.id ? "border-brand-400 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{model.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 font-mono">{model.id}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-gray-400">{formatCtx(model.contextWindow)}</span>
                            <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{model.modality}</span>
                            {model.reasoning && (
                              <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">⚙ Reasoning</span>
                            )}
                            {primaryModel === model.id && <span className="text-xs text-brand-600 font-bold">✓</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {models.length > 1 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fallback Model (optional)</h3>
                    <select className="input w-full" value={fallbackModel} onChange={e => setFallbackModel(e.target.value)}>
                      <option value="">None</option>
                      {models.filter(m => m.id !== primaryModel).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => setStep("key")}
            disabled={selectedProvider.id === "CUSTOM" ? !customModelId : !primaryModel}
            className="btn-primary disabled:opacity-50"
          >
            Continue to API Key →
          </button>
        </div>
      )}

      {/* Step 3: API Key */}
      {step === "key" && selectedProvider && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Enter API Key</h2>
          <div className="card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="relative">
                <input
                  className="input w-full pr-12 font-mono text-sm"
                  type={showKey ? "text" : "password"}
                  placeholder="sk-…"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setValidationResult(null); }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  {showKey ? "🙈" : "👁"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Stored AES-256 encrypted. Never transmitted in plaintext.</p>
            </div>

            {selectedProvider.requiresBaseUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  className="input w-full"
                  placeholder="https://api.your-provider.com/v1"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                />
              </div>
            )}

            {validationResult && (
              <div className={`rounded-xl p-3 text-sm font-medium ${validationResult.valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {validationResult.valid
                  ? "✅ Key validated — configuration saved successfully!"
                  : `❌ Validation failed: ${validationResult.error ?? "Unknown error"}`}
              </div>
            )}
            {saved && !validationResult && (
              <div className="rounded-xl p-3 text-sm font-medium bg-green-50 text-green-700">
                ✅ Configuration saved successfully!
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={handleValidateAndSave}
                disabled={!apiKey || validating || saving}
                className="btn-primary w-full"
              >
                {validating ? "Validating…" : saving ? "Saving…" : "Validate & Save"}
              </button>
            </div>
          </div>

          <div className="card p-4 bg-gray-50 border-dashed text-sm text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">Configuration Summary</p>
            <ul className="space-y-1">
              <li><span className="text-gray-400">Provider:</span> {selectedProvider.name}</li>
              <li><span className="text-gray-400">Model:</span> <span className="font-mono text-xs">{selectedProvider.id === "CUSTOM" ? customModelId : primaryModel}</span></li>
              {fallbackModel && <li><span className="text-gray-400">Fallback:</span> <span className="font-mono text-xs">{fallbackModel}</span></li>}
              {baseUrl && <li><span className="text-gray-400">Base URL:</span> {baseUrl}</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
