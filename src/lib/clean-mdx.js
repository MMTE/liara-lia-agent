/**
 * MDX → plain markdown cleaner for the liara-cloud/docs corpus.
 * @module clean-mdx
 */

// Attributes may contain quoted strings (which can hold '>').
const ATTRS = `((?:[^>"']|"[^"]*"|'[^']*')*)`;
const PAIRED_TAG = new RegExp(
  `<([A-Za-z][\\w.:-]*)${ATTRS}>([\\s\\S]*?)</\\1\\s*>`,
  "g",
);
const SELF_CLOSING_TAG = new RegExp(
  `<([A-Za-z][\\w.:-]*)${ATTRS}/>`,
  "g",
);
const JSX_HEADING = /<h([1-6])((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/h\1\s*>/gi;
// Structural residue lines: only JSX/JS punctuation left after tag removal.
const STRUCTURE_ONLY = /^[\s()<>\[\]{},;/`'"]+$/;
const ATTR_NOISE = /^\s*(?:step|content|tabs)\s*:\s*[^\n]*$/;
// Line that only OPENS a JSX attribute expression (e.g. `content={[`).
const ATTR_OPENER = /^[a-zA-Z][\w-]*=\{?\[?$/;
const UNCLOSED_TAG_LINE = /^\s*<[A-Za-z][^>]*$/;
// Complete single-line attribute expression: name={...} → keep inner value.
const ATTR_EXPR = /^(\s*)[a-zA-Z][\w-]*=\{(.*)\}\s*,?\s*$/;
// Array/fragment payload attribute: name={[ … ]} or name={<> … </>} —
// Tabs/Step/Table/QuestionBox carry whole page sections this way; scalar
// attrs are metadata and die with the tag. (name={( … )} event handlers
// are code noise and stay excluded.)
const PAYLOAD_ATTR = /([a-zA-Z][\w-]*)=\{\s*(?:[<[]|\(\s*<)/;

/**
 * Hoist array-payload JSX attributes out of their tag, inserting the
 * payload text just before the owning `<Tag`. Docs pages wrap entire
 * sections in self-closing components (`<Tabs content={[…]} />`,
 * `<Step steps={[…]} />`, `<Table headers/data={[…]} />`); stripping
 * such tags deletes the payload, so it must be rescued first. Payloads
 * nest (Step inside Tabs content), hence the fixpoint loop.
 * @param {string} s
 * @returns {string}
 */
function hoistPayloadAttrs(s) {
  for (let round = 0; round < 50; round++) {
    const m = PAYLOAD_ATTR.exec(s);
    if (!m) return s;
    // String-aware brace walk from the attribute's `{` to its matching `}`.
    const open = m.index + m[1].length + 1; // the '{' right after `name=`
    let depth = 1;
    let q = null;
    let end = -1;
    for (let i = open + 1; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === "\\") i++;
        else if (c === q) q = null;
      } else if (c === '"' || c === "'" || c === "`") q = c;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end < 0) return s; // unbalanced: leave untouched
    // Owning tag open: nearest `<Letter` above with no bare `>` between.
    let tagStart = -1;
    for (let i = m.index - 1; i >= 0; i--) {
      const c = s[i];
      if (c === ">") break;
      if (c === "<" && /[A-Za-z]/.test(s[i + 1] ?? "")) {
        tagStart = i;
        break;
      }
    }
    if (tagStart < 0) return s; // not inside a tag opening: leave as-is
    const payload = s.slice(open + 1, end);
    s = s.slice(0, tagStart) + payload + "\n" + s.slice(tagStart, m.index) + s.slice(end + 1);
  }
  return s;
}


/**
 * Strip MDX scaffolding while keeping prose and code:
 * removes `import` lines, `<Head>…</Head>` blocks, JSX comments, JSX
 * tags (attributes dropped, inner text kept; `<h1>`–`<h6>` become
 * markdown headings; array-payload attributes are hoisted to text), and
 * unwraps `{`…`}` template-literal expressions.
 * Fenced code blocks are kept verbatim.
 * @param {string} raw
 * @returns {string}
 */
export function cleanMdx(raw) {
  let s = (raw ?? "").replace(/\r\n?/g, "\n");

  // Protect fenced code blocks from every transform below.
  const fences = [];
  s = s.replace(/```[\s\S]*?(?:```|$)/g, (m) => `\u0000${fences.push(m) - 1}\u0000`);

  s = s.replace(/^[ \t]*import[\s\S]*?from\s+["'][^"']*["'];?[ \t]*$/gm, ""); // multi-line imports
  s = s.replace(/^[ \t]*import\s[^\n]*$/gm, ""); // single-line imports
  s = s.replace(/<Head\b[^>]*>[\s\S]*?<\/Head\s*>/gi, ""); // <Head> blocks
  s = s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ""); // JSX comments
  s = s.replace(JSX_HEADING, (_, lvl, _attrs, inner) => `\n${"#".repeat(Number(lvl))} ${inner.trim()}\n`);
  s = s.replace(/\{`([^`]*)`\}/g, "$1"); // {`code`} → code
  s = hoistPayloadAttrs(s); // rescue sections inside self-closing attr payloads

  // Strip JSX tags innermost-out until stable (fragments, paired, self-closing).
  for (let i = 0; i < 200; i++) {
    const before = s;
    s = s.replace(/<>([\s\S]*?)<\/>/g, "$1");
    s = s.replace(PAIRED_TAG, "$3");
    s = s.replace(SELF_CLOSING_TAG, "");
    if (s === before) break;
  }

  // Drop residual structural lines from multi-line JSX attributes and
  // trim per-line indentation left behind by JSX blocks.
  s = s
    .split("\n")
    .map((line) => line.replace(ATTR_EXPR, "$1$2").trim())
    .filter(
      (line) =>
        !STRUCTURE_ONLY.test(line) &&
        !ATTR_NOISE.test(line) &&
        !ATTR_OPENER.test(line) &&
        !UNCLOSED_TAG_LINE.test(line),
    )
    .join("\n");
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => fences[Number(i)] ?? "");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Page title from the raw MDX: `<title>` content, else the first
 * `# ` heading, else null.
 * @param {string} raw
 * @returns {string | null}
 */
export function extractTitle(raw) {
  const s = raw ?? "";
  const t = s.match(/<title[^>]*>([^<]+)<\/title\s*>/i);
  if (t) return t[1].trim();
  const h = s.match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (h) return h[1].trim();
  return null;
}
