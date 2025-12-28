/*********************************
 * GLOBAL STATE
 *********************************/
let jtaEnabled = true;

// Load enabled state from storage
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.get(['jtaEnabled'], (result) => {
    jtaEnabled = result.jtaEnabled !== false; // default true
    updateToggleButton();
  });
}

/*********************************
 * CLIPBOARD (HTML + TEXT)
 *********************************/
async function copyToClipboard(html, text) {
  try {
    const cleanText = (text || "").trim();
    const cleanHtml = (html || "").trim();

    if (!cleanText && !cleanHtml) {
      throw new Error("Nothing to copy");
    }

    const safeHtml = cleanHtml
      ? `<div>${cleanHtml}</div>`
      : `<pre>${cleanText.replace(/</g, "&lt;")}</pre>`;

    if (window.ClipboardItem) {
      const clipboardData = {
        "text/plain": new Blob([cleanText], { type: "text/plain" }),
        "text/html": new Blob([safeHtml], { type: "text/html" })
      };

      await navigator.clipboard.write([
        new ClipboardItem(clipboardData)
      ]);
    } else {
      await navigator.clipboard.writeText(cleanText);
    }

    return true;
  } catch (err) {
    console.warn("JTA copy failed, falling back to writeText", err);
    try {
      await navigator.clipboard.writeText(text || html || "");
      return true;
    } catch (_) {
      return false;
    }
  }
}

/*********************************
 * STYLES INJECTION (nice buttons)
 *********************************/
function ensureJtaStyles() {
  if (document.getElementById("jta-style")) return;
  const style = document.createElement("style");
  style.id = "jta-style";
  style.textContent = `
    .jta-btn {
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      padding: 6px 10px;
      border-radius: 5px;
      border: none;
      background: #2d2d2d;
      color: #ffffff;
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 150ms ease;
      cursor: pointer;
      font-weight: 500;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .jta-btn:hover {
      background: #3d3d3d;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      transform: translateY(-1px);
    }
    .jta-btn:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .jta-btn.jta-copied {
      background: #2d2d2d;
      color: #ffffff;
      text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
      animation: jtaGlowPulseDark 0.8s ease-out;
    }
    @keyframes jtaGlowPulseDark {
      0% {
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
      }
      50% {
        text-shadow: 0 0 12px rgba(0, 0, 0, 1);
      }
      100% {
        text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
      }
    }
    .jta-icon { 
      width: 16px; 
      height: 16px; 
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
    }
    .jta-toast {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: #fff;
      padding: 8px 12px;
      border-radius: 10px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      z-index: 9999;
      opacity: 0;
      transition: opacity 120ms ease;
    }
    .jta-toast.show { opacity: 1; }
    .jta-toast.error { background: rgba(180,40,40,0.9); }
    @media (prefers-color-scheme: dark) {
      .jta-btn {
        background: #3a3a3a;
        color: #ffffff;
      }
      .jta-btn:hover {
        background: #4a4a4a;
      }
      .jta-btn.jta-copied {
        background: #3a3a3a;
        text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        animation: jtaGlowPulseLight 0.8s ease-out;
      }
      @keyframes jtaGlowPulseLight {
        0% {
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        }
        50% {
          text-shadow: 0 0 12px rgba(255, 255, 255, 0.9);
        }
        100% {
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        }
      }
    }
  `;
  document.head.appendChild(style);
}

// Inline SVG icons 
function jtaCopyIconSVG() {
  return `
    <svg class="jta-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="7" width="12" height="12" rx="3" ry="3"></rect>
      <rect x="9" y="4" width="12" height="12" rx="3" ry="3" opacity="0.35"></rect>
      <path d="M17 5l.5 1.2L19 7l-1.5.6L17 9l-.5-1.4L15 7l1.5-.8z" fill="currentColor" stroke="none" opacity="0.8"></path>
    </svg>
  `;
}

function jtaAnswerIconSVG() {
  return `
    <svg class="jta-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" ry="3"></rect>
      <path d="M8 9h8M8 12h8M8 15h5" stroke-linecap="round"></path>
    </svg>
  `;
}

function jtaEquationIconSVG() {
  // Stylized summation symbol
  return `
    <svg class="jta-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h12l-7 8l7 8H6" stroke-linejoin="round"></path>
    </svg>
  `;
}

function jtaMarkCopied(btn, iconHtml, label) {
  if (!btn) return;
  clearTimeout(btn._jtaResetTimer);
  btn.classList.add("jta-copied");
  btn.innerHTML = iconHtml + '<span>Copied!</span>';
  btn._jtaResetTimer = setTimeout(() => {
    btn.innerHTML = iconHtml + `<span>${label}</span>`;
    btn.classList.remove("jta-copied");
  }, 1400);
}

function jtaToast(message, isError = false) {
  let toast = document.getElementById("jta-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "jta-toast";
    toast.className = "jta-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `jta-toast${isError ? " error" : ""} show`;

  clearTimeout(toast._jtaHideTimer);
  toast._jtaHideTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1600);
}

/*********************************
 * DELIMITER DETECTION
 *********************************/
