# NeuralLog

> **LLM Observability & RAG Chat Platform**

NeuralLog is a full-stack AI observability platform that provides real-time inference monitoring, retrieval-augmented generation, and a multi-conversation chat interface — all in one cohesive system.

Built with Next.js 15, MongoDB, Clerk, and Groq's Llama 3.3 70B.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Docker Setup](#docker-setup)
- [Database Schema](#database-schema)
- [SDK & Wrapper Layer](#sdk--wrapper-layer)
- [RAG Pipeline](#rag-pipeline)
- [Security](#security)
- [Design Decisions & Tradeoffs](#design-decisions--tradeoffs)
- [Performance](#performance)
- [Roadmap](#roadmap)

---

## Overview

NeuralLog bridges the gap between AI chat interfaces and production-grade observability tooling. Every inference is logged, measured, and surfaced through an analytics dashboard — giving developers full visibility into latency, token usage, throughput, and errors.

---

## Features

### AI Chat

- Multi-conversation management with message persistence
- Streaming typing effect with auto-scroll
- Context-aware responses via RAG

### Observability

- Per-request inference logging (latency, tokens, throughput, errors)
- Dashboard analytics with activity graphs and token metrics
- Real-time monitoring of provider performance

### RAG (Retrieval-Augmented Generation)

- Upload TXT, Markdown, and PDF documents
- Automatic chunking and keyword-based retrieval
- Context injection into LLM prompts

### Authentication & Access Control

- Clerk-powered authentication
- Protected API routes and dashboard pages
- User-scoped conversations and knowledge documents

---

# 🛠️ Tech Stack

| Layer               | Technology                       |
| ------------------- | -------------------------------- |
| Frontend            | Next.js 15, React 18, TypeScript |
| Styling             | Tailwind CSS                     |
| Authentication      | Clerk                            |
| Backend             | Next.js API Routes               |
| Database            | MongoDB + Mongoose               |
| Vector Database     | Qdrant                           |
| LLM                 | Groq (Llama 3.3 70B Versatile)   |
| Embeddings          | Transformer Embedding Model      |
| Document Processing | PDF Parser, Recursive Chunking   |
| Validation          | Zod                              |
| Charts              | Recharts                         |
| Containerization    | Docker & Docker Compose          |
| Deployment          | Vercel / Docker                  |

---

# ⚙️ Core Technologies

### Frontend

- Next.js App Router
- React 18
- TypeScript
- Tailwind CSS
- Recharts
- Lucide Icons

---

### Backend

- Next.js API Routes
- TypeScript
- MongoDB
- Mongoose

---

### AI Stack

- Groq SDK
- Llama 3.3 70B Versatile
- Retrieval-Augmented Generation
- Semantic Search
- Vector Embeddings

---

### Vector Search

- Qdrant
- Dense Retrieval
- Similarity Search
- Metadata Filtering

---

### Authentication

- Clerk Authentication
- User Sessions
- Route Protection

---

### Infrastructure

- Docker
- Docker Compose
- Environment Variables
- Modular Architecture

---

# 📂 Project Structure

```
NeuralLog/
│
├── src/
│
├── app/
│   ├── api/
│   │
│   ├── chat/
│   ├── dashboard/
│   ├── knowledge/
│   ├── settings/
│   └── auth/
│
├── components/
│   ├── chat/
│   ├── dashboard/
│   ├── knowledge/
│   ├── layout/
│   └── ui/
│
├── lib/
│   │
│   ├── db/
│   │   ├── mongoose.ts
│   │   └── models/
│   │
│   ├── rag/
│   │   ├── embeddings.ts
│   │   ├── qdrant.ts
│   │   ├── retrieval.ts
│   │   └── chunking.ts
│   │
│   ├── providers/
│   │   ├── base.ts
│   │   ├── groq.ts
│   │   └── wrapper.ts
│   │
│   ├── observability/
│   │   ├── logger.ts
│   │   ├── metrics.ts
│   │   └── pii.ts
│   │
│   └── utils/
│
├── public/
│
├── docker/
│
├── docker-compose.yml
│
├── package.json
│
└── README.md
```

---

# 🏗️ High-Level System Architecture

```
                    +----------------------+
                    |      User Browser    |
                    +----------+-----------+
                               |
                               |
                               ▼
                    +----------------------+
                    |     Next.js UI       |
                    +----------+-----------+
                               |
                               |
                               ▼
                    +----------------------+
                    |     API Routes       |
                    +----------+-----------+
                               |
          +--------------------+--------------------+
          |                                         |
          |                                         |
          ▼                                         ▼
+-----------------------+              +------------------------+
|     AI Chat API       |              |  Knowledge Base API    |
+-----------+-----------+              +-----------+------------+
            |                                      |
            |                                      |
            ▼                                      ▼
+-----------------------+              +------------------------+
| Embedding Generator   |              | PDF/Text Processing    |
+-----------+-----------+              +-----------+------------+
            |                                      |
            ▼                                      ▼
+-----------------------+              +------------------------+
| Qdrant Vector Search  |              | Recursive Chunking     |
+-----------+-----------+              +-----------+------------+
            |                                      |
            +------------------+-------------------+
                               |
                               ▼
                    +----------------------+
                    | Prompt Builder       |
                    +----------+-----------+
                               |
                               ▼
                    +----------------------+
                    | Groq LLM             |
                    +----------+-----------+
                               |
                               ▼
                    +----------------------+
                    | AI Response          |
                    +----------+-----------+
                               |
                               ▼
                    +----------------------+
                    | Inference Logger     |
                    +----------+-----------+
                               |
                               ▼
                    +----------------------+
                    | MongoDB              |
                    +----------------------+
```

---

# 🔄 Complete AI Request Flow

```
User Prompt
      │
      ▼
Chat API
      │
      ▼
Generate Query Embedding
      │
      ▼
Semantic Search
(Qdrant)
      │
      ▼
Top-K Chunks
      │
      ▼
Prompt Builder
      │
      ▼
Groq Llama 3.3
      │
      ▼
LLM Response
      │
      ▼
Inference Logger
      │
      ▼
MongoDB
      │
      ▼
Dashboard Analytics
```

---

# 📚 Knowledge Base Processing Flow

```
Upload Document
       │
       ▼
File Validation
       │
       ▼
PDF / TXT / Markdown Parsing
       │
       ▼
Text Cleaning
       │
       ▼
Recursive Chunking
       │
       ▼
Embedding Generation
       │
       ▼
Qdrant Indexing
       │
       ▼
MongoDB Metadata Storage
       │
       ▼
Knowledge Base Ready
```

---

# 🧠 Retrieval-Augmented Generation (RAG)

NeuralLog uses a production-inspired Retrieval-Augmented Generation pipeline to provide context-aware responses grounded in user-uploaded knowledge.

### Pipeline

1. User uploads one or more documents.
2. Documents are parsed and cleaned.
3. Text is split into overlapping chunks.
4. Embeddings are generated for every chunk.
5. Chunks are indexed in Qdrant.
6. User submits a question.
7. The query is embedded.
8. Qdrant retrieves the most semantically similar chunks.
9. Retrieved context is injected into the LLM prompt.
10. Groq generates a grounded response.
11. Observability metrics are logged.
12. The dashboard is updated automatically.

---

# 🎯 Design Goals

NeuralLog is designed around the following principles:

- Modular architecture
- Production-ready codebase
- Scalable RAG pipeline
- Provider abstraction
- Enterprise observability
- User isolation
- Semantic retrieval
- Extensible AI infrastructure
- High maintainability
- Clean separation of concerns

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- [Groq API key](https://console.groq.com)
- [Clerk account](https://clerk.com)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd llm-inference-logger
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Database
MONGODB_URI=your_mongodb_uri

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# LLM Provider
GROQ_API_KEY=your_groq_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Defaults
DEFAULT_PROVIDER=groq
DEFAULT_MODEL=llama-3.3-70b-versatile

# Ingestion
INGEST_API_KEY=neurallog-secret
```

### 4. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Docker Setup

To run the full stack with Docker Compose:

```bash
docker compose up --build
```

---

## Database Schema

### `messages`

Stores the full chat history per conversation, including user prompts, assistant responses, token counts, and timestamps. Enables conversation replay, analytics, and future embedding support.

### `inference_logs`

Stores per-request observability data separately from messages — including latency, token usage, throughput, provider metadata, prompt/output previews, and error records. Keeping this separate improves query performance and monitoring scalability.

### `knowledge_documents`

Stores uploaded documents and their extracted text chunks. Enables lightweight RAG retrieval without an external vector database.

### `conversations`

Stores session-level metadata to support conversation analytics independently of message storage.

**Automatically extracted metadata per inference:**

| Field                | Description                      |
| -------------------- | -------------------------------- |
| `promptTokens`       | Input token count                |
| `completionTokens`   | Output token count               |
| `totalTokens`        | Combined token usage             |
| `latencyMs`          | End-to-end request latency       |
| `tokensPerSecond`    | Throughput metric                |
| `provider` / `model` | Provider and model identifier    |
| `ragEnabled`         | Whether RAG context was injected |

---

## SDK & Wrapper Layer

NeuralLog includes a custom provider abstraction that decouples the application from any single LLM provider.

| File                  | Responsibility                                                |
| --------------------- | ------------------------------------------------------------- |
| `base.ts`             | `BaseProvider` interface and completion/streaming types       |
| `groq.ts`             | Groq implementation — `complete()`, `stream()`, token metrics |
| `llm-wrapper.ts`      | Provider registry and routing                                 |
| `inference-logger.ts` | Log construction, PII redaction, and log shipping             |
| `metrics.ts`          | Latency calculation and local token estimation                |
| `pii-redaction.ts`    | Masking for emails, phone numbers, API keys, and IPs          |

---

## RAG Pipeline

```
Document Upload
      │
      ▼
Text Extraction
      │
      ▼
Chunking
      │
      ▼
Keyword Retrieval  ←─── User Query
      │
      ▼
Context Injection into Prompt
      │
      ▼
LLM Response
```

Documents are uploaded via the Knowledge Base UI and processed through `/api/knowledge`. At inference time, relevant chunks are retrieved and injected into the system prompt before the request is sent to the LLM.

---

## Security

- **Authentication** — Clerk-managed sessions with protected routes
- **Authorization** — All conversations and documents are user-scoped; no cross-user data access
- **PII Redaction** — Emails, phone numbers, API keys, and IP addresses are masked before log storage
- **Input Validation** — All API payloads are validated with Zod schemas

---

## Design Decisions & Tradeoffs

### Keyword Retrieval vs. Embeddings

Keyword-based RAG avoids the need for a vector database, keeping the stack simple and self-contained. The tradeoff is lower semantic accuracy for queries that don't share vocabulary with the source documents.

### Simulated Streaming

The typing effect is simulated on the frontend rather than implemented as true token-level streaming. This simplifies the architecture but means perceived latency doesn't reflect actual time-to-first-token.

### MongoDB vs. SQL

MongoDB's flexible document model suits AI metadata well — inference logs and message payloads vary in structure across providers. The tradeoff is weaker relational enforcement compared to a SQL schema.

### Local Token Estimation

Token counts are estimated locally rather than sourced from provider APIs. This keeps the metrics layer provider-independent but produces approximate counts that may differ from billed usage.

---

## Performance

- Indexed MongoDB queries for fast log and message retrieval
- Async log ingestion — inference logging does not block the chat response
- Chunk-based RAG processing to limit retrieval overhead
- Lazy-loaded dashboard components

---

## Roadmap

**RAG & AI**

- Vector embeddings with semantic search
- Pinecone / pgvector integration
- Hybrid retrieval (keyword + semantic)
- Multi-provider routing with automatic fallback

**Observability**

- WebSocket-based real-time monitoring
- Distributed tracing support
- Advanced analytics and alerting

**Infrastructure**

- Redis caching layer
- Background job queues with retry logic
- Rate limiting per user and provider

**UX**

- Markdown and syntax-highlighted message rendering
- Drag-and-drop document uploads
- Mobile-responsive layout

---

## Built With

Next.js · TypeScript · MongoDB · Groq · Clerk · Tailwind CSS · Mongoose · Docker
