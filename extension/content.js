console.log("🟢 TrustFill Content Script Injected & Waiting!");

// We create a unique backup key based on the website's URL so we don't mix up different forms!
const BACKUP_KEY = "trustfill_backup_" + window.location.pathname;

// --- 1. SCRAPER LOGIC (Unchanged) ---
function gatherContextClues(field) {
    if (window.location.href.includes("docs.google.com/forms") || field.closest('form[action*="docs.google.com/forms"]')) {
        let container = field.closest('div[role="listitem"]');
        if (container) {
            let heading = container.querySelector('[role="heading"]');
            if (heading) return heading.innerText.trim();
        }
    }
    let td = field.closest('td');
    if (td) {
        let tr = td.closest('tr');
        if (tr) {
            let rowText = [];
            tr.querySelectorAll('td, th').forEach(cell => {
                if (!cell.contains(field)) {
                    let cellText = (cell.innerText || cell.textContent || "").trim();
                    if (cellText) rowText.push(cellText);
                }
            });
            if (rowText.length > 0) return rowText.join(" - "); 
        }
    }
    if (field.id) {
        let exactLabel = document.querySelector(`label[for="${field.id}"]`);
        if (exactLabel && exactLabel.innerText) return exactLabel.innerText.trim();
    }
    if (field.closest('label') && field.closest('label').innerText) {
        return field.closest('label').innerText.replace(field.value, '').trim();
    }
    let prevNode = field.previousSibling;
    for (let i = 0; i < 5; i++) {
        if (prevNode) {
            let txt = (prevNode.textContent || "").trim();
            if (txt && prevNode.nodeName !== 'SCRIPT' && prevNode.nodeName !== 'STYLE') {
                return txt.substring(0, 200); 
            }
            prevNode = prevNode.previousSibling;
        }
    }
    if (field.parentElement) {
        let parentText = (field.parentElement.innerText || field.parentElement.textContent || "").trim();
        if (field.value) parentText = parentText.replace(field.value, '');
        if (parentText) return parentText.substring(0, 200);
    }
    if (field.getAttribute('aria-label')) return field.getAttribute('aria-label').trim();
    if (field.placeholder) return field.placeholder.trim();
    if (field.name) return `Field Name: ${field.name}`;
    return "Unknown Field";
}

function scrapeQuestionnaire() {
    let extractedData = [];
    let processedNames = new Set(); 
    
    let formFields = document.querySelectorAll(`
        input:not([type="hidden"]):not([type="submit"]):not([type="button"]), 
        textarea, select
    `);

    const junkKeywords = ["search", "newsletter", "subscribe", "password", "login"];

    formFields.forEach((field, index) => {
        if (field.style.display === "none" || field.style.visibility === "hidden") return;

        if (field.type === "radio" || field.type === "checkbox") {
            if (field.name && processedNames.has(field.name)) return;
            if (field.name) processedNames.add(field.name);
        }

        let isAlreadyFilled = false;
        if (field.type === "radio" || field.type === "checkbox") {
            let radios = field.name ? document.getElementsByName(field.name) : [field];
            isAlreadyFilled = Array.from(radios).some(r => r.checked);
        } else if (field.tagName === "SELECT") {
            isAlreadyFilled = field.value && field.value.trim() !== "" && field.selectedIndex > 0;
        } else {
            isAlreadyFilled = field.value && field.value.trim() !== "";
        }

        if (isAlreadyFilled) return; 

        let questionOrClues = gatherContextClues(field);
        let lowerClues = questionOrClues.toLowerCase();
        let isJunk = junkKeywords.some(keyword => lowerClues.includes(keyword) || (field.id && field.id.toLowerCase().includes(keyword)));

        if (questionOrClues === "Unknown Field" || isJunk) return;

        // 🚨 THE GHOST ID FIX IS BACK 🚨
        let finalId = field.id || field.name;
        if (!finalId) {
            finalId = `trustfill_unnamed_${index}`;
            field.id = finalId; // We MUST physically stamp it onto the webpage!
        }

        extractedData.push({
            field_id: finalId, // Tell Python the exact ID
            question: questionOrClues,
            element_type: field.tagName.toLowerCase()
        });
    });

    console.log("🔥 TrustFill Extracted:", extractedData);
    return extractedData;
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scan_page") {
        let data = scrapeQuestionnaire();
        chrome.runtime.sendMessage({ action: "scan_results", form_data: data });
    }
});

function flashGreen(element) {
    if (!element) return;
    let originalBg = element.style.backgroundColor;
    element.style.transition = "background-color 0.3s";
    element.style.backgroundColor = "#d1fae5";
    setTimeout(() => { 
        element.style.backgroundColor = originalBg; 
        element.style.transition = ""; 
    }, 1000);
}

