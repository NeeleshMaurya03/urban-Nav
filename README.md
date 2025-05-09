🚦 Urban Nav – Smart Traffic Control System
A full-stack AI-powered traffic management system for smart cities. It combines real-time traffic analysis, license plate recognition, simulation, and a dashboard interface.

📁 Project Structure
php
Copy
Edit
project-root/
├── urban-nav/           # Frontend – Next.js Dashboard
│   ├── public/          # Static assets
│   └── src/             # Application source
│
├── python/              # Backend – Python/FastAPI server
│   ├── *.pt / *.pkl     # (weights placed directly here)
│
└── README.md            # Project documentation
📂 Model Weights:
Download the model weights from the following Google Drive folder and place them directly inside the python/ directory:
🔗 Google Drive – [Model Weights](https://drive.google.com/drive/folders/1jXxetl2sypG_cX5m_wwwSJo_H5xDxR02?usp=sharing)

🚀 Getting Started
🔧 Prerequisites
Node.js v18+

Python 3.10+

FFmpeg

Tesseract OCR

🔸 Frontend Setup (Next.js)
bash
Copy
Edit
# Navigate to frontend folder
cd urban-nav

# Install dependencies
npm install

# Start development server
npm run dev
📍 Access the frontend at: http://localhost:3000

🔹 Backend Setup (Python + FastAPI)
bash
Copy
Edit
# Navigate to backend folder
cd python

# Create and activate virtual environment
# Windows:
python -m venv venv
venv\Scripts\activate

# Unix/macOS:
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app:app --reload --host 0.0.0.0 --port 5000
📍 API Docs: http://localhost:5000/docs

📝 Environment Configuration
Create a .env.local file inside the urban-nav/ folder:

env
Copy
Edit
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000


✨ Features Overview
Component	Capabilities
Real-time Analysis	Vehicle counting, helmet detection
ANPR System	License plate recognition (Automatic Number Plate Recognition)
Traffic Simulation	Signal control based on density & intersection modeling
Dashboard	Interactive data visualization and real-time metrics