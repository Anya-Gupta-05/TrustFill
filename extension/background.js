chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_autofill") {
        if (!request.form_data || request.form_data.length === 0) return; 

        chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
            let tabId = tabs[0].id;
            let formData = request.form_data;
            let total = formData.length;
            
            // 🧠 THE AGGREGATOR: We will store the final Q&A here
            let completedQA = [];

            for (let i = 0; i < total; i++) {
                let item = formData[i];
                let currentNum = i + 1;

                try {
                    chrome.runtime.sendMessage({ action: "update_status", text: `⏳ Answering question ${currentNum} out of ${total}...` });
                } catch (e) { }

                try {
                    let response = await fetch("http://127.0.0.1:8000/generate-answer", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ question: item.question })
                    });
                    
                    let data = await response.json();
                    
                    if (data.status === "success") {
                        chrome.tabs.sendMessage(tabId, {
                            action: "fill_answer", field_id: item.field_id,
                            answer: data.answer, is_yes: data.is_yes, is_no: data.is_no
                        });
                        
                        // 🚨 THE FIX: Format the answer for the summary exactly like the screen!
                        let textForSummary = data.answer;
                        if (!textForSummary || textForSummary.trim() === "") {
                            if (data.is_yes) textForSummary = "Yes.";
                            else if (data.is_no) textForSummary = "No.";
                            else textForSummary = "No details provided.";
                        }

                        // Add the formatted answer to our aggregator
                        completedQA.push({
                            question: item.question,
                            answer: textForSummary
                        });
                        
                    } else if (data.status === "error" && data.error_type === "rate_limit") {
                        // FIX: Removed the extra '}' that was breaking this line!
                        chrome.runtime.sendMessage({ action: "update_status", text: "❌ FREE TRIAL CREDITS EXHAUSTED. Try again later." });
                        return; // Stop the loop
                    }
                } catch (error) {
                    console.error("TrustFill API Error:", error);
                }
                
                await new Promise(resolve => setTimeout(resolve, 4000));
            }

            // --- PHASE 2 TRIGGER: The loop is done. Ask Python for a summary! ---
            try {
                chrome.runtime.sendMessage({ action: "update_status", text: "📝 Writing Executive Summary..." });
                
                await fetch("http://127.0.0.1:8000/generate-summary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        qa_list: completedQA, 
                        target_email: request.manager_email 
                    })
                });

                chrome.runtime.sendMessage({ action: "update_status", text: `✨ Finished! Summary prepared for ${request.manager_email}` });
            } catch (summaryError) {
                console.error("Summary failed:", summaryError);
                chrome.runtime.sendMessage({ action: "update_status", text: "✨ Finished answering, but summary failed." });
            }
        });
    }
});