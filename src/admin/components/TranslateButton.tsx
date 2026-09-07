import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

export const TranslateButton: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ slug?: string; id?: string }>();

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Extract content type and current locale from URL / search params
  const searchParams = new URLSearchParams(location.search);
  const currentLocale = searchParams.get('plugins[i18n][locale]') || searchParams.get('locale') || 'en';

  const pathParts = location.pathname.split('/');
  const isCollectionType = location.pathname.includes('/collection-types/');
  const isSingleType = location.pathname.includes('/single-types/');

  let contentType = params.slug || '';
  if (!contentType) {
    if (isCollectionType) {
      const idx = pathParts.indexOf('collection-types');
      if (idx !== -1 && pathParts[idx + 1]) contentType = pathParts[idx + 1];
    } else if (isSingleType) {
      const idx = pathParts.indexOf('single-types');
      if (idx !== -1 && pathParts[idx + 1]) contentType = pathParts[idx + 1];
    }
  }

  let documentId = params.id || '';
  if (!documentId && isCollectionType) {
    const idx = pathParts.indexOf('collection-types');
    if (idx !== -1 && pathParts[idx + 2]) documentId = pathParts[idx + 2];
  }

  const handleTranslateNow = async () => {
    if (!contentType) {
      setStatusMessage({ text: 'Could not detect content type.', type: 'error' });
      return;
    }

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
          contentType,
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
        text: `✅ ${currentLocale.toUpperCase()} translated & published! Reloading...`,
        type: 'success',
      });

      // Reload page to reflect newly populated content
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error('Translation error:', err);
      setStatusMessage({
        text: err.message || 'Translation failed.',
        type: 'error',
      });
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#1e1e2f',
        borderRadius: '8px',
        border: '1px solid #3b3b54',
        marginTop: '10px',
        marginBottom: '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#c0c0d8' }}>🌐 AI Translation</span>
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
          Target: {currentLocale}
        </span>
      </div>

      <p style={{ fontSize: '11px', color: '#9898b0', margin: '0 0 10px 0', lineHeight: 1.3 }}>
        Auto-translate all fields & blocks from English into <strong>{currentLocale.toUpperCase()}</strong>.
      </p>

      {statusMessage && (
        <div
          style={{
            fontSize: '11px',
            padding: '8px',
            borderRadius: '6px',
            marginBottom: '10px',
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
          padding: '8px 12px',
          backgroundColor: currentLocale === 'en' ? '#32324d' : loading ? '#3832ebaa' : '#4945ff',
          color: currentLocale === 'en' ? '#8e8ea9' : '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '12px',
          cursor: currentLocale === 'en' || loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                width: '10px',
                height: '10px',
                border: '2px solid #fff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Translating...</span>
          </>
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
