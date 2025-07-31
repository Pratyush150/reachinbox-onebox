import React, { useState, Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { 
  XMarkIcon, 
  ChartBarIcon, 
  InboxIcon, 
  BoltIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

const AnalyticsModal = ({ isOpen, onClose }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  // Mock analytics data
  const stats = {
    total: 1247,
    unread: 23,
    interested: 45,
    meetings: 12,
    spam: 156,
    notInterested: 78,
    outOfOffice: 23
  };

  const trends = {
    '7d': [
      { date: 'Mon', emails: 42, interested: 8, meetings: 2 },
      { date: 'Tue', emails: 38, interested: 6, meetings: 1 },
      { date: 'Wed', emails: 51, interested: 12, meetings: 3 },
      { date: 'Thu', emails: 35, interested: 5, meetings: 1 },
      { date: 'Fri', emails: 48, interested: 9, meetings: 2 },
      { date: 'Sat', emails: 22, interested: 3, meetings: 0 },
      { date: 'Sun', emails: 15, interested: 2, meetings: 1 }
    ],
    '30d': [
      { date: 'Week 1', emails: 280, interested: 45, meetings: 12 },
      { date: 'Week 2', emails: 320, interested: 52, meetings: 15 },
      { date: 'Week 3', emails: 295, interested: 38, meetings: 9 },
      { date: 'Week 4', emails: 352, interested: 48, meetings: 18 }
    ]
  };

  const categoryBreakdown = [
    { name: 'Interested', count: stats.interested, color: 'emerald', percentage: 15.2, trend: 'up' },
    { name: 'Meetings', count: stats.meetings, color: 'blue', percentage: 4.1, trend: 'up' },
    { name: 'Not Interested', count: stats.notInterested, color: 'red', percentage: 26.4, trend: 'down' },
    { name: 'Spam', count: stats.spam, color: 'orange', percentage: 52.8, trend: 'down' },
    { name: 'Out of Office', count: stats.outOfOffice, color: 'purple', percentage: 7.8, trend: 'neutral' }
  ];

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }) => (
    <div className={`bg-${color}-500/10 border border-${color}-500/20 rounded-xl p-6 backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 bg-${color}-500/20 rounded-lg flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${color}-400`} />
            </div>
            <div>
              <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
              <div className="text-sm text-slate-300">{title}</div>
            </div>
          </div>
          {subtitle && (
            <div className="text-xs text-slate-400">{subtitle}</div>
          )}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend.direction === 'up' ? 'text-emerald-400' : 
            trend.direction === 'down' ? 'text-red-400' : 'text-slate-400'
          }`}>
            {trend.direction === 'up' && <ArrowUpIcon className="w-3 h-3" />}
            {trend.direction === 'down' && <ArrowDownIcon className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );

  const ChartBar = ({ data, maxValue, color = 'blue' }) => (
    <div className="h-48 flex items-end justify-between gap-2">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center group">
          <div className="relative w-full mb-2">
            <div 
              className={`w-full bg-gradient-to-t from-${color}-500 to-${color}-400 rounded-t transition-all duration-1000 hover:from-${color}-400 hover:to-${color}-300 cursor-pointer`}
              style={{ 
                height: `${(item.emails / maxValue) * 160}px`,
                minHeight: '4px'
              }}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {item.emails}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-medium">{item.date}</div>
        </div>
      ))}
    </div>
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-6xl bg-slate-800/90 border border-slate-700/50 rounded-2xl backdrop-blur-sm shadow-xl overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-2xl font-bold text-white">
                        Email Analytics
                      </Dialog.Title>
                      <p className="text-sm text-slate-400">Comprehensive email performance insights</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedTimeRange}
                      onChange={(e) => setSelectedTimeRange(e.target.value)}
                      className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                    >
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </select>
                    
                    <button
                      onClick={onClose}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Emails"
                      value={stats.total.toLocaleString()}
                      subtitle="All time"
                      icon={InboxIcon}
                      color="slate"
                      trend={{ direction: 'up', value: '+12%' }}
                    />
                    <StatCard
                      title="Interested Leads"
                      value={stats.interested}
                      subtitle="This month"
                      icon={BoltIcon}
                      color="emerald"
                      trend={{ direction: 'up', value: '+24%' }}
                    />
                    <StatCard
                      title="Meetings Booked"
                      value={stats.meetings}
                      subtitle="This month"
                      icon={CalendarIcon}
                      color="blue"
                      trend={{ direction: 'up', value: '+18%' }}
                    />
                    <StatCard
                      title="Response Rate"
                      value="3.6%"
                      subtitle="Last 30 days"
                      icon={ArrowTrendingUpIcon}
                      color="purple"
                      trend={{ direction: 'up', value: '+0.8%' }}
                    />
                  </div>

                  <Tab.Group>
                    <Tab.List className="flex space-x-1 rounded-xl bg-slate-900/50 p-1">
                      {['Volume Trends', 'Category Analysis', 'Performance'].map((category) => (
                        <Tab
                          key={category}
                          className={({ selected }) =>
                            `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${
                              selected
                                ? 'bg-white text-slate-900 shadow'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            }`
                          }
                        >
                          {category}
                        </Tab>
                      ))}
                    </Tab.List>
                    
                    <Tab.Panels className="mt-6">
                      {/* Volume Trends Tab */}
                      <Tab.Panel>
                        <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-white mb-4">Email Volume Over Time</h3>
                          <ChartBar 
                            data={trends[selectedTimeRange]} 
                            maxValue={Math.max(...trends[selectedTimeRange].map(d => d.emails))}
                            color="blue"
                          />
                        </div>
                      </Tab.Panel>

                      {/* Category Analysis Tab */}
                      <Tab.Panel>
                        <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-6">
                          <h3 className="text-lg font-semibold text-white mb-6">AI Category Breakdown</h3>
                          <div className="space-y-4">
                            {categoryBreakdown.map((category, index) => (
                              <div key={index} className="flex items-center gap-4">
                                <div className="flex items-center gap-3 w-40">
                                  <div className={`w-4 h-4 bg-${category.color}-500 rounded-full`} />
                                  <span className="text-sm text-slate-300 font-medium">{category.name}</span>
                                </div>
                                <div className="flex-1 flex items-center gap-3">
                                  <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full bg-gradient-to-r from-${category.color}-500 to-${category.color}-400 transition-all duration-1000`}
                                      style={{ width: `${category.percentage}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 text-sm min-w-20">
                                    <span className="text-white font-medium">{category.count}</span>
                                    <span className="text-slate-400">({category.percentage}%)</span>
                                  </div>
                                  <div className={`flex items-center gap-1 text-xs min-w-12 ${
                                    category.trend === 'up' ? 'text-emerald-400' : 
                                    category.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                                  }`}>
                                    {category.trend === 'up' && <ArrowUpIcon className="w-3 h-3" />}
                                    {category.trend === 'down' && <ArrowDownIcon className="w-3 h-3" />}
                                    {category.trend !== 'neutral' && (category.trend === 'up' ? '+' : '-') + '2%'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Performance Tab */}
                      <Tab.Panel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Response Times</h3>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300">Average Response Time</span>
                                <span className="text-white font-medium">2.4 hours</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300">Fastest Response</span>
                                <span className="text-emerald-400 font-medium">8 minutes</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300">Response Coverage</span>
                                <span className="text-white font-medium">87%</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">AI Accuracy</h3>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300">Classification Accuracy</span>
                                <span className="text-emerald-400 font-medium">94.2%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300">Confidence Score</span>
                                <span className="text-white font-medium">89.7%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-300">False Positives</span>
                                <span className="text-orange-400 font-medium">2.1%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AnalyticsModal;
