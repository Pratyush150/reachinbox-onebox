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

const ComposeModal = ({ isOpen, onClose, onSend }) => {
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
  const [scheduleTime, setScheduleTime] = useState('');
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
    
    onSend({
      ...emailData,
      attachments: attachments,
      sentAt: new Date(),
      scheduled: scheduleTime ? new Date(scheduleTime) : null
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
    setScheduleTime('');
    onClose();
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return PhotoIcon;
    if (type.includes('pdf')) return DocumentIcon;
    return DocumentIcon;
  };

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
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-4xl bg-slate-800/90 border border-slate-700/50 rounded-2xl backdrop-blur-sm shadow-xl overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <PaperAirplaneIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold text-white">
                        Compose Email
                      </Dialog.Title>
                      <p className="text-sm text-slate-400">Create and send a new email</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Recipients */}
                  <div className="space-y-3">
                    {/* To Field */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-300 w-12">To:</label>
                      <input
                        type="email"
                        value={emailData.to}
                        onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="recipient@example.com"
                        className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        required
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowCc(!showCc)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            showCc ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Cc
                        </button>
                        <button
                          onClick={() => setShowBcc(!showBcc)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            showBcc ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Bcc
                        </button>
                      </div>
                    </div>

                    {/* CC Field */}
                    {showCc && (
                      <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-sm font-medium text-slate-300 w-12">Cc:</label>
                        <input
                          type="email"
                          value={emailData.cc}
                          onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                          placeholder="cc@example.com"
                          className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        />
                      </div>
                    )}

                    {/* BCC Field */}
                    {showBcc && (
                      <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-sm font-medium text-slate-300 w-12">Bcc:</label>
                        <input
                          type="email"
                          value={emailData.bcc}
                          onChange={(e) => setEmailData(prev => ({ ...prev, bcc: e.target.value }))}
                          placeholder="bcc@example.com"
                          className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        />
                      </div>
                    )}

                    {/* Subject */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-slate-300 w-12">Subject:</label>
                      <input
                        type="text"
                        value={emailData.subject}
                        onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Email subject"
                        className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-4 p-3 bg-slate-800/50 border border-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-1">
                      {formatButtons.map((btn, index) => (
                        <button
                          key={index}
                          onClick={() => handleFormatText(btn.action)}
                          className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors border border-slate-600/50"
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
                    
                    <div className="w-px h-6 bg-slate-600" />
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors text-sm border border-slate-600/50"
                      >
                        <PaperClipIcon className="w-4 h-4" />
                        Attach
                      </button>
                      
                      <button className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors text-sm border border-slate-600/50">
                        <LinkIcon className="w-4 h-4" />
                        Link
                      </button>
                      
                      <button className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors text-sm border border-slate-600/50">
                        <FaceSmileIcon className="w-4 h-4" />
                        Emoji
                      </button>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div>
                    <div
                      ref={bodyRef}
                      contentEditable
                      onInput={(e) => setEmailData(prev => ({ ...prev, body: e.target.innerHTML }))}
                      className="min-h-64 max-h-96 overflow-y-auto bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent focus:outline-none"
                      style={{ whiteSpace: 'pre-wrap' }}
                      placeholder="Type your message here..."
                    />
                  </div>

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-white mb-3">Attachments ({attachments.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {attachments.map((attachment) => {
                          const FileIcon = getFileIcon(attachment.type);
                          return (
                            <div key={attachment.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg group">
                              <FileIcon className="w-5 h-5 text-slate-400" />
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
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Schedule Section - Compact */}
                  {showScheduler && (
                    <div className="flex items-center gap-4 p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-slate-400" />
                        <label className="text-sm text-slate-300">Schedule:</label>
                      </div>
                      <input
                        type="date"
                        value={scheduleTime.split('T')[0] || ''}
                        onChange={(e) => {
                          const time = scheduleTime.split('T')[1] || '09:00';
                          setScheduleTime(e.target.value ? `${e.target.value}T${time}` : '');
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-white text-sm focus:ring-2 focus:ring-blue-500/50"
                      />
                      <select
                        value={scheduleTime.split('T')[1] || ''}
                        onChange={(e) => {
                          const date = scheduleTime.split('T')[0] || new Date().toISOString().split('T')[0];
                          setScheduleTime(e.target.value ? `${date}T${e.target.value}` : '');
                        }}
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
                      {scheduleTime && (
                        <>
                          <span className="text-xs text-slate-400">
                            Send: {new Date(scheduleTime).toLocaleString()}
                          </span>
                          <button
                            onClick={() => setScheduleTime('')}
                            className="text-xs text-slate-400 hover:text-white transition-colors"
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between p-6 border-t border-slate-700/50 bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveDraft}
                      disabled={isDraft}
                      className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <BookmarkIcon className="w-4 h-4" />
                      {isDraft ? 'Saving...' : 'Save Draft'}
                    </button>
                    
                    <button className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors">
                      <EyeIcon className="w-4 h-4" />
                      Preview
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleSend}
                      disabled={isSending || !emailData.to.trim() || !emailData.subject.trim()}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-lg hover:shadow-xl"
                    >
                      {isSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <PaperAirplaneIcon className="w-4 h-4" />
                          {scheduleTime ? 'Schedule Send' : 'Send'}
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
