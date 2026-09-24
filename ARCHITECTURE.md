# Architecture Notes

## Table of Contents

- [Ingestion Pipeline](#ingestion-pipeline)
- [Logging Strategy](#logging-strategy)
- [Scaling Considerations](#scaling-considerations)
- [Failure Handling](#failure-handling)
- [Reliability Philosophy](#reliability-philosophy)

---

## Ingestion Pipeline

Observability data flows through an asynchronous pipeline that is fully decoupled from the chat response path. This ensures that logging and analytics never affect inference latency or user experience.

```
User Message
      │
      ▼
/api/chat
      │
      ▼
LLM Wrapper SDK
      │
      ▼
Provider Layer (Groq)
      │
      ▼
Generate AI Response ──────────────────────────┐
      │                                         │
      ▼                                         ▼
Collect Metrics                         Return to Frontend
      │
      ▼
Build Log Payload
      │
      ▼
POST /api/ingest (async, fire-and-forget)
      │
      ▼
Validation + Metadata Extraction
      │
      ▼
MongoDB Storage
      │
      ▼
Dashboard Analytics
```

### Step-by-Step Breakdown

**1. User Request**

The frontend posts a message to `/api/chat` with the following payload:

| Field | Description |
|---|---|
| `conversationId` | Active session identifier |
| `message` | User's input text |
| `model` | Selected LLM model |
| `ragEnabled` | Whether to inject RAG context |
| `metadata` | Optional client-side metadata |

**2. LLM Wrapper**

The SDK wrapper (`src/lib/inference-logger.ts`, `src/lib/groq.ts`) handles:
- Routing the request to the configured provider
- Measuring end-to-end latency
- Estimating token usage
- Tracking streaming events
- Catching and recording provider failures

**3. Response Generation**

The provider returns the AI response along with token usage, finish reason, and model metadata, all of which are captured for the observability record.

**4. Observability Collection**

The following metrics are captured per request:

| Metric | Description |
|---|---|
| `latencyMs` | Total request duration |
| `promptTokens` | Input token count |
| `completionTokens` | Output token count |
| `totalTokens` | Combined token usage |
| `tokensPerSecond` | Throughput metric |
| `timeToFirstTokenMs` | Perceived response speed |

**5. Log Shipping**

Metrics are shipped asynchronously to `/api/ingest`. This endpoint is intentionally separate from `/api/chat` to isolate observability concerns from inference logic, and to allow either system to fail independently.

**6. Ingestion API**

The ingestion service validates all incoming payloads with Zod, extracts derived metrics, sanitizes sensitive fields, and persists records to the `inference_logs` MongoDB collection.

**7. Dashboard Consumption**

Dashboard API routes aggregate stored logs to produce usage analytics, token trends, latency distributions, and throughput statistics.

---

## Logging Strategy

NeuralLog uses structured logging across three distinct layers.

### Application Logs (`src/lib/logger.ts`)

Runtime logs covering server lifecycle events, incoming request tracking, and provider execution traces. These are console-level logs intended for development and deployment diagnostics.

### Inference Logs (`inference_logs` collection)

Persisted per-request observability records containing prompt previews, output previews, latency, token usage, provider metadata, and error state. This is the primary data source for the analytics dashboard.

### Conversation Logs (`messages` collection)

Full chat history records storing user messages, assistant replies, timestamps, and message-level metadata. Used for conversation replay, analytics, and future embedding support.

### PII Redaction

All log payloads pass through `src/lib/pii-redaction.ts` before storage. The following patterns are masked:

| Data Type | Example Input | Stored As |
|---|---|---|
| Email address | `john@gmail.com` | `[EMAIL]` |
| Phone number | `+1-800-555-0100` | `[PHONE]` |
| API key | `sk-abc123...` | `[API_KEY]` |
| IP address | `192.168.1.1` | `[IP]` |

### Fire-and-Forget Pattern

Inference logging is non-blocking by design:

```ts
void send();
```

Logging failures are swallowed intentionally — they must never delay or interrupt chat completion. This keeps response times consistent regardless of ingestion pipeline health.

---

## Scaling Considerations

The architecture is designed so that each major concern can scale or be replaced independently.

### Provider Abstraction

All LLM providers implement the `BaseProvider` interface, making it straightforward to add OpenAI, Anthropic, Gemini, or Ollama without modifying application logic. Provider selection is handled at the wrapper layer.

### Decoupled Ingestion

The observability pipeline (`/api/ingest`) is isolated from the chat route. This separation allows the ingestion service to be extracted into a dedicated microservice, scaled independently, or replaced with a managed logging platform without any changes to inference logic.

### Chunk-Based RAG

Documents are split into chunks before indexing. This keeps individual retrieval payloads small, improves relevance scoring, and prevents large documents from consuming the full context window.

### MongoDB Collection Design

Collections are separated by concern to enable efficient, independent indexing and querying:

| Collection | Purpose |
|---|---|
| `conversations` | Session-level metadata |
| `messages` | Full chat history |
| `inference_logs` | Per-request observability |
| `knowledge_documents` | RAG document chunks |

### Async Processing

Log shipping, document processing, and analytics aggregation are all non-blocking. This improves throughput and prevents any background operation from adding latency to the critical path.

### Retrieval Upgrade Path

The current keyword-based retrieval layer is intentionally kept simple. The retrieval module is isolated so it can be swapped for an embedding-based approach (e.g., Pinecone, pgvector) without changes to the RAG injection logic.

### Dashboard Aggregation

Dashboard queries currently compute analytics dynamically on each request. The intended upgrade path is cached aggregations backed by Redis, with scheduled background jobs to pre-compute common queries.

---

## Failure Handling

The system is designed around the assumption that failures in any non-critical subsystem should never propagate to the user-facing chat response.

| Failure Scenario | Behavior |
|---|---|
| Ingestion pipeline fails | Chat response still succeeds; log is dropped silently |
| Provider returns an error | Error state is recorded in the inference log; response returns a graceful message |
| Invalid ingest payload | Rejected at validation with HTTP 422; never reaches the database |
| Unauthenticated request | Returns HTTP 401 immediately; no downstream processing |
| Conversation persistence race | Update failure is caught with `.catch(() => {})` and treated as non-fatal |
| Invalid file upload | Rejected early; only PDF, TXT, and Markdown under 25 MB are accepted |
| Token count unavailable | Falls back to local estimation; approximate metrics are considered acceptable |
| Streaming unavailable | Frontend simulates streaming UX; true SSE/WebSocket streaming is a planned upgrade |

---

## Reliability Philosophy

> **AI response generation must succeed even if observability fails.**

This single principle drives most of the architectural decisions in NeuralLog:

- The ingestion pipeline is async and non-blocking
- Logging failures are isolated and never surfaced to the user
- Provider errors are caught and recorded, not re-thrown
- Analytics are treated as eventually consistent, not transactionally critical

The result is a system where the chat experience remains stable under partial failures, and observability data is collected on a best-effort basis without becoming a reliability liability.
