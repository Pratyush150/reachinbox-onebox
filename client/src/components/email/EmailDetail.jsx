import React, { useState, useEffect, useRef } from 'react';
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
  ChartBarIcon,
  PhotoIcon,
  LinkIcon,
  FaceSmileIcon,
  BookmarkIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon
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
  const [replyMode, setReplyMode] = useState('rich');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [salesInsights, setSalesInsights] = useState(null);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccList, setCcList] = useState('');
  const [bccList, setBccList] = useState('');
  
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);
  const customPromptRef = useRef(null);

  useEffect(() => {
    setShowReply(false);
    setReplyText('');
    setReplyHtml('');
    
    // FIXED: Better auto-detection of content type
    if (email?.htmlBody && email.htmlBody.length > 50) {
      // Check if HTML has meaningful content beyond text
      const hasRichContent = /<(?:b|i|u|strong|em|a|img|table|div|span|br|p)[^>]*>/i.test(email.htmlBody);
      const htmlTextLength = email.htmlBody.replace(/<[^>]*>/g, '').length;
      const textLength = email.textBody?.length || 0;
      
      // Use HTML if it has rich content OR significantly more content than text
      if (hasRichContent || htmlTextLength > textLength * 1.2) {
        setViewMode('html');
      } else {
        setViewMode('text');
      }
    } else {
      setViewMode('text');
    }

    // Mark email as read when opened
    if (email && !email.isRead) {
      markEmailAsRead();
    }
  }, [email]);

  // FIXED: Improved scrolling behavior - Replace the existing useEffect for custom prompt scrolling with this:
  useEffect(() => {
    if (showCustomPrompt && customPromptRef.current) {
      // Delay to ensure DOM is updated
      setTimeout(() => {
        const element = customPromptRef.current;
        if (element) {
          // Get the reply section container
          const replySection = element.closest('.max-h-\\[60vh\\]');
          
          if (replySection) {
            // Scroll the reply section container instead of the window
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
            
            // Ensure the container scrolls to show the prompt
            setTimeout(() => {
              replySection.scrollTop = Math.max(0, 
                element.offsetTop - replySection.offsetTop - 100
              );
            }, 300);
          } else {
            // Fallback to normal scroll
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center'
            });
          }
        }
      }, 150);
    }
  }, [showCustomPrompt]);

  // Load AI insights when email is selected
  useEffect(() => {
    if (email?._id) {
      loadSalesInsights();
    }
  }, [email?._id]);

  const markEmailAsRead = async () => {
    try {
      const response = await fetch(`http://65.1.63.189:5001/api/v1/emails/${email._id}/read`, {
        method: 'PUT'
      });
      if (response.ok) {
        email.isRead = true;
      }
    } catch (error) {
      console.error('Failed to mark email as read:', error);
    }
  };

  // FIXED: Add mark as unread functionality
  const markEmailAsUnread = async () => {
    try {
      const response = await fetch(`http://65.1.63.189:5001/api/v1/emails/${email._id}/unread`, {
        method: 'PUT'
      });
      if (response.ok) {
        email.isRead = false;
        // Force re-render
        setViewMode(prev => prev);
      }
    } catch (error) {
      console.error('Failed to mark email as unread:', error);
    }
  };

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

  // FIXED: Enhanced AI reply generation with actual LLM
  const generateAiReply = async (customPromptText = '') => {
    if (isGeneratingReply) return;
    
    setIsGeneratingReply(true);
    
    try {
      const requestBody = {
        emailId: email._id,
        tone: 'professional',
        includeQuestions: true,
        useLocalLLM: true // Force using local LLM
      };

      if (customPromptText) {
        requestBody.customPrompt = customPromptText;
        requestBody.context = {
          subject: email.subject,
          body: getEmailContent(), // Use the actual displayed content
          from: email.from,
          htmlBody: email.htmlBody
        };
      }

      const response = await fetch('http://65.1.63.189:5001/api/v1/ai/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        let generatedReply = data.data.replyOptions?.[0]?.content || data.data.generatedReply;
        
        // FIXED: Ensure we have a quality reply
        if (!generatedReply || generatedReply.length < 20) {
          throw new Error('LLM response too short');
        }
        
        if (replyMode === 'rich') {
          setReplyHtml(generatedReply);
          if (bodyRef.current) {
            bodyRef.current.innerHTML = generatedReply.replace(/\n/g, '<br>');
          }
        } else {
          setReplyText(generatedReply);
        }
        
        setShowCustomPrompt(false);
        setCustomPrompt('');
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Failed to generate AI reply:', error);
      
      // Show error feedback
      const errorMessage = `Failed to generate AI reply. Please try again.`;
      if (replyMode === 'rich') {
        setReplyHtml(errorMessage);
      } else {
        setReplyText(errorMessage);
      }
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleCustomPromptSubmit = () => {
    if (customPrompt.trim()) {
      generateAiReply(customPrompt.trim());
    }
  };

  const handleReply = () => {
    if ((!replyText.trim() && !replyHtml.trim()) || !email) return;

    const replyData = {
      inReplyTo: email.messageId,
      references: email.messageId,
      mode: replyMode,
      content: replyMode === 'rich' ? replyHtml : replyText,
      cc: ccList ? ccList.split(',').map(e => e.trim()) : [],
      bcc: bccList ? bccList.split(',').map(e => e.trim()) : [],
      attachments: attachments
    };

    if (scheduledDate && scheduledTime) {
      replyData.scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    }

    onReply(email._id || email.id, replyMode === 'rich' ? replyHtml : replyText, replyData);
    
    // Reset form
    setReplyText('');
    setReplyHtml('');
    setShowReply(false);
    setShowScheduler(false);
    setScheduledDate('');
    setScheduledTime('');
    setAttachments([]);
    setCcList('');
    setBccList('');
    setShowCc(false);
    setShowBcc(false);
  };

  const handleFileAttach = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type,
      file: file
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
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

  const sanitizeHtml = (html) => {
    if (!html) return '';
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '');
  };

  // FIXED: Better content extraction logic
  const getEmailContent = () => {
    if (!email) return '';
    
    if (viewMode === 'html' && email.htmlBody) {
      // Convert HTML to text for better processing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizeHtml(email.htmlBody);
      return tempDiv.textContent || tempDiv.innerText || email.textBody || '';
    }
    
    return email.textBody || '';
  };

  const renderEmailContent = () => {
    if (!email) return null;

    const content = getEmailContent();
    
    if (viewMode === 'html' && email.htmlBody) {
      return (
        <div 
          className={`prose max-w-none ${isDarkMode ? 'prose-invert' : ''} break-words`}
          dangerouslySetInnerHTML={{ 
            __html: sanitizeHtml(email.htmlBody) 
          }}
          style={{
            maxHeight: 'none',
            overflow: 'visible',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            color: isDarkMode ? '#ffffff' : '#000000'
          }}
        />
      );
    }

    return (
      <div className={`whitespace-pre-wrap break-words ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
        {content || 'No content'}
      </div>
    );
  };

  const handleFormatText = (command) => {
    document.execCommand(command, false, null);
    if (bodyRef.current) {
      setReplyHtml(bodyRef.current.innerHTML);
    }
  };

  const formatButtons = [
    { icon: 'B', action: 'bold', tooltip: 'Bold (Ctrl+B)' },
    { icon: 'I', action: 'italic', tooltip: 'Italic (Ctrl+I)' },
    { icon: 'U', action: 'underline', tooltip: 'Underline (Ctrl+U)' },
    { icon: 'S', action: 'strikeThrough', tooltip: 'Strikethrough' }
  ];

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
      <style jsx>{`
        .prose * {
          color: ${isDarkMode ? '#ffffff !important' : '#000000 !important'};
        }
      `}</style>
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
                {/* FIXED: Added Mark as Unread button */}
                {email.isRead && (
                  <button
                    onClick={markEmailAsUnread}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode
                        ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'
                        : 'text-gray-400 hover:text-blue-500 hover:bg-gray-100'
                    }`}
                    title="Mark as unread"
                  >
                    <EnvelopeIcon className="w-5 h-5" />
                  </button>
                )}

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

        {/* Sales Insights Panel */}
        {salesInsights && (
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

      {/* ENHANCED: Better Reply Section UI with improved colors and layout */}
      {showReply && (
        <div className={`flex-shrink-0 border-t max-h-[70vh] overflow-y-auto ${
          isDarkMode 
            ? 'border-slate-600/40 bg-gradient-to-br from-slate-800/30 via-slate-800/20 to-slate-900/30' 
            : 'border-gray-200/60 bg-gradient-to-br from-white/80 via-gray-50/50 to-white/90'
        } backdrop-blur-sm`}>
          <div className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  ✍️ Reply to {email.from?.name || email.from?.address}
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setReplyMode(replyMode === 'rich' ? 'plain' : 'rich')}
                    className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 border ${
                      replyMode === 'rich' 
                        ? 'bg-blue-500 text-white border-blue-500 shadow-lg' 
                        : isDarkMode 
                          ? 'bg-slate-700/50 text-slate-300 border-slate-600/50 hover:bg-slate-700' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {replyMode === 'rich' ? '📝 Rich' : '📄 Plain'}
                  </button>
                  
                  <button
                    onClick={() => setShowScheduler(!showScheduler)}
                    className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-all duration-200 border ${
                      showScheduler 
                        ? 'bg-purple-500 text-white border-purple-500 shadow-lg' 
                        : isDarkMode 
                          ? 'bg-slate-700/50 text-slate-300 border-slate-600/50 hover:bg-slate-700' 
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <ClockIcon className="w-4 h-4" />
                    Schedule
                  </button>
                </div>
              </div>

              {/* Enhanced CC/BCC Fields */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCc(!showCc)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-all duration-200 border ${
                      showCc 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                        : isDarkMode 
                          ? 'text-slate-400 hover:text-white border-slate-600/30 hover:bg-slate-700/50' 
                          : 'text-gray-600 hover:text-gray-900 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Cc
                  </button>
                  <button
                    onClick={() => setShowBcc(!showBcc)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition-all duration-200 border ${
                      showBcc 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                        : isDarkMode 
                          ? 'text-slate-400 hover:text-white border-slate-600/30 hover:bg-slate-700/50' 
                          : 'text-gray-600 hover:text-gray-900 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Bcc
                  </button>
                </div>
                
                {showCc && (
                  <input
                    type="email"
                    value={ccList}
                    onChange={(e) => setCcList(e.target.value)}
                    placeholder="CC recipients (comma separated)"
                    className={`w-full rounded-lg px-4 py-2 text-sm border-0 focus:ring-2 focus:ring-blue-500 transition-all ${
                      isDarkMode 
                        ? 'bg-slate-700/50 text-white placeholder-slate-400' 
                        : 'bg-white/80 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                )}
                
                {showBcc && (
                  <input
                    type="email"
                    value={bccList}
                    onChange={(e) => setBccList(e.target.value)}
                    placeholder="BCC recipients (comma separated)"
                    className={`w-full rounded-lg px-4 py-2 text-sm border-0 focus:ring-2 focus:ring-blue-500 transition-all ${
                      isDarkMode 
                        ? 'bg-slate-700/50 text-white placeholder-slate-400' 
                        : 'bg-white/80 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                )}
              </div>

              {/* Enhanced Rich Text Formatting Toolbar */}
              {replyMode === 'rich' && (
                <div className={`flex items-center gap-4 p-4 mb-4 rounded-lg border ${
                  isDarkMode 
                    ? 'border-slate-600/40 bg-slate-800/40' 
                    : 'border-gray-200/60 bg-gray-50/60'
                } backdrop-blur-sm`}>
                  <div className="flex items-center gap-2">
                    {formatButtons.map((btn, index) => (
                      <button
                        key={index}
                        onClick={() => handleFormatText(btn.action)}
                        className={`w-10 h-10 flex items-center justify-center text-sm font-bold rounded-lg transition-all duration-200 border ${
                          isDarkMode 
                            ? 'text-slate-300 hover:text-white hover:bg-slate-700/70 border-slate-600/50 hover:border-slate-500' 
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/70 border-gray-400/50 hover:border-gray-500'
                        }`}
                        title={btn.tooltip}
                        style={{ 
                          fontStyle: btn.action === 'italic' ? 'italic' : 'normal',
                          textDecoration: btn.action === 'underline' ? 'underline' : btn.action === 'strikethrough' ? 'line-through' : 'none'
                        }}
                      >
                        {btn.icon}
                      </button>
                    ))}
                  </div>
                  
                  <div className={`w-px h-8 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-400'}`} />
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm border ${
                        isDarkMode 
                          ? 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 border-gray-400/50'
                      }`}
                    >
                      <PaperClipIcon className="w-4 h-4" />
                      Attach
                    </button>
                    
                    <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm border ${
                      isDarkMode 
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 border-gray-400/50'
                    }`}>
                      <LinkIcon className="w-4 h-4" />
                      Link
                    </button>
                  </div>
                </div>
              )}

              {/* Schedule Section */}
              {showScheduler && (
                <div className={`p-4 mb-3 rounded-lg border ${
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

              {/* FIXED: Improved custom prompt positioning and scrolling */}
              {/* Replace the existing custom prompt section with this enhanced version: */}
              {/* FIXED: Enhanced Custom AI Prompt Section with better positioning */}
              {showCustomPrompt && (
                <div 
                  ref={customPromptRef} 
                  className={`p-4 mb-3 rounded-lg border animate-in slide-in-from-top-2 duration-200 max-w-full ${
                    isDarkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-300/50 bg-blue-50/50'
                  }`}
                  style={{
                    maxHeight: '300px',
                    overflow: 'visible',
                    zIndex: 10
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MagnifyingGlassIcon className="w-4 h-4 text-blue-400" />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Custom AI Prompt
                    </span>
                  </div>
                  
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., 'Write a friendly follow-up about pricing' or 'Decline politely but keep door open'"
                    className={`w-full rounded px-3 py-2 text-sm mb-3 h-20 resize-none border-0 focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode 
                        ? 'bg-slate-700 text-white placeholder-slate-400' 
                        : 'bg-white text-gray-900 placeholder-gray-500'
                    }`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleCustomPromptSubmit();
                      }
                    }}
                    autoFocus
                  />
                  
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleCustomPromptSubmit}
                      disabled={!customPrompt.trim() || isGeneratingReply}
                      className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2 ${
                        isGeneratingReply
                          ? 'opacity-50 cursor-not-allowed bg-gray-500'
                          : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      }`}
                      style={{
                        background: isGeneratingReply ? undefined : 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                        boxShadow: isGeneratingReply ? undefined : '0 4px 15px rgba(59, 130, 246, 0.4)'
                      }}
                    >
                      <SparklesIcon className="w-4 h-4" />
                      {isGeneratingReply ? 'Generating...' : 'Generate with Qwen AI'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowCustomPrompt(false);
                        setCustomPrompt('');
                      }}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                  
                  {/* FIXED: Usage hints */}
                  <div className={`mt-3 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                    💡 <strong>Quick examples:</strong> "Schedule a demo call", "Send pricing info", "Politely decline", "Follow up on interest"
                  </div>
                </div>
              )}

              {/* Attachments Display */}
              {attachments.length > 0 && (
                <div className={`p-3 mb-3 rounded-lg border ${
                  isDarkMode ? 'border-slate-600/40 bg-slate-800/30' : 'border-gray-200/60 bg-gray-50/30'
                }`}>
                  <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Attachments ({attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className={`flex items-center justify-between p-2 rounded ${
                        isDarkMode ? 'bg-slate-700/50' : 'bg-white/60'
                      }`}>
                        <div className="flex items-center gap-2">
                          <PaperClipIcon className="w-4 h-4" />
                          <span className="text-sm">{attachment.name}</span>
                          <span className="text-xs opacity-60">({attachment.size})</span>
                        </div>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Reply Input */}
              {replyMode === 'rich' ? (
                <div
                  ref={bodyRef}
                  contentEditable
                  onInput={(e) => setReplyHtml(e.target.innerHTML)}
                  className={`w-full min-h-40 max-h-80 p-4 rounded-xl border-0 resize-none ${
                    isDarkMode
                      ? 'bg-slate-800/50 text-white'
                      : 'bg-white/80 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200`}
                  placeholder="Type your reply..."
                  style={{ 
                    minHeight: '160px', 
                    maxHeight: '320px', 
                    overflow: 'auto',
                    background: isDarkMode 
                      ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))'
                      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8))'
                  }}
                />
              ) : (
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className={`w-full min-h-40 max-h-80 p-4 rounded-xl border-0 resize-none ${
                    isDarkMode
                      ? 'bg-slate-800/50 text-white placeholder-slate-400'
                      : 'bg-white/80 text-gray-900 placeholder-gray-500'
                  } focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200`}
                  style={{
                    minHeight: '160px',
                    maxHeight: '320px',
                    background: isDarkMode 
                      ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.7))'
                      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8))'
                  }}
                />
              )}

              {/* AI Generation Animation */}
              {isGeneratingReply && (
                <div className={`mt-2 p-3 rounded border ${
                  isDarkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-300/50 bg-blue-50/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      Qwen AI is generating your reply...
                    </span>
                  </div>
                </div>
              )}
              
              {/* Enhanced Action Buttons */}
              <div className="flex justify-between items-center mt-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowReply(false)}
                    className={`px-5 py-2.5 rounded-lg transition-all duration-200 ${
                      isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    Cancel
                  </button>
                  
                  {/* ENHANCED: AI Generate button with vibrant styling */}
                  <button
                    onClick={() => generateAiReply()}
                    disabled={isGeneratingReply}
                    className={`px-6 py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 font-semibold ${
                      isGeneratingReply
                        ? 'opacity-50 cursor-not-allowed bg-gray-500'
                        : 'bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                    style={{
                      background: isGeneratingReply ? undefined : 'linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899)',
                      boxShadow: isGeneratingReply ? undefined : '0 10px 30px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    <SparklesIcon className="w-5 h-5" />
                    {isGeneratingReply ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        AI Generating...
                      </>
                    ) : (
                      '✨ AI Generate'
                    )}
                  </button>

                  <button
                    onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                    className={`px-5 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      showCustomPrompt
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : isDarkMode
                          ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 border border-slate-600/30'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100/50 border border-gray-300'
                    }`}
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Custom Prompt
                  </button>
                </div>
                
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() && !replyHtml.trim()}
                  className={`flex items-center gap-2 px-8 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                    (replyText.trim() || replyHtml.trim())
                      ? (scheduledDate && scheduledTime)
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg'
                      : isDarkMode
                        ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                        : 'bg-gray-200/50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {(scheduledDate && scheduledTime) ? (
                    <>
                      <ClockIcon className="w-5 h-5" />
                      Schedule Send
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-5 h-5" />
                      Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileAttach}
            className="hidden"
            accept="*/*"
          />
        </div>
      )}
    </div>
  );
};

export default EmailDetail;
