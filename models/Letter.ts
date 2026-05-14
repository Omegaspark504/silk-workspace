import mongoose, { Schema, Document } from 'mongoose';

export interface ILetter extends Document {
  sender: string;
  senderEmail: string;
  fromUserId: string;
  avatar: string;
  subject: string;
  preview: string;
  content: string;
  time: string;
  isRead: boolean;
  date: string;
  isSystem: boolean;
  userId: string; // recipient's _id
}

const LetterSchema: Schema = new Schema({
  sender:      { type: String, required: true },
  senderEmail: { type: String, default: '' },
  fromUserId:  { type: String, default: '' },
  avatar:      { type: String, default: '' },
  subject:     { type: String, required: true },
  preview:     { type: String, required: true },
  content:     { type: String, default: '' },
  time:        { type: String, required: true },
  isRead:      { type: Boolean, default: false },
  date:        { type: String, required: true },
  isSystem:    { type: Boolean, default: false },
  userId:      { type: String, required: true }, // recipient
}, {
  timestamps: true,
});

// Force re-registration so schema changes (like removing required:true from avatar) take effect after hot-reload
if (mongoose.models.Letter) delete (mongoose.models as any).Letter;
export default mongoose.model<ILetter>('Letter', LetterSchema);
