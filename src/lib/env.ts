const raw = process.env.NEXT_PUBLIC_API_URL;

if (!raw) {
  throw new Error('NEXT_PUBLIC_API_URL is not set. Copy .env.example to .env.local.');
}

export const env = {
  apiUrl: raw.replace(/\/+$/, ''),
} as const;
