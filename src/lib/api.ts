import { createScalarClient } from '@scalar/sdk';
import { env } from './env';

/** Single browser client. The session travels as an httpOnly cookie, so no token handling here. */
export const scalar = createScalarClient({ baseUrl: env.apiUrl });
