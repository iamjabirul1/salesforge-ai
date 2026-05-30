# SalesForge AI 🚀
### Autonomous AI Sales Organization

> Replace 70% of your SDR team with AI agents that find prospects, write personalized emails, handle objections, and fill your pipeline — 24/7.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/iamjabirul1/salesforge-ai&project-name=salesforge-ai&repository-name=salesforge-ai&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,OPENROUTER_API_KEY,BREVO_API_KEY,RESEND_API_KEY,NEXT_PUBLIC_APP_URL&envDescription=API%20keys%20needed%20for%20SalesForge%20AI)

---

## ⚡ Quick Deploy (2 Minutes)

### Step 1: Click the Deploy Button Above

Or go to: https://vercel.com/new/clone?repository-url=https://github.com/iamjabirul1/salesforge-ai

### Step 2: Set Environment Variables in Vercel

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dlxzbwhfdazopymzcvfe.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(from your Supabase dashboard)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from your Supabase dashboard)* |
| `OPENROUTER_API_KEY` | *(from openrouter.ai)* |
| `BREVO_API_KEY` | *(from brevo.com)* |
| `RESEND_API_KEY` | *(from resend.com)* |
| `NEXT_PUBLIC_APP_URL` | *(your-app.vercel.app — fill after deploy)* |

### Step 3: Deploy → Done!

---

## Local Development

```bash
git clone https://github.com/iamjabirul1/salesforge-ai
cd salesforge-ai
npm install
npm run dev
```

App runs at http://localhost:3000

---

## Features

| Feature | Description |
|---------|-------------|
| CEO Orchestrator | Autonomous goal decomposition and agent delegation |
| Research Agent | Apollo.io lead discovery and ICP scoring |
| Email Writer Agent | Personalized cold outreach (AIDA/PAS frameworks) |
| Follow-Up Agent | Reply classification and objection handling |
| Human-in-the-Loop | Approval queue for all emails before sending |
| CRM Pipeline | Kanban deal board with drag-and-drop |
| Brevo Integration | Email sending without domain verification |
| Analytics | Open rates, reply rates, agent performance |

---

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL + Realtime + Auth)
- **AI**: OpenRouter (DeepSeek V3, Gemini 2.5 Flash, Llama 3.3 70B)
- **Email**: Brevo + Resend
- **Monitoring**: Langfuse
- **Deploy**: Vercel
