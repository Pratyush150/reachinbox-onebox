import React, { useState, useEffect, useMemo } from 'react';
import { 
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  CheckIcon,
  EnvelopeIcon,
  EnvelopeOpenIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const EmailList = ({ 
  emails = [], 
  selectedEmailId, 
  onEmailSelect, 
  loading = false, 
  onBulkAction,
  searchTerm = '',
  filters = [],
  isDarkMode = true 
}) => {
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [sortBy, setSortBy] = useState('receivedDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Clear selections when emails change
  useEffect(() => {
    setSelectedEmails(new Set());
    setShowBulkActions(false);
  }, [emails]);

  // Memoized sorted emails
  const sortedEmails = useMemo(() => {
    if (!emails || emails.length === 0) return [];
    
    return [...emails].sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'receivedDate':
          aVal = new Date(a.receivedDate);
          bVal = new Date(b.receivedDate);
          break;
        case 'subject':
          aVal = a.subject?.toLowerCase() || '';
          bVal = b.subject?.toLowerCase() || '';
          break;
        case 'from':
          aVal = a.from?.name?.toLowerCase() || a.from?.address?.toLowerCase() || '';
          bVal = b.from?.name?.toLowerCase() || b.from?.address?.toLowerCase() || '';
          break;
        case 'aiCategory':
          aVal = a.aiCategory || '';
          bVal = b.aiCategory || '';
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [emails, sortBy, sortOrder]);

  const handleSelectAll = () => {
    if (selectedEmails.size === sortedEmails.length) {
      setSelectedEmails(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedEmails(new Set(sortedEmails.map(email => email._id || email.id)));
      setShowBulkActions(true);
    }
  };

  const handleEmailToggle = (emailId) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleBulkActionClick = (action) => {
    if (selectedEmails.size > 0) {
      onBulkAction(action, Array.from(selectedEmails));
      setSelectedEmails(new Set());
      setShowBulkActions(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diff = now - dateObj;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return dateObj.toLocaleDateString([], { weekday: 'short' });
    } else {
      return dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getAiCategoryColor = (category) => {
    const colors = {
      interested: 'text-emerald-400 bg-emerald-500/20',
      meeting_booked: 'text-blue-400 bg-blue-500/20',
      not_interested: 'text-red-400 bg-red-500/20',
      spam: 'text-orange-400 bg-orange-500/20',
      out_of_office: 'text-purple-400 bg-purple-500/20'
    };
    return colors[category] || 'text-gray-400 bg-gray-500/20';
  };

  const getAiCategoryIcon = (category) => {
    switch (category) {
      case 'interested': return '🎯';
      case 'meeting_booked': return '📅';
      case 'not_interested': return '❌';
      case 'spam': return '🚫';
      case 'out_of_office': return '🏠';
      default: return '📧';
    }
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className={`${isDarkMode ? 'bg-yellow-500/30' : 'bg-yellow-200'} rounded px-1`}>
          {part}
        </mark>
      ) : part
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-center p-8 ${
        isDarkMode ? 'text-slate-400' : 'text-gray-500'
      }`}>
        <EnvelopeIcon className="w-12 h-12 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">No emails found</h3>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with bulk actions and sort controls */}
      <div className={`flex-shrink-0 p-3 border-b transition-colors duration-300 ${
        isDarkMode ? 'border-slate-600/40' : 'border-gray-200/60'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedEmails.size === sortedEmails.length}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              {selectedEmails.size > 0 ? `${selectedEmails.size} selected` : `${sortedEmails.length} emails`}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`text-sm rounded px-2 py-1 border ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="receivedDate">Date</option>
              <option value="subject">Subject</option>
              <option value="from">Sender</option>
              <option value="aiCategory">Category</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-1 rounded ${
                isDarkMode 
                  ? 'hover:bg-slate-700 text-slate-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${
                sortOrder === 'desc' ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {showBulkActions && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-600/40">
            <button
              onClick={() => handleBulkActionClick('markRead')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                isDarkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <EnvelopeOpenIcon className="w-3 h-3" />
              Mark Read
            </button>
            <button
              onClick={() => handleBulkActionClick('archive')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                isDarkMode 
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <ArchiveBoxIcon className="w-3 h-3" />
              Archive
            </button>
            <button
              onClick={() => handleBulkActionClick('delete')}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400"
            >
              <TrashIcon className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {sortedEmails.map((email) => (
          <EmailListItem
            key={email._id || email.id}
            email={email}
            isSelected={selectedEmailId === (email._id || email.id)}
            isChecked={selectedEmails.has(email._id || email.id)}
            onSelect={onEmailSelect}
            onToggle={handleEmailToggle}
            searchTerm={searchTerm}
            isDarkMode={isDarkMode}
            formatDate={formatDate}
            getAiCategoryColor={getAiCategoryColor}
            getAiCategoryIcon={getAiCategoryIcon}
            highlightText={highlightText}
          />
        ))}
      </div>
    </div>
  );
};

const EmailListItem = ({
  email,
  isSelected,
  isChecked,
  onSelect,
  onToggle,
  searchTerm,
  isDarkMode,
  formatDate,
  getAiCategoryColor,
  getAiCategoryIcon,
  highlightText
}) => {
  const emailId = email._id || email.id;
  
  return (
    <div
      className={`relative border-b transition-all duration-200 cursor-pointer group ${
        isDarkMode ? 'border-slate-700/50' : 'border-gray-200/50'
      } ${
        isSelected
          ? isDarkMode
            ? 'bg-blue-500/20 border-blue-400/40'
            : 'bg-blue-50 border-blue-200'
          : isDarkMode
            ? 'hover:bg-slate-800/50'
            : 'hover:bg-gray-50'
      }`}
      onClick={() => onSelect(emailId)}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(emailId);
          }}
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />

        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
          {email.from?.name?.charAt(0) || email.from?.address?.charAt(0) || '?'}
        </div>

        {/* Email content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium truncate ${
                !email.isRead
                  ? isDarkMode ? 'text-white' : 'text-gray-900'
                  : isDarkMode ? 'text-slate-300' : 'text-gray-700'
              }`}>
                {highlightText(email.from?.name || email.from?.address || 'Unknown', searchTerm)}
              </span>
              {!email.isRead && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {email.isStarred && (
                <StarIconSolid className="w-4 h-4 text-yellow-400" />
              )}
              <span className={`text-xs ${
                isDarkMode ? 'text-slate-400' : 'text-gray-500'
              }`}>
                {formatDate(email.receivedDate)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-medium truncate ${
              !email.isRead
                ? isDarkMode ? 'text-white' : 'text-gray-900'
                : isDarkMode ? 'text-slate-300' : 'text-gray-700'
            }`}>
              {highlightText(email.subject || 'No subject', searchTerm)}
            </h3>
          </div>

          <p className={`text-sm line-clamp-2 mb-2 ${
            isDarkMode ? 'text-slate-400' : 'text-gray-600'
          }`}>
            {highlightText(email.textBody || 'No content', searchTerm)}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* AI Category */}
              {email.aiCategory && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  getAiCategoryColor(email.aiCategory)
                }`}>
                  <span>{getAiCategoryIcon(email.aiCategory)}</span>
                  {email.aiCategory.replace('_', ' ')}
                </span>
              )}

              {/* Confidence score */}
              {email.aiConfidence && (
                <span className={`text-xs ${
                  isDarkMode ? 'text-slate-500' : 'text-gray-400'
                }`}>
                  {Math.round(email.aiConfidence * 100)}%
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle star toggle
                }}
                className={`p-1 rounded hover:bg-slate-700 ${
                  isDarkMode ? 'text-slate-400 hover:text-yellow-400' : 'text-gray-400 hover:text-yellow-500'
                }`}
              >
                <StarIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle archive
                }}
                className={`p-1 rounded hover:bg-slate-700 ${
                  isDarkMode ? 'text-slate-400 hover:text-blue-400' : 'text-gray-400 hover:text-blue-500'
                }`}
              >
                <ArchiveBoxIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle delete
                }}
                className={`p-1 rounded hover:bg-slate-700 ${
                  isDarkMode ? 'text-slate-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                }`}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailList;
