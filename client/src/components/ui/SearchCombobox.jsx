import React, { useState, Fragment, useEffect, useCallback } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, ChevronUpDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SearchCombobox = ({ onSearch, placeholder = "Search emails...", isDarkMode = true }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const suggestions = [
    { id: 1, name: 'john.doe@startup.com', type: 'sender' },
    { id: 2, name: 'Interested leads', type: 'category' },
    { id: 3, name: 'Meeting confirmations', type: 'category' },
    { id: 4, name: 'Today\'s emails', type: 'date' },
    { id: 5, name: 'Unread messages', type: 'status' }
  ];

  const filteredSuggestions = query === ''
    ? suggestions
    : suggestions.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      );

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length > 2) {
        setIsLoading(true);
        try {
          const searchResponse = await fetch(`http://65.1.63.189:5001/api/v1/emails/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
          if (searchResponse.ok) {
            const data = await searchResponse.json();
            setSearchResults(data.data.emails || []);
            setSearchMetadata(data.data.searchMetadata || null);
          }
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
          setSearchMetadata(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
        setSearchMetadata(null);
      }
    }, 300),
    []
  );

  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    onSearch(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setSearchMetadata(null);
    setSelected(null);
    onSearch('');
  };

  return (
    <div className="relative">
      <Combobox value={selected} onChange={setSelected}>
        <div className="relative">
          <div className={`relative w-full cursor-default overflow-hidden rounded-xl border backdrop-blur-sm focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-transparent transition-all duration-200 ${
            isDarkMode 
              ? 'bg-slate-800/50 border-slate-700/50' 
              : 'bg-white border-gray-300 shadow-sm'
          }`}>
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Combobox.Input
              className={`w-full border-none py-3 pl-10 pr-10 bg-transparent focus:ring-0 focus:outline-none ${
                isDarkMode 
                  ? 'text-white placeholder-slate-400' 
                  : 'text-gray-900 placeholder-gray-500'
              }`}
              displayValue={(item) => item?.name || query}
              onChange={handleInputChange}
              placeholder={placeholder}
              value={query}
            />
            
            {query && (
              <button
                onClick={clearSearch}
                className={`absolute right-10 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-slate-700 text-slate-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </Combobox.Button>
          </div>
          
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Combobox.Options className={`absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-xl backdrop-blur-sm shadow-lg ring-1 ring-black/5 focus:outline-none border ${
              isDarkMode 
                ? 'bg-slate-800/90 border-slate-700/50' 
                : 'bg-white/90 border-gray-300/50'
            }`}>
              {/* Search engine indicator */}
              {searchMetadata && (
                <div className={`px-4 py-2 border-b ${
                  isDarkMode ? 'border-slate-700/50' : 'border-gray-200/50'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-600'}>
                      Powered by {searchMetadata.engine === 'elasticsearch' ? '⚡ Elasticsearch' : '🗄️ MongoDB'}
                    </span>
                    {searchMetadata.took && (
                      <span className={isDarkMode ? 'text-slate-500' : 'text-gray-500'}>
                        {searchMetadata.took}ms
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className={`px-4 py-3 text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </div>
                </div>
              )}

              {/* Search results */}
              {!isLoading && searchResults.length > 0 ? (
                searchResults.map((email, index) => (
                  <Combobox.Option
                    key={email._id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-3 px-4 transition-colors duration-150 ${
                        active 
                          ? isDarkMode 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-blue-50 text-blue-700'
                          : isDarkMode 
                            ? 'text-slate-300' 
                            : 'text-gray-700'
                      }`
                    }
                    value={email}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {email.from?.name?.charAt(0) || email.from?.address?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {email.from?.name || email.from?.address}
                          </span>
                          {email.aiCategory && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              email.aiCategory === 'interested' ? 'bg-emerald-500/20 text-emerald-400' :
                              email.aiCategory === 'meeting_booked' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {email.aiCategory.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <div className={`text-sm truncate ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                          {email._highlights?.subject ? (
                            <span dangerouslySetInnerHTML={{ __html: email._highlights.subject[0] }} />
                          ) : (
                            email.subject
                          )}
                        </div>
                        {email._highlights?.body && (
                          <div className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                            <span dangerouslySetInnerHTML={{ __html: email._highlights.body[0] }} />
                          </div>
                        )}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        {new Date(email.receivedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </Combobox.Option>
                ))
              ) : !isLoading && query.length > 2 ? (
                <div className={`relative cursor-default select-none px-4 py-3 ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-600'
                }`}>
                  No results found.
                </div>
              ) : !isLoading ? (
                // Show suggestions when no query
                filteredSuggestions.map((suggestion) => (
                  <Combobox.Option
                    key={suggestion.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors duration-150 ${
                        active 
                          ? isDarkMode 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-blue-50 text-blue-700'
                          : isDarkMode 
                            ? 'text-slate-300' 
                            : 'text-gray-700'
                      }`
                    }
                    value={suggestion}
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {suggestion.name}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            active 
                              ? isDarkMode 
                                ? 'bg-blue-400/20 text-blue-200' 
                                : 'bg-blue-100 text-blue-700'
                              : isDarkMode 
                                ? 'bg-slate-700/50 text-slate-400' 
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {suggestion.type}
                          </span>
                        </div>
                        {selected ? (
                          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active 
                              ? isDarkMode ? 'text-blue-300' : 'text-blue-700'
                              : isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              ) : null}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default SearchCombobox;
