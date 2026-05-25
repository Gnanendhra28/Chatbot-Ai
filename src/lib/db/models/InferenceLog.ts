import mongoose, { Schema, Document, Model } from "mongoose";

export type LogStatus = "success" | "error" | "timeout" | "cancelled";

export interface IInferenceLog extends Document {
  // Identity
  sessionId: string;
  conversationId: string;
  messageId?: string;
  userId?: string;

  // Provider / Model
  provider: string;
  modelname: string;

  // Timing
  requestedAt: Date;
  respondedAt?: Date;
  latencyMs: number;
  timeToFirstTokenMs?: number;

  // Token usage
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  // Status
  status: LogStatus;
  errorMessage?: string;
  errorCode?: string;
  httpStatus?: number;
  finishReason?: string;

  // Content previews (truncated, PII-redacted)
  inputPreview: string;
  outputPreview?: string;

  // Request config
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  ragEnabled: boolean;

  // Throughput
  tokensPerSecond?: number;

  metadata: Record<string, unknown>;
  createdAt: Date;
}

const InferenceLogSchema = new Schema<IInferenceLog>(
  {
    sessionId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true, index: true },
    messageId: { type: String, index: true },
    userId: { type: String, index: true },

    provider: { type: String, required: true },
    modelname: { type: String, required: true },

    requestedAt: { type: Date, required: true },
    respondedAt: { type: Date },
    latencyMs: { type: Number, required: true, default: 0 },
    timeToFirstTokenMs: { type: Number },

    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["success", "error", "timeout", "cancelled"],
      required: true,
      index: true,
    },
    errorMessage: { type: String },
    errorCode: { type: String },
    httpStatus: { type: Number },
    finishReason: { type: String },

    inputPreview: { type: String, required: true },
    outputPreview: { type: String },

    temperature: { type: Number },
    maxTokens: { type: Number },
    stream: { type: Boolean, default: false },
    ragEnabled: { type: Boolean, default: false },

    tokensPerSecond: { type: Number },

    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    // Capped collection option for high volume — disabled by default, enable for production
    // capped: { size: 100 * 1024 * 1024, max: 100000 },
  },
);

// Indexes for dashboard queries
InferenceLogSchema.index({ createdAt: -1 });
InferenceLogSchema.index({ userId: 1, createdAt: -1 });
InferenceLogSchema.index({ provider: 1, model: 1, createdAt: -1 });
InferenceLogSchema.index({ status: 1, createdAt: -1 });

const InferenceLog: Model<IInferenceLog> =
  mongoose.models.InferenceLog ||
  mongoose.model<IInferenceLog>("InferenceLog", InferenceLogSchema);

export default InferenceLog;
