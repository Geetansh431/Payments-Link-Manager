#!/usr/bin/env node
// Claude Code PostToolUse hook: run Prettier on the file that was just edited/written.
// No-op if Prettier isn't installed yet or the file type isn't formattable. Never blocks.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

try {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const file = input?.tool_input?.file_path;
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const prettier = path.join(root, 'node_modules', '.bin', 'prettier');

  if (
    file &&
    existsSync(file) &&
    existsSync(prettier) &&
    /\.(tsx?|jsx?|mjs|css|json|md|html)$/.test(file) &&
    !file.includes(`${path.sep}node_modules${path.sep}`)
  ) {
    execFileSync(prettier, ['--write', '--log-level', 'warn', file], { stdio: 'ignore' });
  }
} catch {
  // Formatting is best-effort; never fail the agent's edit.
}
process.exit(0);
