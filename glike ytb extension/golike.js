console.log("--- GOLIKE TOOL V15 (DỘI BOM DOM TREE) ---");

let debugPanel = document.createElement('div');
debugPanel.style.cssText = "position:fixed; bottom:20px; left:20px; background:rgba(0,0,0,0.85); color:#00ffff; padding:15px; z-index:999999; border-radius:8px; font-family:monospace; font-size:14px; pointer-events:none; border: 1px solid #00ffff;";
document.body.appendChild(debugPanel);

function setState(state) {
    chrome.storage.local.set({ golikeState: state });
}

function logDebug(msg) {
    debugPanel.innerHTML = msg.replace(/\n/g, '<br>');
}

function clearBorders() {
    document.querySelectorAll('[data-auto-border]').forEach(e => {
        e.style.border = '';
        e.style.boxShadow = '';
        e.removeAttribute('data-auto-border');
    });
}

// HÀM DỘI BOM SỰ KIỆN: Đảm bảo 100% không trượt
function forceClick(el, color = "#ff9900") {
    if (!el) return;
    clearBorders();
    
    el.style.border = `4px solid ${color}`;
    el.style.boxShadow = `0 0 15px ${color}`;
    el.setAttribute('data-auto-border', 'true');

    // Gom tất cả các thẻ có liên quan từ trong ra ngoài (Vỏ, Lõi, Cha, Ông nội)
    let targets = [
        el,
        el.firstElementChild,
        el.parentElement,
        el.parentElement ? el.parentElement.parentElement : null
    ].filter(Boolean); // Lọc bỏ những thẻ không tồn tại
    
    // Lọc trùng lặp
    targets = [...new Set(targets)];

    // Bắn phá sự kiện vào toàn bộ các thẻ này
    targets.forEach(t => {
        try { t.click(); } catch(e) {}
        
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(ev => {
            t.dispatchEvent(new MouseEvent(ev, { 
                bubbles: true, 
                cancelable: true, 
                view: window
            }));
        });
    });
}

// HÀM TÌM NÚT (Đã bỏ hàm closest để bắt chính xác thẻ chứa chữ)
function findBtn(keyword, flexibleSize = false) {
    const els = Array.from(document.querySelectorAll('div, button, a, span, label')).reverse();
    keyword = keyword.toLowerCase();

    for (let el of els) {
        let text = (el.innerText || el.textContent || "").toLowerCase().trim();
        
        if (text === keyword || (text.includes(keyword) && text.length <= keyword.length + 30)) {
            let rect = el.getBoundingClientRect();
            let minHeight = flexibleSize ? 15 : 35;
            let minWidth = flexibleSize ? 30 : 100;

            if (rect.height >= minHeight && rect.width >= minWidth) {
                // Trả về chính thẻ này để hàm forceClick tự lo việc dội bom lên các thẻ cha
                return el;
            }
        }
    }
    return null;
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "CLICK_COMPLETE") {
        setState("DONE"); 
    }
});

let waitFormTimeout = 0;

