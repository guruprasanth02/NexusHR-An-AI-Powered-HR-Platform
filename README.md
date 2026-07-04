# NexusHR — An AI-Powered HR Platform  

> ✨ A modern HR platform combining a Next.js frontend with a TypeScript API and Prisma-backed Postgres persistence. AI-assisted features are optional and pluggable (OpenAI / Gemini).  

## 🚀 Overview
NexusHR provides an opinionated HR application for employee management, recruitment workflows, notifications, and AI-assisted productivity features. It pairs a Next.js (App Router) React UI with a Node/Prisma backend to deliver a full-stack developer experience.

## 🧰 Tech Stack
- **Languages:** TypeScript, CSS
- **Framework / runtime:** Next.js (App Router)
- **ORM / Database:** Prisma → Postgres
- **Notable libraries:** React, Zustand, react-hook-form, framer-motion, recharts

## 📁 Project structure (top-level)
```
README.md
package.json
docker-compose.yml
apps/
  web/                       # main Next.js + API app
    package.json
    next.config.ts
    tsconfig.json
    postcss.config.mjs
    public/                   # static assets
    api/
      .env.example            # example env for server (DB, JWT, SMTP, AI keys)
      prisma/                 # Prisma schema / migrations
      src/                    # backend source for API endpoints and server logic
    src/
      app/                    # Next.js App Router entry (layout, pages)
      components/             # UI components (Sidebar, TopNav, CommandPalette, providers)
      lib/                    # api helpers, store, utils
      hooks/                  # custom React hooks
```

## 🔗 How it fits together
- The Next.js app under `apps/web/src/app` is the front-end entry (layout.tsx + pages).  
- UI components in `src/components` render pages and the global layout (Sidebar, TopNav, CommandPalette).  
- `apps/web/src/lib/api.ts` contains client helpers used by the frontend to call server endpoints implemented in `apps/web/api/src`.  
- Prisma schema and migrations live in `apps/web/api/prisma` and drive the Postgres schema.

## ⚙️ Requirements
- Node.js (compatible version)  
- npm / pnpm / yarn  
- Docker & Docker Compose (recommended for local Postgres)  
- Postgres database (local or hosted) configured via `DATABASE_URL`  
- (Optional) OpenAI / Gemini API key for AI features  
- (Optional) SMTP credentials for email sending

## 🔐 Environment variables
Copy `apps/web/api/.env.example` → `apps/web/api/.env` and fill in required values. Key entries include:
- PORT, NODE_ENV
- DATABASE_URL (Postgres)
- JWT_SECRET, JWT_REFRESH_SECRET (+ expiry values)
- FRONTEND_URL
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
- CLOUDINARY_* (optional)
- OPENAI_API_KEY / GEMINI_API_KEY (optional)

## 🧭 Quick start — local development
1. Clone the repository and start supporting services:
```bash
git clone https://github.com/guruprasanth02/NexusHR-An-AI-Powered-HR-Platform.git
cd NexusHR-An-AI-Powered-HR-Platform
docker-compose up -d
```

2. Prepare server env and install dependencies:
```bash
cp apps/web/api/.env.example apps/web/api/.env
# Edit apps/web/api/.env and fill DATABASE_URL, JWT keys, SMTP and AI keys as needed

cd apps/web
npm install
```

3. Initialize the database (Prisma):
```bash
# generate Prisma client and apply migrations
npx prisma generate --schema=./api/prisma/schema.prisma
# If you use migrations:
npx prisma migrate dev --schema=./api/prisma/schema.prisma
# Or push schema without migrations:
npx prisma db push --schema=./api/prisma/schema.prisma
```

4. Start the development server:
```bash
npm run dev
# Open http://localhost:3000
```

## 🧪 Useful scripts (apps/web/package.json)
- `npm run dev` — start Next.js dev server
- `npm run build` — build production artifacts
- `npm run start` — start production server
- `npm run lint` — run ESLint

## 📦 Prisma & Database notes
- Schema path: `apps/web/api/prisma/schema.prisma`. Ensure `DATABASE_URL` points to the running Postgres.  
- Use `npx prisma studio --schema=./api/prisma/schema.prisma` to inspect data during development.

## 📡 Deployment
- Frontend can be deployed to Vercel. The API and database require hosting or a serverful/serverless strategy.  
- For self-hosting use Docker / Docker Compose or containerized deployments and make sure migrations are applied at startup.

## 💡 Development tips
- If `OPENAI_API_KEY` / `GEMINI_API_KEY` are not set, AI features will use mock responses where implemented.  
- Keep secrets out of Git — use environment or your platform's secret manager.  
- Socket.io client is present; ensure corresponding server support and CORS when using real-time features.

## 🤝 Contributing
Contributions welcome! Please:
- Open an issue to discuss larger changes
- Create feature branches and PRs
- Run linting and tests before submitting
- Add Prisma migrations and, if applicable, seed data for DB model changes

## 🛠️ Troubleshooting
- Missing `DATABASE_URL` or incorrect DB credentials → Prisma connection failures.  
- Prisma client not generated → run `npx prisma generate`.  
- JWT secrets missing → authentication failures.

## 📝 License
Add your license here (e.g., MIT). Include a LICENSE file at repo root.

## 📬 Contact
Repository: https://github.com/guruprasanth02/NexusHR-An-AI-Powered-HR-Platform  
For questions or support, open an issue in the repository.
