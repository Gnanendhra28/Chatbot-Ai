import mongoose, { Schema, Document, Model } from "mongoose";

export type ConversationStatus = "active" | "archived" | "cancelled";

export interface IConversation extends Document {
  userId: string;
  title: string;
  status: ConversationStatus;
  provider: string;
  modelname: string;
  messageCount: number;
  totalTokens: number;
  avgLatency: number;
  systemPrompt?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: "New Conversation" },
    status: {
      type: String,
      enum: ["active", "archived", "cancelled"],
      default: "active",
      index: true,
    },
    provider: { type: String, required: true, default: "groq" },
    modelname: {
      type: String,
      required: true,
      default: "llama-3.3-70b-versatile",
    },
    messageCount: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    avgLatency: { type: Number, default: 0 },
    systemPrompt: { type: String },
    tags: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index for efficient user queries
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ userId: 1, status: 1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
