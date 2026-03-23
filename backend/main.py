from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold
from langchain_core.prompts import ChatPromptTemplate

load_dotenv() 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("\n[STEP 1] Initializing Gemini 2.5 Flash...")
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", 
    temperature=0.0, 
    max_retries=2,
    safety_settings={
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    }
)

class QuestionRequest(BaseModel):
    question: str

print("[STEP 2] Loading CAIQ Document...")
try:
    with open("caiq_document.txt", "r", encoding="utf-8", errors="replace") as file:
        CAIQ_KNOWLEDGE_BASE = file.read()
    print(f"✅ SUCCESS: Loaded document with {len(CAIQ_KNOWLEDGE_BASE)} characters!")
except FileNotFoundError:
    print("⚠️ WARNING: caiq_document.txt not found. Using tiny fallback text.")
    CAIQ_KNOWLEDGE_BASE = "AWS implements a robust continuity plan utilizing frequent server instance back-ups..."

# THE PERFECTED PROMPT
prompt_template = ChatPromptTemplate.from_template("""You are an elite enterprise CISO responding to a security questionnaire.

CAIQ DOCUMENT:
{caiq_document_text}

USER QUESTION: {question}

INSTRUCTIONS:
1. First, write a brief paragraph explaining your reasoning based on the document.
2. Second, provide your final, professional audit answer.
3. You MUST separate your final answer by typing the exact phrase "FINAL_ANSWER:" right before it.
4. CRITICAL YES/NO RULE: If the question can be answered with a Yes or No, your FINAL_ANSWER must begin with exactly [YES] or [NO].
""")

ciso_chain = prompt_template | llm

@app.post("/generate-answer")
async def generate_answer(req: QuestionRequest):
    print(f"\n{'='*50}")
    print(f"[STEP 3] 📥 Received Question from Browser: {req.question}")
    
    try:
        response = ciso_chain.invoke({
            "caiq_document_text": CAIQ_KNOWLEDGE_BASE,
            "question": req.question
        })
        
        raw_content = response.content
        if isinstance(raw_content, list):
            full_text = "\n".join(str(item) for item in raw_content)
        else:
            full_text = str(raw_content)

        # 1. SLICE OFF THE BRAINSTORMING AND TAGS
        if "FINAL_ANSWER:" in full_text:
            clean_answer = full_text.split("FINAL_ANSWER:")[-1].strip()
            print("[STEP 4] ✅ Sliced off brainstorming successfully!")
        else:
            print("[STEP 4] ⚠️ Failed to find 'FINAL_ANSWER:'. Using whole text.")
            clean_answer = full_text.strip()
            
        # 2. DETECT YES/NO FOR THE FRONTEND
        is_yes = "[YES]" in clean_answer
        is_no = "[NO]" in clean_answer
        
        # 3. SCRUB THE YES/NO TAGS SO IT LOOKS PROFESSIONAL
        clean_answer = clean_answer.replace("[YES]", "").replace("[NO]", "").strip()
            
        print(f"[STEP 5] 📤 Sending perfectly clean answer to Browser...")
        print(f"{'='*50}\n")
        
        # We send the text AND the yes/no flags to the Chrome Extension!
        return {
            "status": "success",
            "answer": clean_answer,
            "is_yes": is_yes,
            "is_no": is_no
        }
        
    except Exception as e:
        error_msg = str(e).lower()
        print(f"❌ CRITICAL ERROR: {error_msg}")
        
        # THE PORTFOLIO FIX: Detect API Rate Limits & Quota Exhaustion
        if "429" in error_msg or "quota" in error_msg or "exhausted" in error_msg:
            return {
                "status": "error",
                "error_type": "rate_limit",
                "message": "FREE TRIAL CREDITS EXHAUSTED. TRY AGAIN TOMORROW OR LATER."
            }
            
        return {"status": "error", "error_type": "general", "message": str(e)}


from typing import List
from langchain_groq import ChatGroq
import datetime
import os

# --- PHASE 2: THE EXECUTIVE SUMMARIZER ---

class QAItem(BaseModel):
    question: str
    answer: str

