import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AiBlogGeneratorModal } from './AiBlogGeneratorModal';

const TranslatePanelContent: React.FC<{ model?: string; document?: any; documentId?: string; collectionType?: string }> = ({
  model,
  document,
  documentId: propDocId,
  collectionType,
}) => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const currentLocale = searchParams.get('plugins[i18n][locale]') || searchParams.get('locale') || 'en';

  const isSingleType = collectionType === 'single-types' || location.pathname.includes('/single-types/');
  const contentType = model || (location.pathname.split('/')[3] || '');
  const documentId = propDocId || document?.documentId || '';

  const handleTranslateNow = async () => {
    setLoading(true);
    setStatusMessage({
      text: `Translating content to ${currentLocale.toUpperCase()} with AI...`,
      type: 'info',
    });

    try {
      let resolvedDocId = documentId;
      if (!resolvedDocId && isSingleType) {
        const endpoint = contentType.replace('api::', '').replace(/\..*$/, '');
        const singleRes = await fetch(`/api/${endpoint}?locale=en`);
        const singleData = await singleRes.json();
        resolvedDocId = singleData?.data?.documentId;
      }

      if (!resolvedDocId) {
        throw new Error('Please save the entry in English first before translating.');
      }

      const response = await fetch('/api/translation/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: contentType.startsWith('api::') ? contentType : `api::${contentType}.${contentType}`,
          documentId: resolvedDocId,
          sourceLocale: 'en',
          targetLocale: currentLocale,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result?.error?.message || result?.message || 'Translation failed.');
      }

      setStatusMessage({
        text: `✅ ${currentLocale.toUpperCase()} translated & published! Loading...`,
        type: 'success',
      });

      // Suppress any "Leave site / Changes may not be saved" browser prompts completely
      window.onbeforeunload = null;
      window.addEventListener(
        'beforeunload',
        (e) => {
          e.stopImmediatePropagation();
          delete e.returnValue;
        },
        true
      );

      setTimeout(() => {
        const rawContentType = contentType.startsWith('api::') ? contentType : `api::${contentType}.${contentType}`;
        const targetDocId = result?.documentId || result?.data?.documentId || resolvedDocId;
        
        let targetUrl = '';
        if (isSingleType) {
          targetUrl = `/admin/content-manager/single-types/${rawContentType}?plugins[i18n][locale]=${currentLocale}`;
        } else {
          targetUrl = `/admin/content-manager/collection-types/${rawContentType}/${targetDocId}?plugins[i18n][locale]=${currentLocale}`;
        }

        window.location.replace(targetUrl);
      }, 600);
    } catch (err: any) {
      console.error('Translation error:', err);
      setStatusMessage({
        text: err.message || 'Translation failed.',
        type: 'error',
      });
      setLoading(false);
    }
  };

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <AiBlogGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      <button
        type="button"
        onClick={() => setIsAiModalOpen(true)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 14px',
          backgroundColor: '#2b2b40',
          color: '#a5a0ff',
          border: '1px solid #4945ff66',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '12px',
          cursor: 'pointer',
          marginBottom: '6px',
          transition: 'all 0.15s ease',
        }}
      >
        <span>⚡</span>
        <span>AI Auto-Publish Blog Post</span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#9898b0', fontWeight: 600 }}>Active Language:</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#4945ff33',
            color: '#7b79ff',
            textTransform: 'uppercase',
          }}
        >
          {currentLocale}
        </span>
      </div>

      <p style={{ fontSize: '11px', color: '#a5a5ba', margin: 0, lineHeight: 1.3 }}>
        Auto-translate all fields, blocks and SEO from English into <strong>{currentLocale.toUpperCase()}</strong>.
      </p>

      {statusMessage && (
        <div
          style={{
            fontSize: '11px',
            padding: '8px',
            borderRadius: '6px',
            backgroundColor:
              statusMessage.type === 'success'
                ? '#1b382b'
                : statusMessage.type === 'error'
                ? '#3d1c1c'
                : '#232347',
            color:
              statusMessage.type === 'success'
                ? '#5cd696'
                : statusMessage.type === 'error'
                ? '#ff7878'
                : '#a5a0ff',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? '#2fbe76'
                : statusMessage.type === 'error'
                ? '#eb4444'
                : '#4945ff'
            }`,
          }}
        >
          {statusMessage.text}
        </div>
      )}

      <button
        type="button"
        onClick={handleTranslateNow}
        disabled={loading || currentLocale === 'en'}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 14px',
          backgroundColor: currentLocale === 'en' ? '#32324d' : loading ? '#3832ebaa' : '#4945ff',
          color: currentLocale === 'en' ? '#8e8ea9' : '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '12px',
          cursor: currentLocale === 'en' || loading ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 4px rgba(73, 69, 255, 0.2)',
          transition: 'all 0.15s ease',
        }}
      >
        {loading ? (
          <span>Translating...</span>
        ) : currentLocale === 'en' ? (
          <span>(Default Source Locale)</span>
        ) : (
          <>
            <span>✨</span>
            <span>Translate to {currentLocale.toUpperCase()}</span>
          </>
        )}
      </button>
    </div>
  );
};

export const Panel = (props: any) => {
  return {
    title: 'AI Translation',
    content: <TranslatePanelContent {...props} />,
  };
};
