import mongoose, { Document, Schema } from 'mongoose';

// User Model
export interface IUser extends Document {
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ email: 1 });

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
  syncStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'syncing';
  lastSyncAt?: Date;
  syncStats: {
    totalEmails: number;
    lastEmailDate?: Date;
    errorCount: number;
    lastError?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const emailAccountSchema = new Schema({
  userId: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  provider: { 
    type: String, 
    required: true,
    enum: ['gmail', 'outlook', 'yahoo', 'other'],
    lowercase: true
  },
  imapConfig: {
    host: { type: String, required: true },
    port: { type: Number, required: true, min: 1, max: 65535 },
    secure: { type: Boolean, required: true },
    user: { type: String, required: true },
    pass: { type: String, required: true }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  syncStatus: { 
    type: String, 
    enum: ['connecting', 'connected', 'disconnected', 'error', 'syncing'],
    default: 'disconnected' 
  },
  lastSyncAt: Date,
  syncStats: {
    totalEmails: { type: Number, default: 0 },
    lastEmailDate: Date,
    errorCount: { type: Number, default: 0 },
    lastError: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

emailAccountSchema.index({ userId: 1 });
emailAccountSchema.index({ email: 1 });
emailAccountSchema.index({ isActive: 1, syncStatus: 1 });

export const EmailAccount = mongoose.model<IEmailAccount>('EmailAccount', emailAccountSchema);

// Email Model - Updated with 5 categories
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
  aiProcessed: boolean;
  aiCategory?: 'interested' | 'meeting_booked' | 'not_interested' | 'spam' | 'out_of_office';
  aiConfidence?: number;
  createdAt: Date;
  updatedAt: Date;
}

const emailSchema = new Schema({
  accountId: { 
    type: String, 
    required: true,
    ref: 'EmailAccount',
    index: true
  },
  messageId: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  from: {
    address: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    name: { 
      type: String,
      trim: true
    }
  },
  to: [{
    address: { 
      type: String, 
      required: true,
      lowercase: true,
      trim: true
    },
    name: { 
      type: String,
      trim: true
    }
  }],
  subject: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  textBody: { 
    type: String, 
    required: true
  },
  htmlBody: String,
  folder: { 
    type: String, 
    default: 'INBOX',
    index: true
  },
  isRead: { 
    type: Boolean, 
    default: false,
    index: true
  },
  receivedDate: { 
    type: Date, 
    required: true,
    index: true
  },
  aiProcessed: { 
    type: Boolean, 
    default: false,
    index: true
  },
  aiCategory: { 
    type: String,
    enum: ['interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office'],
    index: true
  },
  aiConfidence: { 
    type: Number,
    min: 0,
    max: 1
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
emailSchema.index({ accountId: 1, receivedDate: -1 });
emailSchema.index({ accountId: 1, isRead: 1 });
emailSchema.index({ accountId: 1, aiCategory: 1 });
emailSchema.index({ 'from.address': 1, receivedDate: -1 });
emailSchema.index({ aiCategory: 1, aiConfidence: -1 });
emailSchema.index({ receivedDate: -1 });

// Text search index
emailSchema.index({ 
  subject: 'text', 
  textBody: 'text',
  'from.name': 'text',
  'from.address': 'text'
});

export const Email = mongoose.model<IEmail>('Email', emailSchema);
