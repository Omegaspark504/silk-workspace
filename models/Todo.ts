import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  title: string;
  category: string;
  isCompleted: boolean;
  desc: string | null;
  isPrimary: boolean;
  progress: number | null;
  userId: string;
}

const TodoSchema: Schema = new Schema({
  title: { type: String, required: true },
  category: { type: String, default: 'General' },
  isCompleted: { type: Boolean, default: false },
  desc: { type: String, default: null },
  isPrimary: { type: Boolean, default: false },
  progress: { type: Number, default: null },
  userId: { type: String, required: true, default: 'global-demo-user' }
}, {
  timestamps: true,
});

export default mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);
