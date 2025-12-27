/*********************************
 * CLIPBOARD (HTML + TEXT)
 *********************************/
function copyToClipboard(html, text) {
  navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" })
    })
  ]);
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

  return top > 0 || bottom > 0;
}

/*********************************
 * BLOCK = BETWEEN TWO DELIMITERS
 *********************************/
function getDelimiterBlocks(answerDiv) {
  const children = Array.from(answerDiv.children);
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

  // Clone and strip any extension-added buttons before serializing
  block.forEach(el => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll("button.jta-copy-btn, button.jta-copy-full-btn").forEach(btn => btn.remove());
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
  const blocks = getDelimiterBlocks(answerDiv);

  blocks.forEach(block => {
    const anchor = block[0];
    if (!anchor || anchor.dataset.jtaBlockReady) return;

    anchor.dataset.jtaBlockReady = "true";
    anchor.style.position = "relative";

    const btn = document.createElement("button");
    btn.textContent = "📋 Copy";
    btn.className = "jta-copy-btn"; // identify for cleanup
    btn.setAttribute("data-jta", "block");
    btn.title = "Copy this block";
    btn.style.position = "absolute";
    btn.style.top = "0";
    btn.style.right = "0";
    btn.style.display = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.zIndex = "999";

    const { html, text } = blockToContent(block);

    btn.onclick = e => {
      e.stopPropagation();
      copyToClipboard(html, text);
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
 *********************************/
function extractFullAnswer(answerDiv) {
  const children = Array.from(answerDiv.children);

  // Find all delimiters
  const delimiterIndexes = children
    .map((el, i) => (isDelimiter(el) ? i : -1))
    .filter(i => i !== -1);

  // If less than 2 delimiters, fallback to old behavior
  if (delimiterIndexes.length < 2) {
    let html = "";
    let text = "";

    children.forEach(el => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll("button.jta-copy-btn, button.jta-copy-full-btn").forEach(btn => btn.remove());
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
    clone.querySelectorAll("button.jta-copy-btn, button.jta-copy-full-btn").forEach(btn => btn.remove());
    html += clone.outerHTML;
    text += clone.innerText + "\n";
  }

  return { html, text };
}


function addFullAnswerCopy(answerDiv) {
  if (answerDiv.dataset.jtaFullCopy) return;
  answerDiv.dataset.jtaFullCopy = "true";

  const btn = document.createElement("button");
  btn.textContent = "📄 Copy Main Answer";
  btn.className = "jta-copy-full-btn"; // identify for cleanup
  btn.setAttribute("data-jta", "full");
  btn.style.marginTop = "12px";
  btn.style.cursor = "pointer";

  btn.onclick = () => {
    const { html, text } = extractFullAnswer(answerDiv);
    copyToClipboard(html, text);
  };

  answerDiv.appendChild(btn);
}

/*********************************
 * BOOTSTRAP
 *********************************/
function enhanceAnswers() {
  document.querySelectorAll("div.markdown").forEach(answer => {
    enableBlockCopy(answer);
    addFullAnswerCopy(answer);
  });
}

// ChatGPT loads content dynamically
setInterval(enhanceAnswers, 1500);
