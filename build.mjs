import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const root = dirname(fileURLToPath(import.meta.url));

function stripModuleSyntax(source) {
  return source
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*["'][^"']+["'];?\s*/g, "")
    .replace(/import\s+[A-Za-z_$][\w$]*\s+from\s+["'][^"']+["'];?\s*/g, "")
    .replace(/export\s+default\s+[A-Za-z_$][\w$]*\s*;?/g, "")
    .replace(/export\s*\{[\s\S]*?\}\s*;?/g, "")
    .replace(/\bexport\s+(?=(?:async\s+)?(?:const|let|var|function|class)\b)/g, "");
}

const [template, styles, interpreter, examples, reference, app] = await Promise.all([
  readFile(join(root, "app.html"), "utf8"),
  readFile(join(root, "styles.css"), "utf8"),
  readFile(join(root, "src/interpreter.js"), "utf8"),
  readFile(join(root, "src/examples.js"), "utf8"),
  readFile(join(root, "src/reference.js"), "utf8"),
  readFile(join(root, "src/app.js"), "utf8"),
]);

const bundle = [interpreter, examples, reference, app]
  .map(stripModuleSyntax)
  .join("\n\n")
  .replaceAll("</script", "<\\/script");

const standaloneScript = `(() => {\n"use strict";\n${bundle}\n})();`;

// Parse the exact classic-script payload before writing the deliverable. This
// catches packaging-only name collisions even when every source module is
// independently valid.
new Script(standaloneScript, { filename: "index.html:inline.js" });

// Use replacement functions so JavaScript source sequences such as `$$` are
// copied verbatim. Passing the bundle as a replacement string would interpret
// `$` patterns and can silently change valid application code.
const html = template
  .replace(
    '    <link rel="stylesheet" href="./styles.css?v=1.0.0" />',
    () => `    <style>\n${styles}\n    </style>`,
  )
  .replace(
    '    <script type="module" src="./src/app.js?v=1.0.0"></script>',
    () => `    <script>\n${standaloneScript}\n    </script>`,
  )
  .replace("</head>", `    <!-- Standalone build: generated ${new Date().toISOString()} -->\n  </head>`);

await writeFile(join(root, "index.html"), html, "utf8");
console.log(`Built standalone index.html (${Buffer.byteLength(html).toLocaleString()} bytes)`);