setInterval(() => {
    chrome.storage.local.get(['golikeState'], (res) => {
        let state = res.golikeState || "IDLE";
        let bodyString = document.body.textContent.toLowerCase(); 
        
        let btnOk = findBtn("ok");
        let btnHoanThanh = findBtn("hoàn thành");
        let btnYoutube = findBtn("youtube");
        let btnNhanJob = findBtn("nhận job");
        let btnBaoLoi = findBtn("báo lỗi");
        
        let btnGuiBaoCao = findBtn("gửi báo cáo", true) || findBtn("gửi", true);
        let btnLyDo = findBtn("tôi đã làm job này rồi", true) || findBtn("đã làm", true);
        
        let log = `=== BẢNG ĐIỀU KHIỂN V15 ===\n`;
        log += `Trạng Thái: [ ${state} ]\n`;
        log += `Nút: Xong(${!!btnHoanThanh}) | YT(${!!btnYoutube}) | Job(${!!btnNhanJob})\n`;
        log += `Báo lỗi: OK(${!!btnOk}) | Nút báo(${!!btnBaoLoi}) | Gửi(${!!btnGuiBaoCao})\n`;
        log += `--------------------------\n`;

        // 1. POPUP LỖI TRÙNG LẶP
        if (btnOk && bodyString.includes("đã làm công việc")) {
            log += "=> Quyết định: BẤM OK ĐÓNG POPUP LỖI !";
            logDebug(log);
            forceClick(btnOk, "#ff0000"); 
            setState("NEED_REPORT");
            return; 
        }

        // 2. CẦN BẤM NÚT BÁO LỖI
        if (state === "NEED_REPORT" && btnBaoLoi && !btnOk) {
            log += "=> Quyết định: BẤM NÚT BÁO LỖI VÀ ĐỨNG ĐỢI";
            logDebug(log);
            forceClick(btnBaoLoi, "#ff0000");
            setState("WAITING_FORM"); 
            waitFormTimeout = 0;
            return;
        }

        // 3. ĐANG ĐỨNG ĐỢI FORM MỞ
        if (state === "WAITING_FORM") {
            if (btnGuiBaoCao) {
                log += "=> Quyết định: FORM ĐÃ MỞ, CHUẨN BỊ ĐIỀN!";
                logDebug(log);
                setState("SUBMITTING_ERROR"); 
            } else {
                waitFormTimeout++;
                log += `=> Quyết định: Đang kiên nhẫn đợi Form mở... (${waitFormTimeout}/5)`;
                logDebug(log);
                
                // NẾU NÚT BỊ KẸT (Hụt click), BẤM LẠI SAU 10 GIÂY
                if (waitFormTimeout > 5) {
                    setState("NEED_REPORT");
                }
            }
            return;
        }

        // 4. ĐIỀN FORM VÀ GỬI
        if (state === "SUBMITTING_ERROR" && btnGuiBaoCao) {
            log += "=> Quyết định: ĐIỀN FORM VÀ GỬI BÁO LỖI";
            logDebug(log);
            
            if (btnLyDo) forceClick(btnLyDo, "#ff0000");
            
            setTimeout(() => {
                forceClick(btnGuiBaoCao, "#ff0000");
                setTimeout(() => setState("IDLE"), 1500); 
            }, 1000);
            return;
        }

        // 5. POPUP THÀNH CÔNG (JOB NGON)
        if (btnOk && bodyString.includes("thành công") && state !== "NEED_REPORT") {
            log += "=> Quyết định: BẤM OK (HÚP TIỀN)";
            logDebug(log);
            forceClick(btnOk);
            setState("IDLE");
            return; 
        }

        // KHÓA AN TOÀN KHI CÓ POPUP BẤT KỲ
        if (btnOk) {
            log += "=> Quyết định: Đang xử lý Popup, tạm dừng nền...";
            logDebug(log);
            return;
        }

        // 6. NÚT HOÀN THÀNH JOB
        if (state === "DONE" && btnHoanThanh) {
            log += "=> Quyết định: BẤM HOÀN THÀNH JOB";
            logDebug(log);
            forceClick(btnHoanThanh);
            setState("WAITING_VERIFY");
            return;
        }

        // 7. MỞ YOUTUBE LÀM JOB
        if (btnHoanThanh && btnYoutube && state !== "WAITING_YT" && state !== "DONE" && !state.includes("REPORT") && state !== "WAITING_FORM") {
            log += "=> Quyết định: MỞ TAB YOUTUBE";
            logDebug(log);
            setState("WAITING_YT");
            forceClick(btnYoutube);
            return;
        }

        // 8. NHẬN JOB MỚI TỪ TRANG CHỦ
        if (btnNhanJob && !btnHoanThanh && !btnGuiBaoCao) {
            log += "=> Quyết định: NHẬN JOB MỚI";
            logDebug(log);
            setState("IDLE"); 
            forceClick(btnNhanJob);
            return;
        }
        
        log += "=> Quyết định: Đang quét & chờ phản hồi...";
        logDebug(log);
    });
}, 2000);