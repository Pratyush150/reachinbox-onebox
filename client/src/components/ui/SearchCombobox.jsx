import React, { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, ChevronUpDownIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SearchCombobox = ({ onSearch, placeholder = "Search emails...", isDarkMode = true }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMetadata, setSearchMetadata] = useState(null);

  // Mock search suggestions - in real app, this would be dynamic
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

  const handleInputChange = async (event) => {
    const value = event.target.value;
    setQuery(value);
    
    if (value.length > 2) {
      try {
        // Debounced search with enhanced API call
        const searchResponse = await fetch(`/api/v1/emails/search?q=${encodeURIComponent(value)}&limit=5`);
        if (searchResponse.ok) {
          const data = await searchResponse.json();
          setSearchResults(data.data.emails || []);
          setSearchMetadata(data.data.searchMetadata || null);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
        setSearchMetadata(null);
      }
    } else {
      setSearchResults([]);
      setSearchMetadata(null);
    }
    
    onSearch(value);
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
              className="w-full border-none py-3 pl-10 pr-10 text-white placeholder-slate-400 bg-transparent focus:ring-0 focus:outline-none"
              displayValue={(item) => item?.name || query}
              onChange={handleInputChange}
              placeholder={placeholder}
            />
            {/* Add after the input, before ChevronUpDownIcon */}
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  onSearch('');
                }}
                className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <XMarkIcon className="h-4 w-4 text-slate-400 hover:text-white" />
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
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-xl bg-slate-800/90 border border-slate-700/50 backdrop-blur-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
              {/* Search engine indicator */}
              {searchMetadata && (
                <div className="px-4 py-2 border-b border-slate-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Powered by {searchMetadata.engine === 'elasticsearch' ? '⚡ Elasticsearch' : '🗄️ MongoDB'}
                    </span>
                    {searchMetadata.took && (
                      <span className="text-slate-500">
                        {searchMetadata.took}ms
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Search results */}
              {searchResults.length > 0 ? (
                searchResults.map((email, index) => (
                  <Combobox.Option
                    key={email._id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-3 px-4 transition-colors duration-150 ${
                        active ? 'bg-blue-500/20 text-blue-300' : 'text-slate-300'
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
                        <div className="text-sm text-slate-400 truncate">
                          {/* Show highlighted snippets if available */}
                          {email._highlights?.subject ? (
                            <span dangerouslySetInnerHTML={{ __html: email._highlights.subject[0] }} />
                          ) : (
                            email.subject
                          )}
                        </div>
                        {email._highlights?.body && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                            <span dangerouslySetInnerHTML={{ __html: email._highlights.body[0] }} />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(email.receivedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </Combobox.Option>
                ))
              ) : query.length > 2 ? (
                <div className="relative cursor-default select-none px-4 py-3 text-slate-400">
                  No results found.
                </div>
              ) : (
                // Show suggestions when no query
                filteredSuggestions.map((suggestion) => (
                  <Combobox.Option
                    key={suggestion.id}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors duration-150 ${
                        active ? 'bg-blue-500/20 text-blue-300' : 'text-slate-300'
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
                            active ? 'bg-blue-400/20 text-blue-200' : 'bg-slate-700/50 text-slate-400'
                          }`}>
                            {suggestion.type}
                          </span>
                        </div>
                        {selected ? (
                          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? 'text-blue-300' : 'text-blue-400'
                          }`}>
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
};

export default SearchCombobox;
