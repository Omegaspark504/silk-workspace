import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  title: string;
  time: string;
  preview: string;
  tags: string[];
  date: string;
  folder: string;
  content: string;
  userId: string; // To eventually link to a specific user
}

const NoteSchema: Schema = new Schema({
  title: { type: String, required: true },
  time: { type: String, required: true },
  preview: { type: String, required: true },
  tags: { type: [String], default: [] },
  date: { type: String, required: true },
  folder: { type: String, default: 'Uncategorized' },
  content: { type: String, default: '' },
  userId: { type: String, required: true, default: 'global-demo-user' }
}, {
  timestamps: true,
});

export default mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
