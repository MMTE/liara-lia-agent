// Lia embed (ADR-0008) — script loaded by docs-site on every page.
// Renders the ✦ bubble, the per-page ask pill beside it, the selection
// ask-bar (highlight text → «پرسیدن از لیا درباره این متن»), and the chat
// panel (agent-origin iframe). Exposes window.Lia = { open(prefill?),
// close() } for the host page. Vanilla JS + a small injected <style>; no
// build step.
//
// Origin resolution: <script src="<origin>/embed.js" data-origin="<origin>">
// — falls back to the host page's own origin when data-origin is unset.
(function () {
  "use strict";

  if (window.top !== window) return; // top frame only
  if (window.Lia && window.Lia._embed) return; // idempotent

  var current = document.currentScript;
  var origin = current && current.dataset ? current.dataset.origin : "";
  origin = origin ? origin.replace(/\/+$/, "") : window.location.origin;

  var Z_BUBBLE = 2147483000;
  var Z_BACKDROP = 2147483001;
  var Z_PANEL = 2147483002;
  var Z_SELECTION = 2147483003;

  function css(el, styles) {
    for (var key in styles) {
      if (Object.prototype.hasOwnProperty.call(styles, key)) el.style[key] = styles[key];
    }
  }

  // --- injected styles (media queries can't be done inline) ---------------
  var style = document.createElement("style");
  style.id = "lia-embed-style";
  style.textContent =
    "#lia-launcher{position:fixed;left:20px;bottom:20px;display:flex;align-items:center;gap:10px;direction:rtl;z-index:" +
    Z_BUBBLE +
    ";}" +
    "#lia-bubble{width:52px;height:52px;border-radius:50%;border:2px solid #00d4ff;background:#121212;padding:0;margin:0;cursor:pointer;overflow:hidden;display:block;box-shadow:0 8px 24px rgba(0,0,0,.35);}" +
    "#lia-bubble img{width:100%;height:100%;object-fit:cover;display:block;}" +
    "#lia-ask{display:inline-flex;align-items:center;gap:6px;border:none;border-radius:999px;background:#00d4ff;color:#0c1214;padding:9px 14px;font:700 13px/1 inherit;font-family:inherit;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:background .15s;white-space:nowrap;}" +
    "#lia-ask:hover{background:#00b8dd;}" +
    "#lia-ask .lia-ask-star{color:#0c5a73;}" +
    "@media (max-width:640px){#lia-ask{padding:9px 11px;}#lia-ask .lia-ask-label{display:none}}" +
    "#lia-selection{position:fixed;direction:rtl;display:flex;align-items:center;gap:2px;background:#161b1e;border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 10px 32px rgba(0,0,0,.45);padding:3px;z-index:" +
    Z_SELECTION +
    ";opacity:0;transition:opacity .12s;pointer-events:none;}" +
    "#lia-selection.lia-on{opacity:1;pointer-events:auto;}" +
    "#lia-selection button{border:none;background:transparent;color:#e8eaed;font:500 12.5px/1.6 inherit;font-family:inherit;padding:5px 9px;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;}" +
    "#lia-selection button:hover{background:rgba(255,255,255,.08);color:#00d4ff;}" +
    "#lia-selection .lia-sep{width:1px;align-self:stretch;margin:4px 0;background:rgba(255,255,255,.12);}" +
    "#lia-selection .lia-copy{color:#9aa0a6;}" +
    "#lia-selection .lia-copy:hover{color:#e8eaed;}";
  document.head && document.head.appendChild(style);

  // --- launcher: bubble + per-page ask pill (bottom-left) ------------------
  var launcher = document.createElement("div");
  launcher.id = "lia-launcher";

  var bubble = document.createElement("button");
  bubble.id = "lia-bubble";
  bubble.type = "button";
  bubble.title = "پرسیدن از لیا";
  bubble.setAttribute("aria-label", "پرسیدن از لیا");
  bubble.setAttribute("aria-haspopup", "dialog");
  var mascot = document.createElement("img");
  mascot.src = origin + "/lia/idle.png";
  mascot.alt = "";
  bubble.appendChild(mascot);

  /** Docs page topic from the page <title> (same normalization the old
   *  AskLia.jsx pill used). */
  function pageTopic() {
    var raw = document.title || "";
    var t = raw
      .replace(/\s*[-|]\s*مستندات لیارا.*$/, "")
      .replace(/\s*[-|–]\s*لیارا.*$/, "")
      .replace(/^مستندات\s+/, "")
      .trim();
    return t || raw.trim() || "این صفحه";
  }

  var askPill = document.createElement("button");
  askPill.id = "lia-ask";
  askPill.type = "button";
  askPill.dir = "rtl";
  askPill.title = "پرسیدن از لیا درباره این صفحه";
  askPill.innerHTML =
    '<span class="lia-ask-star">✦</span><span class="lia-ask-label">پرسیدن از لیا درباره این صفحه</span>';
  askPill.addEventListener("click", function () {
    open("درباره «" + pageTopic() + "» توضیح بده — نکات مهم و خطاهای رایج را بگو");
  });

  launcher.appendChild(askPill);
  launcher.appendChild(bubble);

  // --- selection ask-bar (ChatGPT-style highlight affordance) --------------
  var selBar = document.createElement("div");
  selBar.id = "lia-selection";
  selBar.dir = "rtl";
  selBar.setAttribute("role", "toolbar");
  selBar.setAttribute("aria-label", "پرسیدن از لیا درباره متن انتخاب‌شده");
  var selAsk = document.createElement("button");
  selAsk.type = "button";
  selAsk.innerHTML = "✦ پرسیدن از لیا درباره این متن";
  var selSep = document.createElement("span");
  selSep.className = "lia-sep";
  var selCopy = document.createElement("button");
  selCopy.type = "button";
  selCopy.className = "lia-copy";
  selCopy.textContent = "کپی";
  selBar.appendChild(selAsk);
  selBar.appendChild(selSep);
  selBar.appendChild(selCopy);
  document.body && document.body.appendChild(selBar);

  var selRange = null;
  var selTimer = 0;

  function hideSelBar() {
    selBar.classList.remove("lia-on");
    selRange = null;
  }

  function ourUi(node) {
    if (!node || node === document) return false;
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return false;
    return !!(el.closest && el.closest("#lia-launcher,#lia-panel,#lia-selection"));
  }

  function positionSelBar() {
    if (!selRange) return;
    var rect;
    try {
      rect = selRange.getBoundingClientRect();
    } catch (e) {
      hideSelBar();
      return;
    }
    selBar.classList.add("lia-on");
    var w = selBar.offsetWidth || 240;
    var h = selBar.offsetHeight || 34;
    var vw = document.documentElement.clientWidth;
    // RTL text: anchor the bar to the selection's right edge, above it.
    var x = Math.min(Math.max(rect.right - w, 8), Math.max(vw - w - 8, 8));
    var y = rect.top - h - 8;
    if (y < 8) y = Math.min(rect.bottom + 8, window.innerHeight - h - 8);
    css(selBar, { left: Math.round(x) + "px", top: Math.round(y) + "px" });
  }

  function evaluateSelection() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      hideSelBar();
      return;
    }
    var text = String(sel.toString() || "").trim();
    if (text.length < 3 || ourUi(sel.anchorNode)) {
      hideSelBar();
      return;
    }
    selRange = sel.getRangeAt(0).cloneRange();
    positionSelBar();
  }

  document.addEventListener(
    "selectionchange",
    function () {
      clearTimeout(selTimer);
      selTimer = setTimeout(evaluateSelection, 180);
    },
  );
  document.addEventListener("mouseup", function (e) {
    if (ourUi(e.target)) return;
    clearTimeout(selTimer);
    selTimer = setTimeout(evaluateSelection, 30);
  });
  window.addEventListener(
    "scroll",
    function () {
      if (selRange) requestAnimationFrame(positionSelBar);
    },
    { passive: true, capture: true },
  );
  window.addEventListener("resize", function () {
    if (selRange) requestAnimationFrame(positionSelBar);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideSelBar();
  });

  selAsk.addEventListener("click", function () {
    if (!selRange) return;
    var text = String(selRange.toString() || "").trim();
    hideSelBar();
    var sel2 = window.getSelection && window.getSelection();
    sel2 && sel2.removeAllRanges && sel2.removeAllRanges();
    if (text) {
      open(
        "این بخش از «" + pageTopic() + "» را توضیح بده:\n«" + text + "»\nیعنی دقیقاً چه چیزی می‌گوید و چه زمانی به آن نیاز دارم؟"
      );
    }
  });
  selCopy.addEventListener("click", function () {
    if (!selRange) return;
    var text = String(selRange.toString() || "").trim();
    hideSelBar();
    if (navigator.clipboard && text) navigator.clipboard.writeText(text).catch(function () {});
  });

  // --- panel state ----------------------------------------------------------
  var panel = null;
  var backdrop = null;
  var iframe = null;
  var iframeLoaded = false;
  var pendingPrefill = null;

  function onKeydown(e) {
    if (e.key === "Escape") close();
  }

  function close() {
    if (panel) {
      panel.remove();
      panel = null;
    }
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
    iframe = null;
    iframeLoaded = false;
    stopDelivery();
    document.removeEventListener("keydown", onKeydown);
    askPill.style.display = "";
  }

  var retryTimer = 0;
  var retryDeadline = 0;

  function stopDelivery() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = 0;
    }
  }

  function deliverPrefill() {
    if (!pendingPrefill || !iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "lia-prefill", text: pendingPrefill }, origin);
  }

  // Retry until the chat inside the iframe acknowledges (its message listener
  // registers at hydration, which can lag the iframe load event), then stop.
  // Without an ack (older agent build), give up after 15s rather than retry forever.
  function startDelivery() {
    if (!pendingPrefill) return;
    stopDelivery();
    retryDeadline = Date.now() + 15000;
    deliverPrefill();
    retryTimer = setInterval(function () {
      if (!pendingPrefill || Date.now() > retryDeadline) return stopDelivery();
      deliverPrefill();
    }, 350);
  }

  window.addEventListener("message", function (e) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    if (e.data && e.data.type === "lia-prefill-ack") {
      pendingPrefill = null;
      stopDelivery();
    }
    // Sidebar ⇄ panel toggle from inside the iframe: resize the host
    // container. Sidebar pins flush to the left edge at full height.
    if (e.data && e.data.type === "lia-size" && panel) {
      if (e.data.size === "sidebar") {
        css(panel, {
          left: "0",
          top: "0",
          bottom: "0",
          width: "min(560px, 100vw)",
          height: "auto",
          borderRadius: "0",
        });
      } else {
        css(panel, {
          left: "20px",
          top: "auto",
          bottom: "88px",
          width: "min(420px, calc(100vw - 24px))",
          height: "min(660px, 78vh)",
          borderRadius: "16px",
        });
      }
    }
  });

  function open(prefill) {
    if (typeof prefill === "string" && prefill.trim()) pendingPrefill = prefill;
    if (panel) {
      startDelivery(); // already open — deliver the (possibly new) prompt
      return;
    }
    hideSelBar();
    askPill.style.display = "none";

    panel = document.createElement("div");
    panel.id = "lia-panel";
    panel.dir = "rtl";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "گفتگو با لیا");
    css(panel, {
      position: "fixed",
      left: "20px",
      bottom: "88px",
      width: "min(420px, calc(100vw - 24px))",
      height: "min(660px, 78vh)",
      background: "#1e1e1e",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 24px 64px rgba(0,0,0,.45)",
      zIndex: String(Z_PANEL),
      display: "flex",
      flexDirection: "column",
    });
    backdrop = document.createElement("div");
    backdrop.id = "lia-backdrop";
    css(backdrop, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      background: "rgba(0,0,0,.35)",
      zIndex: String(Z_BACKDROP),
    });
    backdrop.addEventListener("click", close);
    // Host-owned handle strip: the ✕ lives OUTSIDE the iframe so it can
    // never cover the widget's own top-bar controls (refresh/new chat).
    // No title — the widget header inside the iframe already carries the
    // Lia identity; a strip label would repeat it.
    var strip = document.createElement("div");
    strip.id = "lia-strip";
    css(strip, {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      flex: "0 0 auto",
      height: "30px",
      padding: "0 6px",
      background: "#161b1e",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      direction: "rtl",
    });

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.id = "lia-close";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "بستن");
    css(closeBtn, {
      width: "22px",
      height: "22px",
      borderRadius: "50%",
      border: "none",
      background: "rgba(255,255,255,.08)",
      color: "#fff",
      fontSize: "12px",
      lineHeight: "22px",
      padding: "0",
      cursor: "pointer",
    });
    closeBtn.addEventListener("click", close);
    strip.appendChild(closeBtn);
    panel.appendChild(strip);

    iframe = document.createElement("iframe");
    iframe.src = origin + "/chat?embed=1";
    iframe.title = "گفتگو با لیا";
    css(iframe, { width: "100%", flex: "1 1 auto", border: "none", display: "block" });
    iframe.addEventListener("load", function () {
      iframeLoaded = true;
      startDelivery();
    });
    panel.appendChild(iframe);

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    document.addEventListener("keydown", onKeydown);
  }

  bubble.addEventListener("click", function () {
    if (panel) close();
    else open();
  });

  window.Lia = { _embed: true, open: open, close: close };

  function mount() {
    document.body.appendChild(launcher);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
