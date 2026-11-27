import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export function codexHooks() {
  const hook = file => ({ type: 'command', timeout: 10,
    command: `node -e "const c=require('node:child_process');c.execFileSync(process.execPath,[c.execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim()+'/scripts/${file}'],{stdio:'inherit'})"` });
  return { hooks: {
    PreToolUse: [{ matcher: '^Bash$', hooks: [hook('hooks/block-node-eval.mjs')] }],
    Stop: [{ hooks: [hook('ai-log/rotate.mjs')] }],
  } };
}

export function generatedAgent(name, source) {
  const normalized = source.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalized);
  if (!match) throw new Error(`Invalid agent frontmatter: ${name}`);
  const description = /^description:\s*(.+)$/m.exec(match[1])?.[1];
  if (!description || match[2].includes("'''")) throw new Error(`Cannot serialize agent: ${name}`);
  return `# Generated from .claude/agents/${name}.md; run node scripts/harness/check-agent-config.mjs --write\n`
    + `name = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(description)}\ndeveloper_instructions = '''\n`
    + `Đọc AGENTS.md và CLAUDE.md; dùng .claude/rules/ làm nguồn quy ước chung cho cả hai host.\n`
    + match[2].trim() + "\n'''\n";
}

export function checkAgentConfig(root, write = false) {
  const errors = [];
  const sourceDir = join(root, '.claude/agents');
  if (!existsSync(sourceDir)) return ['Missing .claude/agents'];
  if (write) mkdirSync(join(root, '.codex/agents'), { recursive: true });
  const hooksPath = join(root, '.codex/hooks.json');
  if (write) writeFileSync(hooksPath, JSON.stringify(codexHooks(), null, 2) + '\n');
  try {
    if (!isDeepStrictEqual(JSON.parse(readFileSync(hooksPath, 'utf8')), codexHooks())) errors.push('stale .codex/hooks.json');
  } catch { errors.push('Missing or invalid .codex/hooks.json'); }
  const targetDir = join(root, '.codex/agents');
  if (existsSync(targetDir)) for (const file of readdirSync(targetDir).filter(f => f.endsWith('.toml'))) {
    if (!existsSync(join(sourceDir, file.slice(0, -5) + '.md'))) errors.push(`Orphan adapter ${file}`);
  }
  for (const file of readdirSync(sourceDir).filter(f => f.endsWith('.md'))) {
    const source = readFileSync(join(sourceDir, file), 'utf8');
    const name = file.slice(0, -3);
    const target = join(root, '.codex/agents', name + '.toml');
    const expected = generatedAgent(name, source);
    if (write) writeFileSync(target, expected);
    if (!existsSync(target)) errors.push(`Missing ${name}.toml`);
    else if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== expected) errors.push(`stale ${name}.toml`);
    for (const ref of source.matchAll(/\.claude\/rules\/[\w-]+\.md/g)) {
      if (!existsSync(join(root, ref[0]))) errors.push(`Missing ${ref[0]} in ${file}`);
    }
    if (/git diff main\.\.\.HEAD/.test(source)) errors.push(`Hardcoded base in ${file}`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const errors = checkAgentConfig(root, process.argv.includes('--write'));
  errors.forEach(e => console.error(e));
  console.log(`Agent config: ${errors.length ? 'FAIL' : 'PASS'}`);
  process.exitCode = errors.length ? 1 : 0;
}
