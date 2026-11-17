import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, PlugZap, X, XCircle } from 'lucide-react';
import {
  isLocalEndpoint,
  testApiConnection,
  type ApiConnectionTestResult,
} from '../../ai/llmClient';
import { useStudioStore } from '../../store/useStudioStore';

interface ApiConfigModalProps {
  open: boolean;
  onClose: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ open, onClose }) => {
  const language = useStudioStore((s) => s.language);
  const tx = (zhText: string, enText: string) => (language === 'en' ? enText : zhText);
  const aiConfig = useStudioStore((s) => s.aiConfig);
  const setAIConfig = useStudioStore((s) => s.setAIConfig);

  const [baseUrl, setBaseUrl] = useState(aiConfig.baseUrl);
  const [apiKey, setApiKey] = useState(aiConfig.apiKey);
  const [model, setModel] = useState(aiConfig.model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ApiConnectionTestResult | null>(null);

  useEffect(() => {
    if (open) {
      setBaseUrl(aiConfig.baseUrl || 'https://api.deepseek.com');
      setApiKey(aiConfig.apiKey || '');
      setModel(aiConfig.model || 'deepseek-chat');
      setTestResult(null);
    }
  }, [open, aiConfig.baseUrl, aiConfig.apiKey, aiConfig.model]);

  if (!open) return null;

  const normalizedDraft = {
    baseUrl: baseUrl.trim() || 'https://api.deepseek.com',
    apiKey: apiKey.trim(),
    model: model.trim() || 'deepseek-chat',
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testApiConnection(normalizedDraft);
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAIConfig(normalizedDraft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <KeyRound className="w-4 h-4 text-sky-400" />
            {tx('DeepSeek API 配置', 'DeepSeek API Configuration')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          {language === 'en' ? (
            <>
              Use <span className="text-sky-300 font-semibold">DeepSeek Cloud LLM</span> for natural-language scene blocking, procedural 3D modeling, and camera choreography. Saved only in browser{' '}
              <code className="text-sky-300">localStorage</code> and never sent to third parties.
            </>
          ) : (
            <>
              使用 <span className="text-sky-300 font-semibold">DeepSeek 云端大模型</span> 进行自然语言场景构建、自定义 3D 建模与分镜运镜生成。配置仅保存在浏览器本地{' '}
              <code className="text-sky-300">localStorage</code>，不会上传至第三方。
            </>
          )}
        </p>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-400">{tx('快速预设：', 'Presets:')}</span>
            <button
              type="button"
              onClick={() => {
                setBaseUrl('https://api.deepseek.com');
                setModel('deepseek-chat');
                setTestResult(null);
              }}
              className="px-2 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900/70 text-[11px] text-sky-300 border border-sky-700/60 font-medium"
            >
              {tx('DeepSeek 直连 (推荐)', 'DeepSeek Direct (Rec.)')}
            </button>
            <button
              type="button"
              onClick={() => {
                setBaseUrl('/api/deepseek');
                setModel('deepseek-chat');
                setTestResult(null);
              }}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-sky-200 border border-zinc-700"
            >
              {tx('本地代理 (/api/deepseek)', 'Local Proxy (/api/deepseek)')}
            </button>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="https://api.deepseek.com"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-sky-500 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              {tx('API Key（DeepSeek 官网获取，sk-...）', 'API Key (from DeepSeek dashboard, sk-...)')}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder={isLocalEndpoint(baseUrl) ? tx('本地接口可留空', 'Optional for local endpoint') : 'sk-...'}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-sky-500 focus:outline-none font-mono"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-400">
                {tx('Model Name（严格锁定 V3 Function Calling）', 'Model Name (V3 Function Calling)')}
              </label>
              <div className="flex flex-wrap gap-1">
                {(['deepseek-chat'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                      model === m
                        ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m} {tx('(V3 推荐)', '(V3 Rec.)')}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setTestResult(null);
              }}
              placeholder="deepseek-chat"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-sky-500 focus:outline-none font-mono"
            />
            <p className="mt-1 text-[10px] text-zinc-500">
              {tx(
                '注：已禁用 deepseek-reasoner (R1)，全程采用 deepseek-chat 多轮严格 Tool Calling + 前端 Schema 自纠错。',
                'Note: deepseek-reasoner (R1) is disabled; uses deepseek-chat multi-turn strict Tool Calling + frontend schema self-repair.'
              )}
            </p>
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-2.5 text-[11px] leading-relaxed ${
                testResult.ok
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                {testResult.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                {testResult.ok
                  ? `${
                      isLocalEndpoint(normalizedDraft.baseUrl)
                        ? tx('本地模型连接成功', 'Local Model Connected')
                        : tx('API 连接成功', 'API Connected')
                    } (${testResult.model} · ${testResult.latencyMs}ms · ${
                      testResult.via === 'vite-proxy'
                        ? tx('本地代理', 'Local Proxy')
                        : tx('直接请求', 'Direct')
                    })`
                  : tx('API 连通性测试失败', 'API Connection Test Failed')}
              </div>
              <div className="text-[10px] opacity-90 break-all font-mono">
                {testResult.ok ? `${tx('响应校验', 'Response')}: ${testResult.reply}` : testResult.error}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sky-300 border border-zinc-700"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlugZap className="w-3.5 h-3.5" />
            )}
            {testing ? tx('测试中...', 'Testing...') : tx('测试连通性', 'Test Connection')}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800"
            >
              {tx('取消', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-sky-500 hover:bg-sky-400 text-zinc-950"
            >
              {tx('保存配置', 'Save Config')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
