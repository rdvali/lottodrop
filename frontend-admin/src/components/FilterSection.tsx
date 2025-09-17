// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useDebounce } from '../hooks/useDebounce';
import './FilterSection.css';

// Icon Components
const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 12,15 18,9"/>
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18"/>
    <path d="M6 6l12 12"/>
  </svg>
);

// Filter Types
export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

export interface NumericRangeFilter {
  min: string;
  max: string;
}

export interface FilterField {
  type: 'text' | 'select' | 'dateRange' | 'numericRange' | 'boolean';
  key: string;
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string; count?: number }>;
  value?: any;
}

export interface FilterConfig {
  fields: FilterField[];
  onFilterChange: (filters: Record<string, any>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}

// Memoized text input component to prevent focus loss
const TextFilterInput = memo(({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: string; 
  onChange: (key: string, value: string) => void;
}) => (
  <div className="filter-field">
    <label className="filter-label">{field.label}</label>
    <input
      type="text"
      className="filter-input"
      placeholder={field.placeholder}
      value={value}
      onChange={(e) => onChange(field.key, e.target.value)}
      autoComplete="off"
    />
  </div>
));

const FilterSection: React.FC<FilterConfig> = ({
  fields,
  onFilterChange,
  onClearFilters,
  activeFilterCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>(() => {
    // Initialize filters from field values on mount
    const initialFilters: Record<string, any> = {};
    fields.forEach(field => {
      if (field.value !== undefined) {
        initialFilters[field.key] = field.value;
      }
    });
    return initialFilters;
  });
  const [localTextValues, setLocalTextValues] = useState<Record<string, string>>(() => {
    // Initialize text values from field values on mount
    const initialTextValues: Record<string, string> = {};
    fields.forEach(field => {
      if (field.type === 'text' && field.value !== undefined) {
        initialTextValues[field.key] = field.value || '';
      }
    });
    return initialTextValues;
  });
  const [shouldTriggerChange, setShouldTriggerChange] = useState(false);
  
  // Debounce text inputs to avoid excessive API calls
  const debouncedTextValues = useDebounce(localTextValues, 500);

  // Handle debounced text changes
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }
    
    setFilters(prev => {
      const updatedFilters = { ...prev };
      let hasChanges = false;
      
      Object.entries(debouncedTextValues).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
          if (updatedFilters[key] !== undefined) {
            delete updatedFilters[key];
            hasChanges = true;
          }
        } else if (updatedFilters[key] !== value) {
          updatedFilters[key] = value;
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        setShouldTriggerChange(true);
        return updatedFilters;
      }
      return prev;
    });
  }, [debouncedTextValues, isInitialized]);
  
  // Trigger onFilterChange after state update
  useEffect(() => {
    if (shouldTriggerChange) {
      onFilterChange(filters);
      setShouldTriggerChange(false);
    }
  }, [shouldTriggerChange, filters, onFilterChange]);

  const handleFilterChange = useCallback((key: string, value: any) => {
    // Handle text inputs separately for debouncing
    if (fields.find(f => f.key === key)?.type === 'text') {
      setLocalTextValues(prev => ({ ...prev, [key]: value }));
      return;
    }
    
    setFilters(prev => {
      const updatedFilters = { ...prev, [key]: value };
      
      // Remove empty values
      if (value === '' || value === null || value === undefined || 
          (typeof value === 'object' && Object.values(value).every(v => v === ''))) {
        delete updatedFilters[key];
      }
      
      return updatedFilters;
    });
    setShouldTriggerChange(true);
  }, [fields]);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setLocalTextValues({});
    onClearFilters();
  }, [onClearFilters]);

  const renderFilterField = useCallback((field: FilterField) => {
    // Use local text values for text inputs, filters for others
    const value = field.type === 'text' 
      ? (localTextValues[field.key] || '') 
      : (filters[field.key] || '');

    switch (field.type) {
      case 'text':
        return (
          <TextFilterInput
            key={field.key}
            field={field}
            value={value}
            onChange={handleFilterChange}
          />
        );

      case 'select':
        return (
          <div className="filter-field" key={field.key}>
            <label className="filter-label">{field.label}</label>
            <select
              className="filter-select"
              value={value}
              onChange={(e) => handleFilterChange(field.key, e.target.value)}
            >
              <option value="">All</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.count !== undefined && `(${option.count})`}
                </option>
              ))}
            </select>
          </div>
        );

      case 'boolean':
        return (
          <div className="filter-field" key={field.key}>
            <label className="filter-label">{field.label}</label>
            <select
              className="filter-select"
              value={value}
              onChange={(e) => handleFilterChange(field.key, e.target.value)}
            >
              <option value="">All</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'dateRange':
        const dateValue = value as DateRangeFilter || { startDate: '', endDate: '' };
        return (
          <div className="filter-field filter-field-range" key={field.key}>
            <label className="filter-label">{field.label}</label>
            <div className="filter-range-inputs">
              <input
                type="date"
                className="filter-input filter-input-sm"
                placeholder="Start Date"
                value={dateValue.startDate}
                onChange={(e) => handleFilterChange(field.key, {
                  ...dateValue,
                  startDate: e.target.value
                })}
              />
              <span className="filter-range-separator">to</span>
              <input
                type="date"
                className="filter-input filter-input-sm"
                placeholder="End Date"
                value={dateValue.endDate}
                onChange={(e) => handleFilterChange(field.key, {
                  ...dateValue,
                  endDate: e.target.value
                })}
              />
            </div>
          </div>
        );

      case 'numericRange':
        const numericValue = value as NumericRangeFilter || { min: '', max: '' };
        return (
          <div className="filter-field filter-field-range" key={field.key}>
            <label className="filter-label">{field.label}</label>
            <div className="filter-range-inputs">
              <input
                type="number"
                className="filter-input filter-input-sm"
                placeholder="Min"
                value={numericValue.min}
                onChange={(e) => handleFilterChange(field.key, {
                  ...numericValue,
                  min: e.target.value
                })}
              />
              <span className="filter-range-separator">to</span>
              <input
                type="number"
                className="filter-input filter-input-sm"
                placeholder="Max"
                value={numericValue.max}
                onChange={(e) => handleFilterChange(field.key, {
                  ...numericValue,
                  max: e.target.value
                })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [localTextValues, filters, handleFilterChange]);

  // Separate search field from other filters
  const searchField = useMemo(() => 
    fields.find(f => f.type === 'text' && (f.key === 'search' || f.key === 'searchTerm' || f.key.toLowerCase().includes('search'))),
    [fields]
  );
  const otherFields = useMemo(() => 
    fields.filter(f => f !== searchField),
    [fields, searchField]
  );

  return (
    <div className="filter-section">
      <div className="filter-header">
        {/* Always visible search input */}
        {searchField && (
          <div className="filter-search-wrapper">
            <div className="filter-search-container">
              <SearchIcon className="filter-search-icon" />
              {renderFilterField(searchField)}
            </div>
          </div>
        )}
        
        <button
          className={`filter-toggle ${isExpanded ? 'filter-toggle-expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <FilterIcon className="filter-toggle-icon" />
          <span>More Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-count-badge">{activeFilterCount}</span>
          )}
          <ChevronDownIcon className="filter-chevron" />
        </button>
        
        {activeFilterCount > 0 && (
          <button className="filter-clear-button" onClick={handleClearFilters}>
            <XIcon className="filter-clear-icon" />
            Clear All
          </button>
        )}
      </div>

      {otherFields.length > 0 && (
        <div className={`filter-content ${isExpanded ? 'filter-content-expanded' : ''}`}>
          <div className="filter-grid">
            {otherFields.map(renderFilterField)}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSection;