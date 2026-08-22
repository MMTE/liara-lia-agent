// Lia embed (ADR-0008) — script loaded by docs-site on every page.
// Renders the ✦ bubble + chat panel (agent-origin iframe) and exposes
// window.Lia = { open(prefill?), close() } for the host page to trigger
// the assistant. Vanilla JS + inline styles only; no build step.
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

  function css(el, styles) {
    for (var key in styles) {
      if (Object.prototype.hasOwnProperty.call(styles, key)) el.style[key] = styles[key];
    }
  }

  // --- bubble (bottom-left) ------------------------------------------------
  var bubble = document.createElement("button");
  bubble.id = "lia-bubble";
  bubble.type = "button";
  bubble.title = "پرسیدن از لیا";
  bubble.setAttribute("aria-label", "پرسیدن از لیا");
  bubble.setAttribute("aria-haspopup", "dialog");
  var mascot = document.createElement("img");
  mascot.src = origin + "/lia/idle.png";
  mascot.alt = "";
  css(mascot, { width: "100%", height: "100%", objectFit: "cover", display: "block" });
  bubble.appendChild(mascot);
  css(bubble, {
    position: "fixed",
    left: "20px",
    bottom: "20px",
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    border: "2px solid #00d4ff",
    background: "#121212",
    padding: "0",
    margin: "0",
    cursor: "pointer",
    overflow: "hidden",
    display: "block",
    boxShadow: "0 8px 24px rgba(0,0,0,.35)",
    zIndex: String(Z_BUBBLE),
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
    if (backdrop) {
      backdrop.remove();
      backdrop = null;
    }
    if (panel) {
      panel.remove();
      panel = null;
    }
    iframe = null;
    iframeLoaded = false;
    pendingPrefill = null;
    stopDelivery();
    document.removeEventListener("keydown", onKeydown);
  }

  var retryTimer = 0;
  var retryDeadline = 0;

  function stopDelivery() {
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = 0;
    }
  }

  function deliverPrefill() {
    if (!pendingPrefill || !iframeLoaded || !iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({ type: "lia-prefill", text: pendingPrefill }, origin);
    } catch (err) {
      /* cross-origin hiccup — non-fatal, user can still type */
    }
  }

  // Retry until the chat inside the iframe acknowledges (its message listener
  // registers at hydration, which can lag the iframe load event), then stop.
  // Without an ack (older agent build), give up after 15s rather than retry forever.
  function startDelivery() {
    stopDelivery();
    deliverPrefill();
    retryDeadline = Date.now() + 15000;
    retryTimer = setInterval(function () {
      if (!pendingPrefill || !panel || Date.now() > retryDeadline) {
        stopDelivery();
        return;
      }
      deliverPrefill();
    }, 600);
  }

  window.addEventListener("message", function (e) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    if (e.data && e.data.type === "lia-prefill-ack") {
      pendingPrefill = null;
      stopDelivery();
    }
  });

  function open(prefill) {
    if (typeof prefill === "string" && prefill.trim()) pendingPrefill = prefill;
    if (panel) {
      startDelivery(); // already open — deliver the (possibly new) prompt
      return;
    }

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
    });

    iframe = document.createElement("iframe");
    iframe.src = origin + "/chat?embed=1";
    iframe.title = "گفتگو با لیا";
    css(iframe, { width: "100%", height: "100%", border: "none", display: "block" });
    iframe.addEventListener("load", function () {
      iframeLoaded = true;
      startDelivery();
    });
    panel.appendChild(iframe);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.id = "lia-close";
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "بستن");
    css(closeBtn, {
      position: "absolute",
      top: "8px",
      left: "8px",
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      border: "none",
      background: "rgba(0,0,0,.55)",
      color: "#fff",
      fontSize: "13px",
      lineHeight: "28px",
      padding: "0",
      cursor: "pointer",
      zIndex: "1",
    });
    closeBtn.addEventListener("click", close);
    panel.appendChild(closeBtn);

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
    document.body.appendChild(bubble);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
