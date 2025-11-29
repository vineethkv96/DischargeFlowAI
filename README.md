# Hospital Management System - DischargeFlow AI & PatientCare Hub

A comprehensive hospital management platform combining **DischargeFlow AI** (autonomous discharge management) and **PatientCare Hub** (patient care management) in a unified application.

## 🏥 Overview

This platform provides two integrated systems:

1. **DischargeFlow AI** - Autonomous AI-powered hospital discharge management system that automates patient discharge workflows, data extraction, and task generation.

2. **PatientCare Hub** - Complete patient care management system for managing patient records, lab tests, medications, billing, insurance, and clinical notes.

## ✨ Features

### DischargeFlow AI
- 🤖 AI-powered data extraction from patient records
- 📋 Automated task generation for discharge workflows
- 📊 Real-time dashboard with patient status tracking
- 🔍 Agent logs for transparency and debugging
- ⚡ Background processing for extraction and task generation
- 📈 Task management by category (medical, operational, financial)

### PatientCare Hub
- 👥 Complete patient management (CRUD operations)
- 🧪 Lab test management and results tracking
- 💊 Medication prescription and refill tracking
- 💰 Billing and payment management
- 🏥 Insurance policy and claims management
- 📝 Doctor and nurse notes
- 📅 Timeline of patient activities
- 🔐 Role-based authentication (Admin, Doctor, Nurse, Receptionist, Billing)

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Vite
│   (Port 8080)   │  shadcn/ui components
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│   Backend       │  FastAPI + Python
│   (Port 8000)   │  MongoDB + Motor
└────────┬────────┘
         │
         │
┌────────▼────────┐
│   MongoDB       │  Database
│   (Port 27017)  │  dischargeflow_db
└─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching
- **Zod** - Schema validation
- **React Hook Form** - Form management

### Backend
- **FastAPI** - Python web framework
- **MongoDB** - NoSQL database
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation
- **JWT** - Authentication (python-jose)
- **bcrypt** - Password hashing
- **Uvicorn** - ASGI server

### Infrastructure
- **Docker** & **Docker Compose** - Containerization
- **MongoDB** - Database service

## 📋 Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR
- **Node.js** 20+ and **npm**
- **Python** 3.11+
- **MongoDB** 7+

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hat
   ```

2. **Start all services**
   ```bash
   docker-compose up -d --build
   ```

3. **Run database migration**
   ```bash
   docker exec -it discharge_backend python migrations/seed_patientcare_data.py
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - MongoDB: localhost:27017

### Manual Setup

#### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="dischargeflow_db"
export JWT_SECRET_KEY="your-secret-key-here"
export CORS_ORIGINS="http://localhost:8080"

# Run migration
python migrations/seed_patientcare_data.py

# Start server
uvicorn server:app --reload --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variable
export VITE_API_URL="http://localhost:8000/api/patientcare"