function isDelimiter(el) {
  if (!el) return false;

  // Explicit <hr>
  if (el.tagName === "HR") return true;

  // Border-based horizontal line
  const style = window.getComputedStyle(el);
  const top = parseFloat(style.borderTopWidth || "0");
  const bottom = parseFloat(style.borderBottomWidth || "0");

  if (top > 0 || bottom > 0) return true;

  // Copilot: pseudo-element borders (::before / ::after)
  const after = window.getComputedStyle(el, "::after");
  const before = window.getComputedStyle(el, "::before");
  const pseudoHasBorder = (
    (after && (parseFloat(after.borderTopWidth || "0") > 0 || parseFloat(after.borderBottomWidth || "0") > 0)) ||
    (before && (parseFloat(before.borderTopWidth || "0") > 0 || parseFloat(before.borderBottomWidth || "0") > 0))
  );
  if (pseudoHasBorder) return true;

  // Gemini: thin background divider (≤3px tall with background)
  const bgColor = style.backgroundColor;
  const hasBackground = bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent";
  const isThin = el.offsetHeight <= 3;

  return hasBackground && isThin;
}

/*********************************
 * FLATTEN STRUCTURE
 * Extract visible children regardless of nesting (Gemini support)
 *********************************/
function getVisibleChildren(container) {
  if (!container) return [];
  // Flatten immediate children and grandchildren to handle nested markdown
  const nodes = Array.from(
    container.querySelectorAll(":scope > *, :scope > * > *")
  );
  return nodes.filter(el => {
    if (el.offsetParent === null) return false;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;

    // Skip our own injected UI
    if (el.classList.contains("jta-btn")) return false;

    return true;
  });
}

/*********************************
 * BLOCK = BETWEEN TWO DELIMITERS
 * Now uses flattened visible elements
 *********************************/
function getDelimiterBlocks(answerDiv) {
  // Use flattened structure to handle nested divs (Gemini)
  const children = getVisibleChildren(answerDiv);
  const blocks = [];

  let current = [];

  children.forEach(el => {
    if (isDelimiter(el)) {
      // delimiter closes the current block
      if (current.length) {
        blocks.push([...current]);
        current = [];
      }
      return; // delimiter itself is not copied
    }

    current.push(el);
  });

  if (current.length) {
    blocks.push([...current]);
  }

  return blocks;
}

/*********************************
 * NORMALIZE AND FILTER LINES (human-style extraction)
 *********************************/
function normalizeAndFilterLines(text) {
  const lines = text
    .split("\n")
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const finalLines = [];

  lines.forEach(line => {
    const wordCount = line.split(" ").length;

    const isSentence =
      /[.!?]$/.test(line) ||          // ends like a sentence
      wordCount >= 8;                 // long enough to be meaningful

    if (isSentence) {
      finalLines.push(line);
      return;
    }

    // If short line, keep ONLY if it does NOT appear inside any other line
    const appearsInsideLine = lines.some(other =>
      other !== line &&
      other.length > line.length &&
      other.toLowerCase().includes(line.toLowerCase())
    );

    if (!appearsInsideLine) {
      finalLines.push(line);
    }
  });

  return finalLines.join("\n");
}

/*********************************
 * DEDUPLICATE SEMANTIC FRAGMENTS
 *********************************/
function dedupeSemanticFragments(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const fullSentences = lines.filter(l => l.length > 40);
  const fragments = lines.filter(l => l.length <= 40);

  const cleaned = [...fullSentences];

  fragments.forEach(frag => {
    const appearsInSentence = fullSentences.some(sent =>
      sent.toLowerCase().includes(frag.toLowerCase())
    );
    if (!appearsInSentence) {
      cleaned.push(frag);
    }
  });

  return cleaned.join("\n");
}

/*********************************
 * EXTRACT CLEAN BLOCK TEXT (semantic containers only)
 *********************************/
function extractCleanBlockText(root) {
  let lines = [];

  // 🔥 SAFETY: Remove stray text nodes (streaming artifacts like "why")
  Array.from(root.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      node.remove();
    }
  });

  // 1️⃣ CODE BLOCKS — PRE ONLY (never code separately)
  root.querySelectorAll("pre").forEach(pre => {
    if (pre.closest(".jta-btn")) return;
    const code = pre.innerText.trim();
    if (code) lines.push(code);
  });

  // 2️⃣ TABLES — ONCE ONLY
  root.querySelectorAll("table").forEach(table => {
    if (table.closest(".jta-btn")) return;
    const tableText = table.innerText.replace(/\s+\n/g, "\n").trim();
    if (tableText) lines.push(tableText);
  });

  // 3️⃣ EQUATIONS — DISPLAY ONLY
  root.querySelectorAll(".katex-display, mjx-container").forEach(eq => {
    const latex =
      eq.querySelector("annotation[encoding='application/x-tex']")?.textContent
      || eq.innerText;
    if (latex) lines.push(latex.trim());
  });

  // 4️⃣ LIST ITEMS — prefer LI, avoid double-counting P inside LI
  root.querySelectorAll("li").forEach(li => {
    if (li.closest("pre, table, mjx-container, .katex-display")) return;
    const t = li.textContent.replace(/\s+/g, " ").trim();
    if (t) lines.push(t);
  });

  // 5️⃣ NORMAL TEXT — H/P/BLOCKQUOTE but skip those within LI
  root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,blockquote").forEach(el => {
    if (el.closest("pre, table, mjx-container, .katex-display, li")) return;
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (text) lines.push(text);
  });

  return lines.join("\n\n");
}

