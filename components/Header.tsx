
import React from 'react';
import { motion } from 'framer-motion';
import type { Page } from '../App';
import { useLanguage } from '../i18n';
import { BoxIcon, SettingsIcon } from './Icons';

interface HeaderProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  onOpenApiManager: () => void;
}

const Header: React.FC<HeaderProps> = ({ activePage, setActivePage, onOpenApiManager }) => {
  const { t } = useLanguage();

  return (
    <header className="bg-[#0A1F44]/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-black/20 border-b border-slate-700/50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top section: Title and Home Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activePage !== 'dashboard' && (
              <button
                onClick={() => setActivePage('dashboard')}
                className="group flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 hover:border-sky-500 transition-all duration-300 shadow-md"
                title="Quay lại trang chủ"
              >
                <div className="grid grid-cols-2 gap-1 w-5 h-5">
                    <div className="bg-current rounded-[1px]"></div>
                    <div className="bg-current rounded-[1px]"></div>
                    <div className="bg-current rounded-[1px]"></div>
                    <div className="bg-current rounded-[1px]"></div>
                </div>
              </button>
            )}
            
            <div 
              className="flex-shrink-0 cursor-pointer" 
              onClick={() => setActivePage('dashboard')}
            >
              <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-baseline select-none">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-fuchsia-500 filter drop-shadow-sm">
                  Study AI
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button
                onClick={onOpenApiManager}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs sm:text-sm font-medium"
             >
                <SettingsIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{t('header.apiManager')}</span>
             </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
