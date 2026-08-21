/**
 * Page → retrieval chunks. Splits at H2/H3 markdown headings,
 * hard-splits oversized sections at ~1200 chars, and never splits
 * inside a fenced code block.
 * @module chunker
 */

/** @type {number} */
export const MAX_CHUNK = 1200;

/**
 * @typedef {Object} Chunk
 * @property {string} id
 * @property {string} slug
 * @property {string} url
 * @property {string} title
 * @property {string} product
 * @property {string} source
 * @property {string} sectionPath
 * @property {string} text
 */

/**
 * @typedef {Object} Page
 * @property {string} slug
 * @property {string} url
 * @property {string} title
 * @property {string} product
 * @property {string} source
 * @property {string} text cleaned markdown text
 */

/**
 * Split section lines into atomic blocks: fenced code blocks stay whole,
 * the rest groups into paragraph blocks.
 * @param {string[]} lines
 * @returns {{text: string}[]}
 */
function toBlocks(lines) {
  const blocks = [];
  let buf = [];
  let fence = null;
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text) blocks.push({ text });
    buf = [];
  };
  for (const line of lines) {
    if (fence !== null) {
      fence.push(line);
      if (/^\s*```/.test(line)) {
        blocks.push({ text: fence.join("\n") });
        fence = null;
      }
    } else if (/^\s*```/.test(line)) {
      flush();
      fence = [line];
    } else if (line.trim() === "") {
      flush();
    } else {
      buf.push(line);
    }
  }
  if (fence !== null) blocks.push({ text: fence.join("\n") }); // unterminated fence
  flush();
  return blocks;
}

/**
 * Greedily pack blocks into chunks of at most ~MAX_CHUNK chars.
 * A single block longer than MAX_CHUNK becomes its own (unsplittable) chunk.
 * @param {{text: string}[]} blocks
 * @returns {string[]}
 */
function packBlocks(blocks) {
  const out = [];
  let cur = "";
  for (const { text } of blocks) {
    const block = text.trim();
    if (!block) continue;
    if (block.length > MAX_CHUNK) {
      if (cur) out.push(cur);
      out.push(block);
      cur = "";
    } else if (cur && cur.length + block.length + 2 > MAX_CHUNK) {
      out.push(cur);
      cur = block;
    } else {
      cur = cur ? `${cur}\n\n${block}` : block;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Chunk a cleaned docs page.
 * @param {Page} page
 * @returns {Chunk[]}
  // Group lines into sections at H2/H3 headings (H3 nests under current H2).
  /** @type {{path: string, heading: string | null, body: string[]}[]} */
  const sections = [];
  let h2 = "";
  let cur = { path: "", heading: null, body: [] };
  const pushSection = () => {
    const hasBody = cur.body.some((l) => l.trim() !== "");
    if (hasBody || cur.heading) sections.push(cur);
    cur = { path: "", heading: null, body: [] };
  };
  for (const line of lines) {
    const m = line.match(/^(#{2,3})\s+(.*\S)\s*$/);
    if (m) {
      pushSection();
      const name = m[2].trim();
      if (m[1].length === 2) h2 = name;
      cur = {
        path: m[1].length === 2 ? name : [h2, name].filter(Boolean).join(" > "),
        heading: m[0].trim(),
        body: [],
      };
    } else {
      cur.body.push(line);
    }
  }
  pushSection();

  /** @type {Chunk[]} */
  const chunks = [];
  // Heading-only sections (H2 directly followed by H3) merge forward.
  const pendingHeadings = [];
  const addChunk = (section, text) => {
    chunks.push({
      id: `${slug}#${chunks.length}`,
      slug,
      url,
      title,
      product,
      source,
      sectionPath: section.path,
      text,
    });
  };
  for (const section of sections) {
    const hasBody = section.body.some((l) => l.trim() !== "");
    if (!hasBody) {
      if (section.heading) pendingHeadings.push(section.heading);
      continue;
    }
    const parts = packBlocks(toBlocks(section.body));
    parts.forEach((text, i) => {
      const prefix =
        i === 0
          ? [...pendingHeadings, section.heading].filter(Boolean).join("\n\n")
          : "";
      addChunk(section, prefix ? `${prefix}\n\n${text}` : text);
    });
    pendingHeadings.length = 0;
  }
  if (pendingHeadings.length) {
    addChunk({ path: sections.at(-1)?.path ?? "" }, pendingHeadings.join("\n\n"));
  }
  return chunks;
 }
    for (const textChunk of packBlocks(toBlocks(section.lines))) {
      chunks.push({
        id: `${slug}#${chunks.length}`,
        slug,
        url,
        title,
        product,
        source,
        sectionPath: section.path,
        text: textChunk,
      });
    }
  }
  return chunks;
}
