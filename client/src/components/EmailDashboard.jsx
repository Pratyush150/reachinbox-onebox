import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// Import our enhanced modular components
import Sidebar from './layout/Sidebar';
import SearchCombobox from './ui/SearchCombobox';
import FilterMenu from './ui/FilterMenu';
import AnalyticsModal from './ui/AnalyticsModal';
import ComposeModal from './ui/ComposeModal';
import EmailList from './email/EmailList';
import EmailDetail from './email/EmailDetail';

// API Configuration
const API_BASE = 'http://65.1.63.189:5001/api/v1';

// API Service
const apiService = {
  async fetchEmails(folder = 'inbox', page = 1, limit = 50) {
    const response = await fetch(`${API_BASE}/emails?folder=${folder}&page=${page}&limit=${limit}`);
    const data = await response.json();
    return data.success ? data.data.emails : [];
  },

  async fetchEmailStats() {
    const response = await fetch(`${API_BASE}/emails/stats`);
    const data = await response.json();
    return data.success ? data.data : {};
  },

  // FIXED: Enhanced mark email as read with local state update
  async markEmailRead(emailId) {
    const response = await fetch(`${API_BASE}/emails/${emailId}/read`, { method: 'PUT' });
    const result = await response.json();
    return result;
  },

  // FIXED: Enhanced mark email as unread
  async markEmailUnread(emailId) {
    const response = await fetch(`${API_BASE}/emails/${emailId}/unread`, { method: 'PUT' });
    const result = await response.json();
    return result;
  },

  async bulkAction(action, emailIds) {
    const response = await fetch(`${API_BASE}/emails/bulk-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, emailIds })
    });
    return response.json();
  },

  async searchEmails(query) {
    const response = await fetch(`${API_BASE}/emails/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.success ? data.data.emails : [];
  },

  async starEmail(emailId) {
    const response = await fetch(`${API_BASE}/emails/${emailId}/star`, { method: 'PUT' });
    return response.json();
  },

  async archiveEmail(emailId) {
    const response = await fetch(`${API_BASE}/emails/${emailId}/archive`, { method: 'PUT' });
    return response.json();
  },

  async deleteEmail(emailId) {
    const response = await fetch(`${API_BASE}/emails/bulk-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', emailIds: [emailId] })
    });
    return response.json();
  }
};

// Enhanced Notification Component
const NotificationToast = ({ notification, onClose, isDarkMode }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getNotificationColor = (type) => {
    if (isDarkMode) {
      switch (type) {
        case 'interested': return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-emerald-500/20';
        case 'meeting_booked': return 'bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-blue-500/20';
        case 'success': return 'bg-green-500/20 border-green-400/40 text-green-300 shadow-green-500/20';
        case 'error': return 'bg-red-500/20 border-red-400/40 text-red-300 shadow-red-500/20';
        case 'info': return 'bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-blue-500/20';
        default: return 'bg-slate-700/60 border-slate-600/60 text-slate-200 shadow-slate-900/40';
      }
    } else {
      switch (type) {
        case 'interested': return 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-500/20';
        case 'meeting_booked': return 'bg-blue-50 border-blue-200 text-blue-800 shadow-blue-500/20';
        case 'success': return 'bg-green-50 border-green-200 text-green-800 shadow-green-500/20';
        case 'error': return 'bg-red-50 border-red-200 text-red-800 shadow-red-500/20';
        case 'info': return 'bg-blue-50 border-blue-200 text-blue-800 shadow-blue-500/20';
        default: return 'bg-white border-gray-200 text-gray-800 shadow-gray-500/20';
      }
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
    <div className={`fixed top-4 right-4 max-w-sm p-4 rounded-xl border backdrop-blur-sm z-50 animate-in slide-in-from-right-2 duration-300 shadow-xl ${getNotificationColor(notification.type)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
          <div>
            <div className="font-semibold">{notification.title}</div>
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

// Enhanced Account Selector Dropdown Component
const AccountSelector = ({ selectedAccount, onAccountSelect, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    // Fetch real accounts from API
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`${API_BASE}/accounts`);
        const data = await response.json();
        if (data.success) {
          setAccounts(data.data.map(account => ({
            id: account._id,
            email: account.email,
            name: account.email.split('@')[0],
            unread: 0, // Will be updated with real stats
            provider: account.provider || 'Gmail'
          })));
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
        // Fallback to mock data
        setAccounts([{
          id: 'account1',
          email: 'support@kairostudio.in',
          name: 'Support',
          unread: 23,
          provider: 'GoDaddy'
        }]);
      }
    };

    fetchAccounts();
  }, []);

  const selectedAccountData = accounts.find(a => a.id === selectedAccount) || accounts[0];

  if (!selectedAccountData) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-colors border shadow-sm ${
          isDarkMode
            ? 'bg-slate-800/60 border-slate-600/40 text-white hover:bg-slate-800/80 shadow-slate-900/20'
            : 'bg-white/80 border-gray-200/60 text-gray-900 hover:bg-white shadow-gray-900/5'
        }`}
      >
        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg">
          {selectedAccountData.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-sm">{selectedAccountData.name}</div>
          <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{selectedAccountData.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {selectedAccountData.unread > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
              {selectedAccountData.unread}
            </span>
          )}
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
        </div>
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl backdrop-blur-sm z-30 animate-in slide-in-from-top-2 duration-200 border ${
          isDarkMode
            ? 'bg-slate-800/95 border-slate-600/40 shadow-slate-900/40'
            : 'bg-white/95 border-gray-200/60 shadow-gray-900/20'
        }`}>
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => {
                onAccountSelect(account.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${
                selectedAccount === account.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-700/50'
                    : 'text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {account.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{account.name}</div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>{account.email} • {account.provider}</div>
              </div>
              {account.unread > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  {account.unread}
                </span>
              )}
            </button>
          ))}

          <div className={`border-t p-2 ${isDarkMode ? 'border-slate-600/40' : 'border-gray-200/60'}`}>
            <button className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg transition-colors text-sm ${
              isDarkMode
                ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
            }`}>
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

const MailFolderDropdown = ({ selectedFolder, onFolderSelect, emailCounts, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const folders = [
    { key: 'inbox', label: 'Inbox', count: emailCounts.folders?.inbox || 0 },
    { key: 'sent', label: 'Sent', count: emailCounts.folders?.sent || 0 },
    { key: 'drafts', label: 'Drafts', count: emailCounts.folders?.drafts || 0 },
    { key: 'scheduled', label: 'Scheduled', count: emailCounts.folders?.scheduled || 0 },
    { key: 'archive', label: 'Archive', count: emailCounts.folders?.archive || 0 },
    { key: 'deleted', label: 'Deleted', count: emailCounts.folders?.deleted || 0 }
  ];

  const selectedFolderData = folders.find(f => f.key === selectedFolder) || folders[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors border shadow-sm ${
          isDarkMode
            ? 'bg-slate-800/60 border-slate-600/40 text-white hover:bg-slate-800/80 shadow-slate-900/20'
            : 'bg-white/80 border-gray-200/60 text-gray-900 hover:bg-white shadow-gray-900/5'
        }`}
      >
        <span className="font-semibold">{selectedFolderData.label}</span>
        <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>({selectedFolderData.count})</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-2 w-48 rounded-xl shadow-xl backdrop-blur-sm z-20 animate-in slide-in-from-top-2 duration-200 border ${
          isDarkMode
            ? 'bg-slate-800/95 border-slate-600/40 shadow-slate-900/40'
            : 'bg-white/95 border-gray-200/60 shadow-gray-900/20'
        }`}>
          {folders.map((folder) => (
            <button
              key={folder.key}
              onClick={() => {
                onFolderSelect(folder.key);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${
                selectedFolder === folder.key
                  ? 'bg-blue-500/20 text-blue-400'
                  : isDarkMode
                    ? 'text-slate-300 hover:bg-slate-700/50'
                    : 'text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <span className="font-medium">{folder.label}</span>
              <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>({folder.count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EmailDashboard = () => {
  // State management
  const [emails, setEmails] = useState([]);
  const [emailStats, setEmailStats] = useState({});
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

  // Load emails on component mount and category change
  useEffect(() => {
    const loadEmails = async () => {
      setIsLoading(true);
      try {
        const fetchedEmails = await apiService.fetchEmails(selectedCategory, 1, 150);
        const stats = await apiService.fetchEmailStats();
        
        setEmails(fetchedEmails);
        setEmailStats(stats);
      } catch (error) {
        console.error('Failed to load emails:', error);
        setNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load emails from API'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEmails();
  }, [selectedCategory]);

  // Search functionality
  useEffect(() => {
    if (searchTerm) {
      const performSearch = async () => {
        setIsLoading(true);
        try {
          const searchResults = await apiService.searchEmails(searchTerm);
          setEmails(searchResults);
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsLoading(false);
        }
      };

      const searchTimer = setTimeout(performSearch, 300);
      return () => clearTimeout(searchTimer);
    }
  }, [searchTerm]);

  // FIXED: Calculate email counts properly
  const emailCounts = useMemo(() => {
    // Use API stats if available
    if (emailStats.folders && emailStats.categories && emailStats.status) {
      return {
        // Folder counts from API
        folders: {
          inbox: emailStats.folders.inbox || 0,
          sent: emailStats.folders.sent || 0,
          drafts: emailStats.folders.drafts || 0,
          scheduled: emailStats.folders.scheduled || 0,
          archive: emailStats.folders.archive || 0,
          deleted: emailStats.folders.deleted || 0
        },
        // Category counts from API
        categories: {
          interested: emailStats.categories.interested || 0,
          meeting_booked: emailStats.categories.meeting_booked || 0,
          not_interested: emailStats.categories.not_interested || 0,
          spam: emailStats.categories.spam || 0,
          out_of_office: emailStats.categories.out_of_office || 0
        },
        // Status counts from API
        status: {
          total: emailStats.status.total || 0,
          unread: emailStats.status.unread || 0,
          starred: emailStats.status.starred || 0,
          archived: emailStats.status.archived || 0
        }
      };
    }
    
    // Fallback: Calculate from current emails (less accurate)
    const counts = {
      folders: {
        inbox: 0, sent: 0, drafts: 0, scheduled: 0, archive: 0, deleted: 0
      },
      categories: {
        interested: 0, meeting_booked: 0, not_interested: 0, spam: 0, out_of_office: 0
      },
      status: {
        total: emails.length,
        unread: 0,
        starred: 0,
        archived: 0
      }
    };

    emails.forEach(email => {
      // Count by folder
      if (email.folder && counts.folders.hasOwnProperty(email.folder)) {
        counts.folders[email.folder]++;
      }
      
      // Count by AI category
      if (email.aiCategory && counts.categories.hasOwnProperty(email.aiCategory)) {
        counts.categories[email.aiCategory]++;
      }
      
      // Count by status
      if (!email.isRead) counts.status.unread++;
      if (email.isStarred) counts.status.starred++;
      if (email.isArchived) counts.status.archived++;
    });

    return counts;
  }, [emailStats, emails]);

  // Filter emails based on category, search, and filters
  const filteredEmails = useMemo(() => {
    let filtered = emails;

    // Apply additional filters (search is handled by API)
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
  }, [emails, activeFilters]);

  const selectedEmail = selectedEmailId ? emails.find(e => e._id === selectedEmailId || e.id === selectedEmailId) : null;

  // Event handlers
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
  }, []);

  // FIXED: Enhanced email select with proper read marking
  const handleEmailSelect = useCallback(async (emailId) => {
    setSelectedEmailId(emailId);

    // Find the email in our local state
    const email = emails.find(e => e._id === emailId || e.id === emailId);
    
    // Mark email as read via API if it's unread
    if (email && !email.isRead) {
      try {
        const result = await apiService.markEmailRead(emailId);
        if (result.success) {
          // Update local state immediately for responsive UI
          setEmails(prevEmails =>
            prevEmails.map(email =>
              (email._id === emailId || email.id === emailId) 
                ? { ...email, isRead: true } 
                : email
            )
          );
          
          // Update email stats to reflect the change
          setEmailStats(prevStats => ({
            ...prevStats,
            status: {
              ...prevStats.status,
              unread: Math.max(0, (prevStats.status?.unread || 0) - 1)
            }
          }));
        }
      } catch (error) {
        console.error('Failed to mark email as read:', error);
        setNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to mark email as read'
        });
      }
    }
  }, [emails]);

  const handleBulkAction = useCallback(async (action, emailIds) => {
    try {
      const result = await apiService.bulkAction(action, emailIds);
      
      if (result.success) {
        // Reload emails to reflect changes
        const fetchedEmails = await apiService.fetchEmails(selectedCategory, 1, 150);
        const stats = await apiService.fetchEmailStats();
        setEmails(fetchedEmails);
        setEmailStats(stats);
        
        setNotification({
          type: 'success',
          title: 'Action completed',
          message: result.message
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Action failed',
        message: error.message
      });
    }
  }, [selectedCategory]);

  // FIXED: Enhanced email actions with local state updates
  const handleEmailAction = useCallback(async (action, emailId, data = null) => {
    if (!emailId || emailId === 'undefined') {
      console.error('Invalid email ID:', emailId);
      return;
    }

    try {
      let result;
      
      switch (action) {
        case 'star':
          result = await apiService.starEmail(emailId);
          break;
        case 'archive':
          result = await apiService.archiveEmail(emailId);
          break;
        case 'delete':
          result = await apiService.deleteEmail(emailId);
          break;
        case 'markRead':
          result = await apiService.markEmailRead(emailId);
          break;
        case 'markUnread':
          result = await apiService.markEmailUnread(emailId);
          break;
        case 'reply':
          // Handle reply functionality
          setNotification({
            type: 'info',
            title: 'Reply sent',
            message: 'Your reply has been sent successfully'
          });
          return;
        default:
          console.log('Action not implemented via API:', action);
          return;
      }

      if (result?.success) {
        // Update local state immediately for responsive UI
        setEmails(prevEmails => {
          return prevEmails.map(email => {
            if (email._id === emailId || email.id === emailId) {
              const updatedEmail = { ...email };
              
              switch (action) {
                case 'star':
                  updatedEmail.isStarred = !email.isStarred;
                  break;
                case 'archive':
                  updatedEmail.isArchived = true;
                  updatedEmail.folder = 'archive';
                  break;
                case 'delete':
                  updatedEmail.folder = 'deleted';
                  break;
                case 'markRead':
                  updatedEmail.isRead = true;
                  break;
                case 'markUnread':
                  updatedEmail.isRead = false;
                  break;
              }
              
              return updatedEmail;
            }
            return email;
          });
        });

        // Clear selected email if it was archived or deleted
        if (['archive', 'delete'].includes(action) && selectedEmailId === emailId) {
          setSelectedEmailId(null);
        }

        // Update stats
        const stats = await apiService.fetchEmailStats();
        setEmailStats(stats);

        setNotification({
          type: 'success',
          title: `Email ${action}d`,
          message: `Email ${action} completed successfully`
        });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Action failed',
        message: error.message
      });
    }
  }, [selectedEmailId]);

  const handleComposeSend = useCallback((emailData) => {
    setNotification({
      type: 'success',
      title: emailData.scheduled ? 'Email scheduled!' : 'Email sent!',
      message: emailData.scheduled
        ? `Email scheduled for ${new Date(emailData.scheduled).toLocaleString()}`
        : `Email sent to ${emailData.to}`
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
    if (['inbox', 'sent', 'drafts', 'scheduled', 'archive', 'deleted'].includes(selectedCategory)) {
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? 'rgba(15, 23, 42, 0.3)' : 'rgba(241, 245, 249, 0.8)'};
          border-radius: 8px;
          margin: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode
            ? 'linear-gradient(45deg, rgba(59, 130, 246, 0.6), rgba(139, 92, 246, 0.6))'
            : 'linear-gradient(45deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))'};
          border-radius: 8px;
          border: ${isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.4)'};
          transition: all 0.3s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode
            ? 'linear-gradient(45deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))'
            : 'linear-gradient(45deg, rgba(59, 130, 246, 1), rgba(139, 92, 246, 1))'};
          border: ${isDarkMode ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(59, 130, 246, 0.6)'};
          transform: scale(1.1);
        }

        .custom-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isDarkMode
            ? 'rgba(59, 130, 246, 0.6) rgba(15, 23, 42, 0.3)'
            : 'rgba(59, 130, 246, 0.8) rgba(241, 245, 249, 0.8)'};
        }

        .reply-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .reply-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)'};
          border-radius: 6px;
        }

        .reply-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3b82f6, #8b5cf6, #ec4899);
          border-radius: 6px;
          transition: all 0.3s ease;
        }

        .reply-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #2563eb, #7c3aed, #db2777);
          transform: scale(1.2);
        }
      `}</style>

      <div className="flex h-screen overflow-hidden">
        {/* Enhanced Theme Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`fixed top-4 right-4 z-50 p-3 rounded-xl transition-all duration-200 border shadow-lg ${
            isDarkMode
              ? 'bg-slate-800/90 text-yellow-400 hover:bg-slate-700/90 border-slate-600/50 shadow-slate-900/50'
              : 'bg-white/90 text-slate-600 hover:bg-slate-100/90 border-gray-300/50 shadow-gray-500/20'
          } backdrop-blur-sm`}
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

        {/* Enhanced Sidebar with FIXED counts */}
        <Sidebar
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onShowAnalytics={() => setShowAnalytics(true)}
          onShowNotifications={() => showNotificationToast('info', 'Notifications', 'All caught up! No new notifications.')}
          onShowCompose={() => setShowCompose(true)}
          emailStats={emailCounts} // FIXED: Pass correctly structured counts
          isDarkMode={isDarkMode}
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Enhanced Email List Panel */}
          <div className={`w-96 flex flex-col border-r transition-colors duration-300 ${
            isDarkMode
              ? 'border-slate-600/40 bg-slate-900/40'
              : 'border-gray-200/60 bg-white/40'
          } backdrop-blur-sm`}>
            {/* Enhanced Header */}
            <div className={`flex-shrink-0 p-4 border-b transition-colors duration-300 space-y-4 ${
              isDarkMode ? 'border-slate-600/40' : 'border-gray-200/60'
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
                  emailCounts={emailCounts} // FIXED: Pass correct counts
                  isDarkMode={isDarkMode}
                />
                <div className={`text-sm font-medium transition-colors duration-300 ${
                  isDarkMode ? 'text-slate-300' : 'text-gray-700'
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

            {/* Enhanced Email List */}
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

          {/* Enhanced Email Detail Panel */}
          <div className="flex-1 custom-scrollbar">
            <EmailDetail
              email={selectedEmail}
              onClose={() => setSelectedEmailId(null)}
              onReply={(id, text, options) => handleEmailAction('reply', id, { text, ...options })}
              onArchive={(id) => handleEmailAction('archive', id)}
              onDelete={(id) => handleEmailAction('delete', id)}
              onStar={(id) => handleEmailAction('star', id)}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Modals */}
      <AnalyticsModal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        isDarkMode={isDarkMode}
      />

      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        onSend={handleComposeSend}
        isDarkMode={isDarkMode}
      />

      {/* Enhanced Notification Toast */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default EmailDashboard;
