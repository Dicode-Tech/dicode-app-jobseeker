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

- **Node.js 18+** ([download](https://nodejs.org/))
- **SQLite 3** (usually included with Node.js sqlite3 module, see below)
- **Adzuna API key** (free at [developer.adzuna.com](https://developer.adzuna.com))

### SQLite Installation

SQLite is included automatically when you install the dependencies (`npm install`), but if you encounter issues:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install sqlite3 libsqlite3-dev
```

**macOS:**
```bash
brew install sqlite
```

**Windows:**
- Download from [sqlite.org](https://sqlite.org/download.html)
- Or use Chocolatey: `choco install sqlite`

> 💡 **Note:** The `sqlite3` npm package includes pre-compiled binaries for most platforms. You typically don't need to install SQLite manually unless you're building from source or on an exotic architecture.

### Alternative: MongoDB

If you prefer MongoDB over SQLite (better for SaaS/multi-user scenarios):

1. Install MongoDB locally or use MongoDB Atlas (free tier)
2. Update `backend/src/db/database.js` to use mongoose
3. Change connection string in `.env`

See [MongoDB Setup Guide](#mongodb-setup) below.

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

**Option A: SQLite (default, recommended)**

```bash
cd backend
npm install  # This installs sqlite3 with binaries
node -e "require('./src/db/database').initDb()"
```

If you get `sqlite3` build errors:

```bash
# Try rebuilding native modules
npm rebuild sqlite3

# Or use sqlite3 with prebuilt binaries
npm install sqlite3 --build-from-source
```

**Option B: MongoDB**

See [MongoDB Setup](#mongodb-setup) section below.

**Verify database was created:**

```bash
ls -la data/
# Should see: jobs.db
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

## 15. Troubleshooting

### SQLite Build Errors

**Error: `sqlite3: not found` or `node-gyp` errors**

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3 sqlite3 libsqlite3-dev

# macOS
xcode-select --install
brew install sqlite

# Then rebuild
npm rebuild sqlite3
```

**Error: `Error: Cannot find module '../build/Release/sqlite3.node'`**

```bash
# Clear npm cache and reinstall
cd backend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Port Already in Use

```bash
# Find process using port 3001 (backend)
lsof -i :3001
kill -9 <PID>
```

### Database Permission Errors

```bash
# Ensure data directory exists and is writable
mkdir -p backend/data
chmod 755 backend/data
```

---

## 16. MongoDB Setup (Alternative)

If you prefer MongoDB over SQLite:

### 1. Install MongoDB

**Option A: Local MongoDB**
```bash
# Ubuntu
sudo apt-get install mongodb

# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Windows
choco install mongodb
```

**Option B: MongoDB Atlas (Cloud, Free Tier)**
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Get connection string

### 2. Update Environment

```bash
# backend/.env
DATABASE_URL=mongodb://localhost:27017/jobseeker
# Or for Atlas:
# DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/jobseeker
```

### 3. Replace Database Module

Install mongoose:
```bash
cd backend
npm install mongoose
```

Create `backend/src/db/mongodb.js`:
```javascript
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  external_id: { type: String, unique: true },
  source: String,
  title: String,
  company: String,
  location: String,
  description: String,
  url: String,
  salary_min: Number,
  salary_max: Number,
  salary_currency: String,
  job_type: String,
  remote: Boolean,
  tags: [String],
  posted_at: Date,
  match_score: Number,
  status: { type: String, default: 'new' },
  favorited: { type: Boolean, default: false },
  notes: String
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);

async function connectDb() {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('MongoDB connected');
}

module.exports = { connectDb, Job };
```

### 4. Update Backend Code

Replace `require('./src/db/database')` calls with the MongoDB module in `src/index.js`.

---

**Built with**:
- ⚡ Node.js + Fastify
- ⚛️ React + Vite
- 🗃️ SQLite (default) / MongoDB (alternative)
- 🔗 Adzuna API

For questions or feature requests: [contact@dicode.tech](mailto:contact@dicode.tech)