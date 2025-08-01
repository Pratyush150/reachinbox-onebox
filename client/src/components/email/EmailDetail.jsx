import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  PaperClipIcon,
  EyeIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const EmailDetail = ({ 
  email, 
  onClose, 
  onReply, 
  onArchive, 
  onDelete, 
  onStar, 
  isDarkMode = true 
}) => {
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [viewMode, setViewMode] = useState('text'); // 'text' or 'html'

  useEffect(() => {
    setShowReply(false);
    setReplyText('');
    // Auto-detect best view mode
    if (email?.htmlBody && email.htmlBody.length > email?.textBody?.length) {
      setViewMode('html');
    } else {
      setViewMode('text');
    }
  }, [email]);

  const handleReply = () => {
    if (replyText.trim() && email) {
      onReply(email._id || email.id, replyText, { 
        inReplyTo: email.messageId,
        references: email.messageId 
      });
      setReplyText('');
      setShowReply(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return dateObj.toLocaleString();
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

  // Sanitize HTML content for safe rendering
  const sanitizeHtml = (html) => {
    if (!html) return '';
    // Basic sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '');
  };

  const renderEmailContent = () => {
    if (!email) return null;

    if (viewMode === 'html' && email.htmlBody) {
      return (
        <div 
          className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''}`}
          dangerouslySetInnerHTML={{ 
            __html: sanitizeHtml(email.htmlBody) 
          }}
          style={{
            maxHeight: 'calc(100vh - 400px)',
            overflow: 'auto'
          }}
        />
      );
    }

    return (
      <div className={`whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
        {email.textBody || 'No content'}
      </div>
    );
  };

  if (!email) {
    return (
      <div className={`flex-1 flex items-center justify-center ${
        isDarkMode ? 'text-slate-400' : 'text-gray-500'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-2xl">📧</span>
          </div>
          <h3 className="text-lg font-medium mb-2">Select an email</h3>
          <p className="text-sm">Choose an email from the list to view its details</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full ${
      isDarkMode ? 'bg-slate-900/20' : 'bg-white/20'
    } backdrop-blur-sm`}>
      {/* Header */}
      <div className={`flex-shrink-0 p-6 border-b ${
        isDarkMode ? 'border-slate-600/40' : 'border-gray-200/60'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className={`text-xl font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {email.subject || 'No subject'}
            </h1>
            
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                  {email.from?.name?.charAt(0) || email.from?.address?.charAt(0) || '?'}
                </div>
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {email.from?.name || email.from?.address || 'Unknown'}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    {email.from?.address}
                  </div>
                </div>
              </div>
              
              <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {formatDate(email.receivedDate)}
              </div>
            </div>

            {/* AI Category & Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {email.aiCategory && (
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    getAiCategoryColor(email.aiCategory)
                  }`}>
                    <span>{getAiCategoryIcon(email.aiCategory)}</span>
                    {email.aiCategory.replace('_', ' ')}
                  </span>
                )}
                
                {email.aiConfidence && (
                  <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    {Math.round(email.aiConfidence * 100)}% confidence
                  </span>
                )}

                {/* View Mode Toggle */}
                {email.htmlBody && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewMode('text')}
                      className={`px-2 py-1 text-xs rounded ${
                        viewMode === 'text'
                          ? 'bg-blue-500 text-white'
                          : isDarkMode 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <CodeBracketIcon className="w-3 h-3 inline mr-1" />
                      Text
                    </button>
                    <button
                      onClick={() => setViewMode('html')}
                      className={`px-2 py-1 text-xs rounded ${
                        viewMode === 'html'
                          ? 'bg-blue-500 text-white'
                          : isDarkMode 
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <EyeIcon className="w-3 h-3 inline mr-1" />
                      HTML
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onStar(email._id || email.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    email.isStarred
                      ? 'text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-700'
                        : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                  }`}
                >
                  {email.isStarred ? <StarIconSolid className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => setShowReply(!showReply)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'
                      : 'text-gray-400 hover:text-blue-500 hover:bg-gray-100'
                  }`}
                >
                  <ArrowUturnLeftIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={() => onArchive(email._id || email.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-slate-400 hover:text-green-400 hover:bg-slate-700'
                      : 'text-gray-400 hover:text-green-500 hover:bg-gray-100'
                  }`}
                >
                  <ArchiveBoxIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={() => onDelete(email._id || email.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-slate-400 hover:text-red-400 hover:bg-slate-700'
                      : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
                  }`}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className={`mt-4 p-3 rounded-lg border ${
            isDarkMode ? 'border-slate-600/40 bg-slate-800/30' : 'border-gray-200/60 bg-gray-50/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <PaperClipIcon className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`} />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {attachment.filename} ({attachment.size || 'unknown size'})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email Content */}
      <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar`}>
        <div className={`rounded-lg p-4 ${
          isDarkMode ? 'bg-slate-800/30' : 'bg-white/30'
        } backdrop-blur-sm`}>
          {renderEmailContent()}
        </div>
      </div>

      {/* Reply Section */}
      {showReply && (
        <div className={`flex-shrink-0 border-t p-4 ${
          isDarkMode ? 'border-slate-600/40 bg-slate-800/20' : 'border-gray-200/60 bg-gray-50/20'
        }`}>
          <div className="mb-3">
            <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Reply to {email.from?.name || email.from?.address}
            </h3>
          </div>
          
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            className={`w-full h-32 p-3 rounded-lg border resize-none ${
              isDarkMode
                ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          />
          
          <div className="flex justify-between items-center mt-3">
            <button
              onClick={() => setShowReply(false)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                replyText.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : isDarkMode
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDetail;