// --- 2. THE PHYSICAL INJECTOR (Reusable Function) ---
function injectAnswerIntoDOM(field_id, answer, is_yes, is_no) {
    let elementsByName = document.getElementsByName(field_id);
    let field = document.getElementById(field_id) || elementsByName[0];
    
    if (!field) return false; // Failed to find field

    if (field.type === "radio" || field.type === "checkbox") {
        let radios = field.name ? document.getElementsByName(field.name) : [field];
        let successfullyClicked = false;
        
        Array.from(radios).forEach(radio => {
            let val = (radio.value || "").toLowerCase();
            let idStr = (radio.id || "").toLowerCase();
            let labelText = radio.labels && radio.labels.length > 0 ? radio.labels[0].innerText.toLowerCase() : (radio.nextElementSibling ? radio.nextElementSibling.innerText.toLowerCase() : "");

            let isYesTarget = ["yes", "true", "y", "1"].includes(val) || idStr.includes("yes") || labelText.includes("yes");
            let isNoTarget = ["no", "false", "n", "0"].includes(val) || idStr.includes("no") || labelText.includes("no");

            if ((is_yes && isYesTarget) || (is_no && isNoTarget)) {
                radio.click(); 
                flashGreen(radio.closest('div') || radio.parentElement);
                successfullyClicked = true;
            }
        });

        if (!successfullyClicked) {
            if (is_yes && radios.length >= 1) { radios[0].click(); flashGreen(radios[0].parentElement); }
            else if (is_no && radios.length >= 2) { radios[1].click(); flashGreen(radios[1].parentElement); }
        }
    } 
    else if (field.tagName === "SELECT") {
        let options = Array.from(field.options);
        let targetOpt = null;

        if (is_yes) targetOpt = options.find(opt => opt.value.toLowerCase().includes("yes") || opt.text.toLowerCase().includes("yes"));
        else if (is_no) targetOpt = options.find(opt => opt.value.toLowerCase().includes("no") || opt.text.toLowerCase().includes("no"));

        if (targetOpt) field.value = targetOpt.value;
        else field.value = answer;
        
        field.dispatchEvent(new Event('change', { bubbles: true }));
        flashGreen(field);
    } 
    else {
        let textToFill = answer;
        if (!textToFill || textToFill.trim() === "") {
            if (is_yes) textToFill = "Yes.";
            else if (is_no) textToFill = "No.";
            else textToFill = "See security documentation for details.";
        }

        field.value = textToFill;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        flashGreen(field);
    }
    return true; // Successfully injected!
}

// --- 3. THE SAVER (Listens to Python) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fill_answer") {
        // 1. Type it into the page
        let success = injectAnswerIntoDOM(request.field_id, request.answer, request.is_yes, request.is_no);

        // 2. If successful, SAVE it to the hidden hard drive!
        if (success) {
            chrome.storage.local.get([BACKUP_KEY], (result) => {
                let backup = result[BACKUP_KEY] || {};
                backup[request.field_id] = {
                    answer: request.answer,
                    is_yes: request.is_yes,
                    is_no: request.is_no
                };
                chrome.storage.local.set({ [BACKUP_KEY]: backup });
            });
        }
    }
});

// --- 4. THE RESTORER (Runs automatically when page refreshes) ---
window.addEventListener("load", () => {
    // We wait 1 second to make sure modern React/Vue websites have finished loading their HTML
    setTimeout(() => {
        chrome.storage.local.get([BACKUP_KEY], (result) => {
            let backup = result[BACKUP_KEY];
            if (backup) {
                console.log("♻️ [TRUSTFILL] Found saved answers in memory! Restoring now...");
                for (let field_id in backup) {
                    let data = backup[field_id];
                    injectAnswerIntoDOM(field_id, data.answer, data.is_yes, data.is_no);
                }
            }
        });
    }, 1000); 
});

// Listen for emergency alerts from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "update_status" && request.text.includes("EXHAUSTED")) {
        alert("🚨 TrustFill AI: Free Trial Credits Exhausted! Please try again tomorrow.");
    }
});


// --- 5. THE MEMORY WIPER (Listens for the Reset Button) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "clear_memory") {
        // 1. Delete the backup from Chrome's hidden hard drive
        chrome.storage.local.remove([BACKUP_KEY], () => {
            console.log("🗑️ [TRUSTFILL] Memory completely wiped!");
            
            // 2. Physically empty EVERY box, button, and dropdown on the screen
            let formFields = document.querySelectorAll(`input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select`);
            
            formFields.forEach(field => {
                if (field.type === "radio" || field.type === "checkbox") {
                    field.checked = false; // Uncheck circles
                } else if (field.tagName === "SELECT") {
                    field.selectedIndex = 0; // Reset dropdowns to the top default option
                    field.value = ""; 
                } else {
                    field.value = ""; // Empty text boxes
                }
                
                // Force the webpage to recognize the deletion
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            flashGreen(document.body); // Flash the screen to confirm it worked
        });
    }
});