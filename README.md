# JamNotes

Collaborative notes app with:
- JWT auth (access + refresh token flow)
- Notebook and note sharing (viewer/editor roles)
- Realtime note editing with Socket.IO
- Trash/restore flows for notes and notebooks
- Password reset flow

## Current Scope

This repository currently implements collaborative **notes**

- `back_end` - Express + TypeScript + MongoDB API
- `front_end` - React + TypeScript + Vite client

## Local Setup

1. Create env file:
   - `cp .env.example .env`
2. Set `MONGO_URI` in `.env`
3. Install dependencies and run:
   - `cd back_end`
   - `npm install`
   - `npm run dev`
4. Start frontend:
   - `cd front_end`
   - `npm install`
   - `npm run dev`

Backend default URL: `http://localhost:8000`
Frontend default URL: `http://localhost:5173`

## Deploy (Only `MONGO_URI` Required)

This repo includes:
- backend static serving for built frontend
- `render.yaml` for one-service non-Docker deployment

Minimal required runtime env:
- `MONGO_URI`

Everything else has safe defaults.

## Password Reset Mailer

Real email provider is supported via Resend (optional):
- `RESEND_API_KEY`
- `MAIL_FROM`
- `FRONTEND_URL` (recommended in production so reset links use your app URL)

If mailer vars are not configured, reset links are logged on server.

### Mailer Setup (Resend + Render)

1. Create a Resend API key in the Resend dashboard.
2. Verify your sender domain in Resend, or use sandbox sender:
   - `JamNotes <onboarding@resend.dev>` (testing only)
3. In Render service env vars, set:
   - `RESEND_API_KEY=<your_key>`
   - `MAIL_FROM=JamNotes <your_verified_sender@yourdomain.com>`
   - `FRONTEND_URL=https://your-frontend-domain`
4. Redeploy the service.
5. Test from UI:
   - Open `Forgot password` and submit a registered email.
   - Check inbox/spam for reset email.

## Environment Variables Reference

- Root: `.env.example`

## Scripts

Backend:
- `npm run dev`
- `npm run build`
- `npm start`

Frontend:
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`
