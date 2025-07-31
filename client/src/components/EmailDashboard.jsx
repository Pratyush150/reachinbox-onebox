import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDownIcon, KeyboardArrowDownIcon } from '@heroicons/react/24/outline';

// Import our modular components
import Sidebar from './layout/Sidebar';
import SearchCombobox from './ui/SearchCombobox';
import FilterMenu from './ui/FilterMenu';
import AnalyticsModal from './ui/AnalyticsModal';
import ComposeModal from './ui/ComposeModal';
import EmailList from './email/EmailList';
import EmailDetail from './email/EmailDetail';

// Mock data with additional emails for different folders
const mockEmails = [
  {
    id: '1',
    messageId: 'msg-001',
    from: { address: 'john.doe@startup.com', name: 'John Doe' },
    to: [{ address: 'support@reachinbox.com', name: 'Support' }],
    subject: 'Very interested in your product!',
    textBody: 'Hi there! I saw your product demo and I am very interested. Can we schedule a call to discuss pricing and implementation? Our team is looking for a solution exactly like yours and we have budget allocated for this quarter.',
    receivedDate: new Date('2024-01-31T10:30:00'),
    aiCategory: 'interested',
    aiConfidence: 0.92,
    isRead: false,
    folder: 'inbox',
    isStarred: false,
    attachments: []
  },
  {
    id: '2',
    messageId: 'msg-002',
    from: { address: 'sarah@techcorp.com', name: 'Sarah Johnson' },
    to: [{ address: 'support@reachinbox.com', name: 'Support' }],
    subject: 'Meeting confirmed for tomorrow',
    textBody: 'Hi, just confirming our meeting tomorrow at 2 PM. I have added it to my calendar and looking forward to our discussion about the enterprise plan.',
    receivedDate: new Date('2024-01-31T09:45:00'),
    aiCategory: 'meeting_booked',
    aiConfidence: 0.95,
    isRead: true,
    folder: 'inbox',
    isStarred: true,
    attachments: [{ name: 'meeting-agenda.pdf', size: '245 KB' }]
  },
  {
    id: '3',
    messageId: 'msg-003',
    from: { address: 'mike@company.com', name: 'Mike Wilson' },
    to: [{ address: 'support@reachinbox.com', name: 'Support' }],
    subject: 'Not a good fit for our needs',
    textBody: 'Thank you for reaching out, but your solution is not suitable for our current needs.',
    receivedDate: new Date('2024-01-31T08:20:00'),
    aiCategory: 'not_interested',
    aiConfidence: 0.88,
    isRead: true,
    folder: 'inbox',
    isStarred: false,
    attachments: []
  },
  {
    id: '4',
    messageId: 'msg-004',
    from: { address: 'noreply@marketing.com', name: 'Marketing Team' },
    to: [{ address: 'support@reachinbox.com', name: 'Support' }],
    subject: 'CONGRATULATIONS! You have won $1,000,000!!!',
    textBody: 'Claim your prize now! Limited time offer!',
    receivedDate: new Date('2024-01-31T07:15:00'),
    aiCategory: 'spam',
    aiConfidence: 0.99,
    isRead: false,
    folder: 'inbox',
    isStarred: false,
    attachments: []
  },
  // Sent emails
  {
    id: 'sent-1',
    messageId: 'sent-001',
    from: { address: 'admin@reachinbox.com', name: 'Admin User' },
    to: [{ address: 'client@company.com', name: 'Client' }],
    subject: 'Thank you for your interest',
    textBody: 'Thank you for reaching out about our product. I would love to schedule a demo.',
    receivedDate: new Date('2024-01-30T15:30:00'),
    aiCategory: 'interested',
    aiConfidence: 0.90,
    isRead: true,
    folder: 'sent',
    isStarred: false,
    attachments: []
  },
  // Draft emails
  {
    id: 'draft-1',
    messageId: 'draft-001',
    from: { address: 'admin@reachinbox.com', name: 'Admin User' },
    to: [{ address: 'prospect@company.com', name: 'Prospect' }],
    subject: 'Follow-up on our conversation',
    textBody: 'Hi there, I wanted to follow up on our conversation about...',
    receivedDate: new Date('2024-01-30T14:00:00'),
    aiCategory: 'interested',
    aiConfidence: 0.85,
    isRead: false,
    folder: 'drafts',
    isStarred: false,
    attachments: []
  },
  // Archived emails
  {
    id: 'archive-1',
    messageId: 'archive-001',
    from: { address: 'old@client.com', name: 'Old Client' },
    to: [{ address: 'support@reachinbox.com', name: 'Support' }],
    subject: 'Old conversation',
    textBody: 'This is an old email that has been archived.',
    receivedDate: new Date('2024-01-15T10:00:00'),
    aiCategory: 'interested',
    aiConfidence: 0.80,
    isRead: true,
    folder: 'archive',
    isStarred: false,
    attachments: []
  }
];

