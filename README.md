# ByteVipers Coding Arena

> **Tagline:** *Think. Code. Conquer.*

**ByteVipers Coding Arena** is a modern, full-stack, Python-only coding practice and assessment platform inspired by the core capabilities of LeetCode and online judges. It features automated code execution, student verification workflows, class cohorts, scheduled assignments, and a **single unified Teacher/Instructor Dashboard** with granular permission controls.

---

## 🌟 Key Highlights & Features

1. **Python-Focused Coding Environment**:
   - Integrated **Monaco Editor** with Python syntax highlighting, code reset, and custom standard input (stdin) execution.
   - Live sample test case runner vs. full test suite submission.
   - Comprehensive verdict evaluation: `ACCEPTED (AC)`, `WRONG_ANSWER (WA)`, `TIME_LIMIT_EXCEEDED (TLE)`, `MEMORY_LIMIT_EXCEEDED (MLE)`, `RUNTIME_ERROR (RE)`, `COMPILATION_ERROR (CE)`.
   - **Confidentiality Guard**: Hidden/private test cases are strictly guarded and never exposed to student clients.

2. **Mandatory Student Verification Workflow**:
   - Newly registered students are initialized with `verification_status = PENDING`.
   - Students cannot access the protected student dashboard, assignments, or solve submissions until their institutional verification is reviewed and approved by an authorized teacher.
   - Comprehensive status tracking: `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `RESUBMISSION_REQUIRED`, `SUSPENDED`.

3. **Single Unified Teacher/Instructor Dashboard**:
   - **No separate `/admin` dashboard**: All management occurs under `/teacher`.
   - Granular RBAC permissions:
     - `verification.review`: Review, approve, reject, or request resubmission for student verification applications.
     - `problems.create` / `problems.edit` / `problems.publish`: Create problems, author test cases (public and hidden), set memory/time constraints.
     - `classes.manage`: Create classes, generate enrollment join codes, manage rosters.
     - `assignments.create` / `assignments.manage`: Schedule assignments, link problem sets, monitor student progress and submission grades.
     - `submissions.review`: Inspect student code submissions, runtime performance, and individual test verdicts.
     - `users.manage`: Suspend/activate accounts, delegate granular permissions to other instructors.
     - `audit_logs.view`: View administrative and platform audit events.

4. **Robust Dual-Mode Evaluation Engine**:
   - **Judge0 CE / RapidAPI**: Connects directly to Judge0 for containerized sandboxed code execution.
   - **Isolated Fallback Runner**: Built-in safe subprocess runner with configurable CPU timeouts, memory caps, and stdin/stdout pipes, ensuring zero platform downtime if Judge0 is offline.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), TypeScript (strict mode), Tailwind CSS v4, Lucide Icons, Monaco Editor (`@monaco-editor/react`) |
| **Backend** | Python FastAPI, Pydantic v2 (`ConfigDict`), SQLAlchemy 2.0 (Asyncio), `bcrypt` password hashing, JWT Bearer tokens |
| **Database** | PostgreSQL (Production/Docker) & SQLite (`aiosqlite`) for frictionless local development |
| **Code Execution** | Judge0 API with local isolated subprocess fallback |
| **Containerization**| Docker, Docker Compose |
| **Testing** | Pytest, `pytest-asyncio`, `httpx` |

---

## 📁 Repository Structure

```
ByteVipers/
├── backend/
│   ├── app/
│   │   ├── api/v1/              # API endpoints (auth, verification, problems, teacher, etc.)
│   │   │   ├── endpoints/       # Core public/student routers
│   │   │   └── teacher/         # Unified teacher dashboard routers (analytics, users, classes, etc.)
│   │   ├── core/                # Config, security (bcrypt + JWT), async database engine, RBAC dependencies
│   │   ├── models/              # SQLAlchemy 2.0 relational models
│   │   ├── schemas/             # Pydantic v2 schemas
│   │   ├── services/            # Judge0 client, isolated execution engine, bootstrap seeders
│   │   └── main.py              # FastAPI application entrypoint with CORS & route mounting
│   ├── tests/                   # Backend pytest test suite (100% passing)
│   ├── Dockerfile               # Backend production container
│   ├── requirements.txt         # Python dependencies
│   ├── manage.py                # Admin CLI utility
│   └── pytest.ini               # Pytest configuration
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages (problems, dashboard, teacher, assignments, etc.)
│   │   ├── components/          # Reusable components (Navbar, Footer, Logo, etc.)
│   │   ├── context/             # Authentication & permission context provider
│   │   └── lib/                 # Typed API client library
│   ├── Dockerfile               # Multi-stage production container
│   ├── package.json             # Frontend dependencies
│   └── tailwind.config.ts       # Midnight Navy & Electric Cyan theme configuration
├── docker-compose.yml           # Complete containerized multi-service stack
├── .env.example                 # Root environment variable template
└── README.md                    # Platform documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python**: 3.11+
- **Node.js**: 20+ (with npm)
- **Docker & Docker Compose** (optional, for containerized run)

---

### Option A: Local Development Setup (Quickstart)

#### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run initial seed and bootstrap admin account
# Run migrations and seed baseline catalog (permissions, tags, starter problems)
python -m alembic upgrade head
python manage.py seed

# Securely bootstrap the initial administrative teacher account (interactively prompts for password)
python manage.py create-admin --email admin@bytevipers.com --username admin --name "System Administrator"
```

Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```
Backend API interactive documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs)

#### 2. Frontend Setup

In a separate terminal:
```bash
cd frontend

# Install npm packages
npm install

# Start development server
npm run dev
```

Visit the ByteVipers web application at [http://localhost:3000](http://localhost:3000).

---

### Option B: Docker Compose Setup

To launch the full stack (PostgreSQL, Redis, Judge0 CE, Backend, and Frontend) in Docker:

```bash
# From the project root
docker-compose up --build -d
```

Services will be accessible at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Judge0 CE**: [http://localhost:2358](http://localhost:2358)

---

## 🧪 Testing

### Backend Test Suite

Run the comprehensive pytest suite verifying health check, student registration pending state, access denial for unverified students, verification approval flow, Python code evaluation verdicts, and hidden test case confidentiality:

```bash
cd backend
pytest tests/test_backend.py -v
```

### Frontend Production Build

Verify Next.js build and TypeScript compilation:

```bash
cd frontend
npm run build
```

---

## 🔐 Initial Teacher/Super Admin Setup & Administrative CLI

To bootstrap an administrator account, run the command and enter the password when securely prompted:

```bash
cd backend
python manage.py create-admin --email admin@bytevipers.com --username admin --name "System Administrator"
```
Or set the `ADMIN_PASSWORD` environment variable in deployment pipelines.

To apply database migrations:
```bash
python -m alembic upgrade head
```

To re-seed baseline problem sets and system permissions:
```bash
python manage.py seed
```

---

## 🎨 Brand Design Tokens

ByteVipers adheres to a distinct, dark-mode-first developer aesthetic:
- **Midnight Navy**: `#0B1020`
- **Dark Surface**: `#111827`
- **Elevated Surface**: `#182235`
- **Electric Cyan**: `#38BDF8`
- **Champagne Gold**: `#F5B942`
- **Primary Text**: `#F8FAFC`
- **Secondary Text**: `#94A3B8`
- **Success / Accepted**: `#22C55E`
- **Error / Wrong Answer**: `#EF4444`

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
