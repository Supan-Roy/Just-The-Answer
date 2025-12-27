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
function copyToClipboard(html, text) {
  return navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" })
    })
  ]).then(() => true).catch(err => {
    console.warn("JTA copy failed", err);
    return false;
  });
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
      line-height: 1.2;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid rgba(0,0,0,0.15);
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #111;
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1);
      transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 60ms ease;
      user-select: none;
      text-decoration: none;
      white-space: nowrap;
      pointer-events: auto;
      isolation: isolate;
    }
    .jta-btn span { display: inline; }
    .jta-btn:hover { background: #f4f6f8; border-color: rgba(0,0,0,0.25); box-shadow: 0 4px 12px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.1); }
    .jta-btn:active { transform: translateY(0.5px); }
    .jta-btn:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
    .jta-icon { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.6; }
    .jta-btn > .jta-icon { flex: 0 0 auto; display: inline-block; }
    .jta-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 14px;
      border-radius: 10px;
      background: rgba(0,0,0,0.85);
      color: #fff;
      font-size: 13px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      z-index: 9999;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 120ms ease, transform 120ms ease;
    }
    .jta-toast.show { opacity: 1; transform: translateY(0); }
    .jta-toast.error { background: rgba(180,40,40,0.9); }
    .jta-btn.jta-copied { background: #d1fae5; border-color: #34d399; color: #065f46; }
    @media (prefers-color-scheme: dark) {
      .jta-btn.jta-copied { background: rgba(52,211,153,0.2); border-color: rgba(52,211,153,0.6); color: #a7f3d0; }
    }
    @media (prefers-color-scheme: dark) {
      .jta-btn {
        background: rgba(255,255,255,0.08);
        border-color: rgba(255,255,255,0.20);
        color: #fff;
        box-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      .jta-btn:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.30); box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
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

  return Array.from(container.querySelectorAll("*")).filter(el => {
    // Skip if hidden
    if (el.offsetParent === null) return false;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;

    // Skip if element is our own button
    if (el.classList.contains("jta-btn")) return false;

    // Only include direct visual blocks (not deeply nested text nodes)
    // Check if this is a meaningful visual container
    return el.offsetHeight > 0 && el.offsetWidth > 0;
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
 * BLOCK → CONTENT
 *********************************/
function blockToContent(block) {
  let html = "";
  let text = "";

  // Clone and clean: keep equations but remove accessibility garbage
  block.forEach(el => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll("button.jta-copy-btn, button.jta-copy-full-btn, button.jta-copy-eq-btn").forEach(btn => btn.remove());
    
    // Clean equations: remove MathML (contains garbage for screen readers)
    clone.querySelectorAll(".katex-mathml").forEach(ml => ml.remove());
    clone.querySelectorAll("mjx-assistive-mml").forEach(ml => ml.remove());
    
    html += clone.outerHTML;
    text += clone.innerText + "\n";
  });

  return { html, text };
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
    if (!anchor || anchor.dataset.jtaBlockReady) return;
    
    // Skip equations - they have their own copy button
    if (anchor.classList.contains('katex-display') || 
        anchor.classList.contains('katex') || 
        anchor.tagName === 'MJX-CONTAINER' ||
        anchor.querySelector('.katex-display, .katex, mjx-container') ||
        anchor.closest('.katex-display, .katex, mjx-container')) return;
    
    // Skip if this already has an equation button
    if (anchor.querySelector('.jta-copy-eq-btn')) return;
    
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

    anchor.dataset.jtaBlockReady = "true";
    
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

    block.forEach(el => {
      el.addEventListener("mouseenter", () => btn.style.display = "block");
      el.addEventListener("mouseleave", () => btn.style.display = "none");
    });

    anchor.appendChild(btn);
  });
}

/*********************************
 * FEATURE 2
 * Copy full answer (clean)
 * Now uses flattened visible elements
 *********************************/
function extractFullAnswer(answerDiv) {
  const children = getVisibleChildren(answerDiv);

  // Find all delimiters
  const delimiterIndexes = children
    .map((el, i) => (isDelimiter(el) ? i : -1))
    .filter(i => i !== -1);

  // If less than 2 delimiters, fallback to all visible content
  if (delimiterIndexes.length < 2) {
    let html = "";
    let text = "";

    children.forEach(el => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll("button.jta-copy-btn, button.jta-copy-full-btn, button.jta-copy-eq-btn").forEach(btn => btn.remove());
      
      // Clean equations: remove MathML (contains garbage for screen readers)
      clone.querySelectorAll(".katex-mathml").forEach(ml => ml.remove());
      clone.querySelectorAll("mjx-assistive-mml").forEach(ml => ml.remove());
      
      html += clone.outerHTML;
      text += clone.innerText + "\n";
    });

    return { html, text };
  }

  const startIndex = delimiterIndexes[0] + 1;
  const endIndex = delimiterIndexes[delimiterIndexes.length - 1] - 1;

  let html = "";
  let text = "";

  for (let i = startIndex; i <= endIndex; i++) {
    const clone = children[i].cloneNode(true);
    clone.querySelectorAll("button.jta-copy-btn, button.jta-copy-full-btn, button.jta-copy-eq-btn").forEach(btn => btn.remove());
    
    // Clean equations: remove MathML (contains garbage for screen readers)
    clone.querySelectorAll(".katex-mathml").forEach(ml => ml.remove());
    clone.querySelectorAll("mjx-assistive-mml").forEach(ml => ml.remove());
    
    html += clone.outerHTML;
    text += clone.innerText + "\n";
  }

  return { html, text };
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
  // Collect potential equation containers (KaTeX + MathJax)
  const candidates = answerDiv.querySelectorAll(
    ".katex-display, .katex, mjx-container"
  );

  // Filter to outermost nodes only to avoid duplicates on nested structures
  const arr = Array.from(candidates);
  const set = new Set(arr);
  const equations = arr.filter(el => {
    let p = el.parentElement;
    while (p) {
      if (set.has(p)) return false;
      p = p.parentElement;
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
    const btn = document.createElement("button");
    btn.className = "jta-btn jta-copy-eq-btn";
    btn.innerHTML = jtaEquationIconSVG() + '<span>Copy Equation</span>';
    btn.setAttribute("aria-label", "Copy equation");
    btn.title = "Copy this equation";
    btn.style.position = "absolute";
    btn.style.bottom = "4px";
    btn.style.left = "50%";
    btn.style.transform = "translateX(-50%)";
    btn.style.display = "none";
    btn.style.zIndex = "99999";
    btn.style.pointerEvents = "auto";

    btn.onclick = e => {
      e.stopPropagation();
      const { html, text } = getEquationContent(el);
      copyToClipboard(html, text).then(ok => {
        if (ok) {
          jtaMarkCopied(btn, jtaEquationIconSVG(), "Copy Equation");
        } else {
          jtaToast("Copy failed", true);
        }
      });
    };

    el.addEventListener("mouseenter", () => (btn.style.display = "block"));
    el.addEventListener("mouseleave", () => (btn.style.display = "none"));

    el.appendChild(btn);
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
  btn.style.marginTop = "12px";
  btn.style.cursor = "pointer";
  // Ensure button stays at the bottom in flex containers
  btn.style.order = "9999";
  btn.style.alignSelf = "flex-start";

  btn.onclick = () => {
    const { html, text } = extractFullAnswer(answerDiv);
    copyToClipboard(html, text).then(ok => {
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

  // ChatGPT: markdown divs
  document.querySelectorAll("div.markdown").forEach(el => containers.add(el));

  // Gemini: root app and message containers
  document.querySelectorAll("chat-app").forEach(el => containers.add(el));
  document.querySelectorAll("[role='log']").forEach(el => {
    if (el.textContent.length > 100) containers.add(el);
  });

  // Claude: message containers
  document.querySelectorAll("div[class*='message-content']").forEach(el => containers.add(el));

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
  const seen = new Set();
  const containers = findAnswerContainers();

  containers.forEach(answer => {
    // Skip if already processed
    if (seen.has(answer)) return;

    const textLen = answer.textContent?.trim().length || 0;
    // Skip if too small to be a real response
    if (textLen < 100) return;

    // Skip if any parent is already marked as processed
    let parent = answer.parentElement;
    while (parent) {
      if (seen.has(parent)) return;
      parent = parent.parentElement;
    }

    seen.add(answer);
    enhanceAnswer(answer);
  });
}

function enhanceAnswer(answer) {
  // Mark as enhanced for initial processing
  if (!answer.dataset.jtaEnhanced) {
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
    }, 200);
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
  enhanceAnswers();
}
startJtaObserver();
