# 🎯 Dicode.JobSeeker

> Personalized job aggregator and matching system for tech professionals.

Built with ❤️ by [Duilio Izzi](https://dicode.tech). This app automatically fetches jobs from multiple sources, scores them against your profile, and surfaces the best matches.

## ✨ Features

- **🔍 Multi-source aggregation** — Adzuna, GitHub Jobs (more coming)
- **🎯 Smart matching** — Algorithm scores jobs based on your profile
- **📊 Match scoring** — 0-100 score with clear reasons why
- **⭐ Favorites & tracking** — Save and track application status
- **🌐 Location-aware** — Weights remote, hybrid, and on-site preferences
- **🚫 Deal-breaker detection** — Auto-filters out unwanted positions
- **📈 Stats dashboard** — Track your job search progress

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Adzuna     │────▶│              │────▶│          │
│  API        │     │   Backend    │     │ SQLite   │
├─────────────┤     │   (Node.js)  │     │ Database │
│  GitHub     │────▶│              │     │          │
│  Jobs       │     └──────────────┘     └──────────┘
│  (planned)  │             │
└─────────────┘             │
                    ┌───────┴───────┐
                    │   Matching    │
                    │   Algorithm   │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  React        │
                    │  Frontend     │
                    └───────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Adzuna API key (free at [developer.adzuna.com](https://developer.adzuna.com))

### 1. Clone & Install

```bash
git clone https://github.com/Dicode-Tech/dicode-app-jobseeker.git
cd dicode-app-jobseeker

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Configure

```bash
cd backend
cp .env.example .env
# Edit .env with your Adzuna credentials
```

### 3. Update your profile

Edit `backend/src/config/userProfile.js` with your:
- Target positions
- Location preferences
- Technology stack
- Deal-breakers

### 4. Initialize database

```bash
cd backend
node -e "require('./src/db/database').initDb()"
```

### 5. Run

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit http://localhost:3000

## 📊 Score Algorithm

The matching score (0-100) is based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Title match | 30% | Exact or partial title alignment |
| Skills match | 25% | Technology stack overlap |
| Location | 20% | Remote, Spain, or Valencia |
| Tech stack | 15% | Core technologies match |

## 📁 Project Structure

```
dicode-app-jobseeker/
├── backend/
│   ├── src/
│   │   ├── api/           # REST API routes
│   │   ├── config/        # User profile
│   │   ├── db/            # Database
│   │   ├── matcher/       # Scoring algorithm
│   │   ├── scrapers/      # Job source scrapers
│   │   └── index.js       # Main server
│   ├── data/              # SQLite database
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs with filters |
| GET | `/api/jobs/:id` | Get single job |
| PATCH | `/api/jobs/:id` | Update status/notes |
| GET | `/api/profile` | Get user profile |
| GET | `/api/stats` | Get dashboard stats |
| POST | `/api/scrape` | Trigger scraping manually |

## 🛣️ Roadmap

- [x] Basic job aggregation (Adzuna)
- [x] Smart matching algorithm
- [x] Web dashboard
- [x] Application tracking
- [ ] GitHub Jobs integration
- [ ] LinkedIn Jobs (API/official)
- [ ] RemoteOK integration
- [ ] Email notifications
- [ ] Telegram bot
- [ ] Export to CSV

## 📝 License

MIT — Built for personal use but feel free to fork and customize.

---

**Built with**:
- ⚡ Node.js + Fastify
- ⚛️ React + Vite
- 🗃️ SQLite
- 🔗 Adzuna API

For questions or feature requests: [contact@dicode.tech](mailto:contact@dicode.tech)