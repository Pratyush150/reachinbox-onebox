# ReachInbox - AI-Powered Email Management System

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [AI System](#ai-system)
8. [API Documentation](#api-documentation)
9. [Database Design](#database-design)
10. [Configuration](#configuration)
11. [Deployment](#deployment)
12. [Development Workflow](#development-workflow)
13. [Troubleshooting](#troubleshooting)

## Overview

ReachInbox is a sophisticated email management system that combines IMAP email synchronization with advanced AI classification and automated response generation. The system provides intelligent email categorization, sales pipeline insights, and AI-powered reply suggestions to streamline email workflow for businesses and sales teams.

### Key Features

**Email Management**
- Multi-account IMAP synchronization with Gmail, Outlook, and custom email servers
- Real-time email processing and categorization
- Advanced search capabilities powered by Elasticsearch
- Bulk operations and email threading
- Email state persistence with read/unread, starred, and archived status

**AI-Powered Intelligence**
- Automatic email classification into sales categories (Interested, Meeting Booked, Not Interested, Spam, Out of Office)
- Confidence scoring for each classification
- Sales opportunity analysis with pipeline value estimation
- Intelligent reply generation using local LLM (Qwen2:0.5b)
- Custom prompt support for personalized responses

**Business Intelligence**
- Sales pipeline tracking and analytics
- Lead scoring and prioritization
- Performance metrics and trend analysis
- Real-time notification system for high-priority emails
- Integration with Slack and external webhooks

**User Experience**
- Modern React-based interface with dark/light mode support
- Real-time updates and responsive design
- Advanced filtering and search functionality
- Keyboard shortcuts and accessibility features
- Mobile-optimized responsive layout

## System Architecture

ReachInbox follows a modern microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express API    │    │   Database      │
│   (Port 3001)   │◄──►│  (Port 5001)    │◄──►│   MongoDB       │
└─────────────────┘    └─────────────────┘    │   Elasticsearch │
                                              │   Redis         │
                                              └─────────────────┘
         │                        │
         │                        ▼
         │               ┌─────────────────┐
         │               │  IMAP Service   │
         │               │  Multi-Account  │
         │               └─────────────────┘
         │                        │
         │                        ▼
         │               ┌─────────────────┐
         │               │   AI Service    │
         │               │  Qwen2:0.5b     │
         │               └─────────────────┘
         │                        │
         │                        ▼
         │               ┌─────────────────┐
         └──────────────►│  Notification   │
                        │    Service      │
                        └─────────────────┘
```

### Component Overview

**Frontend Layer**
- React 19 with TypeScript for type safety
- Tailwind CSS for responsive design
- Headless UI components for accessibility
- React Query for state management and caching

**Backend Layer**
- Express.js REST API with TypeScript
- MongoDB for primary data storage
- Elasticsearch for advanced search capabilities
- Redis for caching and session management

**Service Layer**
- IMAP Service for email synchronization
- AI Service for classification and response generation
- Notification Service for real-time alerts

**External Integrations**
- IMAP servers (Gmail, Outlook, GoDaddy, custom)
- Ollama with Qwen2:0.5b local LLM
- Slack webhooks for notifications
- External webhook endpoints

## Technology Stack

### Backend Technologies

**Core Framework**
- Node.js 18+ with TypeScript for type safety and modern JavaScript features
- Express.js 4.18+ for REST API development with comprehensive middleware support
- MongoDB 7+ with Mongoose ODM for flexible document storage and relationship management
- Elasticsearch 8.8+ for full-text search and advanced query capabilities
- Redis 7+ for caching, session management, and real-time data

**Email Processing**
- IMAP library for multi-protocol email server connectivity
- Mailparser for robust email content parsing and attachment handling
- Bull queue system for background job processing and email synchronization

**AI and Machine Learning**
- Ollama integration for local LLM deployment and management
- Qwen2:0.5b model for email classification and response generation
- Custom rule-based fallback system for high availability

**Security and Validation**
- Joi for comprehensive input validation and sanitization
- Helmet for security headers and protection against common vulnerabilities
- CORS configuration for cross-origin resource sharing
- Password encryption for sensitive credential storage

### Frontend Technologies

**Core Framework**
- React 19 with latest concurrent features and improved rendering
- TypeScript 5.3+ for comprehensive type safety and developer experience
- Vite build system for fast development and optimized production builds

**UI and Styling**
- Tailwind CSS 4.1+ for utility-first responsive design
- Headless UI 2.2+ for accessible, unstyled component primitives
- Heroicons for consistent iconography throughout the application
- Custom CSS animations and transitions for enhanced user experience

**State Management and Data Fetching**
- TanStack React Query 5.83+ for server state management and caching
- React Context for global application state
- Local state with React hooks for component-level state management

**Development Tools**
- ESLint and Prettier for code quality and formatting
- Jest and React Testing Library for comprehensive testing
- Storybook for component development and documentation

### Infrastructure and DevOps

**Containerization**
- Docker containers for consistent development and deployment environments
- Docker Compose for local development orchestration
- Multi-stage builds for optimized production images

**Database Systems**
- MongoDB with replica sets for high availability
- Elasticsearch cluster for scalable search capabilities
- Redis cluster for distributed caching and session management

**Monitoring and Logging**
- Winston for structured logging with multiple transport options
- Custom error handling and reporting system
- Performance monitoring and memory management

## Installation & Setup

### Prerequisites

Before setting up ReachInbox, ensure your system meets the following requirements:

**System Requirements**
- Node.js 18.0 or higher with npm package manager
- Docker and Docker Compose for containerized services
- Git for version control and repository management
- At least 4GB RAM for optimal performance with AI models
- 10GB available disk space for databases and models

**Email Account Requirements**
- Gmail account with App Password generated (not regular password)
- Outlook account with modern authentication enabled
- Custom IMAP server credentials if using third-party providers
- Administrative access for account configuration

### Quick Start

**1. Repository Setup**
```bash
# Clone the repository
git clone https://github.com/your-username/reachinbox.git
cd reachinbox

# Install dependencies for all packages
npm run setup
```

**2. Environment Configuration**
```bash
# Copy environment template
cp server/.env.example server/.env

# Edit configuration with your settings
nano server/.env
```

**3. Database Services**
```bash
# Start MongoDB, Elasticsearch, and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

**4. AI Model Setup (Optional)**
```bash
# Install Ollama for local AI
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the Qwen2 model
ollama pull qwen2:0.5b
```

**5. Application Launch**
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run server:dev  # Backend on port 5001
npm run client:dev  # Frontend on port 3001
```

### Environment Configuration

The system requires comprehensive environment configuration for proper operation:

**Server Configuration (server/.env)**
```env
# Core server settings
NODE_ENV=development
PORT=5001
API_PREFIX=/api/v1

# Database connections
MONGODB_URI=mongodb://admin:password123@localhost:27017/reachinbox?authSource=admin
MONGODB_DB_NAME=reachinbox
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Authentication and security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
ENCRYPT_SECRET=your-encryption-secret-for-passwords-32-chars-long

# Email account configuration
GMAIL_USER_1=your-email@gmail.com
GMAIL_PASS_1=your-app-password
GMAIL_IMAP_HOST_1=imap.gmail.com
GMAIL_IMAP_PORT_1=993

# AI service configuration
OLLAMA_URL=http://localhost:11434
LLM_MODEL=qwen2:0.5b

# Notification services
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EXTERNAL_WEBHOOK_URL=https://webhook.site/your-unique-id
FRONTEND_URL=http://localhost:3001

# Performance and limits
MAX_EMAILS_PER_SYNC=1000
SYNC_INTERVAL_MINUTES=5
RATE_LIMIT_MAX_REQUESTS=100
```

### Initial Setup and Testing

**1. Database Initialization**
The system automatically creates necessary indexes and collections on first startup. Monitor the logs to ensure successful database connection and initialization.

**2. Email Account Setup**
```bash
# Test email account setup
curl -X POST http://localhost:5001/api/v1/test/setup-accounts

# Generate sample data for testing
curl -X POST http://localhost:5001/api/v1/test/sample-emails \
  -H "Content-Type: application/json" \
  -d '{"count": 20}'
```

**3. System Health Check**
```bash
# Verify all services
curl http://localhost:5001/health

# Check API documentation
curl http://localhost:5001/api/v1/docs
```

**4. Frontend Access**
Navigate to `http://localhost:3001` to access the web interface. The application should load with sample data and demonstrate full functionality including email listing, AI classification, and response generation.

## Backend Architecture

The backend follows a layered architecture pattern with clear separation of concerns and modular design:

### Directory Structure

```
server/
├── src/
│   ├── app.ts                 # Application entry point and middleware setup
│   ├── config/                # Configuration modules
│   │   ├── database.ts        # MongoDB connection and setup
│   │   └── elasticsearch.ts   # Elasticsearch client and indexing
│   ├── middleware/            # Express middleware functions
│   │   └── errorHandler.ts    # Global error handling and validation
│   ├── models/                # Database schemas and models
│   │   └── index.ts           # Mongoose models for Email, User, Account
│   ├── routes/                # API route definitions
│   │   ├── emails.ts          # Email CRUD and search operations
│   │   ├── ai.ts              # AI classification and response generation
│   │   ├── accounts.ts        # Email account management
│   │   └── test.ts            # Development and testing endpoints
│   ├── services/              # Business logic and external integrations
│   │   ├── ImapService.ts     # Email synchronization and processing
│   │   ├── AiService.ts       # AI classification and response generation
│   │   ├── LocalLLMService.ts # Ollama integration and model management
│   │   ├── NotificationService.ts # Slack and webhook notifications
│   │   └── index.ts           # Service initialization and coordination
│   └── utils/                 # Utility functions and helpers
│       ├── emailUtils.ts      # Email processing and analysis utilities
│       └── logger.ts          # Winston logging configuration
├── scripts/                   # Database initialization and migration scripts
└── package.json              # Dependencies and scripts
```

### Core Services

**IMAP Service (ImapService.ts)**
The IMAP service manages multi-account email synchronization with robust error handling and reconnection logic:

```typescript
class ImapService extends EventEmitter {
  private connections: Map<string, ImapConnection>
  private aiService: AiService
  private notificationService: NotificationService

  // Key features:
  // - Multi-account IMAP connection management
  // - Automatic reconnection with exponential backoff
  // - Real-time email processing and AI classification
  // - Elasticsearch indexing for search capabilities
  // - Bulk email processing for performance optimization
}
```

The service handles multiple email providers simultaneously, processes incoming emails in real-time, and maintains persistent connections with automatic reconnection capabilities. Email processing includes parsing, AI classification, and database storage with comprehensive error handling.

**AI Service (AiService.ts & LocalLLMService.ts)**
The AI system provides intelligent email classification and response generation:

```typescript
class LocalLLMService {
  private ollamaUrl: string
  private modelName: string = 'qwen2:0.5b'
  private classificationQueue: Array<ClassificationTask>

  // Key capabilities:
  // - Sequential email classification to prevent model overload
  // - Rule-based fallback for high availability
  // - Sales insights generation with confidence scoring
  // - Custom prompt support for personalized responses
  // - Performance optimization with request queuing
}
```

The AI service uses a hybrid approach combining local LLM processing with rule-based classification fallbacks. The system maintains high availability by gracefully degrading to rule-based classification when the LLM is unavailable, ensuring continuous operation.

**Notification Service (NotificationService.ts)**
Real-time notification system for high-priority emails:

```typescript
class NotificationService {
  // Supported notification channels:
  // - Slack webhook integration with rich message formatting
  // - External webhook endpoints for third-party integrations
  // - Email notifications for critical events
  // - Structured logging for audit trails
}
```

### API Route Architecture

**Email Routes (/api/v1/emails)**
Comprehensive email management with advanced features:

```typescript
// Core email operations
GET    /emails              # List emails with filtering and pagination
GET    /emails/:id          # Retrieve single email with full content
PUT    /emails/:id/read     # Mark email as read with state persistence
PUT    /emails/:id/star     # Toggle star status
PUT    /emails/:id/archive  # Archive email with folder management

// Advanced operations
GET    /emails/search       # Full-text search with Elasticsearch
POST   /emails/bulk-actions # Bulk operations (read, archive, delete)
GET    /emails/stats        # Email statistics and analytics
GET    /emails/search-status # Search service health check
```

**AI Routes (/api/v1/ai)**
AI-powered email intelligence and automation:

```typescript
// Classification and analysis
POST   /ai/classify         # Single email classification with confidence scoring
POST   /ai/batch-classify   # Bulk email classification for performance
GET    /ai/categories       # Available categories with descriptions and examples

// Response generation
POST   /ai/generate-reply   # AI-powered response generation with custom prompts
GET    /ai/sales-insights/:id # Detailed sales analysis for specific emails

// Analytics and insights
GET    /ai/insights/summary # AI performance metrics and trend analysis
```

**Account Routes (/api/v1/accounts)**
Email account management and configuration:

```typescript
// Account management
GET    /accounts            # List all configured email accounts
POST   /accounts            # Add new email account with validation
GET    /accounts/:id        # Retrieve account details and status
DELETE /accounts/:id        # Remove account and cleanup connections

// Configuration and testing
GET    /accounts/providers  # Supported email providers and settings
POST   /accounts/:id/test-connection # Test account connectivity
GET    /accounts/:id/stats  # Account-specific email statistics
```

### Database Models

**Email Model**
Comprehensive email document structure with full state management:

```typescript
interface IEmail extends Document {
  // Core email data
  accountId: string           # Associated email account
  messageId: string          # Unique message identifier
  from: EmailAddress         # Sender information
  to: EmailAddress[]         # Recipients
  subject: string            # Email subject
  textBody: string           # Plain text content
  htmlBody?: string          # HTML content
  
  // State management
  isRead: boolean            # Read status
  isStarred: boolean         # Star status
  isArchived: boolean        # Archive status
  folder: string             # Current folder location
  
  // AI processing results
  aiCategory: AICategory     # Classification result
  aiConfidence: number       # Confidence score (0-1)
  aiInsights: SalesInsights  # Advanced sales analysis
  
  // Metadata and tracking
  receivedDate: Date         # Email receipt timestamp
  attachments: Attachment[]  # File attachments
  actions: UserAction[]      # Action history for audit trails
}
```

**Email Account Model**
Email account configuration with connection management:

```typescript
interface IEmailAccount extends Document {
  userId: string             # Owner user ID
  email: string              # Email address
  provider: string           # Email provider type
  
  imapConfig: {              # IMAP connection settings
    host: string
    port: number
    secure: boolean
    user: string
    pass: string             # Encrypted password
  }
  
  syncStatus: string         # Current synchronization status
  syncStats: {               # Performance metrics
    totalEmails: number
    lastSyncAt: Date
    errorCount: number
  }
}
```

### Error Handling and Reliability

The backend implements comprehensive error handling with graceful degradation:

**Global Error Handler**
Centralized error processing with structured logging and user-friendly responses:

```typescript
export const errorHandler = (error: AppError, req: Request, res: Response, next: NextFunction) => {
  // Log error details for debugging
  logger.error('API Error:', { error: error.message, path: req.path, stack: error.stack })
  
  // Return appropriate HTTP status and user message
  const statusCode = error.statusCode || 500
  res.status(statusCode).json({
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  })
}
```

**Service Resilience**
Each service implements circuit breaker patterns and fallback mechanisms:

- IMAP Service: Automatic reconnection with exponential backoff
- AI Service: Graceful fallback to rule-based classification
- Search Service: MongoDB fallback when Elasticsearch is unavailable
- Notification Service: Queued delivery with retry logic

### Performance Optimization

**Memory Management**
Optimized for t3.medium instances with 4GB RAM:

```typescript
// Memory monitoring and garbage collection
const MEMORY_LIMIT_MB = 2048  # 2GB limit for application
const CHECK_INTERVAL = 30000  # 30-second monitoring

setInterval(() => {
  const memUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  
  if (heapUsedMB > MEMORY_LIMIT_MB * 0.9) {
    if (global.gc) global.gc()  # Force garbage collection
  }
}, CHECK_INTERVAL)
```

**Database Optimization**
Strategic indexing for query performance:

```typescript
// Email collection indexes
emailSchema.index({ accountId: 1, receivedDate: -1 })  # Account timeline
emailSchema.index({ aiCategory: 1, aiConfidence: -1 }) # AI classification
emailSchema.index({ isRead: 1, folder: 1 })           # Status filtering
emailSchema.index({ 'from.address': 1 })              # Sender queries
```

**Caching Strategy**
Redis integration for frequently accessed data:

```typescript
// Cache email statistics for dashboard
const cacheKey = `stats:${accountId}:${timeRange}`
const cachedStats = await redis.get(cacheKey)

if (cachedStats) {
  return JSON.parse(cachedStats)
} else {
  const stats = await calculateEmailStats(accountId, timeRange)
  await redis.setex(cacheKey, 300, JSON.stringify(stats))  # 5-minute cache
  return stats
}
```

## Frontend Architecture

The frontend is built as a modern React application with TypeScript, emphasizing performance, accessibility, and user experience:

### Directory Structure

```
client/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── email/           # Email-specific components
│   │   │   ├── EmailList.jsx        # Email listing with virtual scrolling
│   │   │   └── EmailDetail.jsx      # Email viewing and reply interface
│   │   ├── layout/          # Layout and navigation components
│   │   │   └── Sidebar.jsx          # Navigation sidebar with statistics
│   │   └── ui/              # Generic UI components
│   │       ├── SearchCombobox.jsx   # Advanced search interface
│   │       ├── FilterMenu.jsx       # Email filtering options
│   │       ├── AnalyticsModal.jsx   # Business intelligence dashboard
│   │       └── ComposeModal.jsx     # Email composition interface
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions and helpers
│   ├── types/               # TypeScript type definitions
│   └── App.tsx              # Main application component
├── public/                  # Static assets and HTML template
└── package.json            # Dependencies and build scripts
```

### Core Components

**EmailDashboard (Main Application)**
The central component orchestrating the entire email management interface:

```typescript
const EmailDashboard = () => {
  // State management for application-wide data
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedCategory, setSelectedCategory] = useState('inbox')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState([])
  
  // Real-time email synchronization
  useEffect(() => {
    const loadEmails = async () => {
      const fetchedEmails = await apiService.fetchEmails(selectedCategory)
      setEmails(fetchedEmails)
    }
    loadEmails()
  }, [selectedCategory])
  
  // Advanced filtering and search integration
  const filteredEmails = useMemo(() => {
    return emails.filter(email => {
      // Apply category, search, and custom filters
      return matchesFilters(email, { selectedCategory, searchTerm, activeFilters })
    }).sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate))
  }, [emails, selectedCategory, searchTerm, activeFilters])
}
```

**EmailList Component**
High-performance email listing with virtual scrolling and bulk operations:

```typescript
const EmailList = ({ emails, selectedEmailId, onEmailSelect, onBulkAction }) => {
  // Virtual scrolling for performance with large email lists
  const [selectedEmails, setSelectedEmails] = useState(new Set())
  const [sortBy, setSortBy] = useState('receivedDate')
  
  // Bulk operation handling
  const handleBulkAction = (action, emailIds) => {
    onBulkAction(action, Array.from(emailIds))
    setSelectedEmails(new Set())  # Clear selection after action
  }
  
  // Optimized rendering with React.memo and useMemo
  const EmailListItem = React.memo(({ email, isSelected, onSelect }) => (
    <div 
      className={`email-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(email.id)}
    >
      <EmailPreview email={email} />
      <AIClassificationBadge category={email.aiCategory} confidence={email.aiConfidence} />
    </div>
  ))
}
```

**EmailDetail Component**
Comprehensive email viewing with AI-powered reply generation:

```typescript
const EmailDetail = ({ email, onReply, onArchive, isDarkMode }) => {
  const [replyText, setReplyText] = useState('')
  const [isGeneratingReply, setIsGeneratingReply] = useState(false)
  const [replyMode, setReplyMode] = useState('rich')  # rich text or plain text
  
  // AI reply generation with custom prompts
  const generateAiReply = async (customPrompt = '') => {
    setIsGeneratingReply(true)
    try {
      const response = await fetch('/api/v1/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          customPrompt,
          useLocalLLM: true
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setReplyText(data.data.generatedReply)
      }
    } finally {
      setIsGeneratingReply(false)
    }
  }
  
  // Enhanced email content rendering with sanitization
  const renderEmailContent = () => {
    if (email.htmlBody) {
      return (
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.htmlBody) }}
        />
      )
    }
    return <div className="whitespace-pre-wrap">{email.textBody}</div>
  }
}
```

### Advanced UI Components

**SearchCombobox Component**
Intelligent search with real-time suggestions and Elasticsearch integration:

```typescript
const SearchCombobox = ({ onSearch, isDarkMode }) => {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchMetadata, setSearchMetadata] = useState(null)
  
  // Debounced search with performance optimization
  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length > 2) {
        const response = await fetch(`/api/v1/emails/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await response.json()
        
        if (data.success) {
          setSearchResults(data.data.emails)
          setSearchMetadata(data.data.searchMetadata)  # Elasticsearch metadata
        }
      }
    }, 300),
    []
  )
  
  // Search result highlighting and categorization
  const highlightSearchTerms = (text, searchTerm) => {
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.split(regex).map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 rounded px-1">{part}</mark>
      ) : part
    )
  }
}
```

**AnalyticsModal Component**
Comprehensive business intelligence dashboard with interactive charts:

```typescript
const AnalyticsModal = ({ isOpen, onClose, isDarkMode }) => {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  
  // Real-time analytics data loading
  useEffect(() => {
    if (isOpen) {
      const loadAnalytics = async () => {
        const [statsResponse, trendsResponse] = await Promise.all([
          fetch('/api/v1/emails/stats'),
          fetch(`/api/v1/ai/insights/summary?days=${selectedTimeRange}`)
        ])
        
        const stats = await statsResponse.json()
        const trends = await trendsResponse.json()
        
        setAnalyticsData({ stats: stats.data, trends: trends.data })
      }
      loadAnalytics()
    }
  }, [isOpen, selectedTimeRange])
  
  // Interactive chart components
  const InteractiveLineChart = ({ data, title }) => {
    const [hoveredPoint, setHoveredPoint] = useState(null)
    
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">{title}</h4>
        <svg width="100%" height="300" viewBox="0 0 400 200">
          {/* SVG chart rendering with hover interactions */}
          {data.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === index ? 6 : 4}
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}
        </svg>
      </div>
    )
  }
}
```

### State Management

**API Service Integration**
Centralized API communication with error handling and caching:

```typescript
const apiService = {
  async fetchEmails(folder = 'inbox', page = 1, limit = 50) {
    try {
      const response = await fetch(`/api/v1/emails?folder=${folder}&page=${page}&limit=${limit}`)
      const data = await response.json()
      return data.success ? data.data.emails : []
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      return []
    }
  },
  
  async markEmailRead(emailId) {
    const response = await fetch(`/api/v1/emails/${emailId}/read`, { method: 'PUT' })
    return response.json()
  },
  
  async bulkAction(action, emailIds) {
    const response = await fetch('/api/v1/emails/bulk-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, emailIds })
    })
    return response.json()
  }
}
```

**Real-time Updates**
WebSocket integration for live email updates and notifications:

```typescript
useEffect(() => {
  // WebSocket connection for real-time updates
  const ws = new WebSocket('ws://localhost:5001/ws')
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    switch (data.type) {
      case 'new_email':
        setEmails(prev => [data.email, ...prev])
        showNotification('New email received', data.email.subject)
        break
        
      case 'email_classified':
        setEmails(prev => prev.map(email => 
          email.id === data.emailId 
            ? { ...email, aiCategory: data.category, aiConfidence: data.confidence }
            : email
        ))
        break
    }
  }
  
  return () => ws.close()
}, [])
```

### Performance Optimization

**Component Optimization**
React performance best practices throughout the application:

```typescript
// Memoized components to prevent unnecessary re-renders
const EmailListItem = React.memo(({ email, isSelected, onSelect }) => {
  return (
    <div className={`email-item ${isSelected ? 'selected' : ''}`}>
      <EmailPreview email={email} />
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.email.id === nextProps.email.id && 
         prevProps.isSelected === nextProps.isSelected
})

// Optimized event handlers with useCallback
const handleEmailSelect = useCallback((emailId) => {
  setSelectedEmailId(emailId)
  // Mark as read automatically
  apiService.markEmailRead(emailId)
}, [])

// Efficient filtering with useMemo
const filteredEmails = useMemo(() => {
  return emails.filter(email => {
    if (activeFilters.includes('unread') && email.isRead) return false
    if (searchTerm && !email.subject.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })
}, [emails, activeFilters, searchTerm])
```


## 7. AI System

ReachInbox integrates a sophisticated AI classification system using Qwen2:0.5B local LLM with intelligent fallback mechanisms to ensure 100% uptime and accurate email categorization.

### AI Architecture Overview

The AI system operates on a hybrid architecture combining local LLM processing with rule-based classification fallbacks. This dual-layer approach ensures continuous operation even when the LLM service is unavailable, maintaining system reliability for critical business operations.

### Local LLM Integration

**Qwen2:0.5B Model Configuration**

The system utilizes Qwen2:0.5B, a compact yet powerful language model optimized for email classification tasks. The model runs locally via Ollama, providing fast inference times while maintaining data privacy.

```typescript
class LocalLLMService {
  private ollamaUrl: string = 'http://localhost:11434';
  private modelName: string = 'qwen2:0.5b';
  private requestTimeout: number = 8000;
  
  // Sequential queue processing prevents model overload
  private classificationQueue: Array<ClassificationTask> = [];
}
```

**Queue-Based Processing System**

The AI service implements a sequential queue system to prevent overwhelming the LLM with concurrent requests. This ensures stable performance and consistent response times across all email classifications.

The queue processes emails one by one, maintaining classification quality while preventing memory issues on t3.medium instances. Each classification request includes both category determination and confidence scoring.

### Classification Categories

The system classifies emails into five primary categories optimized for sales and business workflows:

**Interested**: Emails indicating buying intent, demo requests, or positive engagement signals. These emails receive the highest priority routing and immediate notification triggers.

**Meeting Booked**: Confirmed meetings, calendar acceptances, and scheduled appointment confirmations. These trigger urgent notifications and preparation workflows.

**Not Interested**: Rejection emails, unsubscribe requests, and explicit negative responses. These are routed to nurturing sequences or removed from active follow-up lists.

**Spam**: Promotional content, automated marketing emails, and irrelevant communications. These are automatically filtered and archived.

**Out of Office**: Vacation replies and automatic responses. These trigger delayed follow-up scheduling based on return dates.

### Advanced Sales Insights

Beyond basic classification, the AI system generates comprehensive sales insights for business-relevant emails:

**Purchase Confidence Scoring**: Analyzes email content to determine likelihood of purchase conversion, ranging from 0-100% based on buying signals and language patterns.

**Urgency Assessment**: Evaluates temporal indicators and language urgency to categorize response priority as high, medium, or low.

**Deal Value Estimation**: Estimates potential deal value based on company signals, team size mentions, and budget indicators found in email content.

**Buying Signal Detection**: Identifies specific phrases and contexts that indicate purchase readiness, such as "budget approved" or "ready to implement."

**Next Action Recommendations**: Provides contextual suggestions for optimal follow-up actions based on email content and classification results.

### Intelligent Fallback System

When the LLM service is unavailable, the system seamlessly transitions to a sophisticated rule-based classification engine. This fallback system maintains operational continuity while providing reliable categorization based on keyword patterns and linguistic analysis.

The fallback engine uses weighted scoring algorithms that analyze email subject lines, body content, and sender patterns to determine the most appropriate category. This ensures that no emails remain unprocessed during LLM downtime.

### AI Service Performance Optimization

The AI service includes memory management optimizations specifically designed for t3.medium instances. Memory usage monitoring prevents system overload, while garbage collection triggers maintain stable performance during high-volume email processing.

Response caching reduces redundant LLM calls for similar email patterns, improving overall system throughput while maintaining classification accuracy.

## 8. API Documentation

ReachInbox provides a comprehensive REST API designed for scalability and integration flexibility. All endpoints follow RESTful conventions with consistent response formatting and comprehensive error handling.

### API Base Configuration

**Base URL**: `http://65.1.63.189:5001/api/v1`
**Authentication**: Bearer token (JWT) - Currently in development mode
**Content-Type**: `application/json`
**Rate Limiting**: 100 requests per 15-minute window

### Email Management Endpoints

**GET /emails**
Retrieves paginated email list with advanced filtering capabilities.

Query Parameters:
- `page` (integer): Page number for pagination (default: 1)
- `limit` (integer): Items per page (default: 50, max: 150)
- `folder` (string): Filter by folder (inbox, sent, drafts, archive, deleted)
- `aiCategory` (string): Filter by AI classification
- `isRead` (boolean): Filter by read status
- `isStarred` (boolean): Filter by starred status
- `accountId` (string): Filter by specific email account
- `search` (string): Full-text search across subject and body
- `sortBy` (string): Sort field (receivedDate, subject, from)
- `sortOrder` (string): Sort direction (asc, desc)

Response includes email objects with complete metadata, AI classification results, and pagination information.

**GET /emails/:id**
Retrieves detailed information for a specific email including full content, attachments, and AI insights.

**PUT /emails/:id/read**
Marks an email as read and updates the last action timestamp.

**PUT /emails/:id/unread**
Marks an email as unread for follow-up processing.

**PUT /emails/:id/star**
Toggles the starred status of an email.

**PUT /emails/:id/archive**
Archives an email by moving it to the archive folder and updating the archived status.

**POST /emails/bulk-actions**
Performs bulk operations on multiple emails simultaneously.

Request Body:
```json
{
  "action": "markRead|markUnread|archive|delete|restore",
  "emailIds": ["email_id_1", "email_id_2"]
}
```

**GET /emails/search**
Advanced search endpoint with Elasticsearch integration for high-performance full-text search.

Query Parameters:
- `q` (string): Search query across all email content
- `from` (string): Filter by sender address
- `subject` (string): Search within subject lines
- `dateFrom` (string): Start date filter (ISO format)
- `dateTo` (string): End date filter (ISO format)
- `hasAttachments` (boolean): Filter emails with attachments

**GET /emails/stats**
Provides comprehensive email statistics broken down by folders, categories, and status indicators.

Returns aggregated counts for inbox, sent, drafts, archive, and deleted folders, along with AI category distributions and read/unread ratios.

**GET /emails/search-status**
Returns the current status of the Elasticsearch search service, including availability and performance metrics.

### AI Processing Endpoints

**POST /ai/classify**
Classifies email content using the AI system and returns category predictions with confidence scores.

Request Body:
```json
{
  "subject": "Email subject line",
  "body": "Email content text",
  "from": {
    "address": "sender@example.com",
    "name": "Sender Name"
  }
}
```

Response includes classification category, confidence percentage, and detailed sales analysis.

**POST /ai/generate-reply**
Generates AI-powered email replies using the local LLM system.

Request Body:
```json
{
  "emailId": "email_id",
  "tone": "professional|friendly|enthusiastic|brief",
  "customPrompt": "Optional custom instructions",
  "useLocalLLM": true
}
```

Returns generated reply content with multiple options and sales insights.

**GET /ai/sales-insights/:emailId**
Provides detailed sales analysis for a specific email including purchase probability, urgency assessment, and recommended actions.

**POST /ai/batch-classify**
Processes multiple emails for AI classification in a single request, optimized for bulk operations.

**GET /ai/categories**
Returns available AI categories with descriptions, examples, and current statistics.

**GET /ai/insights/summary**
Provides comprehensive AI performance metrics and sales pipeline analysis across specified time periods.

### Account Management Endpoints

**GET /accounts**
Lists all configured email accounts with connection status and synchronization information.

**POST /accounts**
Adds a new email account to the system with IMAP configuration.

Request Body:
```json
{
  "userId": "user_id",
  "email": "account@example.com",
  "provider": "gmail|outlook|other",
  "imapConfig": {
    "host": "imap.gmail.com",
    "port": 993,
    "secure": true,
    "user": "username",
    "pass": "password"
  }
}
```

**GET /accounts/:id**
Retrieves detailed information for a specific email account including synchronization statistics and connection status.

**DELETE /accounts/:id**
Removes an email account and disconnects associated IMAP connections.

**POST /accounts/:id/test-connection**
Tests the IMAP connection for a specific account and returns connectivity results.

**GET /accounts/:id/stats**
Provides detailed statistics for an account including total emails, unread count, and AI category breakdown.

**GET /accounts/providers**
Returns supported email provider configurations with recommended IMAP settings.

### Testing and Development Endpoints

**GET /test/health**
Comprehensive system health check including database connections, service status, and performance metrics.

**POST /test/setup-accounts**
Automatically configures test accounts from environment variables for development and demonstration purposes.

**POST /test/sample-emails**
Generates realistic sample emails across all AI categories for testing and demonstration.

Request Body:
```json
{
  "count": 15
}
```

**POST /test/test-ai**
Tests AI classification functionality with custom email content.

**GET /test/sync-status**
Monitors IMAP synchronization progress across all configured accounts.

**POST /test/force-sync**
Triggers a complete fresh synchronization of all email accounts.

**DELETE /test/clear-samples**
Removes all sample emails generated by the testing system.

### API Response Format

All API endpoints return responses in a consistent JSON format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses include detailed error information:

```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 9. Database Design

ReachInbox utilizes MongoDB as the primary database with Elasticsearch for advanced search capabilities and Redis for caching and session management. The database architecture prioritizes performance, scalability, and data integrity.

### MongoDB Schema Architecture

**Email Document Structure**

The Email collection serves as the core data structure, storing comprehensive email information with complete state management for UI persistence.

```typescript
interface IEmail {
  // Core identification
  accountId: ObjectId;           // Reference to EmailAccount
  messageId: string;             // Unique IMAP message identifier
  threadId?: string;             // Email threading support
  
  // Email headers and content
  from: { address: string; name?: string };
  to: { address: string; name?: string }[];
  cc?: { address: string; name?: string }[];
  subject: string;
  textBody: string;              // Plain text content
  htmlBody?: string;             // HTML content
  snippet: string;               // First 150 characters for preview
  
  // State management (critical for UI persistence)
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  folder: string;                // inbox, sent, archive, deleted
  
  // AI processing results
  aiCategory: 'interested' | 'meeting_booked' | 'not_interested' | 'spam' | 'out_of_office';
  aiConfidence: number;          // 0-1 confidence score
  aiInsights: {
    sentiment: 'positive' | 'negative' | 'neutral';
    urgency: 'high' | 'medium' | 'low';
    intent: string;
    keyTopics: string[];
    suggestedResponse?: string;
  };
  
  // Timestamps and audit trail
  receivedDate: Date;
  actions: Array<{
    type: string;
    timestamp: Date;
    metadata?: any;
  }>;
}
```

**EmailAccount Document Structure**

The EmailAccount collection manages IMAP connection configurations and synchronization status for multiple email providers.

```typescript
interface IEmailAccount {
  userId: ObjectId;              // Reference to User
  email: string;                 // Account email address
  provider: 'gmail' | 'outlook' | 'other';
  
  imapConfig: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;                // Encrypted password storage
  };
  
  // Synchronization management
  isActive: boolean;
  syncStatus: 'connecting' | 'connected' | 'syncing' | 'error';
  lastSyncAt: Date;
  syncStats: {
    totalEmails: number;
    errorCount: number;
    lastError?: string;
  };
}
```

### Database Indexing Strategy

**Performance-Optimized Indexes**

The database implements strategic indexing to ensure fast query performance across all common access patterns:

```javascript
// Primary performance indexes
db.emails.createIndex({ accountId: 1, receivedDate: -1 });
db.emails.createIndex({ accountId: 1, isRead: 1, folder: 1 });
db.emails.createIndex({ aiCategory: 1, aiConfidence: -1 });
db.emails.createIndex({ isStarred: 1, isArchived: 1 });

// Search and filtering indexes
db.emails.createIndex({ 'from.address': 1, receivedDate: -1 });
db.emails.createIndex({ subject: 'text', textBody: 'text' });
db.emails.createIndex({ messageId: 1 }, { unique: true });

// Account management indexes
db.emailaccounts.createIndex({ userId: 1, isActive: 1 });
db.emailaccounts.createIndex({ email: 1 }, { unique: true });
```

**Compound Index Optimization**

Compound indexes support complex queries commonly used by the frontend application, such as filtering by account, read status, and folder simultaneously. This reduces query execution time from hundreds of milliseconds to single-digit milliseconds for typical operations.

### Elasticsearch Integration

**Email Search Index Structure**

Elasticsearch provides advanced full-text search capabilities with custom analyzers optimized for email content:

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "email_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "snowball"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "subject": { 
        "type": "text", 
        "analyzer": "email_analyzer", 
        "boost": 2.0 
      },
      "body": { 
        "type": "text", 
        "analyzer": "email_analyzer" 
      },
      "from": { 
        "type": "text", 
        "analyzer": "email_analyzer" 
      }
    }
  }
}
```

The Elasticsearch integration includes automatic indexing of new emails, bulk indexing for performance optimization, and fallback to MongoDB search when Elasticsearch is unavailable.

### Data Consistency and Integrity

**ACID Compliance**

MongoDB transactions ensure data consistency during critical operations such as bulk email updates and account synchronization. The system uses atomic operations for state changes and maintains referential integrity through careful schema design.

**Backup and Recovery**

The database implements automated backup strategies with point-in-time recovery capabilities. Daily snapshots capture complete system state, while incremental backups ensure minimal data loss potential.

### Performance Optimization

**Memory Usage Management**

Database queries are optimized for the t3.medium instance constraints, with careful attention to memory usage during large result set operations. Pagination limits prevent memory exhaustion, while strategic field selection reduces document transfer overhead.

**Connection Pooling**

MongoDB connection pooling optimizes database connectivity, maintaining persistent connections while preventing connection limit exhaustion during high-volume operations.

## 10. Configuration

ReachInbox configuration management supports multiple deployment environments with secure credential handling and flexible service integration options.

### Environment Configuration

**Core Server Settings**

```env
NODE_ENV=development
PORT=5001
API_PREFIX=/api/v1
```

The server configuration supports both development and production modes with appropriate logging levels, error handling, and performance optimizations for each environment.

**Database Connection Configuration**

```env
MONGODB_URI=mongodb://admin:password123@localhost:27017/reachinbox?authSource=admin
MONGODB_DB_NAME=reachinbox
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
```

Database connections include connection pooling settings, authentication parameters, and failover configurations to ensure high availability across all database services.

**Security Configuration**

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
ENCRYPT_SECRET=your-encryption-secret-for-passwords-32-chars-long
```

Security settings include JWT token management, password encryption keys, and secure session handling. All sensitive credentials use environment variable injection to prevent exposure in version control systems.

### Email Account Configuration

**IMAP Provider Settings**

The system supports multiple email providers with optimized IMAP configurations:

```env
# Gmail configuration
GMAIL_USER_1=your-email@gmail.com
GMAIL_PASS_1=your-app-password
GMAIL_IMAP_HOST_1=imap.gmail.com
GMAIL_IMAP_PORT_1=993

# Outlook configuration
OUTLOOK_USER=your-email@outlook.com
OUTLOOK_PASS=your-outlook-password
OUTLOOK_IMAP_HOST=outlook.office365.com
OUTLOOK_IMAP_PORT=993
```

Email provider configurations include host settings, port specifications, and security parameters optimized for each provider's IMAP implementation.

### AI Service Configuration

**Local LLM Settings**

```env
OLLAMA_URL=http://localhost:11434
LLM_MODEL=qwen2:0.5b
```

AI service configuration includes Ollama connection parameters and model specifications. The system automatically detects model availability and configures fallback behavior when the LLM service is unavailable.

### Notification Service Configuration

**Webhook Integration Settings**

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EXTERNAL_WEBHOOK_URL=https://webhook.site/your-unique-id
FRONTEND_URL=http://65.1.63.189:3001
```

Notification services support multiple channels including Slack integration, external webhook endpoints, and frontend URL configuration for proper link generation in notifications.

### Performance and Scaling Configuration

**Resource Management Settings**

```env
MAX_EMAILS_PER_SYNC=1000
SYNC_INTERVAL_MINUTES=5
RATE_LIMIT_MAX_REQUESTS=100
MEMORY_LIMIT_MB=2048
```

Performance configuration includes email synchronization limits, processing intervals, rate limiting parameters, and memory management settings optimized for t3.medium instances.

## 11. Deployment

ReachInbox deployment architecture supports both development and production environments with containerized services and automated setup procedures.

### Local Development Deployment

**Prerequisites Installation**

Development deployment requires Node.js 18+, Docker, Docker Compose, and sufficient system resources for database services and AI model operations.

**Quick Start Deployment**

```bash
git clone https://github.com/your-username/reachinbox.git
cd reachinbox
npm run setup
docker-compose up -d
npm run dev
```

The development deployment includes hot reloading, debug logging, and development-optimized database configurations. All services run locally with persistent data storage through Docker volumes.

**Service Verification**

Development deployment includes health check endpoints and service status monitoring:

```bash
curl http://localhost:5001/health
curl http://localhost:5001/api/v1/test/health
```

Health checks verify database connectivity, service initialization, and AI model availability.

### Production Deployment Architecture

**Container Orchestration**

Production deployment utilizes Docker containers with optimized images for performance and security. The containerized architecture includes:

- Application container with Node.js runtime
- MongoDB container with persistent storage
- Elasticsearch container with custom configuration
- Redis container for caching and session management
- Nginx reverse proxy for load balancing and SSL termination

**Infrastructure Requirements**

Production deployment requires minimum t3.medium instances (4GB RAM, 2 vCPUs) to support concurrent AI processing and database operations. Storage requirements include 20GB for database operations and model storage.

**Environment-Specific Configuration**

Production configuration includes enhanced security settings, optimized memory management, and production-grade logging:

```env
NODE_ENV=production
MEMORY_LIMIT_MB=3072
LOG_LEVEL=warn
RATE_LIMIT_MAX_REQUESTS=1000
```

### Database Deployment

**MongoDB Production Setup**

Production MongoDB deployment includes replica set configuration, authentication, and automated backup procedures:

```yaml
mongodb:
  image: mongo:7
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
  volumes:
    - mongodb_data:/data/db
  command: mongod --replSet rs0 --auth
```

**Elasticsearch Production Configuration**

Elasticsearch production deployment includes cluster configuration, index optimization, and memory management:

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
  environment:
    - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    - discovery.type=single-node
    - xpack.security.enabled=false
```

### SSL and Security Configuration

**HTTPS Configuration**

Production deployment includes SSL certificate management through Let's Encrypt integration and Nginx configuration for secure communications:

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Security Headers**

Production deployment includes comprehensive security headers, CORS configuration, and request validation to prevent common security vulnerabilities.

### Monitoring and Logging

**Application Monitoring**

Production deployment includes comprehensive monitoring through structured logging, performance metrics collection, and error tracking:

```typescript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

**Health Monitoring**

Automated health checks monitor service availability, database connectivity, and AI model responsiveness with alerting integration for production incidents.

## 12. Development Workflow

ReachInbox development workflow emphasizes code quality, automated testing, and efficient development practices for both individual contributors and team collaboration.

### Development Environment Setup

**Local Development Configuration**

Development environment setup includes automated dependency installation, database initialization, and service configuration:

```bash
npm run setup          # Install all dependencies
npm run docker:up      # Start database services
npm run dev           # Start development servers
```

Development configuration includes hot reloading for both frontend and backend services, debug logging, and development-optimized build processes.

**Code Quality Standards**

Development workflow enforces consistent code quality through ESLint configuration, Prettier formatting, and TypeScript strict mode compilation:

```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.{ts,tsx,js,jsx}"
  }
}
```

### Testing Strategy

**Backend Testing**

Backend testing includes unit tests for service classes, integration tests for API endpoints, and database testing with test fixtures:

```typescript
describe('Email Classification Service', () => {
  test('classifies interested emails correctly', async () => {
    const email = { subject: 'Budget approved for demo', body: 'Ready to purchase' };
    const result = await aiService.classifyEmail(email);
    expect(result.category).toBe('interested');
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
```

**Frontend Testing**

Frontend testing utilizes React Testing Library for component testing, Jest for unit testing, and integration tests for user workflows:

```typescript
test('displays email list correctly', async () => {
  render(<EmailList emails={mockEmails} />);
  expect(screen.getByText('New email received')).toBeInTheDocument();
  expect(screen.getByText('🎯 Interested')).toBeInTheDocument();
});
```

### API Development Process

**Endpoint Development Standards**

API endpoint development follows RESTful conventions with comprehensive input validation, error handling, and response formatting:

```typescript
router.post('/emails/:id/reply', asyncHandler(async (req: Request, res: Response) => {
  const { error, value } = replySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }
  
  const result = await emailService.generateReply(req.params.id, value);
  res.json({ success: true, data: result });
}));
```

**Database Migration Management**

Database schema changes follow migration procedures with version control, rollback capabilities, and data integrity verification:

```javascript
// Migration script example
db.emails.createIndex({ 'aiInsights.sentiment': 1 });
db.emails.updateMany({}, { $set: { 'aiInsights.version': '2.0' } });
```

### Debugging and Development Tools

**Backend Debugging**

Backend debugging includes comprehensive logging, error tracking, and performance monitoring during development:

```typescript
logger.debug('Processing email classification', {
  emailId: email._id,
  category: result.category,
  confidence: result.confidence,
  processingTime: Date.now() - startTime
});
```

**Frontend Development Tools**

Frontend development includes React Developer Tools integration, component state inspection, and API call monitoring through browser developer tools.

### Performance Optimization During Development

**Memory Management**

Development workflow includes memory usage monitoring and optimization techniques specifically for t3.medium instance constraints:

```typescript
setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  if (heapUsedMB > 2048) {
    logger.warn(`High memory usage: ${heapUsedMB}MB`);
  }
}, 30000);
```

**Database Query Optimization**

Development includes query performance analysis and index optimization to ensure efficient database operations:

```typescript
// Query performance monitoring
const startTime = Date.now();
const emails = await Email.find(filter).limit(50);
const queryTime = Date.now() - startTime;
logger.debug(`Query executed in ${queryTime}ms`);
```

## 13. Troubleshooting

ReachInbox troubleshooting procedures address common deployment issues, service connectivity problems, and performance optimization challenges.

### Common Issues and Solutions

**IMAP Connection Failures**

IMAP connection issues typically result from authentication problems, network connectivity, or provider-specific configuration requirements:

```python
# Test IMAP connectivity
def test_imap_connection(email, password, host, port=993):
    try:
        mail = imaplib.IMAP4_SSL(host, port)
        mail.login(email, password)
        mail.select('INBOX')
        print("✅ IMAP connection successful")
        return True
    except Exception as e:
        print(f"❌ IMAP connection failed: {e}")
        return False
```

**Gmail App Password Configuration**

Gmail integration requires App Password generation rather than regular account passwords. Users must enable 2-factor authentication and generate application-specific passwords through Google Account security settings.

**Database Connection Issues**

MongoDB connection failures often result from authentication configuration, network connectivity, or resource constraints:

```javascript
// Database connection troubleshooting
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error:', error);
  // Attempt reconnection with exponential backoff
});

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected successfully');
});
```

### AI Service Troubleshooting

**Ollama Model Loading Issues**

AI service issues typically involve Ollama installation, model availability, or resource constraints:

```bash
# Verify Ollama installation
ollama --version

# Check available models
ollama list

# Pull required model
ollama pull qwen2:0.5b

# Test model functionality
ollama run qwen2:0.5b "Test classification"
```

**Memory Management Issues**

AI processing can consume significant memory resources. Memory management includes monitoring usage and implementing garbage collection triggers:

```typescript
// Memory monitoring and management
if (global.gc && memoryUsageMB > MEMORY_LIMIT * 0.9) {
  global.gc();
  logger.info('Forced garbage collection due to high memory usage');
}
```

### Performance Troubleshooting

**Slow Email Synchronization**

Email synchronization performance issues often result from large mailbox sizes, network latency, or resource constraints:

```typescript
// Optimize email synchronization
const SYNC_BATCH_SIZE = 50;  // Reduce batch size for memory constraints
const SYNC_TIMEOUT = 30000;  // Increase timeout for slow connections

// Monitor synchronization progress
logger.info(`Syncing ${limit} emails for ${account.email} (${start}:${totalMessages})`);
```

**Database Query Performance**

Database performance issues require index analysis and query optimization:

```javascript
// Analyze query performance
db.emails.explain('executionStats').find({ accountId: 'account1', isRead: false });

// Add missing indexes
db.emails.createIndex({ accountId: 1, isRead: 1, receivedDate: -1 });
```

### Frontend Troubleshooting

**Component Rendering Issues**

Frontend rendering problems often involve state management, prop validation, or dependency conflicts:

```typescript
// Debug component state
useEffect(() => {
  console.log('EmailList rendered with:', { emails: emails.length, selectedId });
}, [emails, selectedEmailId]);

// Validate props and data
if (!emails || emails.length === 0) {
  return <EmptyState message="No emails found" />;
}
```

**API Communication Issues**

Frontend API communication problems require network debugging, error handling verification, and response validation:

```typescript
// Debug API calls
const apiService = {
  async fetchEmails(folder) {
    try {
      const response = await fetch(`${API_BASE}/emails?folder=${folder}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
};
```

### System Health Monitoring

**Health Check Endpoints**

System health monitoring includes comprehensive status verification across all services:

```bash
# System health verification
curl http://localhost:5001/health
curl http://localhost:5001/api/v1/test/health
curl http://localhost:5001/api/v1/emails/search-status
```

**Log Analysis**

System logging provides detailed troubleshooting information for all service components:

```bash
# Monitor application logs
tail -f logs/app.log | grep ERROR

