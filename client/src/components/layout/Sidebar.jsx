import React, { useState } from 'react';
import { 
  InboxIcon, 
  BoltIcon, 
  CalendarIcon, 
  NoSymbolIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  Bars3Icon,
  ChevronRightIcon,
  PlusIcon,
  UserIcon,
  ArchiveBoxIcon,
  DocumentIcon,
  PaperAirplaneIcon,
  TrashIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { 
  BoltIcon as BoltSolid,
  CalendarIcon as CalendarSolid,
  ExclamationTriangleIcon as ExclamationSolid 
} from '@heroicons/react/24/solid';

const Sidebar = ({ 
  selectedCategory, 
  onCategorySelect, 
  isCollapsed, 
  onToggleCollapse,
  onShowAnalytics,
  onShowNotifications,
  onShowCompose,
  emailStats,
  isDarkMode = true
}) => {
  const [hoveredCategory, setHoveredCategory] = useState(null);

  const folderCategories = [
    { 
      key: 'inbox', 
      label: 'Inbox', 
      icon: InboxIcon, 
      count: emailStats?.total || 0,
      color: isDarkMode ? 'text-slate-400' : 'text-gray-600',
      description: 'All incoming emails'
    },
    { 
      key: 'sent', 
      label: 'Sent', 
      icon: PaperAirplaneIcon, 
      count: 8,
      color: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      description: 'Sent emails'
    },
    { 
      key: 'drafts', 
      label: 'Drafts', 
      icon: DocumentIcon, 
      count: 3,
      color: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
      description: 'Draft emails'
    },
    { 
      key: 'scheduled', 
      label: 'Scheduled', 
      icon: ClockIcon, 
      count: emailStats?.scheduled || 2,
      color: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      description: 'Scheduled emails'
    },
    { 
      key: 'archive', 
      label: 'Archive', 
      icon: ArchiveBoxIcon, 
      count: 156,
      color: isDarkMode ? 'text-green-400' : 'text-green-600',
      description: 'Archived emails'
    },
    { 
      key: 'deleted', 
      label: 'Deleted', 
      icon: TrashIcon, 
      count: 12,
      color: isDarkMode ? 'text-red-400' : 'text-red-600',
      description: 'Deleted emails'
    }
  ];

  const aiCategories = [
    { 
      key: 'all', 
      label: 'All Categories', 
      icon: FunnelIcon, 
      count: emailStats?.total || 0,
      color: isDarkMode ? 'text-slate-400' : 'text-gray-600',
      bgColor: isDarkMode ? 'bg-slate-500/10' : 'bg-gray-200/80',
      borderColor: isDarkMode ? 'border-slate-500/20' : 'border-gray-300/80',
      description: 'View all AI categories'
    },
    { 
      key: 'interested', 
      label: 'Interested', 
      icon: BoltIcon, 
      solidIcon: BoltSolid,
      count: emailStats?.interested || 0,
      color: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
      bgColor: isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-100/80',
      borderColor: isDarkMode ? 'border-emerald-500/20' : 'border-emerald-400/60',
      description: 'Buying intent detected'
    },
    { 
      key: 'meeting_booked', 
      label: 'Meetings', 
      icon: CalendarIcon,
      solidIcon: CalendarSolid,
      count: emailStats?.meeting_booked || 0,
      color: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      bgColor: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-100/80',
      borderColor: isDarkMode ? 'border-blue-500/20' : 'border-blue-400/60',
      description: 'Scheduled meetings'
    },
    { 
      key: 'not_interested', 
      label: 'Not Interested', 
      icon: NoSymbolIcon, 
      count: emailStats?.not_interested || 0,
      color: isDarkMode ? 'text-red-400' : 'text-red-600',
      bgColor: isDarkMode ? 'bg-red-500/10' : 'bg-red-100/80',
      borderColor: isDarkMode ? 'border-red-500/20' : 'border-red-400/60',
      description: 'Declined proposals'
    },
    { 
      key: 'spam', 
      label: 'Spam', 
      icon: ExclamationTriangleIcon,
      solidIcon: ExclamationSolid,
      count: emailStats?.spam || 0,
      color: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      bgColor: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-100/80',
      borderColor: isDarkMode ? 'border-orange-500/20' : 'border-orange-400/60',
      description: 'Promotional emails'
    },
    { 
      key: 'out_of_office', 
      label: 'Out of Office', 
      icon: ClockIcon, 
      count: emailStats?.out_of_office || 0,
      color: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      bgColor: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-100/80',
      borderColor: isDarkMode ? 'border-purple-500/20' : 'border-purple-400/60',
      description: 'Auto-reply messages'
    }
  ];

  const quickActions = [
    {
      key: 'analytics',
      label: 'Analytics',
      icon: ChartBarIcon,
      onClick: onShowAnalytics,
      color: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      description: 'View detailed analytics'
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: BellIcon,
      onClick: onShowNotifications,
      color: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
      hasNotification: true,
      description: 'View notifications'
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: CogIcon,
      onClick: () => console.log('Settings clicked'),
      color: isDarkMode ? 'text-slate-400' : 'text-gray-600',
      description: 'Configure settings'
    }
  ];

  const CategoryItem = ({ category, isFolder = false }) => {
    const IconComponent = selectedCategory === category.key && category.solidIcon 
      ? category.solidIcon 
      : category.icon;

    const isSelected = selectedCategory === category.key;

    return (
      <button
        onClick={() => onCategorySelect(category.key)}
        onMouseEnter={() => setHoveredCategory(category.key)}
        onMouseLeave={() => setHoveredCategory(null)}
        className={`group w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 relative ${
          isSelected
            ? `${category.bgColor || (isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100/80')} ${category.color} border ${category.borderColor || (isDarkMode ? 'border-blue-500/30' : 'border-blue-400/60')} shadow-lg`
            : isDarkMode 
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
        }`}
      >
        <div className={`relative ${isCollapsed ? 'mx-auto' : ''}`}>
          <IconComponent className={`w-5 h-5 ${category.color} transition-all duration-200 ${
            isSelected ? 'scale-110' : 'group-hover:scale-105'
          }`} />
          
          {/* Priority indicator for important categories */}
          {(['interested', 'meeting_booked'].includes(category.key) && category.count > 0) && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {!isCollapsed && (
          <>
            <div className="flex-1 text-left">
              <div className="font-medium">{category.label}</div>
              {hoveredCategory === category.key && (
                <div className={`text-xs opacity-80 animate-in fade-in duration-200 ${
                  isDarkMode ? 'text-slate-500' : 'text-gray-500'
                }`}>
                  {category.description}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-200 ${
                isSelected
                  ? `${category.bgColor || (isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100/80')} ${category.color}`
                  : isDarkMode 
                    ? 'bg-slate-700/50 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'
                    : 'bg-gray-200/60 text-gray-600 group-hover:bg-gray-300/60 group-hover:text-gray-800'
              }`}>
                {category.count}
              </span>
              
              {isSelected && (
                <ChevronRightIcon className="w-4 h-4 text-current animate-in slide-in-from-left-1 duration-200" />
              )}
            </div>
          </>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className={`absolute left-full ml-2 px-3 py-2 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-white' 
              : 'bg-white border-gray-300 text-gray-900 shadow-lg'
          }`}>
            <div className="font-medium">{category.label}</div>
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
              {category.count} emails
            </div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={`flex-shrink-0 border-r backdrop-blur-sm transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } ${
      isDarkMode 
        ? 'bg-slate-900/50 border-slate-700/50' 
        : 'bg-white/50 border-gray-300/50'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`flex-shrink-0 p-4 border-b ${
          isDarkMode ? 'border-slate-700/30' : 'border-gray-300/30'
        }`}>
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <InboxIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    ReachInbox
                  </h1>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-slate-400' : 'text-gray-600'
                  }`}>
                    AI Email Manager
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={onToggleCollapse}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <Bars3Icon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compose Button */}
        <div className="flex-shrink-0 p-4">
          <button 
            onClick={onShowCompose}
            className={`w-full flex items-center gap-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl group ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <PlusIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="font-medium">Compose</span>}
          </button>
        </div>

        {/* Quick Stats */}
        {!isCollapsed && (
          <div className={`flex-shrink-0 px-4 pb-4 border-b ${
            isDarkMode ? 'border-slate-700/30' : 'border-gray-300/30'
          }`}>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-lg p-3 backdrop-blur-sm border ${
                isDarkMode 
                  ? 'bg-slate-800/30 border-slate-700/30' 
                  : 'bg-white/60 border-gray-300/30'
              }`}>
                <div className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {(emailStats?.total || 0).toLocaleString()}
                </div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  Total
                </div>
              </div>
              <div className={`rounded-lg p-3 backdrop-blur-sm border ${
                isDarkMode 
                  ? 'bg-blue-500/10 border-blue-500/20' 
                  : 'bg-blue-100/80 border-blue-400/60'
              }`}>
                <div className={`text-xl font-bold ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {emailStats?.unread || 0}
                </div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  Unread
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Mail Folders */}
          <nav className="space-y-2">
            {!isCollapsed && (
              <div className={`text-xs font-medium uppercase tracking-wider mb-4 ${
                isDarkMode ? 'text-slate-500' : 'text-gray-500'
              }`}>
                Mail Folders
              </div>
            )}
            
            {folderCategories.map((category) => (
              <CategoryItem key={category.key} category={category} isFolder={true} />
            ))}
          </nav>

          {/* AI Categories */}
          <nav className="space-y-2">
            {!isCollapsed && (
              <div className={`text-xs font-medium uppercase tracking-wider mb-4 ${
                isDarkMode ? 'text-slate-500' : 'text-gray-500'
              }`}>
                AI Categories
              </div>
            )}
            
            {aiCategories.map((category) => (
              <CategoryItem key={category.key} category={category} />
            ))}
          </nav>

          {/* Quick Actions */}
          <div>
            {!isCollapsed && (
              <div className={`text-xs font-medium uppercase tracking-wider mb-4 ${
                isDarkMode ? 'text-slate-500' : 'text-gray-500'
              }`}>
                Quick Actions
              </div>
            )}
            
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.key}
                  onClick={action.onClick}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${
                    isDarkMode 
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  <div className={`relative ${isCollapsed ? 'mx-auto' : ''}`}>
                    <action.icon className={`w-5 h-5 ${action.color} group-hover:scale-105 transition-transform`} />
                    {action.hasNotification && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  {!isCollapsed && (
                    <span className="font-medium">{action.label}</span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className={`absolute left-full ml-2 px-3 py-2 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border ${
                      isDarkMode 
                        ? 'bg-slate-800 border-slate-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-900 shadow-lg'
                    }`}>
                      <div className="font-medium">{action.label}</div>
                      <div className={`text-xs ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-600'
                      }`}>
                        {action.description}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className={`flex-shrink-0 p-4 border-t ${
          isDarkMode ? 'border-slate-700/30' : 'border-gray-300/30'
        }`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Admin User
                </div>
                <div className={`text-xs ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  admin@reachinbox.com
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
