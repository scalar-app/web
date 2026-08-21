'use client';

import { useEffect } from 'react';

/**
 * The root layout itself failing, which the per route `error.tsx` cannot catch because it lives
 * inside that layout. Next renders this in place of the whole document, so it has to supply its
 * own `html` and `body`, and it cannot rely on any provider or component that the layout sets up.
 *
 * Deliberately plain: no design system import, no hooks beyond logging, since whatever broke may
 * be exactly that. The colours are literals rather than tokens because Next does not carry the
 * global stylesheet into this document, so `var(--sc-...)` would resolve to nothing here.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: '#080808',
          color: '#F5F5F3',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div role="alert" style={{ maxWidth: '24rem', width: '100%' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
            Scalar could not start.
          </h1>
          <p
            style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#9A9A94',
            }}
          >
            Your data is on your server and is untouched. Reloading usually clears this.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#80807C',
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: '24px',
              font: 'inherit',
              fontSize: '13px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #242424',
              background: '#101010',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