# Monitor database operations
tail -f logs/app.log | grep "MongoDB"

# Monitor AI service operations
tail -f logs/app.log | grep "LLM"
```

**Resource Monitoring**

Resource monitoring includes memory usage, CPU utilization, and disk space verification:

```bash
# Monitor system resources
htop
df -h
free -h

# Monitor Docker container resources
docker stats
```

### Recovery Procedures

**Service Recovery**

Service recovery procedures include automated restart mechanisms and data integrity verification:

```bash
# Restart all services
docker-compose restart

# Verify service health
npm run test:health

# Clear cache and restart
redis-cli FLUSHALL
docker-compose up -d
```

**Data Recovery**

Data recovery procedures include backup restoration and database consistency verification:

```bash
# Restore from backup
mongorestore --drop --db reachinbox backup/reachinbox

# Verify data integrity
db.emails.countDocuments()
db.emailaccounts.find({ isActive: true }).count()

# Rebuild search indexes
curl -X DELETE http://localhost:9200/emails
curl -X POST http://localhost:5001/api/v1/test/force-sync
```

### Emergency Procedures

**Complete System Reset**

For catastrophic failures, complete system reset procedures restore functionality:

```bash
# Stop all services
docker-compose down

# Clear all data volumes
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
npm run test:setup-accounts
npm run test:sample-emails
```

**AI Service Recovery**

AI service recovery includes model reloading and fallback system verification:

```bash
# Restart Ollama service
systemctl restart ollama