/*********************************
 * EXTRACT BLOCK HEADING (once only)
 *********************************/
function extractBlockHeading(block) {
  for (const el of block) {
    if (!el) continue;
    // Direct heading
    if (/^H[1-6]$/.test(el.tagName)) {
      const txt = (el.innerText || el.textContent || "");
      return txt.replace(/\bCopy\b/i, "").trim();
    }
    // Nested heading inside a container (div/section/article)
    if (el.querySelector) {
      const nested = el.querySelector("h1,h2,h3,h4,h5,h6");
      if (nested) {
        // Clone to strip any injected UI (copy buttons) inside heading
        const clone = nested.cloneNode(true);
        clone.querySelectorAll("button, .jta-btn, [data-jta-ui], [aria-hidden='true']").forEach(n => n.remove());
        const txt = (clone.innerText || clone.textContent || "");
        return txt.replace(/\bCopy\b/i, "").trim();
      }
    }
  }
  return null;
}

/*********************************
 * BLOCK → CONTENT
 *********************************/
function blockToContent(block) {
  let html = "";
  let text = "";

  // 1️⃣ Extract heading ONCE
  const heading = extractBlockHeading(block);
  if (heading) {
    text += heading + "\n";
  }

   // Capture heading HTML (for Word) without UI contamination
   let headingHtml = "";
   (function findHeadingHtml() {
     for (const el of block) {
       if (!el) continue;
       let target = null;
       if (/^H[1-6]$/.test(el.tagName)) target = el;
       else if (el.querySelector) target = el.querySelector("h1,h2,h3,h4,h5,h6");
       if (target) {
         const clone = target.cloneNode(true);
         clone.querySelectorAll("button, .jta-btn, [data-jta-ui], .katex-mathml, mjx-assistive-mml").forEach(n => n.remove());
         headingHtml = clone.outerHTML;
         break;
       }
     }
   })();

  // 2️⃣ Build clean body container (skip top-level headings)
  const wrapper = document.createElement("div");
  
  // Determine OUTERMOST nodes only to avoid duplicating nested content
  const arr = block.slice();
  const set = new Set(arr);
  const outerEls = arr.filter(el => {
    // Skip headings here; handled separately
    if (/^H[1-6]$/.test(el.tagName)) return false;
    let p = el.parentElement;
    while (p) {
      if (set.has(p)) return false; // ancestor present in block → skip child
      p = p.parentElement;
    }
    return true;
  });

  outerEls.forEach(el => {
    // Skip top-level heading elements
    if (/^H[1-6]$/.test(el.tagName)) return;

    const clone = el.cloneNode(true);

    // Remove nested headings and UI (but keep aria-hidden content like KaTeX render spans)
    clone.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, button, .jta-btn, [data-jta-ui], .katex-mathml, mjx-assistive-mml"
    ).forEach(n => n.remove());

    wrapper.appendChild(clone);
    html += clone.outerHTML;
  });

  // Prepend heading html once if present
  if (headingHtml) {
    html = headingHtml + html;
  }

  // 3️⃣ Extract body text ONCE
  let bodyText = extractCleanBlockText(wrapper);

  // 🔥 CRITICAL: Remove heading from body if it appears there
  if (heading && bodyText) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}\\s*`, "i");
    bodyText = bodyText.replace(re, "").trim();
  }

  if (bodyText) {
    text += bodyText;
  }

  return { html, text };
}

/*********************************
 * BLOCK FINGERPRINT (structural)
 *********************************/
function getBlockSignature(block) {
  try {
    return block
      .map(el => (el?.tagName || "_") + ":" + ((el?.innerText || "").length))
      .join("|");
  } catch (_) {
    return String(block.length);
  }
}

/*********************************
 * BLOCK STABILITY CHECK
 *********************************/
function isBlockStable(el) {
  if (!el) return false;

  const text = (el.innerText || "").trim();
  if (text.length < 60) return false;

  const now = Date.now();
  const lastText = el.dataset.jtaLastText || "";
  const lastTime = parseInt(el.dataset.jtaLastTime || "0", 10);

  // First observation: treat as stable if text is sufficient
  if (!lastText) {
    el.dataset.jtaLastText = text;
    el.dataset.jtaLastTime = now.toString();
    return true; // Allow button on first observation
  }

  // Text changed: reset timer
  if (text !== lastText) {
    el.dataset.jtaLastText = text;
    el.dataset.jtaLastTime = now.toString();
    return false;
  }

  // Stable if unchanged for ≥ 150ms
  return (now - lastTime) >= 150;
}

/*********************************
 * FEATURE 1
 * Copy by block (hover)
 *********************************/
function enableBlockCopy(answerDiv) {
  ensureJtaStyles();
  const blocks = getDelimiterBlocks(answerDiv);

  blocks.forEach(block => {
    const anchor = block[0];
    if (!anchor) return;

    // Structural gating: inject when signature is stable for a short time
    const nowTs = Date.now();
    const signature = getBlockSignature(block);
    const lastSig = anchor.dataset.jtaBlockSig || "";
    const lastTs = parseInt(anchor.dataset.jtaBlockSigTs || "0", 10);
    const firstTs = parseInt(anchor.dataset.jtaBlockSigFirstTs || "0", 10);

    if (signature !== lastSig) {
      anchor.dataset.jtaBlockSig = signature;
      anchor.dataset.jtaBlockSigTs = String(nowTs);
      if (!firstTs) anchor.dataset.jtaBlockSigFirstTs = String(nowTs);
      return; // still evolving, wait until stable
    }

    // If signature unchanged, require a minimal stability window (stream-friendly)
    const stableByRecent = nowTs - lastTs >= 80;
    const stableByFallback = firstTs && (nowTs - firstTs >= 500);
    if (!(stableByRecent || stableByFallback)) return;

    // Allow reinjection when DOM replaces nodes; only skip if a button already exists
    if (anchor.querySelector('.jta-copy-btn')) return;
    
    // Skip only if the block itself is an equation container.
    // Allow blocks that merely contain equations inside.
    const isEqContainer = anchor.matches('.katex-display, mjx-container');
    if (isEqContainer && block.length === 1) return;
    
    // Skip very short blocks (chips/prompts)
    const blockTextLen = block.reduce((acc, el) => acc + (el.innerText || "").trim().length, 0);
    if (blockTextLen < 60) return;
    // Skip blocks inside prompt/user areas (Copilot/Gemini)
      const skip = anchor.closest("textarea, input, form, [contenteditable='true'], [role='textbox'], [data-testid*='prompt' i], [data-testid*='composer' i], [data-testid*='user' i], [data-role*='input' i], [data-testid*='query' i]") ||
        (/\b(suggest|chip|pill|prompt|bubble|input|composer|query|search)\b/i.test(((anchor.className || "").toString())));
    // Also skip interactive bubbles (role=button or pointer cursor)
    const roleBtn = anchor.closest("[role='button']") || anchor.getAttribute("role") === "button";
    const cursor = window.getComputedStyle(anchor).cursor;
    if (skip || roleBtn || cursor === "pointer") return;

    // Ensure proper positioning context
    const anchorStyle = window.getComputedStyle(anchor);
    if (anchorStyle.position === "static") {
      anchor.style.position = "relative";
    }
    anchor.style.overflow = "visible";
    
    // Hide any native copy buttons that might conflict
    const nativeBtns = anchor.querySelectorAll("button[aria-label*='copy' i], button[title*='copy' i]");
    nativeBtns.forEach(nb => {
      if (!nb.classList.contains('jta-btn')) {
        nb.style.display = 'none';
      }
    });

    const btn = document.createElement("button");
    btn.className = "jta-btn jta-copy-btn"; // identify for cleanup
    btn.innerHTML = jtaCopyIconSVG() + '<span>Copy</span>';
    btn.setAttribute("data-jta", "block");
    btn.setAttribute("aria-label", "Copy block");
    btn.setAttribute("aria-hidden", "true");
    btn.setAttribute("tabindex", "-1");
    btn.setAttribute("data-jta-ui", "true");
    btn.title = "Copy this block";
    btn.style.position = "absolute";
    btn.style.top = "8px";
    btn.style.right = "8px";
    btn.style.display = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.zIndex = "99999";
    btn.style.pointerEvents = "auto";
    btn.style.transform = "translateZ(0)";
    btn.style.backdropFilter = "blur(8px)";
    btn.style.WebkitBackdropFilter = "blur(8px)";

    btn.onclick = e => {
      e.stopPropagation();
      const { html, text } = blockToContent(block);
      copyToClipboard(html, text).then(ok => {
        if (ok) {
          jtaMarkCopied(btn, jtaCopyIconSVG(), "Copy");
        } else {
          jtaToast("Copy failed", true);
        }
      });
    };

    anchor.addEventListener("mouseenter", () => btn.style.display = "block");
    anchor.addEventListener("mouseleave", () => btn.style.display = "none");

    anchor.appendChild(btn);

    // Mark as ready only after successful injection
    anchor.dataset.jtaBlockReady = "true";
  });
}

/*********************************
 * FEATURE 2
 * Copy full answer (clean)
 * Smart greeting detection + delimiter handling
 *********************************/
function stripGreetingPrefix(text) {
  if (!text) return text;

  let t = text.trim();

  // Normalize newlines
  t = t.replace(/\r\n/g, "\n");

  const greetingRegexes = [
    // Hey Roy 👋
    /^hey\b[^\n]*\n+/i,
    /^hi\b[^\n]*\n+/i,
    /^hello\b[^\n]*\n+/i,

    // Let's break...
    /^hey\b[^.?!]*\s+/i,
    /^hi\b[^.?!]*\s+/i,
    /^hello\b[^.?!]*\s+/i,

    // Other soft openers
    /^sure\b\s+/i,
    /^of course\b\s+/i,
    /^great question\b[^\n]*\n+/i,
    /^good question\b[^\n]*\n+/i,
    /^thanks for asking\b[^\n]*\n+/i,
    /^let['']s\b[^\n]*\n+/i
  ];

  for (const re of greetingRegexes) {
    t = t.replace(re, "");
  }

  return t.trim();
}

function stripClosingSuffix(text) {
  if (!text) return text;
  let t = text.trim();

  // Normalize newlines
  t = t.replace(/\r\n/g, "\n");

  const closingRegexes = [
    /\n+(hope this helps)[^.\n]*[.!]?$/i,
    /\n+(let me know[^\n]*|feel free to ask[^\n]*|if you have (any|other) questions[^\n]*)[.!]?$/i,
    /\n+(in summary|to summarize|tl;dr|conclusion)[^\n]*[.!]?$/i,
    /\n+(happy coding|cheers|best regards|thanks(!?))\s*$/i,
    /\n+(-{2,}|—|–)\s*$/i
  ];

  // Remove trailing closing lines greedily
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of closingRegexes) {
      const next = t.replace(re, "").trim();
      if (next.length !== t.length) {
        t = next;
        changed = true;
      }
    }
  }

  return t.trim();
}

function sanitizeHtmlGreetingsClosings(html) {
  if (!html) return html;
  const container = document.createElement("div");
  container.innerHTML = html;

  // Remove leading greetings in first few semantic elements
  const greetPatterns = [
    /^hey\b/i, /^hi\b/i, /^hello\b/i, /^sure\b/i, /^of course\b/i,
    /^great question\b/i, /^good question\b/i, /^thanks for asking\b/i, /^let['']s\b/i
  ];

  const blocks = Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote"));
  for (let i = 0; i < Math.min(3, blocks.length); i++) {
    const el = blocks[i];
    const txt = (el.textContent || "").trim();
    if (greetPatterns.some(re => re.test(txt))) {
      el.remove();
    } else {
      break;
    }
  }

  // Remove trailing closings greedily from the end
  const closingPatterns = [
    /(hope this helps)[^.\n]*[.!]?$/i,
    /(let me know[^\n]*|feel free to ask[^\n]*|if you have (any|other) questions[^\n]*)[.!]?$/i,
    /(in summary|to summarize|tl;dr|conclusion)[^\n]*[.!]?$/i,
    /(happy coding|cheers|best regards|thanks(!?))\s*$/i,
    /(-{2,}|—|–)\s*$/i
  ];

  let tail = Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote"));
  for (let i = tail.length - 1; i >= Math.max(0, tail.length - 3); i--) {
    const el = tail[i];
    const txt = (el.textContent || "").trim();
    if (closingPatterns.some(re => re.test(txt))) {
      el.remove();
    } else {
      break;
    }
  }

  return container.innerHTML;
}

function extractFullAnswer(answerDiv) {
  const blocks = getDelimiterBlocks(answerDiv);

  // If delimiters exist → use middle blocks
  let contentBlocks = blocks.length >= 2
    ? blocks.slice(1, -1)
    : blocks;

  let textParts = [];
  let htmlParts = [];

  // Reuse the SAME deduplication logic as block copy
  contentBlocks.forEach(block => {
    const { html, text } = blockToContent(block);

    if (text && text.trim().length > 0) {
      textParts.push(text.trim());
    }

    if (html && html.trim().length > 0) {
      htmlParts.push(html.trim());
    }
  });

  return {
    html: htmlParts.join("\n"),
    text: textParts.join("\n\n")
  };
}

/*********************************
 * FEATURE 3
 * Copy equation (KaTeX/MathJax)
 *********************************/
function getEquationContent(eqEl) {
  const node = eqEl;
  const clone = node.cloneNode(true);
  clone.querySelectorAll("button.jta-copy-eq-btn").forEach(btn => btn.remove());

  let latex = "";
  // KaTeX exposes LaTeX in MathML annotation
  const katexAnno = node.querySelector(
    ".katex-mathml annotation[encoding='application/x-tex']"
  );
  if (katexAnno) {
    latex = katexAnno.textContent || "";
  } else {
    // MathJax v3 exposes <annotation encoding="application/x-tex">
    const mjxAnno = node.querySelector(
      "annotation[encoding='application/x-tex']"
    );
    if (mjxAnno) latex = mjxAnno.textContent || "";
  }

  const html = clone.outerHTML;
  const text = latex || node.innerText || "";
  return { html, text };
}

function addEquationCopy(answerDiv) {
  // Collect ALL equation containers (both display and inline that contain math)
  const candidates = answerDiv.querySelectorAll(
    ".katex, mjx-container, .katex-display"
  );

  // Filter to outermost nodes only to avoid duplicates on nested structures
  const arr = Array.from(candidates);
  const set = new Set(arr);
  const equations = arr.filter(el => {
    // Skip if nested inside another equation
    let p = el.parentElement;
    while (p) {
      if (set.has(p)) return false;
      p = p.parentElement;
    }

    // Ignore inline single-letter or short math like italic a, b, c
    const isKatexDisplay = el.classList && el.classList.contains('katex-display');
    const isKatexInline = el.classList && el.classList.contains('katex') && !isKatexDisplay;
    const isMJX = el.tagName === 'MJX-CONTAINER';
    const isMJXDisplay = isMJX && ((el.getAttribute('display') || '').toLowerCase() === 'block');
    const isMJXInline = isMJX && !isMJXDisplay;

    if (isKatexInline || isMJXInline) {
      const t = (el.innerText || '').trim();
      // Skip inline math that is too short (single letters, variables)
      if (t.length < 3) return false;
    }
    
    return true;
  });

  equations.forEach(eq => {
    const el = eq;
    if (el.dataset && el.dataset.jtaEqReady) return;
    if (el.dataset) el.dataset.jtaEqReady = "true";

    // Use the element itself as anchor; ensure positioning works
    const computed = window.getComputedStyle(el);
    if (computed.position === "static") {
      el.style.position = "relative";
    }
    // Add padding to prevent button overlap
    el.style.paddingBottom = "40px";
    el.style.minHeight = "40px";

    ensureJtaStyles();
    // Add thin visible box outline around equation
    el.style.border = "1px solid #333";
    el.style.padding = "8px";
    el.style.borderRadius = "4px";
    el.style.cursor = "pointer";
    el.style.transition = "all 150ms ease";

    // Store original border for reset
    const originalBorder = el.style.border;
    const originalPadding = el.style.padding;

    el.onclick = e => {
      e.stopPropagation();
      const { html, text } = getEquationContent(el);
      copyToClipboard(html, text).then(ok => {
        if (ok) {
          // Flash green on copy
          el.style.borderColor = "#10b981";
          el.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
          setTimeout(() => {
            el.style.borderColor = "#333";
            el.style.backgroundColor = "transparent";
          }, 500);
          jtaToast("Equation copied!");
        } else {
          jtaToast("Copy failed", true);
        }
      });
    };

    el.onmouseenter = () => {
      el.style.borderColor = "#666";
      el.style.backgroundColor = "rgba(100, 100, 100, 0.05)";
    };

    el.onmouseleave = () => {
      el.style.borderColor = "#333";
      el.style.backgroundColor = "transparent";
    };

    // Add dark mode styles
    const darkModeStyle = document.createElement("style");
    darkModeStyle.textContent = `
      @media (prefers-color-scheme: dark) {
        .katex, .katex-display, mjx-container {
          border-color: #ccc !important;
        }
      }
    `;
    if (!document.querySelector("style[data-jta-eq-dark]")) {
      darkModeStyle.setAttribute("data-jta-eq-dark", "true");
      document.head.appendChild(darkModeStyle);
    }
  });
}


function addFullAnswerCopy(answerDiv) {
  // Double-check: ensure we don't already have a button in this container
  if (answerDiv.dataset.jtaFullCopy) return;
  if (answerDiv.querySelector(".jta-copy-full-btn")) return;
  answerDiv.dataset.jtaFullCopy = "true";

  const btn = document.createElement("button");
  btn.innerHTML = jtaAnswerIconSVG() + '<span>Copy Main Answer</span>';
  ensureJtaStyles();
  btn.className = "jta-btn jta-copy-full-btn"; // identify for cleanup
  btn.setAttribute("data-jta", "full");
  btn.setAttribute("aria-label", "Copy main answer");
  btn.setAttribute("aria-hidden", "true");
  btn.setAttribute("tabindex", "-1");
  btn.setAttribute("data-jta-ui", "true");
  btn.style.marginTop = "12px";
  btn.style.cursor = "pointer";
  // Ensure button stays at the bottom in flex containers
  btn.style.order = "9999";
  btn.style.alignSelf = "flex-start";

  btn.onclick = () => {
    const { html, text } = extractFullAnswer(answerDiv);
    const cleanedText = stripClosingSuffix(stripGreetingPrefix(text));
    const cleanedHtml = sanitizeHtmlGreetingsClosings(html);
    copyToClipboard(cleanedHtml, cleanedText).then(ok => {
      if (ok) {
        jtaMarkCopied(btn, jtaAnswerIconSVG(), "Copy Main Answer");
      } else {
        jtaToast("Copy failed", true);
      }
    });
  };

  answerDiv.appendChild(btn);

  // Lightweight observer to keep button at bottom during streaming
  // Disconnects after 3s of inactivity to avoid permanent overhead
  let btnTimer = null;
  const fullBtnKeeper = new MutationObserver(() => {
    clearTimeout(btnTimer);
    try {
      if (btn.parentElement === answerDiv && answerDiv.lastElementChild !== btn) {
        answerDiv.appendChild(btn);
        btn.style.order = "9999";
      }
    } catch (_) {}
    // Auto-disconnect after 3s of no changes (streaming completed)
    btnTimer = setTimeout(() => {
      fullBtnKeeper.disconnect();
    }, 3000);
  });
  fullBtnKeeper.observe(answerDiv, { childList: true, subtree: false });
}

/*********************************
 * PLATFORM SELECTORS
 *********************************/
// Find answer containers across platforms
function findAnswerContainers() {
  const containers = new Set();

  // ChatGPT: markdown divs (DO NOT pre-mark)
  document.querySelectorAll("div.markdown").forEach(el => {
    const textLen = el.textContent.trim().length;
    if (textLen < 100) return;

    // Skip if we already injected buttons here
    if (el.dataset.jtaEnhanced) return;

    containers.add(el);
  });

  // Gemini: root app and message containers
  document.querySelectorAll("chat-app").forEach(el => containers.add(el));
  document.querySelectorAll("[role='log']").forEach(el => {
    if (el.textContent.length > 100) containers.add(el);
  });

  // Copilot: assistant message containers (not the user prompt)
  const copilotRoots = [
    ...document.querySelectorAll("[data-testid='highlighted-chats']"),
    ...document.querySelectorAll("[data-content='conversation']")
  ];
  copilotRoots.forEach(root => {
    const allDivs = Array.from(root.querySelectorAll("div"));
    // Primary heuristic: assistant messages with actions or live regions
    let candidates = allDivs.filter(el => {
      const t = (el.textContent || "").trim();
      if (t.length < 120) return false;
      // Skip inputs/prompt/user areas
      if (el.closest("textarea, input, form, [contenteditable='true'], [role='textbox'], [data-testid*='prompt' i], [data-testid*='composer' i], [data-testid*='user' i], [data-role*='input' i]")) return false;
      const cls = (el.className || "").toString().toLowerCase();
      if (/(suggest|chip|pill|prompt|bubble|input|composer|query|search)/.test(cls)) return false;
      const hasActions = el.querySelector("button[aria-label*='like' i], button[aria-label*='dislike' i], [data-testid*='feedback' i]");
      const isLive = el.getAttribute('aria-live') || el.closest('[aria-live]');
      return !!(hasActions || isLive);
    });

    // Fallback heuristic: substantial prose blocks that are not interactive bubbles
    if (!candidates.length) {
      candidates = allDivs.filter(el => {
        const t = (el.textContent || "").trim();
        if (t.length < 200) return false; // require more content for fallback
        if (el.closest("textarea, input, form, [contenteditable='true'], [role='textbox'], [data-testid*='prompt' i], [data-testid*='composer' i], [data-testid*='user' i], [data-role*='input' i]")) return false;
        const cls = (el.className || "").toString().toLowerCase();
        if (/(suggest|chip|pill|prompt|bubble|input|composer|query|search)/.test(cls)) return false;
        const hasProse = el.querySelector("p, h1, h2, h3, ul, ol, code, pre, blockquote");
        const roleBtn = el.getAttribute("role") === "button" || el.closest("[role='button']");
        const style = window.getComputedStyle(el);
        const isPointer = style.cursor === "pointer";
        return !!(hasProse && !roleBtn && !isPointer);
      });
    }
    const set = new Set(candidates);
    candidates.forEach(el => {
      let p = el.parentElement;
      while (p) {
        if (set.has(p)) return; // skip nested
        p = p.parentElement;
      }
      containers.add(el);
    });
  });

  // Generic: articles with substantial content
  document.querySelectorAll("article").forEach(el => {
    if (el.textContent.length > 100) containers.add(el);
  });

  // DeepSeek: markdown containers
  const host = location.hostname || "";
  if (/deepseek\.com$|deepseek\.com$/i.test(host) || /deepseek/i.test(host)) {
    // Prefer elements that look like markdown bodies; avoid reliance on exact class names
    const dsCandidates = [
      ...document.querySelectorAll("div[class*='markdown']"),
      ...document.querySelectorAll("section[class*='markdown']"),
      ...document.querySelectorAll("main div[class*='message'], main div[class*='markdown']")
    ];
    dsCandidates.forEach(el => {
      // Must contain substantial text and typical markdown children
      const t = (el.textContent || "").trim();
      if (t.length < 120) return;
      const hasProse = el.querySelector("p, h1, h2, h3, ul, ol, code, pre, blockquote, hr");
      if (!hasProse) return;
      // Exclude inputs/prompt/bubbles
      if (el.closest("textarea, input, form, [contenteditable='true'], [role='textbox']")) return;
      const cls = (el.className || "").toString().toLowerCase();
      if (/(suggest|chip|pill|prompt|bubble|input|composer|query|search)/.test(cls)) return;
      containers.add(el);
    });
  }

  return Array.from(containers);
}

/*********************************
 * BOOTSTRAP
 *********************************/
function enhanceAnswers() {
  const containers = findAnswerContainers();

  containers.forEach(answer => {
    const textLen = answer.textContent?.trim().length || 0;
    if (textLen < 100) return;

    // Full-answer button: inject ONCE when stable (do not block block copy)
    if (!answer.dataset.jtaFullEnhanced && isAssistantMessageStable(answer)) {
      answer.dataset.jtaFullEnhanced = "true";
      addFullAnswerCopy(answer);
    }

    // Always run incremental features
    enableBlockCopy(answer);
    addEquationCopy(answer);
  });
}

function isAssistantMessageStable(answerDiv) {
  // Check for streaming indicators
  if (answerDiv.querySelector(".result-streaming, .animate-pulse, [class*='cursor'], [class*='typing']")) {
    return false;
  }

  // Check parent container for streaming state
  const messageRoot = answerDiv.closest("[data-message-author-role='assistant']");
  if (messageRoot) {
    // If parent has streaming class, not stable yet
    if (messageRoot.querySelector(".result-streaming, .animate-pulse, [class*='cursor'], [class*='typing']")) {
      return false;
    }
  }

  // Text exists → treat as stable
  const textLength = answerDiv.textContent.trim().length;
  return textLength > 50;
}

function enhanceAnswer(answer) {
  // Mark as enhanced for initial processing
  if (!answer.dataset.jtaEnhanced) {
    // ⛔ Do NOT inject during streaming
    if (!isAssistantMessageStable(answer)) {
      // Retry after a short delay for streaming messages
      setTimeout(() => {
        if (!answer.dataset.jtaEnhanced && isAssistantMessageStable(answer)) {
          answer.dataset.jtaEnhanced = "true";
          addFullAnswerCopy(answer);
        }
      }, 500);
      return;
    }

    answer.dataset.jtaEnhanced = "true";
    addFullAnswerCopy(answer);
  }
  
  // Always check equations - they may render late (KaTeX/MathJax)
  const currentEqs = answer.querySelectorAll(".katex-display, .katex, mjx-container");
  const eqCount = currentEqs.length;
  const lastEqCount = parseInt(answer.dataset.jtaEqCount || "0", 10);
  
  if (eqCount !== lastEqCount || eqCount > 0) {
    answer.dataset.jtaEqCount = eqCount.toString();
    // Clear existing retry timers
    if (answer._jtaEqTimer) clearTimeout(answer._jtaEqTimer);
    if (answer._jtaEqTimer2) clearTimeout(answer._jtaEqTimer2);
    if (answer._jtaEqTimer3) clearTimeout(answer._jtaEqTimer3);
    
    // Immediate processing
    addEquationCopy(answer);
    
    // Progressive retries to catch slow-rendering equations
    answer._jtaEqTimer = setTimeout(() => {
      const retry1 = answer.querySelectorAll(".katex-display, .katex, mjx-container");
      if (retry1.length >= eqCount) {
        answer.dataset.jtaEqCount = retry1.length.toString();
        addEquationCopy(answer);
      }
    }, 300);
    
    answer._jtaEqTimer2 = setTimeout(() => {
      const retry2 = answer.querySelectorAll(".katex-display, .katex, mjx-container");
      if (retry2.length >= eqCount) {
        answer.dataset.jtaEqCount = retry2.length.toString();
        addEquationCopy(answer);
      }
    }, 800);
    
    answer._jtaEqTimer3 = setTimeout(() => {
      const retry3 = answer.querySelectorAll(".katex-display, .katex, mjx-container");
      answer.dataset.jtaEqCount = retry3.length.toString();
      addEquationCopy(answer);
    }, 2000);
  }
  
  // Always check blocks - they may have changed during streaming
  const currentBlocks = getDelimiterBlocks(answer);
  const blockCount = currentBlocks.length;
  const lastBlockCount = parseInt(answer.dataset.jtaBlockCount || "0", 10);
  
  // Create a fingerprint of the blocks to detect real changes
  const blockFingerprint = currentBlocks.map(b => b[0]?.tagName + (b[0]?.className || '')).join('|');
  const lastFingerprint = answer.dataset.jtaBlockFingerprint || '';
  
  // Only re-enhance if blocks actually changed structure, not just on every mutation
  if (blockCount !== lastBlockCount || (blockCount > 0 && blockFingerprint !== lastFingerprint)) {
    answer.dataset.jtaBlockCount = blockCount.toString();
    answer.dataset.jtaBlockFingerprint = blockFingerprint;
    // Only clear markers for new blocks, not existing ones
    currentBlocks.forEach(block => {
      if (block[0] && !block[0].dataset.jtaBlockReady) {
        enableBlockCopy(answer);
      }
    });
  } else if (lastBlockCount === 0 && blockCount > 0) {
    // First run
    enableBlockCopy(answer);
    answer.dataset.jtaBlockCount = blockCount.toString();
    answer.dataset.jtaBlockFingerprint = blockFingerprint;
  }

  // 🔁 ALWAYS re-check block copy (cheap operation)
  enableBlockCopy(answer);
}

// Observe the page for dynamic ChatGPT content and enhance on changes
let jtaObserverStarted = false;
function startJtaObserver() {
  if (jtaObserverStarted) return;
  jtaObserverStarted = true;
  const target = document.body;
  if (!target) return;

  let scheduled = false;
  const schedule = () => {
    if (scheduled || !jtaEnabled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      enhanceAnswers();
    }, 150);
  };

  const observer = new MutationObserver(() => schedule());
  // Only observe DOM changes, not text mutations (reduces overhead)
  observer.observe(target, { childList: true, subtree: true });
}

// Listen for state changes from popup
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleExtension') {
      jtaEnabled = request.enabled;
      if (jtaEnabled) {
        enhanceAnswers();
      } else {
        document.querySelectorAll('.jta-copy-btn, .jta-copy-full-btn, .jta-copy-eq-btn').forEach(btn => btn.remove());
      }
    }
  });
}

// Initial run and start observing
if (jtaEnabled) {
  // Run immediately
  enhanceAnswers();
  
  // Run again after a delay to catch any late-loading content
  setTimeout(() => enhanceAnswers(), 500);
  setTimeout(() => enhanceAnswers(), 1500);
}
startJtaObserver();
