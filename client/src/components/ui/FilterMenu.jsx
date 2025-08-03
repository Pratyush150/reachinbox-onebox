import React, { useState, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { FunnelIcon, ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { 
  BoltIcon, 
  CalendarIcon, 
  NoSymbolIcon, 
  ExclamationTriangleIcon, 
  ClockIcon 
} from '@heroicons/react/24/solid';

const FilterMenu = ({ onFilterChange, activeFilters = [], isDarkMode = true }) => {
  const [selectedFilters, setSelectedFilters] = useState(activeFilters);

  const filterOptions = [
    {
      id: 'unread',
      name: 'Unread Only',
      description: 'Show unread emails',
      type: 'status',
      icon: null,
      color: 'text-blue-400'
    },
    {
      id: 'interested',
      name: 'Interested',
      description: 'Buying intent detected',
      type: 'category',
      icon: BoltIcon,
      color: 'text-emerald-400'
    },
    {
      id: 'meeting_booked',
      name: 'Meeting Booked',
      description: 'Meetings confirmed',
      type: 'category',
      icon: CalendarIcon,
      color: 'text-blue-400'
    },
    {
      id: 'not_interested',
      name: 'Not Interested',
      description: 'Rejected proposals',
      type: 'category',
      icon: NoSymbolIcon,
      color: 'text-red-400'
    },
    {
      id: 'spam',
      name: 'Spam',
      description: 'Promotional emails',
      type: 'category',
      icon: ExclamationTriangleIcon,
      color: 'text-orange-400'
    },
    {
      id: 'out_of_office',
      name: 'Out of Office',
      description: 'Auto-reply messages',
      type: 'category',
      icon: ClockIcon,
      color: 'text-purple-400'
    },
    {
      id: 'today',
      name: 'Today',
      description: 'Emails from today',
      type: 'date',
      icon: null,
      color: 'text-slate-400'
    },
    {
      id: 'this_week',
      name: 'This Week',
      description: 'Last 7 days',
      type: 'date',
      icon: null,
      color: 'text-slate-400'
    }
  ];

  const toggleFilter = (filterId) => {
    const newFilters = selectedFilters.includes(filterId)
      ? selectedFilters.filter(f => f !== filterId)
      : [...selectedFilters, filterId];
    
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setSelectedFilters([]);
    onFilterChange([]);
  };

  const getFilterGroups = () => {
    const groups = {};
    filterOptions.forEach(filter => {
      if (!groups[filter.type]) {
        groups[filter.type] = [];
      }
      groups[filter.type].push(filter);
    });
    return groups;
  };

  const filterGroups = getFilterGroups();

  return (
    <Menu as="div" className="relative">
      <div>
        <Menu.Button className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm border ${
          isDarkMode 
            ? 'bg-slate-800/30 border-slate-700/30 text-slate-300 hover:bg-slate-800/50 hover:text-white'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
        }`}>
          <FunnelIcon className="w-4 h-4" />
          <span>Filters</span>
          {selectedFilters.length > 0 && (
            <span className="ml-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              {selectedFilters.length}
            </span>
          )}
          <ChevronDownIcon className="w-4 h-4 ml-1" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-80 bg-slate-800/90 border border-slate-700/50 rounded-xl shadow-lg backdrop-blur-sm z-50 focus:outline-none">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Filter Options</h3>
              {selectedFilters.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-4">
              {Object.entries(filterGroups).map(([groupType, filters]) => (
                <div key={groupType}>
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                    {groupType === 'category' ? 'AI Categories' : 
                     groupType === 'status' ? 'Status' : 'Time Range'}
                  </h4>
                  <div className="space-y-1">
                    {filters.map((filter) => (
                      <Menu.Item key={filter.id}>
                        {({ close }) => (
                          <button
                            onClick={() => toggleFilter(filter.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                              selectedFilters.includes(filter.id)
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-center w-5 h-5">
                              {selectedFilters.includes(filter.id) ? (
                                <CheckIcon className="w-4 h-4 text-blue-400" />
                              ) : filter.icon ? (
                                <filter.icon className={`w-4 h-4 ${filter.color}`} />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-slate-600" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{filter.name}</div>
                              <div className="text-xs text-slate-400">{filter.description}</div>
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedFilters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="text-xs text-slate-400 mb-2">Active Filters:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedFilters.map(filterId => {
                    const filter = filterOptions.find(f => f.id === filterId);
                    return filter ? (
                      <span
                        key={filterId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30"
                      >
                        {filter.icon && <filter.icon className="w-3 h-3" />}
                        {filter.name}
                        <button
                          onClick={() => toggleFilter(filterId)}
                          className="ml-1 hover:text-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default FilterMenu;
