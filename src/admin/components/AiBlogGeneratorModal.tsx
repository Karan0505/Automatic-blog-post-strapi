import React, { useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const AiBlogGeneratorModal: React.FC<ModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('authoritative, deeply practical, modern tech journalism');
  const [wordCount, setWordCount] = useState(1000);
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('Architecture');
  const [generateImage, setGenerateImage] = useState(true);
  const [autoPublish, setAutoPublish] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePreviewCost = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic first.');
      return;
    }
    setError(null);
    setPreviewing(true);
    try {
      const res = await fetch('/api/ai-blog/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          locale: 'en',
          wordCount,
          tone,
          generateImage,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Preview failed');
      setPreviewData(json.data?.costEstimate);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ai-blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          locale: 'en',
          tone,
          wordCount,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          category: category.trim(),
          generateImage,
          autoPublish,
          imageCompressionConfig: {
            maxWidth: 1200,
            quality: 82,
            format: 'webp',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.message || 'Generation failed');

      setResult(json);
      if (onSuccess) onSuccess(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 10, 20, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#181826',
          border: '1px solid #32324d',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #28283f',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>AI Automatic Blog Publisher</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#9898b0' }}>
                Strapi 5 + Sharp WebP Compression + Multi-Locale Pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8e8ea9',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#3d1c1c',
                border: '1px solid #eb4444',
                color: '#ff9999',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {result ? (
            <div
              style={{
                backgroundColor: '#1b382b',
                border: '1px solid #2fbe76',
                color: '#85e6b5',
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '15px' }}>🎉 Post Published Successfully!</div>
              <div><strong>Title:</strong> {result.title}</div>
              <div><strong>Slug:</strong> <code>{result.slug}</code></div>
              <div><strong>Status:</strong> {result.status.toUpperCase()} ({result.workflowStatus})</div>
              <div><strong>AI Cost:</strong> ${result.aiCostUsd} (Model: {result.aiModel})</div>
              <div><strong>Canonical URL:</strong> <a href={result.canonicalUrl} target="_blank" rel="noreferrer" style={{ color: '#5cd696' }}>{result.canonicalUrl}</a></div>
              {result.translationsEnqueued?.length > 0 && (
                <div><strong>Enqueued Translations:</strong> {result.translationsEnqueued.join(', ')}</div>
              )}
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    window.location.href = `/admin/content-manager/collection-types/api::post.post/${result.documentId}`;
                  }}
                  style={{
                    backgroundColor: '#2fbe76',
                    color: '#0e2417',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Open in Strapi Admin
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setTopic('');
                  }}
                  style={{
                    backgroundColor: '#2b2b40',
                    color: '#ffffff',
                    border: '1px solid #444460',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Publish Another
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Topic Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#c0c0cf' }}>
                  Blog Topic / Headline *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Next.js 16 Server Components and Streaming Architecture"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#12121c',
                    border: '1px solid #32324d',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Grid 2-cols */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#a5a5ba' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#12121c',
                      border: '1px solid #32324d',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#a5a5ba' }}>
                    Word Count Target
                  </label>
                  <select
                    value={wordCount}
                    onChange={(e) => setWordCount(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#12121c',
                      border: '1px solid #32324d',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value={600}>Short & Dense (~600 words)</option>
                    <option value={1000}>Standard Editorial (~1,000 words)</option>
                    <option value={1500}>Deep Dive Case Study (~1,500 words)</option>
                  </select>
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#a5a5ba' }}>
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. Server Components, Strapi 5, Cache Revalidation"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: '#12121c',
                    border: '1px solid #32324d',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', backgroundColor: '#12121c', borderRadius: '8px', border: '1px solid #232338' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={generateImage}
                    onChange={(e) => setGenerateImage(e.target.checked)}
                  />
                  <span>
                    Generate Cover Image with <strong>Sharp WebP Compression (Max 1200px, 82% quality)</strong>
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoPublish}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                  />
                  <span>
                    Auto-Publish Master Post & Trigger Multi-Locale Translations immediately
                  </span>
                </label>
              </div>

              {/* Cost Estimate Preview Box */}
              {previewData && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#23233b',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#b3b3d4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>Pre-Flight Cost Calculation (Phase 1):</div>
                  <div>Estimated Text Tokens: ${previewData.estimatedTextCostUsd}</div>
                  <div>Estimated Image Generation: ${previewData.estimatedImageCostUsd}</div>
                  <div><strong>Total Estimated Spend: ${previewData.totalEstimatedUsd}</strong> (Budget limit: ${previewData.dailyBudgetLimitUsd})</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!result && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #28283f',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={handlePreviewCost}
              disabled={previewing || loading}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #4945ff',
                color: '#8b88ff',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {previewing ? 'Estimating...' : '🔍 Estimate Cost (Free)'}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  backgroundColor: '#2b2b3f',
                  border: 'none',
                  color: '#c0c0cf',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                style={{
                  backgroundColor: loading ? '#3832ebaa' : '#4945ff',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(73, 69, 255, 0.4)',
                }}
              >
                {loading ? 'Generating & Compressing...' : '🚀 Generate & Publish Post'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
