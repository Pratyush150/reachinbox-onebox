import mongoose, { Document, Schema } from 'mongoose';

// Enhanced Email Model with Full State Persistence
export interface IEmail extends Document {
  accountId: string;
  messageId: string;
  threadId?: string;
  
  // Email Headers
  from: { address: string; name?: string };
  to: { address: string; name?: string }[];
  cc?: { address: string; name?: string }[];
  bcc?: { address: string; name?: string }[];
  replyTo?: { address: string; name?: string };
  
  // Content
  subject: string;
  textBody: string;
  htmlBody?: string;
  snippet: string; // First 150 chars for preview
  
  // Metadata
  folder: string;
  labels: string[];
  flags: string[];
  
  // State Management (CRITICAL FOR UI PERSISTENCE)
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  isSnoozed: boolean;
  snoozeUntil?: Date;
  
  // Dates
  receivedDate: Date;
  sentDate?: Date;
  
  // AI Processing
  aiProcessed: boolean;
  aiCategory?: 'interested' | 'meeting_booked' | 'not_interested' | 'spam' | 'out_of_office';
  aiConfidence?: number;
  aiInsights?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    urgency: 'high' | 'medium' | 'low';
    intent: string;
    keyTopics: string[];
    suggestedResponse?: string;
  };
  
  // Attachments
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    contentId?: string;
    url?: string;
  }[];
  
  // Threading
  inReplyTo?: string;
  references: string[];
  
  // User Actions History
  actions: {
    type: string; // "read", "star", "archive", etc.
    timestamp: Date;
    metadata?: any;
  }[];
  
  // Timestamps
  lastActionAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance Methods
  markAsRead(): Promise<IEmail>;
  markAsUnread(): Promise<IEmail>;
  toggleStar(): Promise<IEmail>;
  archive(): Promise<IEmail>;
  restore(): Promise<IEmail>;
  moveToFolder(targetFolder: string): Promise<IEmail>;
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
  threadId: {
    type: String,
    trim: true,
    index: true
  },
  
  // Email Headers
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
  cc: [{
    address: { 
      type: String,
      lowercase: true,
      trim: true
    },
    name: { 
      type: String,
      trim: true
    }
  }],
  bcc: [{
    address: { 
      type: String,
      lowercase: true,
      trim: true
    },
    name: { 
      type: String,
      trim: true
    }
  }],
  replyTo: {
    address: { 
      type: String,
      lowercase: true,
      trim: true
    },
    name: { 
      type: String,
      trim: true
    }
  },
  
  // Content
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
  snippet: {
    type: String,
    maxlength: 200
  },
  
  // Metadata
  folder: { 
    type: String, 
    default: 'inbox',
    enum: ['inbox', 'sent', 'drafts', 'archive', 'deleted', 'spam', 'scheduled'],
    index: true
  },
  labels: [{
    type: String,
    trim: true
  }],
  flags: [{
    type: String,
    trim: true
  }],
  
  // State Management (KEY FOR UI PERSISTENCE)
  isRead: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isStarred: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isArchived: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isDeleted: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isSnoozed: { 
    type: Boolean, 
    default: false
  },
  snoozeUntil: Date,
  
  // Dates
  receivedDate: { 
    type: Date, 
    required: true,
    index: true
  },
  sentDate: Date,
  
  // AI Processing
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
  },
  aiInsights: {
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    urgency: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    intent: String,
    keyTopics: [String],
    suggestedResponse: String
  },
  
  // Attachments
  attachments: [{
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    contentId: String,
    url: String
  }],
  
  // Threading
  inReplyTo: String,
  references: [String],
  
  // User Actions History
  actions: [{
    type: { 
      type: String, 
      required: true,
      enum: ['read', 'unread', 'star', 'unstar', 'archive', 'restore', 'delete', 'move', 'label']
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    metadata: Schema.Types.Mixed
  }],
  
  // Timestamps
  lastActionAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Performance Indexes
emailSchema.index({ accountId: 1, receivedDate: -1 });
emailSchema.index({ accountId: 1, isRead: 1, isDeleted: 1 });
emailSchema.index({ accountId: 1, folder: 1, isDeleted: 1 });
emailSchema.index({ accountId: 1, isArchived: 1, isDeleted: 1 });
emailSchema.index({ aiCategory: 1, aiConfidence: -1 });
emailSchema.index({ isRead: 1, isArchived: 1, isDeleted: 1 });
emailSchema.index({ 'from.address': 1, receivedDate: -1 });
emailSchema.index({ threadId: 1, receivedDate: -1 });
emailSchema.index({ lastActionAt: -1 });

// Text search index
emailSchema.index({
  subject: 'text',
  textBody: 'text',
  'from.name': 'text',
  'from.address': 'text'
});

// Virtuals
emailSchema.virtual('isUnread').get(function() {
  return !this.isRead;
});

emailSchema.virtual('priority').get(function() {
  if (this.aiCategory === 'interested') return 'high';
  if (this.aiCategory === 'meeting_booked') return 'urgent';
  return 'normal';
});

// Middleware to update snippet
emailSchema.pre('save', function(next) {
  if (this.textBody && !this.snippet) {
    this.snippet = this.textBody.substring(0, 150).trim();
  }
  if (this.isModified('isRead') || this.isModified('isStarred') || this.isModified('isArchived')) {
    this.lastActionAt = new Date();
  }
  next();
});

// Instance Methods
emailSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.actions.push({ type: 'read', timestamp: new Date() });
  this.lastActionAt = new Date();
  return this.save();
};

