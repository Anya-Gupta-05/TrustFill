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

Clone this repository to your machine.

Open the terminal and navigate to the backend folder.

Create a virtual environment and install the dependencies:

```bash
pip install -r requirements.txt
