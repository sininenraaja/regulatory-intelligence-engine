# Regulatory Intelligence Engine MVP

AI-powered monitoring system for Finnish chemical industry regulations. Automatically fetches regulations from Finlex, analyzes relevance and impact using Google Gemini AI, and provides a professional dashboard for Kemira Oyj.

## 🎯 Overview

The Regulatory Intelligence Engine helps Kemira Oyj stay compliant with Finnish chemical regulations by:

1. **Automated Monitoring** - Fetches regulations from Finlex RSS feed every 6 hours
2. **AI Analysis** - Uses Gemini 2.5 Flash to score relevance (0-100) and generate impact analysis
3. **Smart Caching** - Avoids redundant API calls with intelligent caching
4. **Professional Dashboard** - Beautiful web interface with filtering, search, and sorting
5. **Document Exports** - Generate PDF and DOCX reports with full analysis

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Gemini API key from [https://ai.google.dev/](https://ai.google.dev/)
- (Optional) Vercel account for deployment

### 1. Get Gemini API Key

1. Visit [https://ai.google.dev/](https://ai.google.dev/)
2. Sign in with Google
3. Click "Get API Key" → "Create API key"
4. Copy the key

### 2. Setup Local Development

```bash
# Navigate to project
cd "Regulatory Intelligence Engine/regulatory-intelligence-engine"

# Configure environment
cp .env.local.example .env.local

# Edit .env.local and add your Gemini API key
# GEMINI_API_KEY=your_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📋 Project Structure

```
app/
├── api/                    # API routes
│   ├── monitor/route.ts    # Cron: Finlex monitoring
│   ├── analyze/route.ts    # Manual re-analysis
│   ├── export/[format]/    # PDF/DOCX export
│   └── regulations/route.ts# List regulations
├── components/             # Shared React components
├── alert/[id]/page.tsx    # Regulation detail page
├── page.tsx               # Home page
└── layout.tsx             # Root layout

lib/
├── db/                    # Database operations
│   ├── schema.ts         # Database schema
│   └── operations.ts     # CRUD functions
├── ai/                   # AI integration
│   ├── gemini.ts        # Gemini API
│   └── prompts.ts       # Prompt templates
├── parsers/             # RSS parsing
│   └── finlex.ts        # Finlex RSS parser
└── exporters/           # Document generation
    ├── pdf.ts          # PDF export
    └── docx.ts         # DOCX export
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Node.js, Next.js API Routes
- **Database:** Vercel Postgres (managed PostgreSQL)
- **AI:** Google Gemini 2.5 Flash API
- **Export:** pdfkit, docx
- **Deployment:** Vercel (including cron jobs)

## 🚢 Deploy to Vercel

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial: Regulatory Intelligence Engine MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/repo-name.git
   git push -u origin main
   ```

2. **Import on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your GitHub repo
   - Click "Import"

3. **Configure**
   - Add `GEMINI_API_KEY` environment variable
   - Generate and add `CRON_SECRET` (random string for security)

4. **Add Database**
   - Go to "Storage" tab
   - Click "Create Database" → "Postgres"
   - Vercel auto-populates database env vars

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your deployment URL

## 📊 Database Setup

Tables are automatically created on first deploy:

- **regulations** - Stores regulations data and AI analysis
- **action_items** - Compliance action items per regulation
- **gemini_cache** - Caches AI responses to save API quota

Schema is defined in `lib/db/schema.ts`.

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/monitor` | POST | Cron job: fetch & analyze Finlex regulations |
| `/api/analyze` | POST | Force re-analyze a regulation |
| `/api/export/pdf` | GET | Download regulation as PDF |
| `/api/export/docx` | GET | Download regulation as DOCX |
| `/api/regulations` | GET | List all regulations with filters |

## 🔑 Environment Variables

```env
# Required
GEMINI_API_KEY=sk-...           # Google Gemini API key
CRON_SECRET=random-secret-here  # Cron job authentication

# Auto-populated by Vercel (when using Postgres)
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Optional
NEXT_PUBLIC_APP_NAME=Regulatory Intelligence Engine
NEXT_PUBLIC_COMPANY_NAME=Kemira Oyj
```

## ⚙️ Configuration

### Cron Job Schedule

Edit `vercel.json` to change monitoring frequency:
```json
{
  "crons": [{
    "path": "/api/monitor",
    "schedule": "0 */6 * * *"  # Every 6 hours
  }]
}
```

### Relevance Threshold

In `app/api/monitor/route.ts`, adjust the relevance score threshold:
```typescript
const RELEVANCE_THRESHOLD = 40; // regulations with score > 40 get full analysis
```

## 📱 Features

### Implemented (MVP)
- ✅ Finlex RSS monitoring every 6 hours
- ✅ AI relevance scoring (0-100)
- ✅ Full impact analysis for relevant regulations
- ✅ Web dashboard with filtering/search/sort
- ✅ PDF and DOCX export
- ✅ Kemira-specific insights
- ✅ Response caching
- ✅ Professional Kemira branding

### Future Enhancements
- Authentication with NextAuth.js
- Email alerts for high-impact regulations
- User action item tracking
- Advanced analytics dashboard
- Mobile app

## 🐛 Troubleshooting

### "Database connection failed"
- Ensure Vercel Postgres is added to project
- Check environment variables are set
- Restart deployment

### "No regulations showing"
- Trigger manual monitoring via API call
- Check cron job logs in Vercel dashboard
- Wait for Finlex RSS to have new items

### "Gemini API rate limited"
- Free tier: 2 req/min, 50 req/day
- Caching prevents duplicate calls
- Upgrade to paid tier if needed

### Development without database
- App gracefully handles missing DB during dev
- For testing with real data, set up Vercel Postgres

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini API](https://ai.google.dev/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Implementation Plan](./../../plans/polished-waddling-moon.md)

## 📄 License

© 2025 Kemira Oyj - Proprietary Demo

---

Built with ❤️ by Anthropic Claude Code
# Deployment attempt at to 18. joulu 2025  8.11.12
// Database connected
