import React, { useState, useRef, useEffect } from 'react';
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  ArchiveBoxIcon, 
  TrashIcon, 
  StarIcon,
  EyeIcon,
  ClockIcon,
  BoltIcon,
  UserIcon,
  LinkIcon,
  DocumentIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const CategoryBadge = ({ category, confidence }) => {
  const categoryConfig = {
    interested: {
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      label: 'Interested',
      description: 'Shows buying intent'
    },
    meeting_booked: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      label: 'Meeting Booked',
      description: 'Meeting confirmed'
    },
    not_interested: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      label: 'Not Interested',
      description: 'Declined proposal'
    },
    spam: {
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      label: 'Spam',
      description: 'Promotional content'
    },
    out_of_office: {
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      label: 'Out of Office',
      description: 'Auto-reply message'
    }
  };

  const config = categoryConfig[category];
  if (!config) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm border transition-all duration-200 hover:scale-105 ${config.bg} ${config.color} ${config.border}`}>
      <span>{config.label}</span>
      {confidence && (
        <span className="text-white/60 text-xs">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
};

const AIInsights = ({ email }) => {
  const insights = [
    {
      type: 'sentiment',
      label: 'Sentiment',
      value: email.aiCategory === 'interested' ? 'Positive' : 
            email.aiCategory === 'not_interested' ? 'Negative' : 'Neutral',
      color: email.aiCategory === 'interested' ? 'text-emerald-400' : 
            email.aiCategory === 'not_interested' ? 'text-red-400' : 'text-slate-400'
    },
    {
      type: 'urgency',
      label: 'Urgency',
      value: email.aiCategory === 'meeting_booked' ? 'High' : 
            email.aiCategory === 'interested' ? 'Medium' : 'Low',
      color: email.aiCategory === 'meeting_booked' ? 'text-red-400' :
            email.aiCategory === 'interested' ? 'text-yellow-400' : 'text-slate-400'
    }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <BoltIcon className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">AI Insights</h3>
      </div>

      <div className="space-y-2">
        {/* Confidence Score */}
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000"
                style={{ width: `${(email.aiConfidence || 0) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 font-medium min-w-8">
              {Math.round((email.aiConfidence || 0) * 100)}%
            </span>
          </div>
        </div>

        {/* Insights */}
        <div className="flex justify-between">
          {insights.map((insight, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-slate-400 mb-1">
                {insight.label}
              </div>
              <div className={`text-xs font-medium ${insight.color}`}>
                {insight.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AIReplyGenerator = ({ email, onReplyGenerated }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReply, setGeneratedReply] = useState('');

  const generateReply = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation with typing effect
    const replyTemplates = {
      interested: "Thank you for your interest in our product! I'd be delighted to schedule a personalized demo to show you how our solution can address your specific needs. I have availability this week on Tuesday at 2 PM or Thursday at 10 AM. Which time works better for you?\n\nLooking forward to our conversation!\n\nBest regards",
      meeting_booked: "Perfect! I've confirmed our meeting and added it to my calendar. I'm looking forward to our discussion and will prepare all the relevant materials for our session.\n\nPlease let me know if you need to reschedule or have any specific topics you'd like to cover.\n\nSee you soon!",
      not_interested: "Thank you for taking the time to respond and for your honest feedback. I completely understand that our solution may not be the right fit at this moment.\n\nI'll keep you updated on any new features or offerings that might be more aligned with your needs in the future.\n\nWishing you all the best!",
      spam: "Thank you for your email. Please remove me from your mailing list as I'm not interested in promotional content.\n\nBest regards",
      out_of_office: "Thank you for the auto-reply notification. I'll follow up when you return from your time away.\n\nEnjoy your time off!"
    };

    const template = replyTemplates[email.aiCategory] || replyTemplates.interested;
    
    // Simulate typing effect
    for (let i = 0; i <= template.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      setGeneratedReply(template.substring(0, i));
    }
    
    setIsGenerating(false);
    onReplyGenerated(template);
  };

  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-purple-400" />
          AI Reply Assistant
        </h4>
        <button
          onClick={generateReply}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="w-3 h-3" />
              Generate Reply
            </>
          )}
        </button>
      </div>
      
      {(isGenerating || generatedReply) && (
        <div className="bg-slate-700/30 rounded-lg p-3 animate-in slide-in-from-top-2 duration-200">
          <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
            {generatedReply}
            {isGenerating && <span className="animate-pulse">|</span>}
          </div>
        </div>
      )}
    </div>
  );
};

