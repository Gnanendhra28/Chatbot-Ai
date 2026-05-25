import mongoose, { Schema, Document, modelNames, Model } from "mongoose";

export interface IKnowledgeDocument extends Document {
  userId: string;
  filename: string;
  mimeType: string;
  content: string;
  chunks: Array<{
    text: string;
    embedding?: number[];
    index: number;
  }>;
  characterCount: number;
  chunkCount: number;
  status: "processing" | "ready" | "error";
  errorMessage?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeDocumentSchema = new Schema<IKnowledgeDocument>(
  {
    userId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    content: { type: String, required: true },
    chunks: [
      {
        text: { type: String, required: true },
        embedding: [{ type: Number }],
        index: { type: Number, required: true },
      },
    ],
    characterCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["processing", "ready", "error"],
      default: "processing",
    },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

KnowledgeDocumentSchema.index({ userId: 1, status: 1 });

const KnowledgeDocument: Model<IKnowledgeDocument> =
  mongoose.models.KnowledgeDocument ||
  mongoose.model<IKnowledgeDocument>(
    "KnowledgeDocument",
    KnowledgeDocumentSchema,
  );

export default KnowledgeDocument;
