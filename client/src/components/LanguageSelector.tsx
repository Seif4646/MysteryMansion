import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'العربية' },
    { code: 'pl', name: 'Polski' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
    // Save language preference
    localStorage.setItem('i18nextLng', code);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center bg-surface px-3 py-2 rounded-md text-textLight"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="material-icons mr-1">language</span>
        <span className="mx-1">{currentLanguage.name}</span>
        <span className="material-icons">arrow_drop_down</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 bg-surface shadow-lg rounded-md overflow-hidden z-50">
          {languages.map(lang => (
            <button
              key={lang.code}
              className="w-full px-4 py-2 text-left hover:bg-primary transition-colors text-textLight"
              onClick={() => changeLanguage(lang.code)}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