# Verify model availability
ollama list | grep qwen2

# Test AI classification
curl -X POST http://localhost:5001/api/v1/test/test-ai \
  -H "Content-Type: application/json" \
  -d '{"subject": "Test email", "body": "Interested in demo"}'
```

### Performance Optimization

**Memory Optimization**

Memory optimization procedures for t3.medium instances include garbage collection tuning and resource monitoring:

```typescript
// Optimize garbage collection
const GC_INTERVAL = 300000; // 5 minutes
setInterval(() => {
  if (global.gc) {
    const beforeGC = process.memoryUsage().heapUsed;
    global.gc();
    const afterGC = process.memoryUsage().heapUsed;
    const freed = Math.round((beforeGC - afterGC) / 1024 / 1024);
    logger.info(`Garbage collection freed ${freed}MB`);
  }
}, GC_INTERVAL);
```

**Database Optimization**

Database optimization includes index management, query analysis, and connection pooling:

```javascript
// Optimize database queries
db.emails.aggregate([
  { $match: { receivedDate: { $gte: new Date(Date.now() - 86400000) } } },
  { $group: { _id: '$aiCategory', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// Monitor slow queries
db.setProfilingLevel(2, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(5);
```

**Frontend Performance Optimization**

Frontend optimization includes component memoization, virtual scrolling, and efficient state management:

```typescript
// Optimize component rendering
const EmailListItem = React.memo(({ email, isSelected, onSelect }) => {
  return (
    <div 
      className={`email-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(email.id)}
    >
      <EmailPreview email={email} />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.email.id === nextProps.email.id && 
         prevProps.isSelected === nextProps.isSelected;
});

// Optimize email filtering
const filteredEmails = useMemo(() => {
  return emails.filter(email => {
    if (activeFilters.includes('unread') && email.isRead) return false;
    if (searchTerm && !email.subject.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
}, [emails, activeFilters, searchTerm]);
```

### Deployment Troubleshooting

**Docker Container Issues**

Container deployment issues require systematic debugging of service dependencies and configuration:

```bash
# Check container logs
docker-compose logs backend
docker-compose logs mongodb
docker-compose logs elasticsearch

# Inspect container health
docker-compose ps
docker inspect reachinbox-mongodb

# Restart specific services
docker-compose restart backend
docker-compose up -d --force-recreate mongodb
```

**Network Connectivity Issues**

Network troubleshooting includes port verification, firewall configuration, and service discovery:

```bash
# Test port accessibility
netstat -tlnp | grep :5001
telnet localhost 27017
curl -I http://localhost:9200

# Test service connectivity
docker-compose exec backend curl http://mongodb:27017
docker-compose exec backend curl http://elasticsearch:9200
```

**Environment Configuration Issues**

Configuration troubleshooting includes environment variable validation and credential verification:

```bash
# Verify environment variables
printenv | grep MONGODB_URI
printenv | grep GMAIL_USER

# Test email credentials
node -e "console.log(process.env.GMAIL_USER_1, process.env.GMAIL_PASS_1)"

# Validate configuration
npm run test:setup-accounts
```

### Monitoring and Alerting

**Production Monitoring Setup**

Production monitoring includes comprehensive service health tracking and alerting:

```typescript
// Health monitoring service
class HealthMonitor {
  async checkSystemHealth() {
    const checks = {
      database: await this.checkDatabase(),
      elasticsearch: await this.checkElasticsearch(),
      aiService: await this.checkAIService(),
      emailAccounts: await this.checkEmailAccounts()
    };
    
    const healthStatus = Object.values(checks).every(check => check.healthy);
    
    if (!healthStatus) {
      await this.sendAlert(checks);
    }
    
    return checks;
  }
  
  async sendAlert(healthChecks) {
    const failedServices = Object.entries(healthChecks)
      .filter(([_, check]) => !check.healthy)
      .map(([service, check]) => `${service}: ${check.error}`);
    
    logger.error('System health alert:', { failedServices });
    // Send notification to monitoring service
  }
}
```

**Performance Metrics Collection**

Performance monitoring includes response time tracking, resource utilization, and error rate monitoring:

```typescript
// Performance metrics middleware
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();
    
    logger.info('Request performance', {
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
      memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    });
    
    if (duration > 5000) {
      logger.warn('Slow request detected', { path: req.path, duration });
    }
  });
  
  next();
};
```

This comprehensive troubleshooting guide addresses the most common issues encountered during ReachInbox deployment and operation. The procedures provide systematic approaches to problem identification, resolution, and prevention across all system components.

### Support and Community Resources

**Documentation and Resources**

- **API Documentation**: Complete endpoint reference at `/api/v1/docs`
- **Health Monitoring**: Real-time system status at `/health`
- **Test Suite**: Comprehensive testing endpoints at `/api/v1/test/*`

**Development Tools**

- **Database Administration**: MongoDB Compass for database inspection
- **API Testing**: Postman collection for endpoint testing
- **Log Analysis**: Structured JSON logging for debugging
- **Performance Monitoring**: Built-in memory and performance tracking

**Best Practices**

- Regular health check monitoring every 30 seconds
- Automated backup procedures for critical data
- Memory usage monitoring with garbage collection triggers
- Error logging with structured data for debugging
- Performance optimization for t3.medium instance constraints

This documentation provides comprehensive coverage of ReachInbox architecture, implementation, and operational procedures. The system delivers enterprise-grade email management with advanced AI classification, robust error handling, and scalable architecture designed for production deployment.