class SummaryRequest(BaseModel):
    qa_list: List[QAItem]
    target_email: str

# Initialize the blazing-fast free model (Llama 3 via Groq)
# Make sure to add GROQ_API_KEY to your .env file!
print("[STEP 1.5] Initializing Groq Llama 3 for Summarization...")
try:
    summary_llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.2,
        max_retries=2
    )
except Exception as e:
    print(f"⚠️ Groq Warning: {e}. (Make sure GROQ_API_KEY is in your .env)")

summary_prompt = ChatPromptTemplate.from_template("""You are an elite enterprise CISO. 
Write a professional, 3-paragraph Executive Summary based ONLY on the following security questionnaire answers. 
Highlight our compliance strengths. This will be emailed to our CEO. No pleasantries, no XML tags.

--- START Q&A DATA ---
{qa_data}
--- END Q&A DATA ---
""")

summary_chain = summary_prompt | summary_llm

@app.post("/generate-summary")
async def generate_summary(req: SummaryRequest):
    print(f"\n{'='*50}")
    print(f"[SUMMARY] 📊 Received {len(req.qa_list)} questions. Target Email: {req.target_email}")
    
    formatted_qa = ""
    for idx, item in enumerate(req.qa_list):
        formatted_qa += f"Q{idx+1}: {item.question}\nA: {item.answer}\n\n"
        
    try:
        print("[SUMMARY] 🧠 Generating Executive Brief via Llama 3.1...")
        response = summary_chain.invoke({"qa_data": formatted_qa})
        exec_summary = response.content.strip()
        
        # 1. Save the Local Text File
        filename = f"Security_Audit_Report_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"TRUSTFILL - AUTOMATED SECURITY REPORT\n")
            f.write(f"Prepared for: {req.target_email}\n")
            f.write("="*50 + "\n\n")
            f.write("EXECUTIVE SUMMARY:\n")
            f.write(exec_summary + "\n\n")
            f.write("="*50 + "\n")
            f.write("FULL QUESTIONNAIRE LOG:\n")
            f.write(formatted_qa)
            
        print(f"[SUMMARY] ✅ Successfully saved report to {filename}")
        
        # --- 2. THE EMAIL DISPATCHER ---
        print("[SUMMARY] 📧 Sending email to manager...")
        
        # Make sure these are securely in your .env file!
        sender_email = os.getenv("SENDER_EMAIL") 
        sender_password = os.getenv("SENDER_PASSWORD")
        
        if not sender_email or not sender_password:
            print("⚠️ ERROR: SENDER_EMAIL or SENDER_PASSWORD not found in .env file!")
        else:
            # Build the email
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = req.target_email # 👈 GRABS THE EMAIL FROM YOUR POPUP!
            msg['Subject'] = "ACTION REQUIRED: Security Questionnaire Ready for Review"
            
            # The HTML Email Template
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <h2 style="color: #1e3a8a;">TrustFill AI: Security Questionnaire Completed</h2>
                    <p>The automated security review has finished. Please review the executive summary below:</p>
                    
                    <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #10b981; margin-bottom: 20px;">
                        {exec_summary.replace(chr(10), '<br>')}
                    </div>
                    
                    <p><b>Action Required:</b> Please review the full answers in the portal and submit the form.</p>
                    
                    <a href="https://anya-gupta-05.github.io/Trust-Fill-Test-Branch/" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 10px;">
                        Review & Submit Form
                    </a>
                    
                    <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
                        Automated compliance message generated by TrustFill AI.
                    </p>
                </body>
            </html>
            """
            msg.attach(MIMEText(html_body, 'html'))
            
            # Connect to Gmail and Send!
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            server.quit()
            print(f"[SUMMARY] 📬 Email sent successfully to {req.target_email}!")

        print(f"{'='*50}\n")
        
        return {"status": "success", "summary": exec_summary, "filename": filename}
        
    except Exception as e:
        print(f"❌ SUMMARY ERROR: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    print("\n🚀 Starting Server... Waiting for Chrome Extension!")
    uvicorn.run(app, host="127.0.0.1", port=8000)