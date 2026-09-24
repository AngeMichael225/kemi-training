const fs = require('fs');
const path = require('path');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');

const roots = ['src', 'scripts', 'tests'];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
}
for (const root of roots) if (fs.existsSync(root)) walk(root);
files.push('next.config.ts', 'playwright.config.ts', 'vitest.config.ts');
let failed = 0;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const out = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
  });
  for (const diagnostic of out.diagnostics || []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue;
    failed += 1;
    const pos = diagnostic.start == null ? null : ts.getLineAndCharacterOfPosition(ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true), diagnostic.start);
    const where = pos ? `${file}:${pos.line + 1}:${pos.character + 1}` : file;
    console.error(`${where} TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`);
  }
}
if (failed) {
  console.error(`FAIL: ${failed} syntax/transpile errors across ${files.length} files.`);
  process.exit(1);
}
console.log(`PASS: ${files.length} TypeScript/TSX files transpile without syntax errors.`);
