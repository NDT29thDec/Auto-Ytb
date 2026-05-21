let currentYtTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Khi YouTube báo cáo đã làm xong
  if (message.action === "YT_SUBSCRIBED") {
    // 1. Đóng tab YouTube đó lại
    if (sender.tab && sender.tab.id) {
      chrome.tabs.remove(sender.tab.id);
    }
    
    // 2. Gửi tín hiệu về cho tất cả các tab GoLike đang mở
    chrome.tabs.query({ url: "https://*.golike.net/*" }, (tabs) => {
      for (let tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: "CLICK_COMPLETE" });
      }
    });
    sendResponse({ status: "done" });
  }
});