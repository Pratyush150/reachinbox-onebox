import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  ChartBarIcon, 
  TrophyIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  PaperAirplaneIcon,
  EyeIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const AISalesInsights = ({ email, onGenerateReply, isDarkMode = true }) => {
  const [insights, setInsights] = useState(null);
  const [aiReplies, setAiReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    if (email?._id) {
      loadSalesInsights();
    } else {
      setInsights(null);
      setAiReplies([]);
    }
  }, [email?._id]);

  const loadSalesInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://65.1.63.189:5001/api/v1/ai/sales-insights/${email._id}`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.data);
      }
    } catch (error) {
      console.error('Failed to load sales insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAiReplies = async () => {
    try {
      setLoading(true);
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
        setActiveTab('replies');
      }
    } catch (error) {
      console.error('Failed to generate AI replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return isDarkMode ? 'text-green-400' : 'text-green-600';
    if (confidence >= 40) return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
    return isDarkMode ? 'text-red-400' : 'text-red-600';
  };

  const getUrgencyIcon = (urgency) => {
    switch (urgency) {
      case 'high': return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
      case 'medium': return <ClockIcon className="w-4 h-4 text-yellow-400" />;
      case 'low': return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      default: return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getUrgencyBg = (urgency) => {
    switch (urgency) {
      case 'high': return isDarkMode ? 'bg-red-500/20 border-red-400/30' : 'bg-red-50 border-red-200';
      case 'medium': return isDarkMode ? 'bg-yellow-500/20 border-yellow-400/30' : 'bg-yellow-50 border-yellow-200';
      case 'low': return isDarkMode ? 'bg-green-500/20 border-green-400/30' : 'bg-green-50 border-green-200';
      default: return isDarkMode ? 'bg-gray-500/20 border-gray-400/30' : 'bg-gray-50 border-gray-200';
    }
  };

  if (!email) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 text-center ${
        isDarkMode ? 'text-slate-400 bg-slate-900/40' : 'text-gray-500 bg-white/40'
      } backdrop-blur-sm`}>
        <SparklesIcon className="w-16 h-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">AI Sales Assistant</h3>
        <p className="text-sm">Select an email to view AI insights and get smart reply suggestions</p>
      </div>
    );
  }

  if (loading && !insights) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-6 text-center ${
        isDarkMode ? 'text-slate-400 bg-slate-900/40' : 'text-gray-500 bg-white/40'
      } backdrop-blur-sm`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
        <h3 className="text-lg font-medium mb-2">Analyzing Email</h3>
        <p className="text-sm">AI is processing sales insights...</p>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-slate-900/40' : 'bg-white/40'
    } backdrop-blur-sm`}>
      {/* Header */}
      <div className={`flex-shrink-0 p-4 border-b ${
        isDarkMode ? 'border-slate-600/40' : 'border-gray-200/60'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <SparklesIcon className="w-5 h-5 text-purple-400" />
            AI Assistant
          </h2>
          <button
            onClick={generateAiReplies}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              loading 
                ? 'opacity-50 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            Generate
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {['insights', 'replies'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? isDarkMode
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-blue-50 text-blue-700'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/50'
              }`}
            >
              {tab === 'insights' ? '📊 Insights' : `🤖 Replies (${aiReplies.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {activeTab === 'insights' && insights && (
          <>
            {/* Purchase Confidence Score */}
            <div className={`p-4 rounded-lg border ${
              isDarkMode ? 'border-slate-600/40 bg-slate-800/30' : 'border-gray-200/60 bg-gray-50/30'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-medium flex items-center gap-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  <TrophyIcon className="w-5 h-5 text-yellow-400" />
                  Sales Score
                </h3>
                <span className={`text-2xl font-bold ${getConfidenceColor(insights.confidence)}`}>
                  {insights.confidence}%
                </span>
              </div>
              
              <div className={`h-2 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    insights.confidence >= 70 ? 'bg-green-500' :
                    insights.confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${insights.confidence}%` }}
                />
              </div>
              
              <p className={`text-sm mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                {insights.intent}
              </p>
            </div>

            {/* Urgency & Next Action */}
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${getUrgencyBg(insights.urgency)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getUrgencyIcon(insights.urgency)}
                  <span className={`font-medium text-sm ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {insights.urgency.charAt(0).toUpperCase() + insights.urgency.slice(1)} Urgency
                  </span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  {insights.urgency === 'high' ? 'Respond immediately' :
                   insights.urgency === 'medium' ? 'Respond today' :
                   'Standard timing'}
                </p>
              </div>

              <div className={`p-3 rounded-lg border ${
                isDarkMode ? 'border-blue-400/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'
              }`}>
                <div className={`flex items-center gap-2 mb-2 ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  <span className="font-medium text-sm">Next Action</span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                  {insights.nextAction}
                </p>
              </div>
            </div>

            {/* Buying Signals */}
            {insights.buyingSignals && insights.buyingSignals.length > 0 && (
              <div className={`p-3 rounded-lg border ${
                isDarkMode ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
              }`}>
                <h3 className={`font-medium mb-2 flex items-center gap-2 text-sm ${
                  isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                }`}>
                  <CheckCircleIcon className="w-4 h-4" />
                  Buying Signals
                </h3>
                <div className="flex flex-wrap gap-1">
                  {insights.buyingSignals.slice(0, 3).map((signal, idx) => (
                    <span 
                      key={idx}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isDarkMode 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {signal.length > 15 ? signal.substring(0, 15) + '...' : signal}
                    </span>
                  ))}
                  {insights.buyingSignals.length > 3 && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isDarkMode ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      +{insights.buyingSignals.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Strategy */}
            <div className={`p-3 rounded-lg border ${
              isDarkMode ? 'border-purple-400/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50'
            }`}>
              <h3 className={`font-medium mb-2 flex items-center gap-2 text-sm ${
                isDarkMode ? 'text-purple-300' : 'text-purple-700'
              }`}>
                <LightBulbIcon className="w-4 h-4" />
                Strategy
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-purple-200' : 'text-purple-800'}`}>
                {insights.responseStrategy}
              </p>
            </div>

            {/* Email Metrics - Compact */}
            {insights.emailMetrics && (
              <div className={`p-3 rounded-lg border ${
                isDarkMode ? 'border-slate-600/40 bg-slate-800/30' : 'border-gray-200/60 bg-gray-50/30'
              }`}>
                <h3 className={`font-medium mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  📈 Metrics
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Response:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {insights.emailMetrics.responseTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>Domain:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {insights.emailMetrics.domain}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>First Contact:</span>
                    <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {insights.emailMetrics.isFirstContact ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'replies' && (
          <div className="space-y-3">
            {loading ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
                <p className="text-sm">Generating replies...</p>
              </div>
            ) : aiReplies.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                <PaperAirplaneIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click "Generate" to get AI reply suggestions</p>
              </div>
            ) : (
              aiReplies.map((reply, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                    isDarkMode 
                      ? 'border-slate-600/40 bg-slate-800/30 hover:bg-slate-800/50' 
                      : 'border-gray-200/60 bg-white/30 hover:bg-white/50'
                  }`}
                  onClick={() => onGenerateReply && onGenerateReply(reply.content)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      {reply.title}
                    </span>
                    {reply.recommended && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                        ⭐
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                    {reply.content.length > 100 ? reply.content.substring(0, 100) + '...' : reply.content}
                  </p>
                  <div className={`mt-2 text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                    Click to use
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AISalesInsights;
