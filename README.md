# JamNote

JamNote is a collaborative note-taking web application that allows users to create, organize, and share notes in real time.

It supports authentication, notebook organization, role-based sharing, and live note editing using WebSockets.

---

# Features

- Secure authentication using JWT
- Notebook and note sharing with viewer/editor roles
- Real-time collaborative editing powered by Socket.IO
- Trash and restore functionality for notes and notebooks
- Password reset flow with email support
- Structured REST API backend

---

# Tech Stack

## Frontend
- React
- TypeScript
- Vite

## Backend
- Node.js
- Express
- TypeScript
- MongoDB
- Socket.IO

## Other Tools
- JWT Authentication
- Resend (email service)
- Render (deployment)

---

# Project Structure

```text
JamNote/
│
├── back_end/      Express + TypeScript + MongoDB API
├── front_end/     React + TypeScript + Vite client
└── render.yaml    Render deployment configuration


## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/yashgarg1708/JamNote.git
cd JamNote
```

### 2. Create environment file

```bash
cp .env.example .env
```

Update `.env` with:

```env
MONGO_URI=<your_mongodb_connection>
```

### 3. Start Backend

```bash
cd back_end
npm install
npm run dev
```

Backend runs at:

```text
http://localhost:8000
```

### 4. Start Frontend

```bash
cd front_end
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

---

## Live Demo

https://jamnote.onrender.com/

---

## Author

**Yash Garg**

GitHub: https://github.com/yashgarg1708  
LinkedIn: https://linkedin.com/in/yashgarg1708

<img width="1512" height="859" alt="Screenshot 2026-03-08 at 4 29 23 PM" src="https://github.com/user-attachments/assets/94553880-3502-4d9a-a02b-79fea492241d" />
<img width="1512" height="855" alt="Screenshot 2026-03-08 at 4 29 47 PM" src="https://github.com/user-attachments/assets/0670cce4-ede9-4232-88d4-15577591d5ec" />
<img width="1510" height="857" alt="Screenshot 2026-03-08 at 4 30 02 PM" src="https://github.com/user-attachments/assets/ac9baa95-fa82-4a8a-80e2-737f01c2e485" />
<img width="1512" height="856" alt="Screenshot 2026-03-08 at 4 30 12 PM" src="https://github.com/user-attachments/assets/63af7887-5582-45f7-80e1-d072ab2e398c" />

