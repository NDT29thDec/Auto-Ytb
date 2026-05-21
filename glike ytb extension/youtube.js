console.log("[YouTube] Script đã chạy, bắt đầu tính giờ tự đóng tab...");

const wait = (ms) => new Promise(res => setTimeout(res, ms));

function simulateClick(el) {
    el.style.border = "3px solid red";
    el.click();
}

async function autoSub() {
    await wait(3500); // Đợi giao diện YouTube load xong

    try {
        // Tìm nút đăng ký trong mọi ngóc ngách của YouTube
        let buttons = document.querySelectorAll('button, yt-button-shape button');
        for (let btn of buttons) {
            let text = (btn.innerText || btn.textContent || "").toLowerCase().trim();
            if (text.includes('đăng ký') || text.includes('subscribe')) {
                console.log("[YouTube] Đã tìm thấy nút Đăng ký, click!");
                simulateClick(btn);
                await wait(2000); // Chờ 2s để YouTube lưu data
                break;
            }
        }
    } catch (e) {
        console.log("[YouTube] Lỗi kịch bản, bỏ qua.");
    } finally {
        // Luôn báo về Service Worker để đóng tab
        chrome.runtime.sendMessage({ action: "YT_SUBSCRIBED" });
    }
}

// Khởi chạy tác vụ
autoSub();

// CƠ CHẾ BẢO HIỂM: Tự động đóng tab sau tối đa 8 giây bất kể mọi lỗi
setTimeout(() => {
    chrome.runtime.sendMessage({ action: "YT_SUBSCRIBED" });
}, 8000);