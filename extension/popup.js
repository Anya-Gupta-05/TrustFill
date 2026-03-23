let totalQuestions = [];

// 1. Listen for ALL incoming broadcasts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const scanBtn = document.getElementById("scan-btn");
    const fillBtn = document.getElementById("autofill-btn");
    const statusDiv = document.getElementById("status");

    // Catch Scan Results from content.js
    if (request.action === "scan_results") {
        totalQuestions = request.form_data; 
        if (totalQuestions.length > 0) {
            if (scanBtn) scanBtn.style.display = "none"; 
            if (fillBtn) fillBtn.style.display = "block"; 
            if (statusDiv) statusDiv.innerHTML = `✅ Found <b>${totalQuestions.length}</b> questions.`;
        }
    }
    
    // Catch Live Progress Updates from background.js
    if (request.action === "update_status") {
        if (statusDiv) {
            statusDiv.innerText = request.text;
            statusDiv.style.display = "block";
            
            // Success State: If the text says "Finished", reset the button!
            if (request.text.includes("Finished")) {
                if (fillBtn) {
                    fillBtn.innerText = "Done ✨";
                    fillBtn.style.backgroundColor = "#10b981"; // Turn it green
                }
            }
            // 🚨 Error State for API Limits
            else if (request.text.includes("EXHAUSTED")) {
                statusDiv.style.color = "#ef4444"; // Make text red
                statusDiv.style.fontWeight = "bold";
                if (fillBtn) {
                    fillBtn.innerText = "Limit Reached";
                    fillBtn.style.backgroundColor = "#ef4444"; // Turn button red
                }
            }
        }
    }
});

// 2. Scan Button Click
document.getElementById("scan-btn").addEventListener("click", async () => {
    totalQuestions = []; 
    let statusDiv = document.getElementById("status");
    if (statusDiv) statusDiv.innerText = "Analyzing page structure...";
    
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: "scan_page" });
});

// 3. Auto-Fill Button Click
document.getElementById("autofill-btn").addEventListener("click", async () => {
    const fillBtn = document.getElementById("autofill-btn");
    const emailInput = document.getElementById("manager-email");
    
    // Grab the email, or default to a placeholder if they forgot to type it
    const targetEmail = emailInput && emailInput.value ? emailInput.value : "manager@company.com";

    if (fillBtn) {
        fillBtn.innerText = "AI is typing...";
        fillBtn.disabled = true;
    }
    
    // Send the questions AND the manager's email to the Background Worker
    chrome.runtime.sendMessage({
        action: "start_autofill",
        form_data: totalQuestions,
        manager_email: targetEmail
    });
});

// 4. Clear Memory Button Click
document.getElementById("clear-btn").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send the wipe command to the webpage
    chrome.tabs.sendMessage(tab.id, { action: "clear_memory" });
    
    // Reset our popup UI
    let statusDiv = document.getElementById("status");
    if (statusDiv) {
        statusDiv.innerText = "Memory wiped. Ready to scan!";
        statusDiv.style.color = "#374151";
    }
    
    let autofillBtn = document.getElementById("autofill-btn");
    let scanBtn = document.getElementById("scan-btn");
    if (autofillBtn) autofillBtn.style.display = "none";
    if (scanBtn) scanBtn.style.display = "block";
});