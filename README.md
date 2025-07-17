# TALQS – Transformer -Based Architecture For Legal QA & Summarization

**TALQS** is a full-stack web app built with **Next.js (frontend)** and **Python (backend)** that uses **Transformer models** to answer legal questions and summarize content.

## ⚙️ Features
- Uses HuggingFace Transformers for NLP tasks.
- Loads custom-trained `.pth` weights.
- Full-stack: Next.js + Python.
- Authentication via Google OAuth and NextAuth.js.

## 📋 Table of Contents
- [Prerequisites](#Prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Model Weights](#model-weights)
- [Running the App](#running-the-app)

##  Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.8+)
- [pip](https://pip.pypa.io/)

##  Installation

```bash
git clone https://github.com/Eshwar0745/talqs.git
cd talqs
npm install            
cd backend
pip install -r requirements.txt
cd ..
```
##  Configuration
```bash

Frontend (.env.local)

MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

Backend
Check server.py or qa_server.py for os.getenv() variables and set accordingly.
```
##  Model Weights
```bash

Download the model weights from Google Drive and place them inside the backend/models/ folder:



```
👉 [Download Weights](https://drive.google.com/drive/folders/1YYKWoPmnDcJ_kYcEL1lo1fuwKqjdwTnF?usp=drive_link)

##  Running the App

```bash
# Terminal 1
cd backend
python server.py

# Terminal 2
cd backend
python qa_server.py

# Terminal 3
npm run dev

App runs at: http://localhost:3000