const EmailDetail = ({ email, onClose, onReply, onArchive, onDelete, onStar }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showFullHeaders, setShowFullHeaders] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const replyRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (showReply && replyRef.current) {
      replyRef.current.focus();
    }
  }, [showReply]);

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

  const handleSaveDraft = () => {
    const textContent = replyRef.current ? replyRef.current.textContent || replyRef.current.innerText : '';
    if (textContent.trim()) {
      setIsDraft(true);
      // Here you would typically save to backend
      setTimeout(() => {
        setIsDraft(false);
        setShowReply(false);
        setReplyText('');
        setAttachments([]);
        setScheduledDate('');
        setScheduledTime('');
      }, 1000);
    }
  };

  const handleCloseReply = () => {
    const textContent = replyRef.current ? replyRef.current.textContent || replyRef.current.innerText : '';
    if (textContent.trim() || attachments.length > 0) {
      if (confirm('You have unsaved changes. Do you want to discard them?')) {
        setShowReply(false);
        setReplyText('');
        setAttachments([]);
        setScheduledDate('');
        setScheduledTime('');
      }
    } else {
      setShowReply(false);
    }
  };

  const handleSchedule = () => {
    if (scheduledDate && scheduledTime) {
      const scheduleDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      
      if (scheduleDateTime <= now) {
        alert('Please select a future date and time');
        return;
      }
      
      const textContent = replyRef.current ? replyRef.current.textContent || replyRef.current.innerText : '';
      if (textContent.trim()) {
        onReply && onReply(email.id, textContent, { 
          scheduled: scheduleDateTime,
          attachments: attachments 
        });
        setReplyText('');
        setShowReply(false);
        setAttachments([]);
        setScheduledDate('');
        setScheduledTime('');
        setShowScheduler(false);
      }
    }
  };

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 bg-slate-900/20 backdrop-blur-sm">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 bg-slate-800/50 rounded-full flex items-center justify-center">
            <DocumentIcon className="w-12 h-12 opacity-50" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Email Selected</h3>
          <p className="text-slate-500">Select an email from the list to view its details</p>
        </div>
      </div>
    );
  }

  const formatFullDate = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const handleSendReply = () => {
    const textContent = replyRef.current ? replyRef.current.textContent || replyRef.current.innerText : '';
    if (textContent.trim()) {
      onReply && onReply(email.id, textContent, { attachments: attachments });
      setReplyText('');
      setShowReply(false);
      setAttachments([]);
      setScheduledDate('');
      setScheduledTime('');
    }
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    return '📎';
  };

  const formatScheduleTime = () => {
    if (scheduledDate && scheduledTime) {
      const date = new Date(`${scheduledDate}T${scheduledTime}`);
      return date.toLocaleString();
    }
    return '';
  };

  const handleAIReplyGenerated = (generatedText) => {
    setReplyText(generatedText);
    setShowReply(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/20 backdrop-blur-sm">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg">
              {getInitials(email.from.name, email.from.address)}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-semibold text-white">
                  {email.from.name || email.from.address}
                </h2>
                <button
                  onClick={() => onStar && onStar(email.id)}
                  className="p-1 text-slate-400 hover:text-yellow-400 transition-colors"
                >
                  {email.isStarred ? (
                    <StarSolid className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <StarIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                <span>{email.from.address}</span>
                <span>•</span>
                <span>To: {email.to[0]?.address}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">
                  {formatFullDate(email.receivedDate)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <CategoryBadge 
              category={email.aiCategory} 
              confidence={email.aiConfidence}
            />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-white mb-2">{email.subject}</h1>
        
        {/* Email Headers Toggle */}
        <button
          onClick={() => setShowFullHeaders(!showFullHeaders)}
          className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          {showFullHeaders ? 'Hide' : 'Show'} full headers
        </button>
        
        {showFullHeaders && (
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400 font-mono animate-in slide-in-from-top-2 duration-200">
            <div>Message-ID: {email.messageId}</div>
            <div>From: {email.from.address}</div>
            <div>To: {email.to.map(t => t.address).join(', ')}</div>
            <div>Date: {email.receivedDate.toISOString()}</div>
            <div>Subject: {email.subject}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Email Body */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-slate-300 font-sans leading-relaxed">
              {email.textBody}
            </div>
          </div>
          
          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <h4 className="text-sm font-medium text-white mb-3">Attachments</h4>
              <div className="space-y-2">
                {email.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg">
                    <DocumentIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-300">{attachment.name}</span>
                    <span className="text-xs text-slate-500">({attachment.size})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Insights - Compact */}
        <AIInsights email={email} />

        {/* AI Reply Generator */}
        <AIReplyGenerator 
          email={email} 
          onReplyGenerated={handleAIReplyGenerated}
        />
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-6 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              Reply
            </button>
            
            <button
              onClick={() => onArchive && onArchive(email.id)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 text-white rounded-lg transition-colors"
            >
              <ArchiveBoxIcon className="w-4 h-4" />
              Archive
            </button>
            
            <button
              onClick={() => onDelete && onDelete(email.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              Delete
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <EyeIcon className="w-4 h-4" />
            <span>{email.isRead ? 'Read' : 'Unread'}</span>
          </div>
        </div>

        {/* Reply Section */}
        {showReply && (
          <div className="mt-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="border-t border-slate-700/50 pt-4">
              <h4 className="text-sm font-medium text-white mb-3">Reply to {email.from.name || email.from.address}</h4>
              
              {/* Formatting Toolbar for Reply */}
              <div className="flex items-center gap-4 p-3 bg-slate-800/50 border border-slate-700/30 rounded-lg mb-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => document.execCommand('bold', false, null)}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors border border-slate-600/50"
                    title="Bold (Ctrl+B)"
                  >
                    B
                  </button>
                  <button
                    onClick={() => document.execCommand('italic', false, null)}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors border border-slate-600/50"
                    title="Italic (Ctrl+I)"
                    style={{ fontStyle: 'italic' }}
                  >
                    I
                  </button>
                  <button
                    onClick={() => document.execCommand('underline', false, null)}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors border border-slate-600/50"
                    title="Underline (Ctrl+U)"
                    style={{ textDecoration: 'underline' }}
                  >
                    U
                  </button>
                  <button
                    onClick={() => document.execCommand('strikethrough', false, null)}
                    className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors border border-slate-600/50"
                    title="Strikethrough"
                    style={{ textDecoration: 'line-through' }}
                  >
                    S
                  </button>
                </div>
                
                <div className="w-px h-6 bg-slate-600" />
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors text-sm border border-slate-600/50"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Attach
                  </button>
                  
                  <button 
                    onClick={() => setShowScheduler(!showScheduler)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm border border-slate-600/50 ${
                      showScheduler ? 'bg-blue-500/20 text-blue-400' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <ClockIcon className="w-4 h-4" />
                    Schedule
                  </button>
                </div>
              </div>
              
              <div
                ref={replyRef}
                contentEditable
                onInput={(e) => setReplyText(e.target.innerHTML)}
                dangerouslySetInnerHTML={{ __html: replyText }}
                className="w-full h-40 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-white resize-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 focus:outline-none"
                style={{ whiteSpace: 'pre-wrap' }}
                placeholder="Type your reply..."
              />

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mt-3 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg">
                  <h5 className="text-xs font-medium text-white mb-2">Attachments ({attachments.length})</h5>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-3 p-2 bg-slate-700/30 rounded group">
                        <span className="text-lg">{getFileIcon(attachment.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-300 truncate">{attachment.name}</div>
                          <div className="text-xs text-slate-500">{attachment.size}</div>
                        </div>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all duration-200"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Section - Compact */}
              {showScheduler && (
                <div className="mt-3 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="w-4 h-4 text-blue-400" />
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500/50"
                    />
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">Select time</option>
                      {Array.from({ length: 24 }, (_, i) => {
                        return Array.from({ length: 4 }, (_, j) => {
                          const hour = i.toString().padStart(2, '0');
                          const minute = (j * 15).toString().padStart(2, '0');
                          const time = `${hour}:${minute}`;
                          const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          });
                          return (
                            <option key={time} value={time}>
                              {displayTime}
                            </option>
                          );
                        });
                      }).flat()}
                    </select>
                    {scheduledDate && scheduledTime && (
                      <span className="text-xs text-slate-400">
                        Send: {formatScheduleTime()}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-slate-400">
                  Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+U for underline
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isDraft}
                    className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors text-sm disabled:opacity-50"
                  >
                    <DocumentIcon className="w-4 h-4" />
                    {isDraft ? 'Saving...' : 'Save Draft'}
                  </button>
                  
                  <button
                    onClick={handleCloseReply}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  
                  {scheduledDate && scheduledTime ? (
                    <button
                      onClick={handleSchedule}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      <ClockIcon className="w-4 h-4" />
                      Schedule Send
                    </button>
                  ) : (
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      <PaperAirplaneIcon className="w-4 h-4" />
                      Send Reply
                    </button>
                  )}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailDetail;
