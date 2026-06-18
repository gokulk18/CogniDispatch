# 🚨 CogniDispatch — AI-Powered Emergency Home Service Triage

CogniDispatch is a modern emergency dispatch platform for home services (Plumbing, Electrical, HVAC, Structural). It leverages **Azure Cognitive Services** and **OpenAI** to allow homeowners to report emergencies via voice or image scan, uses **AI Triage** to classify the emergency, and dispatches the closest available technician in real-time with **Uber-style map telemetry**.

This application is built as a decoupled **Microservices Architecture** that can run entirely locally on Windows **without Docker** and **without MongoDB** using an offline in-memory mock system.

---

## ✨ Core Features

- 🎙️ **Voice-Activated AI Triage**: Homeowners describe their emergencies by speaking. The app converts speech to text, parses the category, and estimates service fees.
- 📷 **Multimodal Vision Damage Scan**: Homeowners can upload photos of the damage. The AI scans the image, overlays hazard bounding boxes, calculates severity, and provides immediate containment steps.
- ⚡ **Real-Time Telemetry & Matching**: Integrates WebSockets (Socket.IO) to find the closest qualified responder and emit real-time GPS coordinates.
- 🗺️ **Live En-Route Vehicle Tracking**: Once a technician accepts a job, the homeowner tracks the technician's vehicle moving on a map in real-time.
- 🔐 **Secure Handoff Verification**: Homeowner receives a secure 4-digit OTP. The technician must verify this OTP upon arrival before starting mitigation.
- 💳 **Integrated Billing Checkout**: A high-fidelity Razorpay simulation for payment processing, applying a 20% platform commission/80% technician payout split.

---

## 🛠️ Microservices Architecture

The application is structured into the following services:

| Component | Directory | Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Client** | `/client` | `3000` | Next.js 14 Web Application (Tailwind CSS, Leaflet Maps) |
| **Auth Service** | `/services/auth-service` | `5001` | Handles homeowner, technician, and admin login/registration |
| **Vendor Service** | `/services/vendor-service` | `5002` | Manages technician profiles, locations, and matchmaking |
| **AI Service** | `/services/ai-service` | `5003` | Generates speech tokens and handles LLM triage/vision APIs |
| **Admin Service** | `/services/admin-service` | `5004` | Powers dashboard metrics and vendor registration controls |
| **Dispatch Service** | `/services/dispatch-service` | `5005` | Manages live WebSocket rooms and telemetry tracking |
| **Shared Library** | `/services/shared` | N/A | Contains shared DB adapter, schemas, and mock seed data |

*Note: In local development, the Next.js frontend acts as the API Gateway via rewrites in `next.config.js` to avoid CORS issues and Nginx configuration overhead.*

---

## 🚀 Local Quickstart (No Docker / MongoDB Required)

The application has been enhanced with an **in-memory database fallback**. By default, it loads initial mock data from local JSON files and persists updates in-memory per session. **You do not need a running MongoDB server to test the app.**

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Windows Terminal** (pre-installed on Windows 11/10)

### 2. Startup Script
Since you are on Windows, you can start the entire stack in one click:
1. Open **PowerShell** in the project root.
2. Run the startup script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start_locally.ps1
   ```
3. A single **Windows Terminal** window will open containing **6 separate tabs**, automatically installing dependencies (including peer-dependency bypasses) and starting each service.

---

## ⚙️ AI Configurations (Real vs. Mock Mode)

The AI endpoints are designed to run in a standalone **Offline Mock Mode** if API keys are omitted. 

To configure real cloud APIs, update the environment variables:

### 1. Speech-to-Text & Transcription
Configure your Azure Cognitive Services in [services/ai-service/.env](file:///d:/CogniDispatch/services/ai-service/.env):
```env
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=centralindia
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```
*If left blank, the app will return simulated transcription handling based on text keyword rules.*

### 2. Vision Damage Scan
Configure your standard OpenAI key in [services/ai-service/.env](file:///d:/CogniDispatch/services/ai-service/.env):
```env
OPENAI_API_KEY=your_openai_api_key
```
*If left blank, selecting categories like `PLUMBING` or `ELECTRICAL` and uploading any photo will immediately mock the visual bounding boxes and safety steps for demonstration.*

---

## 🧪 Testing the Live Flow

Once the startup script completes, follow these steps to test the end-to-end integration:

1. **Open Technician Console**:
   * Navigate to: **[http://localhost:3000/technician](http://localhost:3000/technician)**
   * Login Phone: `9090909090`
   * Password: `password123`
   * Click **Go On Duty (Available)**.

2. **Open Homeowner Portal**:
   * Navigate to: **[http://localhost:3000/homeowner](http://localhost:3000/homeowner)** (in an incognito/different tab)
   * Login Email: `user1@gmail.com`
   * Password: `password123`

3. **Report Emergency**:
   * **Voice**: Click the microphone on the Speak Emergency tab and describe a plumbing leak, or use the simulated speech input inputting: *"Water is spraying from my sink pipe!"*
   * **Vision**: Click **Scan Damage**, select an image, choose a mock specialty (e.g., `ELECTRICAL`), and click **Analyze Damage**. You will see hazard zones mapped directly over the image, along with a list of **Immediate Safety Actions**.
   * Click **Confirm & Dispatch**.

4. **Complete Route**:
   * Switch to the **Technician** tab, review the matching offer panel, and click **Accept Dispatch Offer**.
   * Switch back to the **Homeowner** tab. You will see a **Secure OTP** (e.g., `5122`) and the technician's vehicle moving towards your house on the map in real-time.
   * On the Technician tab, click **Signal Arrival**. Request the OTP from the homeowner, enter it, and submit.
   * On the Technician tab, click **Mitigation Complete & Request Payout**.
   * On the Homeowner tab, rate the service and proceed to checkout using the secure **Razorpay checkout simulation** to conclude the transaction.
