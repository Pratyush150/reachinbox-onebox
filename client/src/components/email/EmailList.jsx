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

const CategoryBadge = ({ category, confidence }) => {
  const categoryConfig = {
    interested: {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      label: 'Interested'
    },
    meeting_booked: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      label: 'Meeting'
    },
    not_interested: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      label: 'Not Interested'
    },
    spam: {
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      label: 'Spam'
    },
    out_of_office: {
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      label: 'OOO'
    }
  };

  const config = categoryConfig[category];
  if (!config) return null;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${config.bg} ${config.color} ${config.border}`}>
      <span>{config.label}</span>
      {confidence && (
        <span className="text-white/60">{Math.round(confidence * 100)}%</span>
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
  onMarkRead 
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
      case 'interested': return 'border-l-emerald-400';
      case 'meeting_booked': return 'border-l-blue-400';
      case 'not_interested': return 'border-l-red-400';
      case 'spam': return 'border-l-orange-400';
      case 'out_of_office': return 'border-l-purple-400';
      default: return 'border-l-slate-600';
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative border-l-4 transition-all duration-200 cursor-pointer
        ${getPriorityColor(email.aiCategory)}
        ${isSelected
          ? 'bg-blue-500/10 border-r border-t border-b border-blue-500/30 shadow-lg shadow-blue-500/10'
          : email.isRead
            ? 'bg-slate-800/30 border-r border-t border-b border-slate-700/30 hover:bg-slate-800/50'
            : 'bg-slate-800/50 border-r border-t border-b border-slate-700/50 hover:bg-slate-800/70'
        }
        backdrop-blur-sm
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
              className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 transition-all duration-200"
            />
          </div>

          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
              ${email.isRead 
                ? 'bg-slate-700 text-slate-300' 
                : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg'
              }
              ${isSelected ? 'scale-110 shadow-xl' : 'group-hover:scale-105'}
            `}>
              {getInitials(email.from.name, email.from.address)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className={`font-medium truncate transition-colors duration-200 ${
                  email.isRead ? 'text-slate-300' : 'text-white'
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
                <span className="text-xs text-slate-400">
                  {formatDate(email.receivedDate)}
                </span>
                
                {email.aiCategory === 'interested' && (
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
              </div>
            </div>

            {/* Subject */}
            <p className={`text-sm truncate mb-2 transition-colors duration-200 ${
              email.isRead ? 'text-slate-400' : 'text-slate-200'
            }`}>
              {email.subject}
            </p>

            {/* Preview */}
            <p className="text-xs text-slate-500 truncate mb-3 leading-relaxed">
              {email.textBody}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryBadge 
                  category={email.aiCategory} 
                  confidence={email.aiConfidence}
                />
                
                {email.attachments && email.attachments.length > 0 && (
                  <div className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
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
                  className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all duration-200"
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
                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all duration-200"
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
                  className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                  title="Archive"
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(email.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200"
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
        <div className="absolute inset-0 bg-slate-800/50 backdrop-blur-sm flex items-center justify-center">
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
  filters 
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
            <div className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-xl">
              <div className="w-10 h-10 bg-slate-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
                <div className="h-3 bg-slate-800 rounded w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50 space-y-4">
        {/* Bulk Actions */}
        {selectedEmails.size > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBulkAction('markRead')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                  Mark Read
                </button>
                <button 
                  onClick={() => handleBulkAction('archive')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                  Archive
                </button>
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllEmails}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <div className={`w-4 h-4 border rounded transition-all duration-200 ${
                selectedEmails.size === emails.length 
                  ? 'bg-blue-500 border-blue-500' 
                  : selectedEmails.size > 0
                    ? 'bg-blue-500/50 border-blue-500'
                    : 'border-slate-600 hover:border-slate-500'
              }`}>
                {selectedEmails.size > 0 && (
                  <CheckIcon className="w-4 h-4 text-white" />
                )}
              </div>
              Select All
            </button>

            <div className="text-sm text-slate-400">
              {emails.length} email{emails.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="date">Date</option>
              <option value="sender">Sender</option>
              <option value="subject">Subject</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {sortedEmails.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No emails found</p>
              {searchTerm && (
                <p className="text-sm mt-2">Try adjusting your search or filters</p>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailList;
