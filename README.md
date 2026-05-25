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

## Tech Stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Frontend         | Next.js 15, React, TypeScript, Tailwind CSS |
| Backend          | Next.js API Routes, MongoDB, Mongoose       |
| LLM              | Groq SDK — Llama 3.3 70B Versatile          |
| Auth             | Clerk                                       |
| Validation       | Zod                                         |
| Containerization | Docker, Docker Compose                      |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                     # Sign-in and sign-up pages
│   ├── (dashboard)/                # Chat and conversations views
│   ├── api/                        # API routes
│   │   ├── chat/                   # LLM inference endpoint
│   │   ├── conversations/          # Conversation CRUD
│   │   ├── dashboard/              # Analytics aggregation
│   │   ├── ingest/                 # Log ingestion pipeline
│   │   ├── knowledge/              # Document management
│   │   └── metrics/                # Token & latency metrics
│   ├── dashboard/                  # Dashboard page
│   ├── knowledge/                  # Knowledge base page
│   └── settings/                   # User settings
│
├── components/
│   └── chat/
│       ├── ChatInterface.tsx
│       ├── ChatWindow.tsx
│       ├── MetricsCards.tsx
│       └── Sidebar.tsx
│
└── lib/
    ├── db/
    │   ├── models/                 # Mongoose schemas
    │   │   ├── Conversation.ts
    │   │   ├── InferenceLog.ts
    │   │   ├── KnowledgeDocument.ts
    │   │   └── Message.ts
    │   └── mongoose.ts             # DB connection
    ├── rag/
    │   └── retrieval.ts            # Chunking & retrieval logic
    ├── base.ts                     # Provider abstraction
    ├── groq.ts                     # Groq implementation
    ├── inference-logger.ts         # SDK wrapper & log shipping
    ├── llm-wrapper.ts              # Provider registry
    ├── metrics.ts                  # Latency & token helpers
    └── pii-redaction.ts            # Sensitive data masking
```

---

## Architecture

```
Frontend Chat UI
       │
       ▼
 /api/chat Route
       │
       ▼
 LLM Wrapper SDK
       │
       ▼
 Groq Provider
       │
       ▼
 Inference Logger ──────────────────────┐
       │                                │
       ▼                                ▼
 RAG Retrieval                  /api/ingest Pipeline
 (Context Injection)                    │
       │                                ▼
       ▼                         MongoDB Storage
 LLM Response                          │
                                        ▼
                               Dashboard Analytics
```

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
