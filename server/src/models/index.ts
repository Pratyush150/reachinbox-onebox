import mongoose, { Document, Schema } from 'mongoose';

// User Model
export interface IUser extends Document {
  email: string;
  name: string;
}

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);

// Email Account Model
export interface IEmailAccount extends Document {
  userId: string;
  email: string;
  provider: string;
  imapConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  isActive: boolean;
  syncStatus: string;
}

const emailAccountSchema = new Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  provider: { type: String, required: true },
  imapConfig: {
    host: String,
    port: Number,
    secure: Boolean,
    user: String,
    pass: String
  },
  isActive: { type: Boolean, default: true },
  syncStatus: { type: String, default: 'disconnected' }
}, { timestamps: true });

export const EmailAccount = mongoose.model<IEmailAccount>('EmailAccount', emailAccountSchema);

// Email Model
export interface IEmail extends Document {
  accountId: string;
  messageId: string;
  from: { address: string; name?: string };
  to: { address: string; name?: string }[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  folder: string;
  isRead: boolean;
  receivedDate: Date;
  aiCategory?: string;
  aiConfidence?: number;
}

const emailSchema = new Schema({
  accountId: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  from: {
    address: { type: String, required: true },
    name: String
  },
  to: [{
    address: { type: String, required: true },
    name: String
  }],
  subject: { type: String, required: true },
  textBody: { type: String, required: true },
  htmlBody: String,
  folder: { type: String, default: 'INBOX' },
  isRead: { type: Boolean, default: false },
  receivedDate: { type: Date, required: true },
  aiCategory: String,
  aiConfidence: Number
}, { timestamps: true });

export const Email = mongoose.model<IEmail>('Email', emailSchema);
