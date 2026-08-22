// Liara Agent helpdesk bubble (ADR-0006): floating ✦ on *.liara.ir /
// *.liara.cloud that opens the deployed agent in an iframe. No DOM parsing
// of the dashboard.
//
// v0.2: host-owned header strip (the ✕ can never cover the widget's own
// top-bar controls), mascot bubble image, and lia-size support so the
// sidebar ⇄ panel toggle inside the iframe resizes this container too.
const DEFAULT_APP_URL = "https://liara-lia-agent.liara.run";

const APP_URL_KEY = "liaraAgentAppUrl";

function appUrl() {
  return new Promise((resolve) => {
    chrome.storage?.local?.get([APP_URL_KEY], (r) => {
      resolve(String(r?.[APP_URL_KEY] || DEFAULT_APP_URL).replace(/\/$/, ""));
    });
  });
}

(async () => {
  if (window.top !== window) return; // only top frame
  // Mutual exclusion with the in-page embed: docs forks that already load
  // <agent>/embed.js render the #lia-bubble — the extension yields to the
  // in-page Lia instead of stacking a second bubble.
  // MV3 isolated world — DOM check, not window.Lia (page JS is invisible here).
  if (document.getElementById("lia-bubble") || document.getElementById("liara-agent-bubble")) return;
  const base = await appUrl();

  const bubble = document.createElement("button");
  bubble.id = "liara-agent-bubble";
  bubble.title = "ایجنت لیارا";
  bubble.setAttribute("aria-label", "ایجنت لیارا");
  bubble.setAttribute("aria-haspopup", "dialog");
  const mascot = document.createElement("img");
  mascot.src = base + "/lia/idle.png";
  mascot.alt = "";
  mascot.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit";
  bubble.appendChild(mascot);

  let panel = null;
  let iframe = null;

  function closePanel() {
    panel?.remove();
    panel = null;
    iframe = null;
  }

  bubble.addEventListener("click", () => {
    if (panel) {
      closePanel();
      return;
    }

    panel = document.createElement("div");
    panel.id = "liara-agent-panel";
    panel.dir = "rtl";

    // Header strip owned by the extension: close lives OUTSIDE the iframe so
    // it never blocks the widget's refresh/new-chat buttons. No title — the
    // widget header inside the iframe already carries the Lia identity.
    const strip = document.createElement("div");
    strip.id = "liara-agent-strip";
    const close = document.createElement("button");
    close.id = "liara-agent-close";
    close.textContent = "✕";
    close.setAttribute("aria-label", "بستن");
    close.addEventListener("click", closePanel);
    strip.appendChild(close);

    iframe = document.createElement("iframe");
    iframe.src = base + "/chat?embed=1";
    iframe.title = "گفتگو با لیا";

    panel.appendChild(strip);
    panel.appendChild(iframe);

    // Sidebar ⇄ panel toggle inside the iframe resizes this container.
    window.addEventListener("message", (e) => {
      if (!panel || !iframe || e.source !== iframe.contentWindow) return;
      if (e.data && e.data.type === "lia-size") {
        panel.classList.toggle("sidebar", e.data.size === "sidebar");
      }
    });

    document.documentElement.appendChild(panel);
  });

  document.documentElement.appendChild(bubble);
})();