# Start dev server
npm run dev
```

## 🔐 Default Login Credentials

After running the migration, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | admin123 |
| Doctor | doctor@hospital.com | doctor123 |
| Nurse | nurse@hospital.com | nurse123 |

## 📁 Project Structure

```
hat/
├── backend/
│   ├── server.py              # Main FastAPI app (DischargeFlow API)
│   ├── patientcare_api.py     # PatientCare Hub API routes
│   ├── auth.py                # Authentication utilities
│   ├── agent_service.py       # AI agent services
│   ├── migrations/
│   │   └── seed_patientcare_data.py  # Database migration
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Patients.tsx           # PatientCare Hub
│   │   │   ├── PatientDetails.tsx     # PatientCare Hub
│   │   │   ├── DischargeFlowPatients.tsx
│   │   │   └── DischargeFlowDashboard.tsx
│   │   ├── components/
│   │   │   ├── AppHeader.tsx          # Shared header with navigation
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── ui/                    # shadcn/ui components
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx        # Authentication context
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client
│   │   │   └── utils.ts
│   │   └── App.tsx
│   └── package.json
│
├── mongo/
│   └── Dockerfile
│
└── docker-compose.yml
```

## 🔌 API Endpoints

### PatientCare Hub API (`/api/patientcare`)

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - Register new user (admin only)
- `GET /auth/me` - Get current user

#### Patients
- `GET /patients` - List all patients
- `GET /patients/{id}` - Get patient details
- `POST /patients` - Create patient
- `PATCH /patients/{id}` - Update patient
- `GET /patients/{id}/dashboard` - Get complete dashboard

#### Other Resources
- Lab Tests: `/patients/{id}/lab-tests`
- Notes: `/patients/{id}/notes`
- Billing: `/patients/{id}/billing`
- Medications: `/patients/{id}/medications`
- Insurance: `/patients/{id}/insurance`
- Timeline: `/patients/{id}/timeline`

### DischargeFlow API (`/api`)

#### Patients
- `GET /patients` - List discharge flow patients
- `POST /patients` - Create patient
- `GET /patients/{id}` - Get patient
- `GET /patients/{id}/dashboard` - Get dashboard
- `POST /patients/{id}/mark-ready` - Mark ready for discharge
- `POST /patients/{id}/extract` - Trigger data extraction
- `POST /patients/{id}/generate-tasks` - Generate tasks

#### Tasks
- `GET /tasks/{patient_id}` - Get patient tasks
- `PATCH /tasks/{task_id}/status` - Update task status

## 🌐 Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `dischargeflow_db` |
| `JWT_SECRET_KEY` | Secret key for JWT tokens | (required) |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `*` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `480` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000/api/patientcare` |

## 🗄️ Database Migration

To seed the database with initial data:

```bash
# Using Docker
docker exec -it discharge_backend python migrations/seed_patientcare_data.py

# Or manually
cd backend
python migrations/seed_patientcare_data.py
```

The migration creates:
- 3 default users (admin, doctor, nurse)
- 3 sample patients with complete medical records
- Lab tests, notes, billing, medications, and insurance data

## 🔒 Authentication & Authorization

- **JWT-based authentication** with 8-hour token expiration
- **Role-based access control**:
  - `admin` - Full access
  - `doctor` - Can manage patients, lab tests, medications, notes
  - `nurse` - Can view patients, add notes, view medications
  - `receptionist` - Can manage patients and billing
  - `billing` - Can manage billing and insurance

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Stop and remove volumes (clears data)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build

# Execute command in container
docker exec -it discharge_backend bash
docker exec -it discharge_frontend sh
```

## 🧪 Development

### Backend Development

```bash
cd backend
uvicorn server:app --reload --port 8000
```

### Frontend Development

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:8080` with hot-reload enabled.

## 📊 Database Collections

### DischargeFlow Collections
- `patients` - Discharge flow patients (with `mrn` field)
- `extracted_data` - AI-extracted patient data
- `tasks` - Discharge tasks
- `agent_logs` - AI agent activity logs

### PatientCare Collections
- `patients` - PatientCare patients (with `firstName` field)
- `users` - System users
- `lab_tests` - Laboratory test results
- `timeline` - Patient activity timeline
- `notes` - Doctor and nurse notes
- `billing` - Billing items
- `medications` - Prescribed medications
- `insurance` - Insurance policies and claims

## 🚢 Deployment

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# The built files will be in frontend/dist/
```

### Environment Setup

Create a `.env` file in the `backend/` directory:

```env
MONGO_URL=mongodb://mongo:27017
DB_NAME=dischargeflow_db
JWT_SECRET_KEY=your-production-secret-key-here
CORS_ORIGINS=https://yourdomain.com
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

## 📝 Notes

- Both systems share the same MongoDB database but use different collections
- PatientCare patients are filtered by `firstName` field
- DischargeFlow patients are filtered by `mrn` field
- All API endpoints require authentication except `/auth/login` and `/auth/register`
- Timeline events are automatically created for most patient actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

[Add your license here]

## 🆘 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ for healthcare management**
