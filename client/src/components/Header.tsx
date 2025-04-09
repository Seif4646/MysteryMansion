import LanguageSelector from './LanguageSelector';
import { useTranslation } from 'react-i18next';

type HeaderProps = {
  showLanguageSelector?: boolean;
};

const Header = ({ showLanguageSelector = true }: HeaderProps) => {
  const { t } = useTranslation();
  
  return (
    <header className="bg-primary py-3 px-4 shadow-md flex justify-between items-center">
      <div className="flex items-center">
        <h1 className="font-heading text-2xl md:text-3xl text-secondary font-bold">
          {t('appName')}
        </h1>
      </div>
      
      {showLanguageSelector && <LanguageSelector />}
    </header>
  );
};

export default Header;
