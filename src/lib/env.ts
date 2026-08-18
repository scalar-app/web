/**
 * Build time configuration.
 *
 * `NEXT_PUBLIC_API_URL` is the default server for a browser deployment, where the app and the API
 * are put up together by whoever runs them. A packaged desktop or mobile build has no sensible
 * default, because Scalar is self-hosted and only the person running it knows where their server
 * is, so an empty value here is expected rather than an error. `lib/api.ts` resolves the rest.
 */
export const env = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, ''),
} as const;
