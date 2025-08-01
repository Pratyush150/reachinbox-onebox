import React, { useState, useRef, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  PaperAirplaneIcon, 
  PaperClipIcon,
  PhotoIcon,
  LinkIcon,
  FaceSmileIcon,
  BookmarkIcon,
  ClockIcon,
  EyeIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';

const ComposeModal = ({ isOpen, onClose, onSend, isDarkMode = true }) => {
  const [emailData, setEmailData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  
  const bodyRef = useRef(null);
  const fileInputRef = useRef(null);

  const formatButtons = [
    { icon: 'B', action: 'bold', tooltip: 'Bold (Ctrl+B)' },
    { icon: 'I', action: 'italic', tooltip: 'Italic (Ctrl+I)' },
    { icon: 'U', action: 'underline', tooltip: 'Underline (Ctrl+U)' },
    { icon: 'S', action: 'strikethrough', tooltip: 'Strikethrough' },
  ];

  const handleFormatText = (command) => {
    document.execCommand(command, false, null);
    bodyRef.current?.focus();
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

  const handleSend = async () => {
    if (!emailData.to.trim() || !emailData.subject.trim()) {
      alert('Please fill in required fields (To and Subject)');
      return;
    }

    setIsSending(true);
    
    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const scheduledDateTime = scheduledDate && scheduledTime 
      ? new Date(`${scheduledDate}T${scheduledTime}`) 
      : null;

    onSend({
      ...emailData,
      attachments: attachments,
      sentAt: new Date(),
      scheduled: scheduledDateTime
    });
    
    setIsSending(false);
    handleClose();
  };

  const handleSaveDraft = () => {
    setIsDraft(true);
    setTimeout(() => {
      setIsDraft(false);
    }, 1000);
  };

  const handleClose = () => {
    setEmailData({ to: '', cc: '', bcc: '', subject: '', body: '' });
    setAttachments([]);
    setShowCc(false);
    setShowBcc(false);
    setScheduledDate('');
    setScheduledTime('');
    setShowScheduler(false);
    onClose();
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return PhotoIcon;
    if (type.includes('pdf')) return DocumentIcon;
    return DocumentIcon;
  };

  const formatScheduleTime = () => {
    if (scheduledDate && scheduledTime) {
      const date = new Date(`${scheduledDate}T${scheduledTime}`);
      return date.toLocaleString();
    }
    return '';
  };

  const isScheduled = scheduledDate && scheduledTime;
  const isValidSchedule = isScheduled && new Date(`${scheduledDate}T${scheduledTime}`) > new Date();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className={`fixed inset-0 backdrop-blur-sm ${
            isDarkMode ? 'bg-slate-900/80' : 'bg-gray-900/80'
          }`} />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full max-w-4xl rounded-2xl backdrop-blur-sm shadow-xl overflow-hidden border ${
                isDarkMode 
                  ? 'bg-slate-800/90 border-slate-700/50' 
                  : 'bg-white/90 border-gray-300/50'
              }`}>
                
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${
                  isDarkMode ? 'border-slate-700/50' : 'border-gray-300/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <PaperAirplaneIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <Dialog.Title className={`text-xl font-bold ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Compose Email
                      </Dialog.Title>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>Create and send a new email</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                    }`}
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Recipients */}
                  <div className="space-y-3">
                    {/* To Field */}
                    <div className="flex items-center gap-3">
                      <label className={`text-sm font-medium w-12 ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-700'
                      }`}>To:</label>
                      <input
                        type="email"
                        value={emailData.to}
                        onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="recipient@example.com"
                        className={`flex-1 rounded-lg px-3 py-2 border transition-colors focus:ring-2 focus:ring-blue-500/50 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400' 
                            : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500'
                        }`}
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowCc(!showCc)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            showCc 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : isDarkMode 
                                ? 'text-slate-400 hover:text-white' 
                                : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Cc
                        </button>
                        <button
                          onClick={() => setShowBcc(!showBcc)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            showBcc 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : isDarkMode 
                                ? 'text-slate-400 hover:text-white' 
                                : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Bcc
                        </button>
                      </div>
                    </div>

                    {/* CC Field */}
                    {showCc && (
                      <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                        <label className={`text-sm font-medium w-12 ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>Cc:</label>
                        <input
                          type="email"
                          value={emailData.cc}
                          onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                          placeholder="cc@example.com"
                          className={`flex-1 rounded-lg px-3 py-2 border transition-colors focus:ring-2 focus:ring-blue-500/50 focus:border-transparent ${
                            isDarkMode 
                              ? 'bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400' 
                              : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>
                    )}

                    {/* BCC Field */}
                    {showBcc && (
                      <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                        <label className={`text-sm font-medium w-12 ${
                          isDarkMode ? 'text-slate-300' : 'text-gray-700'
                        }`}>Bcc:</label>
                        <input
                          type="email"
                          value={emailData.bcc}
                          onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                          placeholder="bcc@example.com"
                          className={`flex-1 rounded-lg px-3 py-2 border transition-colors focus:ring-2 focus:ring-blue-500/50 focus:border-transparent ${
                            isDarkMode 
                              ? 'bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400' 
                              : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>
                    )}

                    {/* Subject */}
                    <div className="flex items-center gap-3">
                      <label className={`text-sm font-medium w-12 ${
                        isDarkMode ? 'text-slate-300' : 'text-gray-700'
                      }`}>Subject:</label>
                      <input
                        type="text"
                        value={emailData.subject}
                        onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Email subject"
                        className={`flex-1 rounded-lg px-3 py-2 border transition-colors focus:ring-2 focus:ring-blue-500/50 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400' 
                            : 'bg-white/80 border-gray-300/50 text-gray-900 placeholder-gray-500'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Formatting Toolbar */}
                  <div className={`flex items-center gap-4 p-3 rounded-lg border ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700/30' 
                      : 'bg-gray-50/80 border-gray-300/30'
                  }`}>
                    <div className="flex items-center gap-1">
                      {formatButtons.map((btn, index) => (
                        <button
                          key={index}
                          onClick={() => handleFormatText(btn.action)}
                          className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded transition-colors border ${
                            isDarkMode 
                              ? 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50' 
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 border-gray-400/50'
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
                    
                    <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-400'}`} />
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm border ${
                          isDarkMode 
                            ? 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50' 
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 border-gray-400/50'
                        }`}
                      >
                        <PaperClipIcon className="w-4 h-4" />
                        Attach
                      </button>
                      
                      <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm border ${
                        isDarkMode 
                          ? 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 border-gray-400/50'
                      }`}>
                        <LinkIcon className="w-4 h-4" />
                        Link
                      </button>
                      
                      <button
                        onClick={() => setShowScheduler(!showScheduler)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm border ${
                          showScheduler 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : isDarkMode 
                              ? 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50' 
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 border-gray-400/50'
                        }`}
                      >
                        <ClockIcon className="w-4 h-4" />
                        Schedule
                      </button>
                      
                      <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm border ${
                        isDarkMode 
                          ? 'text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50 border-gray-400/50'
                      }`}>
                        <FaceSmileIcon className="w-4 h-4" />
                        Emoji
                      </button>
                    </div>
                  </div>

                  {/* Schedule Section - Enhanced */}
                  {showScheduler && (
                    <div className={`p-4 rounded-lg border animate-in slide-in-from-top-2 duration-200 ${
                      isDarkMode 
                        ? 'bg-slate-800/30 border-slate-700/30' 
                        : 'bg-blue-50/80 border-blue-300/30'
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <ClockIcon className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          Schedule Email
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-slate-300' : 'text-gray-700'
                          }`}>
                            Date
                          </label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className={`w-full rounded-lg px-3 py-2 text-sm border transition-colors focus:ring-2 focus:ring-blue-500/50 ${
                              isDarkMode 
                                ? 'bg-slate-700/50 border-slate-600/50 text-white' 
                                : 'bg-white/80 border-gray-300/50 text-gray-900'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${
                            isDarkMode ? 'text-slate-300' : 'text-gray-700'
                          }`}>
                            Time
                          </label>
                          <select
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className={`w-full rounded-lg px-3 py-2 text-sm border transition-colors focus:ring-2 focus:ring-blue-500/50 ${
                              isDarkMode 
                                ? 'bg-slate-700/50 border-slate-600/50 text-white' 
                                : 'bg-white/80 border-gray-300/50 text-gray-900'
                            }`}
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
                        </div>
                      </div>
                      
                      {/* Schedule Preview */}
                      {scheduledDate && scheduledTime && (
                        <div className={`mt-4 p-3 rounded-lg border ${
                          isValidSchedule 
                            ? isDarkMode 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                              : 'bg-emerald-50 border-emerald-300/50 text-emerald-800'
                            : isDarkMode 
                              ? 'bg-red-500/10 border-red-500/20 text-red-300' 
                              : 'bg-red-50 border-red-300/50 text-red-800'
                        }`}>
                          <div className="flex items-center gap-2 text-sm">
                            <ClockIcon className="w-4 h-4" />
                            <span className="font-medium">
                              {isValidSchedule ? 'Scheduled for:' : 'Invalid time:'}
                            </span>
                            <span>{formatScheduleTime()}</span>
                          </div>
                          {!isValidSchedule && (
                            <p className="text-xs mt-1 opacity-80">
                              Please select a future date and time
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Email Body */}
                  <div>
                    <div
                      ref={bodyRef}
                      contentEditable
                      onInput={(e) => setEmailData(prev => ({ ...prev, body: e.target.innerHTML }))}
                      className={`min-h-64 max-h-96 overflow-y-auto rounded-xl p-4 border transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent focus:outline-none reply-scrollbar ${
                        isDarkMode 
                          ? 'bg-slate-700/30 border-slate-600/50 text-white' 
                          : 'bg-white/80 border-gray-300/50 text-gray-900'
                      }`}
                      style={{ whiteSpace: 'pre-wrap' }}
                      placeholder="Type your message here..."
                    />
                  </div>

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className={`rounded-lg p-4 border ${
                      isDarkMode 
                        ? 'bg-slate-800/30 border-slate-700/30' 
                        : 'bg-gray-50/80 border-gray-300/30'
                    }`}>
                      <h4 className={`text-sm font-medium mb-3 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Attachments ({attachments.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {attachments.map((attachment) => {
                          const FileIcon = getFileIcon(attachment.type);
                          return (
                            <div key={attachment.id} className={`flex items-center gap-3 p-3 rounded group ${
                              isDarkMode ? 'bg-slate-700/30' : 'bg-white/60'
                            }`}>
                              <FileIcon className={`w-5 h-5 ${
                                isDarkMode ? 'text-slate-400' : 'text-gray-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm truncate ${
                                  isDarkMode ? 'text-slate-300' : 'text-gray-700'
                                }`}>
                                  {attachment.name}
                                </div>
                                <div className={`text-xs ${
                                  isDarkMode ? 'text-slate-500' : 'text-gray-500'
                                }`}>
                                  {attachment.size}
                                </div>
                              </div>
                              <button
                                onClick={() => removeAttachment(attachment.id)}
                                className={`opacity-0 group-hover:opacity-100 p-1 transition-all duration-200 ${
                                  isDarkMode 
                                    ? 'text-slate-400 hover:text-red-400' 
                                    : 'text-gray-500 hover:text-red-600'
                                }`}
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className={`flex items-center justify-between p-6 border-t ${
                  isDarkMode 
                    ? 'border-slate-700/50 bg-slate-800/30' 
                    : 'border-gray-300/50 bg-gray-50/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveDraft}
                      disabled={isDraft}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                        isDarkMode 
                          ? 'text-slate-300 hover:text-white hover:bg-slate-700/50' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                      }`}
                    >
                      <BookmarkIcon className="w-4 h-4" />
                      {isDraft ? 'Saving...' : 'Save Draft'}
                    </button>
                    
                    <button className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700/50' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}>
                      <EyeIcon className="w-4 h-4" />
                      Preview
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className={`px-4 py-2 transition-colors ${
                        isDarkMode 
                          ? 'text-slate-400 hover:text-white' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleSend}
                      disabled={isSending || !emailData.to.trim() || !emailData.subject.trim() || (isScheduled && !isValidSchedule)}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors shadow-lg hover:shadow-xl disabled:cursor-not-allowed ${
                        isScheduled && isValidSchedule
                          ? 'bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 text-white'
                      }`}
                    >
                      {isSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {isScheduled ? 'Scheduling...' : 'Sending...'}
                        </>
                      ) : (
                        <>
                          {isScheduled ? (
                            <ClockIcon className="w-4 h-4" />
                          ) : (
                            <PaperAirplaneIcon className="w-4 h-4" />
                          )}
                          {isScheduled ? 'Schedule Send' : 'Send'}
                        </>
                      )}
                    </button>
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ComposeModal;
