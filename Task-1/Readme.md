Installation & Setup

1. Backend Setup
Navigate to the Task-1 directory.
Create a virtual environment:   python -m venv venv
source venv/bin/activate
Install dependencies:    pip install -r requirements.txt
Set your Groq API Key:     $env:GROQ_API_KEY=""
Run the server:   python backend.py
The backend will run on http://localhost:8000.

2. Frontend Setup

Navigate to the crm-hcp-module directory.
Install dependencies: npm install
Start the application: npm start
The application will open at http://localhost:3000.
