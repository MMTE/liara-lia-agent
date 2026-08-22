// Toolbar action opens the options page (agent URL configuration).
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});
