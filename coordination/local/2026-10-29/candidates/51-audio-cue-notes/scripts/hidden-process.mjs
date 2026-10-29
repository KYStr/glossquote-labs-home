// Process-local npm verification preload. No persistent Node/Windows settings.
// npm's Windows adapter constructs cmd.exe arguments itself, then invokes native
// spawn with shell:false. Keep that child hidden and reject shell expansion at
// the native Node spawn boundary. This is not OS sandboxing or browser isolation.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';

for (const method of ['spawn', 'spawnSync']) {
  const original = childProcess[method];
  childProcess[method] = function hiddenProcess(command, args, options) {
    if (!Array.isArray(args)) { options = args ?? {}; args = []; }
    const settings = options ?? {};
    if (settings.shell) {
      const error = new Error('M1B shell expansion is disabled.');
      error.code = 'M1B_SHELL_DISABLED';
      throw error;
    }
    return original.call(this, command, args, { ...settings, shell: false, windowsHide: true });
  };
}
syncBuiltinESMExports();
