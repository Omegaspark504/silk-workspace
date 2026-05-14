import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  image?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyDigest: boolean;
    theme: 'system' | 'light' | 'dark';
    compact: boolean;
  };
}

const UserSchema: Schema = new Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  // passwordHash is empty string for OAuth-only users
  passwordHash: { type: String, default: '' },
  image:        { type: String, default: null },
  bio:          { type: String, default: '' },
  phone:        { type: String, default: '' },
  location:     { type: String, default: '' },
  website:      { type: String, default: '' },
  twitter:      { type: String, default: '' },
  linkedin:     { type: String, default: '' },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications:  { type: Boolean, default: false },
    weeklyDigest:       { type: Boolean, default: true },
    theme:              { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
    compact:            { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