emailSchema.methods.markAsUnread = function() {
  this.isRead = false;
  this.actions.push({ type: 'unread', timestamp: new Date() });
  this.lastActionAt = new Date();
  return this.save();
};

emailSchema.methods.toggleStar = function() {
  this.isStarred = !this.isStarred;
  this.actions.push({ 
    type: this.isStarred ? 'star' : 'unstar', 
    timestamp: new Date() 
  });
  this.lastActionAt = new Date();
  return this.save();
};

emailSchema.methods.archive = function() {
  this.isArchived = true;
  this.folder = 'archive';
  this.actions.push({ type: 'archive', timestamp: new Date() });
  this.lastActionAt = new Date();
  return this.save();
};

emailSchema.methods.restore = function() {
  this.isArchived = false;
  this.folder = 'inbox';
  this.actions.push({ type: 'restore', timestamp: new Date() });
  this.lastActionAt = new Date();
  return this.save();
};

emailSchema.methods.moveToFolder = function(targetFolder: string) {
  this.folder = targetFolder;
  this.actions.push({ 
    type: 'move', 
    timestamp: new Date(), 
    metadata: { targetFolder } 
  });
  this.lastActionAt = new Date();
  return this.save();
};

export const Email = mongoose.model<IEmail>('Email', emailSchema);

// Draft Model
export interface IDraft extends Document {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  
  attachments: {
    filename: string;
    contentType: string;
    size: number;
    path: string;
  }[];
  
  scheduledFor?: Date;
  isScheduled: boolean;
  
  lastSavedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const draftSchema = new Schema({
  accountId: { 
    type: String, 
    required: true,
    ref: 'EmailAccount'
  },
  to: [{ 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  }],
  cc: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],
  bcc: [{ 
    type: String,
    trim: true,
    lowercase: true
  }],
  subject: { 
    type: String, 
    required: true,
    trim: true
  },
  body: { 
    type: String, 
    required: true
  },
  htmlBody: String,
  
  attachments: [{
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }
  }],
  
  scheduledFor: Date,
  isScheduled: { 
    type: Boolean, 
    default: false 
  },
  
  lastSavedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

draftSchema.index({ accountId: 1, updatedAt: -1 });
draftSchema.index({ scheduledFor: 1, isScheduled: 1 });

export const Draft = mongoose.model<IDraft>('Draft', draftSchema);

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
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);

// EmailAccount Model
export interface IEmailAccount extends Document {
  userId: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'other';
  displayName?: string;
  
  imapConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string; // encrypted
  };
  
  // Sync Status
  isActive: boolean;
  syncStatus: 'connecting' | 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSyncAt?: Date;
  
  // Statistics
  syncStats?: {
    totalEmails: number;
    lastFetchedUid?: number;
    errorCount: number;
    lastError?: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const emailAccountSchema = new Schema({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
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
    enum: ['gmail', 'outlook', 'yahoo', 'other']
  },
  displayName: {
    type: String,
    trim: true
  },
  
  imapConfig: {
    host: {
      type: String,
      required: true
    },
    port: {
      type: Number,
      required: true
    },
    secure: {
      type: Boolean,
      required: true
    },
    user: {
      type: String,
      required: true
    },
    pass: {
      type: String,
      required: true
    }
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  syncStatus: {
    type: String,
    enum: ['pending', 'connecting', 'connected', 'syncing', 'error', 'disconnected'],
    default: 'connecting',
    index: true
  },
  lastSyncAt: Date,
  
  syncStats: {
    totalEmails: {
      type: Number,
      default: 0
    },
    lastFetchedUid: Number,
    errorCount: {
      type: Number,
      default: 0
    },
    lastError: String
  }
}, {
  timestamps: true
});

// Indexes for performance
emailAccountSchema.index({ userId: 1, isActive: 1 });
emailAccountSchema.index({ syncStatus: 1, isActive: 1 });

export const EmailAccount = mongoose.model<IEmailAccount>('EmailAccount', emailAccountSchema);