// Notification Component
const NotificationToast = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getNotificationColor = (type) => {
    switch (type) {
      case 'interested': return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
      case 'meeting_booked': return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
      case 'success': return 'bg-green-500/20 border-green-500/30 text-green-300';
      case 'error': return 'bg-red-500/20 border-red-500/30 text-red-300';
      case 'info': return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
      default: return 'bg-slate-700/50 border-slate-600/50 text-slate-300';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'interested': return '🎯';
      case 'meeting_booked': return '📅';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📧';
    }
  };

  return (
    <div className={`fixed top-4 right-4 max-w-sm p-4 rounded-xl border backdrop-blur-sm z-50 animate-in slide-in-from-right-2 duration-300 shadow-lg ${getNotificationColor(notification.type)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
          <div>
            <div className="font-medium">{notification.title}</div>
            <div className="text-sm opacity-80 mt-1">{notification.message}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-current hover:opacity-70 transition-opacity text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Account Selector Dropdown Component
const AccountSelector = ({ selectedAccount, onAccountSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const accounts = [
    { 
      id: 'account1', 
      email: 'support@reachinbox.com', 
      name: 'ReachInbox Support',
      unread: 23,
      provider: 'Gmail'
    },
    { 
      id: 'account2', 
      email: 'sales@reachinbox.com', 
      name: 'ReachInbox Sales',
      unread: 8,
      provider: 'Outlook'
    },
    { 
      id: 'account3', 
      email: 'admin@kairostudio.in', 
      name: 'Kairo Studio Admin',
      unread: 5,
      provider: 'Gmail'
    }
  ];

  const selectedAccountData = accounts.find(a => a.id === selectedAccount) || accounts[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white hover:bg-slate-800/70 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {selectedAccountData.name.charAt(0)}
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-sm">{selectedAccountData.name}</div>
          <div className="text-xs text-slate-400">{selectedAccountData.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {selectedAccountData.unread > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {selectedAccountData.unread}
            </span>
          )}
          <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800/90 border border-slate-700/50 rounded-lg shadow-lg backdrop-blur-sm z-30 animate-in slide-in-from-top-2 duration-200">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onAccountSelect(account.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-3 text-left hover:bg-slate-700/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                selectedAccount === account.id ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {account.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{account.name}</div>
                <div className="text-xs text-slate-400">{account.email} • {account.provider}</div>
              </div>
              {account.unread > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {account.unread}
                </span>
              )}
            </button>
          ))}
          
          <div className="border-t border-slate-700/50 p-2">
            <button className="w-full flex items-center justify-center gap-2 p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
const MailFolderDropdown = ({ selectedFolder, onFolderSelect, emailCounts }) => {
  const [isOpen, setIsOpen] = useState(false);

  const folders = [
    { key: 'inbox', label: 'Inbox', count: emailCounts.inbox || 0 },
    { key: 'sent', label: 'Sent', count: emailCounts.sent || 0 },
    { key: 'drafts', label: 'Drafts', count: emailCounts.drafts || 0 },
    { key: 'archive', label: 'Archive', count: emailCounts.archive || 0 },
    { key: 'deleted', label: 'Deleted', count: emailCounts.deleted || 0 }
  ];

  const selectedFolderData = folders.find(f => f.key === selectedFolder) || folders[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white hover:bg-slate-800/70 transition-colors"
      >
        <span className="font-medium">{selectedFolderData.label}</span>
        <span className="text-slate-400">({selectedFolderData.count})</span>
        <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800/90 border border-slate-700/50 rounded-lg shadow-lg backdrop-blur-sm z-20 animate-in slide-in-from-top-2 duration-200">
          {folders.map((folder) => (
            <button
              key={folder.key}
              onClick={() => {
                onFolderSelect(folder.key);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                selectedFolder === folder.key ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300'
              }`}
            >
              <span>{folder.label}</span>
              <span className="text-slate-400 text-sm">({folder.count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EmailDashboard = () => {
  // State management
  const [emails, setEmails] = useState(mockEmails);
  const [selectedCategory, setSelectedCategory] = useState('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('account1');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Calculate email counts by folder and category
  const emailCounts = useMemo(() => {
    const counts = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      archive: 0,
      deleted: 0,
      total: emails.length,
      unread: 0,
      interested: 0,
      meeting_booked: 0,
      not_interested: 0,
      spam: 0,
      out_of_office: 0
    };

    emails.forEach(email => {
      // Folder counts
      if (counts.hasOwnProperty(email.folder)) {
        counts[email.folder]++;
      }
      
      // Status counts
      if (!email.isRead) counts.unread++;
      
      // Category counts
      if (counts.hasOwnProperty(email.aiCategory)) {
        counts[email.aiCategory]++;
      }
    });

    return counts;
  }, [emails]);

  // Filter emails based on category, search, and filters
  const filteredEmails = useMemo(() => {
    let filtered = emails;

    // Filter by folder/category
    if (['inbox', 'sent', 'drafts', 'archive', 'deleted'].includes(selectedCategory)) {
      filtered = filtered.filter(email => email.folder === selectedCategory);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(email => email.aiCategory === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(email =>
        email.subject.toLowerCase().includes(searchLower) ||
        email.from.name?.toLowerCase().includes(searchLower) ||
        email.from.address.toLowerCase().includes(searchLower) ||
        email.textBody.toLowerCase().includes(searchLower)
      );
    }

    // Apply additional filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(email => {
        return activeFilters.some(filter => {
          switch (filter) {
            case 'unread':
              return !email.isRead;
            case 'today':
              const today = new Date();
              const emailDate = new Date(email.receivedDate);
              return emailDate.toDateString() === today.toDateString();
            case 'this_week':
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(email.receivedDate) > weekAgo;
            case 'interested':
            case 'meeting_booked':
            case 'not_interested':
            case 'spam':
            case 'out_of_office':
              return email.aiCategory === filter;
            default:
              return false;
          }
        });
      });
    }

    return filtered.sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate));
  }, [emails, selectedCategory, searchTerm, activeFilters]);

  const selectedEmail = selectedEmailId ? emails.find(e => e.id === selectedEmailId) : null;

  // Event handlers
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 200);
  }, []);

  const handleEmailSelect = useCallback((emailId) => {
    setSelectedEmailId(emailId);
    
    // Mark email as read when selected
    setEmails(prevEmails => 
      prevEmails.map(email => 
        email.id === emailId ? { ...email, isRead: true } : email
      )
    );
  }, []);

  const handleBulkAction = useCallback((action, emailIds) => {
    setEmails(prevEmails => {
      return prevEmails.map(email => {
        if (emailIds.includes(email.id)) {
          switch (action) {
            case 'markRead':
              return { ...email, isRead: true };
            case 'markUnread':
              return { ...email, isRead: false };
            case 'archive':
              return { ...email, folder: 'archive' };
            case 'delete':
              return { ...email, folder: 'deleted' };
            case 'star':
              return { ...email, isStarred: !email.isStarred };
            default:
              return email;
          }
        }
        return email;
      });
    });

    setNotification({
      type: 'success',
      title: 'Action completed',
      message: `${action} applied to ${emailIds.length} email(s)`
    });
  }, []);

  const handleEmailAction = useCallback((action, emailId, data = null) => {
    setEmails(prevEmails => {
      return prevEmails.map(email => {
        if (email.id === emailId) {
          switch (action) {
            case 'star':
              return { ...email, isStarred: !email.isStarred };
            case 'archive':
              return { ...email, folder: 'archive' };
            case 'delete':
              return { ...email, folder: 'deleted' };
            case 'reply':
              console.log('Sending reply:', data);
              return email;
            default:
              return email;
          }
        }
        return email;
      });
    });

    if (['archive', 'delete'].includes(action) && selectedEmailId === emailId) {
      setSelectedEmailId(null);
    }

    if (['archive', 'delete', 'reply'].includes(action)) {
      const actionMessages = {
        archive: 'Email archived successfully',
        delete: 'Email moved to deleted',
        reply: 'Reply sent successfully'
      };
      
      setNotification({
        type: 'success',
        title: `Email ${action}d`,
        message: actionMessages[action]
      });
    }
  }, [selectedEmailId]);

  const handleComposeSend = useCallback((emailData) => {
    const newEmail = {
      id: `sent-${Date.now()}`,
      messageId: `sent-${Date.now()}`,
      from: { address: 'admin@reachinbox.com', name: 'Admin User' },
      to: [{ address: emailData.to, name: '' }],
      subject: emailData.subject,
      textBody: emailData.body,
      receivedDate: new Date(),
      aiCategory: 'interested',
      aiConfidence: 0.90,
      isRead: true,
      folder: 'sent',
      isStarred: false,
      attachments: emailData.attachments || []
    };

    setEmails(prev => [newEmail, ...prev]);
    setNotification({
      type: 'success',
      title: 'Email sent!',
      message: `Email sent to ${emailData.to}`
    });
  }, []);

  const showNotificationToast = useCallback((type, title, message) => {
    setNotification({ type, title, message });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            document.querySelector('input[placeholder*="Search"]')?.focus();
            break;
          case '1':
            e.preventDefault();
            setSelectedCategory('interested');
            break;
          case '2':
            e.preventDefault();
            setSelectedCategory('meeting_booked');
            break;
          case 'n':
            e.preventDefault();
            setShowCompose(true);
            break;
          case 'b':
            e.preventDefault();
            setSidebarCollapsed(!sidebarCollapsed);
            break;
          case 'a':
            e.preventDefault();
            setShowAnalytics(true);
            break;
          default:
            break;
        }
      }
      
      if (e.key === 'Delete' && selectedEmailId) {
        e.preventDefault();
        handleEmailAction('delete', selectedEmailId);
      }

      if (e.key === 'Escape') {
        if (showAnalytics) {
          setShowAnalytics(false);
        } else if (showCompose) {
          setShowCompose(false);
        } else if (selectedEmailId) {
          setSelectedEmailId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, selectedEmailId, showAnalytics, showCompose, handleEmailAction]);

  const getCurrentFolderName = () => {
    if (['inbox', 'sent', 'drafts', 'archive', 'deleted'].includes(selectedCategory)) {
      return selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
    }
    return selectedCategory.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'
    }`}>
      <style jsx>{`
        /* Custom Scrollbar Styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? 'rgba(51, 65, 85, 0.1)' : 'rgba(203, 213, 225, 0.2)'};
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.4)'};
          border-radius: 3px;
          transition: background 0.2s;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? 'rgba(148, 163, 184, 0.5)' : 'rgba(100, 116, 139, 0.6)'};
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isDarkMode ? 'rgba(148, 163, 184, 0.3) rgba(51, 65, 85, 0.1)' : 'rgba(100, 116, 139, 0.4) rgba(203, 213, 225, 0.2)'};
        }
      `}</style>
      
      <div className="flex h-screen overflow-hidden">
        {/* Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`fixed top-4 right-4 z-50 p-2 rounded-lg transition-all duration-200 ${
            isDarkMode 
              ? 'bg-slate-800/80 text-yellow-400 hover:bg-slate-700/80' 
              : 'bg-white/80 text-slate-600 hover:bg-slate-100/80'
          } backdrop-blur-sm border border-opacity-20`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
        {/* Sidebar */}
        <Sidebar
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onShowAnalytics={() => setShowAnalytics(true)}
          onShowNotifications={() => showNotificationToast('info', 'Notifications', 'All caught up! No new notifications.')}
          onShowCompose={() => setShowCompose(true)}
          emailStats={emailCounts}
          isDarkMode={isDarkMode}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email List Panel */}
          <div className={`w-96 flex flex-col border-r transition-colors duration-300 ${
            isDarkMode 
              ? 'border-slate-700/50 bg-slate-900/30' 
              : 'border-slate-300/50 bg-white/30'
          } backdrop-blur-sm`}>
            {/* Header */}
            <div className={`flex-shrink-0 p-4 border-b transition-colors duration-300 space-y-4 ${
              isDarkMode ? 'border-slate-700/50' : 'border-slate-300/50'
            }`}>
              {/* Account Selector */}
              <AccountSelector
                selectedAccount={selectedAccount}
                onAccountSelect={setSelectedAccount}
                isDarkMode={isDarkMode}
              />
              
              <div className="flex items-center justify-between">
                <MailFolderDropdown
                  selectedFolder={selectedCategory}
                  onFolderSelect={setSelectedCategory}
                  emailCounts={emailCounts}
                  isDarkMode={isDarkMode}
                />
                <div className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <SearchCombobox 
                onSearch={handleSearch}
                placeholder="Search emails, subjects, senders..."
                isDarkMode={isDarkMode}
              />
              
              <FilterMenu 
                onFilterChange={handleFilterChange}
                activeFilters={activeFilters}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <EmailList
                emails={filteredEmails}
                selectedEmailId={selectedEmailId}
                onEmailSelect={handleEmailSelect}
                loading={isLoading}
                onBulkAction={handleBulkAction}
                searchTerm={searchTerm}
                filters={activeFilters}
                isDarkMode={isDarkMode}
              />
            </div>
          </div>

          {/* Email Detail Panel */}
          <div className="flex-1 custom-scrollbar">
            <EmailDetail
              email={selectedEmail}
              onClose={() => setSelectedEmailId(null)}
              onReply={(id, text) => handleEmailAction('reply', id, text)}
              onArchive={(id) => handleEmailAction('archive', id)}
              onDelete={(id) => handleEmailAction('delete', id)}
              onStar={(id) => handleEmailAction('star', id)}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnalyticsModal 
        isOpen={showAnalytics} 
        onClose={() => setShowAnalytics(false)} 
      />

      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={handleComposeSend}
      />

      {/* Notification Toast */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default EmailDashboard;
