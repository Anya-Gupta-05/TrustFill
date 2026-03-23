# 🛡️ TrustFill AI: Security Questionnaires on Autopilot

**TrustFill** is an enterprise-grade Chrome Extension and AI pipeline designed to automate the painful, time-consuming process of filling out B2B vendor security assessments and compliance questionnaires.

By leveraging cutting-edge Generative AI, TrustFill reads a company's internal security documentation (like SOC 2 reports or CAIQ documents) and autonomously navigates web-based forms to inject accurate, context-aware answers.

---

## 🛑 The Problem

When enterprises purchase third-party software, their compliance teams require the vendor to fill out massive security questionnaires—often containing **50 to 300+ highly technical questions**. Sales engineers and security teams waste hundreds of hours manually hunting through internal PDFs to copy-paste answers into web portals.

---

## 🚀 The TrustFill Solution & Enterprise ROI

TrustFill acts as an intelligent, automated compliance engineer.

- **Massive Time Savings:** Reduces a tedious 4-hour manual audit down to minutes  
- **Accuracy:** Grounds every answer strictly in the provided company documentation to prevent AI hallucinations  
- **Automated Reporting:** Not only fills the form but triggers a background workflow to generate an executive summary using a secondary LLM, instantly emailing the results to the compliance manager  

---

## 🛠️ System Architecture & Tech Stack

This project utilizes a **decoupled architecture**, separating the browser-based DOM scraper from the heavy AI processing backend.

- **Frontend:** Vanilla JavaScript, HTML/CSS, Chrome Extension Manifest V3  
- **Backend:** Python, FastAPI  
- **AI Extraction Engine:** Google Gemini 1.5 Flash (via LangChain)  
- **Summarization Engine:** Llama 3.1 (via Groq)  
- **Vector Database:** ChromaDB (for document embedding and retrieval)  
- **Automation:** Python `smtplib` for automated email dispatch  

---

## ⚙️ How to Run Locally (Developer Setup)

### 1. Start the Python Backend

### 2.Clone this repository to your machine.

### 3.Open the terminal and navigate to the backend folder.

Create a virtual environment and install the dependencies:

```bash
pip install -r requirements.txt
```


### 4. Create a `.env` File

Create a `.env` file in the root of the backend directory and add your API credentials:

```bash
GEMINI_API_KEY="your_gemini_key"
GROQ_API_KEY="your_groq_key"
SENDER_EMAIL="your_bot_email@gmail.com"
SENDER_PASSWORD="your_16_letter_app_password"
```

### 5.Start the FastAPI Server
```bash
fastapi dev main.py
```

## 2. Install the Chrome Extension

1. Open Google Chrome and navigate to `chrome://extensions/`  
2. Toggle **Developer mode** ON in the top right corner  
3. Click **Load unpacked** in the top left  
4. Select the extension folder from this repository  

The TrustFill shield icon will now appear in your browser toolbar.

---

## 3. Try the Live Demo

You can test the AI extraction on the official TrustFill Benchmark Form here:

👉 **Launch the TrustFill Test Bench**

---

## 📐 Architectural Note on DOM Scraping Scope

The core innovation of TrustFill lies in its **Retrieval-Augmented Generation (RAG)** pipeline and LLM chaining.

Currently, the frontend DOM scraper is optimized for standard HTML5 architecture and semantic form elements (`<input>`, `<select>`, `<textarea>`, and standard radio groupings).
Because modern enterprise web portals often utilize highly obfuscated, proprietary UI frameworks or custom `<div>`-based pseudo-elements (such as Google Forms’ custom blocks), extracting targets from unstandardized “junk” HTML falls outside the scope of this iteration.
To demonstrate the end-to-end AI capabilities cleanly, a standardized benchmark form (linked above) was developed.
Future scale iterations would involve implementing **Computer Vision models** to bypass DOM scraping entirely, allowing the AI to “see” and interact with non-standard web elements visually.

#Developed by Anya Gupta
