# AI-Powered Evangadi Forum

A full-stack Q&A forum for developers, with Google Gemini built into the workflow. Users can post technical questions, answer each other, find related threads by **meaning** (not just keywords), get AI feedback on their writing, and chat with their own PDF notes through a private knowledge base.

Built as a team project during the [Evangadi](https://www.evangadi.com/) full-stack bootcamp (Phase 4).

---

## Features

**Forum**
- Register / log in with JWT authentication; new users are signed in right after registering
- Post questions (Markdown supported) and answer other people's questions
- "My Questions" page for everything you've posted
- Profile page with password change

**AI features (Google Gemini)**
- **Semantic search** – questions are turned into vector embeddings, so searching "login keeps failing" can find "JWT token not accepted"
- **Draft coach** – AI feedback on a question draft before you post it
- **Answer fit check** – rates whether an answer actually addresses the question (strong / partial / weak)
- **Knowledge Base (RAG)** – upload PDFs or text files, search inside them, and ask questions answered from your own documents, with citations to the chunks used
- **Support chat** – an in-app assistant for signed-in users

## Tech Stack

| Layer    | Tools |
|----------|-------|
| Frontend | React 19, Vite, React Router, Framer Motion, Axios, React Markdown, Lucide icons |
| Backend  | Node.js, Express 5, express-validator, JWT, bcrypt, Multer |
| Database | MySQL (`mysql2`) |
| AI       | Google Gemini – text generation + `gemini-embedding-001` embeddings |

## How it works (high level)

```
React (Vite) ──Axios + JWT──▶ Express API ──▶ MySQL
                                   │
                                   └──▶ Gemini (embeddings + text)
```

- Every question gets an embedding stored in `question_vectors`. Semantic search embeds the query and ranks questions by **cosine similarity**.
- For the Knowledge Base, an uploaded PDF is split into overlapping text chunks, each chunk is embedded, and the most similar chunks are sent to Gemini as context for the answer.

> Note: the RAG pipeline here is a learning implementation to show the core idea. A production RAG system would use a dedicated vector database and a more advanced retrieval pipeline.

## Project Structure

```
backend/
  db/            schema.sql + MySQL connection
  src/api/       routes (auth, questions, rag, support)
  src/question/  question + answer logic
  src/ragController/  PDF parsing, chunking, embeddings, vector search
  src/middleware/     auth, validation, error handling
frontend/
  src/pages/       Landing, Auth, Dashboard, PostQuestion, QuestionDetail, MyQuestions, KnowledgeBase, Profile
  src/components/  Layout, Navbar, Sidebar, ProtectedRoute, SupportChat
  src/contexts/    AuthContext, Theme
  src/services/    API client + feature services
```

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+
- A Google Gemini API key – get one at [Google AI Studio](https://aistudio.google.com/)

### 1. Clone
```bash
git clone https://github.com/abeselom20/ai-powered-evangadi-forum.git
cd ai-powered-evangadi-forum
```

### 2. Database
Create a database and import the schema:
```bash
mysql -u root -p -e "CREATE DATABASE evangadi_forum_db;"
mysql -u root -p evangadi_forum_db < backend/db/schema.sql
```

### 3. Backend
```bash
cd backend
npm install
cp .env.example .env
```
Open `backend/.env`, remove the `#` at the start of each line, and fill in your values:

| Variable | What it is |
|----------|-----------|
| `PORT` | Port the API runs on (e.g. `3777`) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Your MySQL connection |
| `JWT_SECRET` | Any long random string used to sign login tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `1d` |
| `GEMINI_API_KEY` | Your Gemini API key |
| `GEMINI_TEXT_MODEL`, `GEMINI_EMBEDDING_MODEL` | Gemini models to use |

Then start it:
```bash
npm run dev
```

### 4. Frontend
In a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Make sure `VITE_API_BASE_URL` in `frontend/.env` points to the backend port you chose (e.g. `http://localhost:3777`).

Open the URL Vite prints (usually `http://localhost:5173`).

## Main API Endpoints

All routes are under `/api`. 🔒 = requires a JWT.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create an account (returns a token) |
| POST | `/auth/login` | Log in |
| GET  | `/auth/me` 🔒 | Current user (checked against the database) |
| GET  | `/questions` | List questions (`?search=`, `?mine=true`) |
| GET  | `/questions/search` | Semantic search |
| POST | `/questions` 🔒 | Post a question |
| POST | `/questions/draft-coach` | AI feedback on a draft |
| GET  | `/questions/:questionHash` | Question with its answers |
| POST | `/questions/:questionHash/answers` 🔒 | Post an answer |
| POST | `/questions/:questionHash/answer-fit` 🔒 | AI answer-fit check |
| POST | `/rag/upload` 🔒 | Upload a PDF/TXT to your knowledge base |
| GET  | `/rag/documents` 🔒 | List your documents |
| POST | `/rag/search` 🔒 | Search inside your documents |
| POST | `/rag/ask` 🔒 | Ask AI using your documents |
| POST | `/support/chat` 🔒 | Support assistant |

## Author

**Adamu** – [@abeselom20](https://github.com/abeselom20)
Built with teammates as part of the Evangadi bootcamp.
