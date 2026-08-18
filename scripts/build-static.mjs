/**
 * Builds the app as a folder of static files for the desktop and mobile shells.
 *
 * A script rather than an inline environment variable so the command works the same in PowerShell,
 * cmd and any POSIX shell, without adding a dependency just to set one variable.
 */
import { spawn } from 'node:child_process';

const child = spawn('next', ['build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, SCALAR_STATIC_EXPORT: '1' },
});

child.on('exit', (code) => process.exit(code ?? 1));
