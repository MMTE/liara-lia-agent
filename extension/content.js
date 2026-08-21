// Liara Agent helpdesk bubble (ADR-0006): floating ✦ on *.liara.ir that opens
// the deployed agent in an iframe. No DOM parsing of the dashboard.
const DEFAULT_APP_URL = "https://liara-agent.iran.liara.ir"; // set after deploy

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
  // <agent>/embed.js expose window.Liri — the extension yields to the
  // in-page Liri instead of stacking a second bubble.
  if (window.Liri) return;
  const base = await appUrl();

  const bubble = document.createElement("button");
  bubble.id = "liara-agent-bubble";
  bubble.title = "ایجنت لیارا";
  bubble.textContent = "✦";

  let panel = null;

  function closePanel() {
    panel?.remove();
    panel = null;
  }

  bubble.addEventListener("click", () => {
    if (panel) {
      closePanel();
      return;
    }
    panel = document.createElement("div");
    panel.id = "liara-agent-panel";
    const iframe = document.createElement("iframe");
    iframe.src = `${base}/?embed=1`;
    iframe.title = "Liara Agent";
    panel.appendChild(iframe);

    const close = document.createElement("button");
    close.id = "liara-agent-close";
    close.textContent = "✕";
    close.addEventListener("click", closePanel);
    panel.appendChild(close);

    document.documentElement.appendChild(panel);
  });

  document.documentElement.appendChild(bubble);
})();
