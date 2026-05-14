import mongoose, { Schema, Document } from 'mongoose';

export interface ISecretThread extends Document {
  participants: [string, string]; // exactly 2 user IDs, sorted ascending
  lastMessage: string;
  lastAt: Date;
}

const SecretThreadSchema: Schema = new Schema({
  participants: { type: [String], required: true }, // sorted [smallerId, largerId]
  lastMessage:  { type: String, default: '' },
  lastAt:       { type: Date,   default: Date.now },
}, { timestamps: true });

// Unique constraint so one thread ever exists per pair
SecretThreadSchema.index({ participants: 1 }, { unique: true });

export default mongoose.models.SecretThread ||
  mongoose.model<ISecretThread>('SecretThread', SecretThreadSchema);
