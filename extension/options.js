// Options page: persist the agent origin the content script opens.
const DEFAULT_APP_URL = "https://liara-lia-agent.liara.run";
const APP_URL_KEY = "liaraAgentAppUrl";

const input = document.getElementById("url");
const save = document.getElementById("save");
const status = document.getElementById("status");

chrome.storage.local.get([APP_URL_KEY], (r) => {
  input.value = r?.[APP_URL_KEY] || DEFAULT_APP_URL;
});

save.addEventListener("click", () => {
  let value = input.value.trim().replace(/\/+$/, "");
  let ok = value.startsWith("https://") || value.startsWith("http://");
  if (ok) {
    try {
      value = new URL(value).origin;
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    status.textContent = "نشانی معتبر نیست (مثل https://example.liara.ir)";
    status.className = "err";
    return;
  }
  chrome.storage.local.set({ [APP_URL_KEY]: value }, () => {
    status.textContent = "ذخیره شد ✓";
    status.className = "";
  });
});
