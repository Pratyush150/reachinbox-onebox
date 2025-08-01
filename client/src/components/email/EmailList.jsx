import React, { useState, useMemo } from 'react';
import { 
  StarIcon, 
  ArchiveBoxIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const CategoryBadge = ({ category, confidence, isDarkMode }) => {
  const categoryConfig = {
    interested: {
      color: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
      bg: isDarkMode ? 'bg-emerald-500/15 border-emerald-400/30' : 'bg-emerald-50 border-emerald-200',
      label: 'Interested'
    },
    meeting_booked: {
      color: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      bg: isDarkMode ? 'bg-blue-500/15 border-blue-400/30' : 'bg-blue-50 border-blue-200',
      label: 'Meeting'
    },
    not_interested: {
      color: isDarkMode ? 'text-red-300' : 'text-red-700',
      bg: isDarkMode ? 'bg-red-500/15 border-red-400/30' : 'bg-red-50 border-red-200',
      label: 'Not Interested'
    },
    spam: {
      color: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      bg: isDarkMode ? 'bg-orange-500/15 border-orange-400/30' : 'bg-orange-50 border-orange-200',
      label: 'Spam'
    },
    out_of_office: {
      color: isDarkMode ? 'text-purple-300' : 'text-purple-700',
      bg: isDarkMode ? 'bg-purple-500/15 border-purple-400/30' : 'bg-purple-50 border-purple-200',
      label: 'OOO'
    }
  };

  const config = categoryConfig[category];
  if (!config) return null;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all duration-200 hover:scale-105 ${config.bg} ${config.color}`}>
      <span>{config.label}</span>
      {confidence && (
        <span className={`text-xs font-normal ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
};

const EmailListItem = ({ 
  email, 
  isSelected, 
  isInSelectionMode,
  onSelect, 
  onToggleSelect,
  onStarToggle,
  onArchive,
  onDelete,
  onMarkRead,
  isDarkMode
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date) => {
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const getPriorityColor = (category) => {
    switch (category) {
      case 'interested': return isDarkMode ? 'border-l-emerald-400' : 'border-l-emerald-500';
      case 'meeting_booked': return isDarkMode ? 'border-l-blue-400' : 'border-l-blue-500';
      case 'not_interested': return isDarkMode ? 'border-l-red-400' : 'border-l-red-500';
      case 'spam': return isDarkMode ? 'border-l-orange-400' : 'border-l-orange-500';
      case 'out_of_office': return isDarkMode ? 'border-l-purple-400' : 'border-l-purple-500';
      default: return isDarkMode ? 'border-l-slate-600' : 'border-l-gray-400';
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative border-l-4 transition-all duration-200 cursor-pointer border-r border-t border-b
        ${getPriorityColor(email.aiCategory)}
        ${isSelected
          ? isDarkMode 
            ? 'bg-blue-500/15 border-r-blue-400/30 border-t-blue-400/30 border-b-blue-400/30 shadow-lg shadow-blue-500/10'
            : 'bg-blue-50 border-r-blue-200 border-t-blue-200 border-b-blue-200 shadow-lg shadow-blue-500/10'
          : email.isRead
            ? isDarkMode 
              ? 'bg-slate-800/40 border-r-slate-600/30 border-t-slate-600/30 border-b-slate-600/30 hover:bg-slate-800/60'
              : 'bg-white/60 border-r-gray-200/60 border-t-gray-200/60 border-b-gray-200/60 hover:bg-gray-50/80'
            : isDarkMode 
              ? 'bg-slate-800/70 border-r-slate-600/40 border-t-slate-600/40 border-b-slate-600/40 hover:bg-slate-800/90'
              : 'bg-white/90 border-r-gray-300/60 border-t-gray-300/60 border-b-gray-300/60 hover:bg-gray-50'
        }
        backdrop-blur-sm shadow-sm
      `}
    >
      <div 
        onClick={() => onSelect(email.id)}
        className="p-4"
      >
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isInSelectionMode}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect(email.id);
              }}
              className={`w-4 h-4 text-blue-500 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-slate-700 border-slate-600' 
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 shadow-sm
              ${email.isRead 
                ? isDarkMode 
                  ? 'bg-slate-700/60 text-slate-300 border border-slate-600/40' 
                  : 'bg-gray-100 text-gray-600 border border-gray-300/60'
                : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg border border-blue-400/30'
              }
              ${isSelected ? 'scale-110 shadow-xl' : 'group-hover:scale-105'}
            `}>
              {getInitials(email.from.name, email.from.address)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className={`font-semibold truncate transition-colors duration-200 ${
                  email.isRead 
                    ? isDarkMode ? 'text-slate-300' : 'text-gray-700'
                    : isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {email.from.name || email.from.address}
                </h3>
                
                {!email.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                )}
                
                {email.isStarred && (
                  <StarSolid className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-medium ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  {formatDate(email.receivedDate)}
                </span>
                
                {email.aiCategory === 'interested' && (
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </div>
            </div>

            {/* Subject */}
            <p className={`text-sm truncate mb-2 transition-colors duration-200 font-medium ${
              email.isRead 
                ? isDarkMode ? 'text-slate-400' : 'text-gray-600'
                : isDarkMode ? 'text-slate-200' : 'text-gray-800'
            }`}>
              {email.subject}
            </p>

            {/* Preview */}
            <p className={`text-xs truncate mb-3 leading-relaxed ${
              isDarkMode ? 'text-slate-500' : 'text-gray-500'
            }`}>
              {email.textBody}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryBadge 
                  category={email.aiCategory} 
                  confidence={email.aiConfidence}
                  isDarkMode={isDarkMode}
                />
                
                {email.attachments && email.attachments.length > 0 && (
                  <div className={`text-xs px-2 py-1 rounded-lg border ${
                    isDarkMode 
                      ? 'text-slate-400 bg-slate-700/50 border-slate-600/40' 
                      : 'text-gray-600 bg-gray-100/80 border-gray-300/60'
                  }`}>
                    📎 {email.attachments.length}
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className={`flex items-center gap-1 transition-all duration-200 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
              }`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStarToggle(email.id);
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10' 
                      : 'text-gray-500 hover:text-yellow-500 hover:bg-yellow-50'
                  }`}
                  title="Star email"
                >
                  {email.isStarred ? (
                    <StarSolid className="w-4 h-4" />
                  ) : (
                    <StarIcon className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(email.id, !email.isRead);
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'text-slate-400 hover:text-blue-400 hover:bg-blue-400/10' 
                      : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title={email.isRead ? "Mark unread" : "Mark read"}
                >
                  {email.isRead ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(email.id);
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'text-slate-400 hover:text-green-400 hover:bg-green-400/10' 
                      : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                  }`}
                  title="Archive"
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(email.id);
                  }}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isDarkMode 
                      ? 'text-slate-400 hover:text-red-400 hover:bg-red-400/10' 
                      : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator for actions */}
      {email.isLoading && (
        <div className={`absolute inset-0 backdrop-blur-sm flex items-center justify-center ${
          isDarkMode ? 'bg-slate-800/50' : 'bg-white/50'
        }`}>
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

const EmailList = ({ 
  emails, 
  selectedEmailId, 
  onEmailSelect, 
  loading,
  onBulkAction,
  searchTerm,
  filters,
  isDarkMode = true
}) => {
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [sortBy, setSortBy] = useState('date'); // date, sender, subject
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  // Sort emails
  const sortedEmails = useMemo(() => {
    const sorted = [...emails].sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'sender':
          aVal = a.from.name || a.from.address;
          bVal = b.from.name || b.from.address;
          break;
        case 'subject':
          aVal = a.subject;
          bVal = b.subject;
          break;
        case 'date':
        default:
          aVal = new Date(a.receivedDate);
          bVal = new Date(b.receivedDate);
          break;
      }
      
      if (sortBy === 'date') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      } else {
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === 'desc' ? -comparison : comparison;
      }
    });
    
    return sorted;
  }, [emails, sortBy, sortOrder]);

  const toggleEmailSelection = (emailId) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const selectAllEmails = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const handleBulkAction = (action) => {
    onBulkAction(action, Array.from(selectedEmails));
    setSelectedEmails(new Set());
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className={`flex items-start gap-4 p-4 rounded-xl border ${
              isDarkMode 
                ? 'bg-slate-800/40 border-slate-600/30' 
                : 'bg-white/60 border-gray-200/60'
            }`}>
              <div className={`w-10 h-10 rounded-xl ${
                isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
              }`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 rounded w-3/4 ${
                  isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                }`} />
                <div className={`h-3 rounded w-1/2 ${
                  isDarkMode ? 'bg-slate-800' : 'bg-gray-100'
                }`} />
                <div className={`h-3 rounded w-full ${
                  isDarkMode ? 'bg-slate-800' : 'bg-gray-100'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls - Enhanced */}
      <div className={`flex-shrink-0 p-4 border-b space-y-4 ${
        isDarkMode ? 'border-slate-600/40' : 'border-gray-200/60'
      }`}>
        {/* Bulk Actions */}
        {selectedEmails.size > 0 && (
          <div className={`rounded-xl p-3 border animate-in slide-in-from-top-2 duration-200 shadow-sm ${
            isDarkMode 
              ? 'bg-slate-800/60 border-slate-600/40 shadow-slate-900/20' 
              : 'bg-white/80 border-gray-200/60 shadow-gray-900/5'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-slate-200' : 'text-gray-800'
              }`}>
                {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBulkAction('markRead')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:scale-105 transition-all duration-200 border ${
                    isDarkMode 
                      ? 'bg-blue-500/20 text-blue-300 border-blue-400/30 hover:bg-blue-500/30' 
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <EyeIcon className="w-4 h-4" />
                  Mark Read
                </button>
                <button 
                  onClick={() => handleBulkAction('archive')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:scale-105 transition-all duration-200 border ${
                    isDarkMode 
                      ? 'bg-green-500/20 text-green-300 border-green-400/30 hover:bg-green-500/30' 
                      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  }`}
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                  Archive
                </button>
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm hover:scale-105 transition-all duration-200 border ${
                    isDarkMode 
                      ? 'bg-red-500/20 text-red-300 border-red-400/30 hover:bg-red-500/30' 
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                  }`}
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List Controls - Enhanced */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllEmails}
              className={`flex items-center gap-2 text-sm transition-colors ${
                isDarkMode 
                  ? 'text-slate-300 hover:text-white' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <div className={`w-4 h-4 border rounded transition-all duration-200 ${
                selectedEmails.size === emails.length 
                  ? 'bg-blue-500 border-blue-500' 
                  : selectedEmails.size > 0
                    ? 'bg-blue-500/50 border-blue-500'
                    : isDarkMode 
                      ? 'border-slate-600 hover:border-slate-500' 
                      : 'border-gray-400 hover:border-gray-500'
              }`}>
                {selectedEmails.size > 0 && (
                  <CheckIcon className="w-4 h-4 text-white" />
                )}
              </div>
              Select All
            </button>

            <div className={`text-sm font-medium ${
              isDarkMode ? 'text-slate-300' : 'text-gray-700'
            }`}>
              {emails.length} email{emails.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Sort Controls - Enhanced */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors focus:ring-2 focus:ring-blue-500/50 ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-600/50 text-white focus:border-transparent' 
                  : 'bg-white/80 border-gray-300/50 text-gray-900 focus:border-transparent'
              }`}
            >
              <option value="date">Date</option>
              <option value="sender">Sender</option>
              <option value="subject">Subject</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-1.5 rounded-lg transition-colors border ${
                isDarkMode 
                  ? 'text-slate-300 hover:text-white border-slate-600/50 hover:bg-slate-800/50' 
                  : 'text-gray-600 hover:text-gray-900 border-gray-300/50 hover:bg-gray-100/50'
              }`}
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Email List - Enhanced */}
      <div className="flex-1 overflow-y-auto">
        {sortedEmails.length === 0 ? (
          <div className={`flex items-center justify-center h-64 ${
            isDarkMode ? 'text-slate-400' : 'text-gray-600'
          }`}>
            <div className="text-center">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No emails found</p>
              {searchTerm && (
                <p className="text-sm mt-2 opacity-75">Try adjusting your search or filters</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sortedEmails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmailId === email.id}
                isInSelectionMode={selectedEmails.has(email.id)}
                onSelect={onEmailSelect}
                onToggleSelect={toggleEmailSelection}
                onStarToggle={(id) => console.log('Toggle star:', id)}
                onArchive={(id) => console.log('Archive:', id)}
                onDelete={(id) => console.log('Delete:', id)}
                onMarkRead={(id, read) => console.log('Mark read:', id, read)}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailList;
