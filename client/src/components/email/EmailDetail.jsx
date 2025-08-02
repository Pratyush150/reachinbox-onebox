import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  PaperClipIcon,
  EyeIcon,
  CodeBracketIcon,
  PaperAirplaneIcon,
  ClockIcon,
  SparklesIcon,
  ChartBarIcon
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
  const [replyHtml, setReplyHtml] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [viewMode, setViewMode] = useState('auto');
  const [replyMode, setReplyMode] = useState('rich'); // 'rich' or 'plain'
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [aiReplies, setAiReplies] = useState([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [salesInsights, setSalesInsights] = useState(null);

  useEffect(() => {
    setShowReply(false);
    setReplyText('');
    setReplyHtml('');
    
    // Auto-detect best view mode based on content
    if (email?.htmlBody && email.htmlBody.length > 50) {
      // Check if HTML has meaningful content (not just plain text wrapped in HTML)
      const hasRichContent = /<(?:b|i|u|strong|em|a|img|table|div|span)[^>]*>/i.test(email.htmlBody);
      setViewMode(hasRichContent ? 'html' : 'text');
    } else {
      setViewMode('text');
    }
  }, [email]);

  // Load AI insights when email is selected
  useEffect(() => {
    if (email?._id) {
      loadSalesInsights();
    }
  }, [email?._id]);

  const loadSalesInsights = async () => {
    try {
      const response = await fetch(`http://65.1.63.189:5001/api/v1/ai/sales-insights/${email._id}`);
      if (response.ok) {
        const data = await response.json();
        setSalesInsights(data.data);
      }
    } catch (error) {
      console.error('Failed to load sales insights:', error);
    }
  };

  const generateAiReplies = async () => {
    try {
      setShowAiSuggestions(true);
      const response = await fetch('http://65.1.63.189:5001/api/v1/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email._id,
          tone: 'professional',
          includeQuestions: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiReplies(data.data.replyOptions || []);
      }
    } catch (error) {
      console.error('Failed to generate AI replies:', error);
    }
  };

  const handleReply = () => {
    if ((!replyText.trim() && !replyHtml.trim()) || !email) return;

    const replyData = {
      inReplyTo: email.messageId,
      references: email.messageId,
      mode: replyMode,
      content: replyMode === 'rich' ? replyHtml : replyText
    };

    if (scheduledDate && scheduledTime) {
      replyData.scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    }

    onReply(email._id || email.id, replyMode === 'rich' ? replyHtml : replyText, replyData);
    setReplyText('');
    setReplyHtml('');
    setShowReply(false);
    setShowScheduler(false);
    setScheduledDate('');
    setScheduledTime('');
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
          className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''} break-words`}
          dangerouslySetInnerHTML={{ 
            __html: sanitizeHtml(email.htmlBody) 
          }}
          style={{
            maxHeight: 'none', // Remove height limit
            overflow: 'visible', // Allow full content
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
        />
      );
    }

    return (
      <div className={`whitespace-pre-wrap break-words ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
        {email.textBody || 'No content'}
      </div>
    );
  };

  const handleFormatText = (command) => {
    document.execCommand(command, false, null);
  };

  const insertAiReply = (replyContent) => {
    if (replyMode === 'rich') {
      setReplyHtml(replyContent);
    } else {
      setReplyText(replyContent);
    }
    setShowAiSuggestions(false);
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

                {/* Sales Insights Button */}
                {salesInsights && (
                  <button
                    onClick={() => setShowAiSuggestions(!showAiSuggestions)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      isDarkMode 
                        ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30' 
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <ChartBarIcon className="w-3 h-3" />
                    Sales Insights
                  </button>
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
                  onClick={generateAiReplies}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-slate-400 hover:text-purple-400 hover:bg-slate-700'
                      : 'text-gray-400 hover:text-purple-500 hover:bg-gray-100'
                  }`}
                  title="Generate AI Replies"
                >
                  <SparklesIcon className="w-5 h-5" />
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

        {/* Sales Insights Panel */}
        {showAiSuggestions && salesInsights && (
          <div className={`mt-4 p-4 rounded-lg border ${
            isDarkMode ? 'border-slate-600/40 bg-slate-800/30' : 'border-gray-200/60 bg-gray-50/30'
          }`}>
            <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              🎯 Sales Insights
            </h4>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Purchase Confidence:
                </span>
                <div className={`font-semibold ${
                  salesInsights.confidence > 60 ? 'text-green-400' : 
                  salesInsights.confidence > 30 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {salesInsights.confidence}%
                </div>
              </div>
              <div>
                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Urgency:
                </span>
                <div className={`font-semibold ${
                  salesInsights.urgency === 'high' ? 'text-red-400' : 
                  salesInsights.urgency === 'medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {salesInsights.urgency}
                </div>
              </div>
            </div>
            {salesInsights.buyingSignals?.length > 0 && (
              <div className="mb-3">
                <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  Buying Signals:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {salesInsights.buyingSignals.map((signal, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
              <strong>Next Action:</strong> {salesInsights.nextAction}
            </div>
          </div>
        )}

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

      {/* AI Reply Suggestions */}
      {showAiSuggestions && aiReplies.length > 0 && (
        <div className={`flex-shrink-0 border-t p-4 ${
          isDarkMode ? 'border-slate-600/40 bg-slate-800/20' : 'border-gray-200/60 bg-gray-50/20'
        }`}>
          <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🤖 AI Reply Suggestions
          </h4>
          <div className="space-y-2">
            {aiReplies.map((reply, idx) => (
              <div key={idx} className={`p-3 rounded-lg border cursor-pointer hover:opacity-80 ${
                isDarkMode ? 'border-slate-600/40 bg-slate-700/30' : 'border-gray-200/60 bg-white/30'
              }`}
              onClick={() => insertAiReply(reply.content)}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    {reply.title}
                  </span>
                  {reply.recommended && (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {reply.content.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Reply Section */}
      {showReply && (
        <div className={`flex-shrink-0 border-t p-4 ${
          isDarkMode ? 'border-slate-600/40 bg-slate-800/20' : 'border-gray-200/60 bg-gray-50/20'
        }`}>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Reply to {email.from?.name || email.from?.address}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReplyMode(replyMode === 'rich' ? 'plain' : 'rich')}
                  className={`px-3 py-1 text-xs rounded ${
                    replyMode === 'rich' 
                      ? 'bg-blue-500 text-white' 
                      : isDarkMode 
                        ? 'bg-slate-700 text-slate-300' 
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {replyMode === 'rich' ? 'Rich' : 'Plain'}
                </button>
                <button
                  onClick={() => setShowScheduler(!showScheduler)}
                  className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${
                    showScheduler 
                      ? 'bg-purple-500 text-white' 
                      : isDarkMode 
                        ? 'bg-slate-700 text-slate-300' 
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <ClockIcon className="w-3 h-3" />
                  Schedule
                </button>
              </div>
            </div>

            {/* Rich Text Formatting Toolbar */}
            {replyMode === 'rich' && (
              <div className={`flex items-center gap-2 p-2 mb-2 rounded border ${
                isDarkMode ? 'border-slate-600/40 bg-slate-800/30' : 'border-gray-200/60 bg-gray-50/30'
              }`}>
                <button
                  onClick={() => handleFormatText('bold')}
                  className={`p-1 rounded hover:bg-slate-700 text-sm font-bold ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-700'
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => handleFormatText('italic')}
                  className={`p-1 rounded hover:bg-slate-700 text-sm italic ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-700'
                  }`}
                >
                  I
                </button>
                <button
                  onClick={() => handleFormatText('underline')}
                  className={`p-1 rounded hover:bg-slate-700 text-sm underline ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-700'
                  }`}
                >
                  U
                </button>
              </div>
            )}

            {/* Schedule Section */}
            {showScheduler && (
              <div className={`p-3 mb-3 rounded-lg border ${
                isDarkMode ? 'border-slate-600/40 bg-slate-800/30' : 'border-gray-200/60 bg-gray-50/30'
              }`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-slate-300' : 'text-gray-700'
                    }`}>Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full rounded px-2 py-1 text-sm ${
                        isDarkMode 
                          ? 'bg-slate-700 border-slate-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-slate-300' : 'text-gray-700'
                    }`}>Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className={`w-full rounded px-2 py-1 text-sm ${
                        isDarkMode 
                          ? 'bg-slate-700 border-slate-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reply Input */}
          {replyMode === 'rich' ? (
            <div
              contentEditable
              onInput={(e) => setReplyHtml(e.target.innerHTML)}
              className={`w-full h-32 p-3 rounded-lg border resize-none ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              placeholder="Type your reply..."
              style={{ minHeight: '120px', maxHeight: '300px', overflow: 'auto' }}
            />
          ) : (
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
          )}
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center gap-2">
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
                onClick={generateAiReplies}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-purple-400 hover:bg-slate-700'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-gray-100'
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
                AI Suggest
              </button>
            </div>
            
            <button
              onClick={handleReply}
              disabled={!replyText.trim() && !replyHtml.trim()}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                (replyText.trim() || replyHtml.trim())
                  ? (scheduledDate && scheduledTime)
                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  : isDarkMode
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {(scheduledDate && scheduledTime) ? (
                <>
                  <ClockIcon className="w-4 h-4" />
                  Schedule Send
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-4 h-4" />
                  Send Reply
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailDetail;
