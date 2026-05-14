import mongoose, { Schema, Document } from 'mongoose';

export interface ISecretMessage extends Document {
  threadId: string;
  fromUserId: string;
  content: string;
}

const SecretMessageSchema: Schema = new Schema({
  threadId:   { type: String, required: true },
  fromUserId: { type: String, required: true },
  content:    { type: String, required: true },
}, { timestamps: true });

SecretMessageSchema.index({ threadId: 1, createdAt: 1 });

export default mongoose.models.SecretMessage ||
  mongoose.model<ISecretMessage>('SecretMessage', SecretMessageSchema);
