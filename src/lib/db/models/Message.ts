import mongoose, { Schema, Document, Model } from "mongoose";

export type MessageRole = "user" | "assistant" | "system";

export interface IMessage extends Document {
  conversationId: string;
  role: MessageRole;
  content: string;
  contentRedacted?: string; // PII-redacted version for logs
  tokens?: number;
  finishReason?: string;
  ragSources?: Array<{ documentId: string; score: number; excerpt: string }>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
      ref: "Conversation",
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    contentRedacted: { type: String },
    tokens: { type: Number },
    finishReason: { type: String },
    ragSources: [
      {
        documentId: String,
        score: Number,
        excerpt: String,
      },
    ],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({
  role: 1,
  createdAt: -1,
});

MessageSchema.index({
  tokens: -1,
});

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
