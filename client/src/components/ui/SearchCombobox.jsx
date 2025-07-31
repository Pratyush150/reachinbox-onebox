import React, { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';

const SearchCombobox = ({ onSearch, placeholder = "Search emails..." }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

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

  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="relative">
      <Combobox value={selected} onChange={setSelected}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-transparent transition-all duration-200">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Combobox.Input
              className="w-full border-none py-3 pl-10 pr-10 text-white placeholder-slate-400 bg-transparent focus:ring-0 focus:outline-none"
              displayValue={(item) => item?.name || query}
              onChange={handleInputChange}
              placeholder={placeholder}
            />
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
            <Combobox.Options className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl bg-slate-800/90 border border-slate-700/50 backdrop-blur-sm shadow-lg ring-1 ring-black/5 focus:outline-none">
              {filteredSuggestions.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none px-4 py-3 text-slate-400">
                  No results found.
                </div>
              ) : (
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
