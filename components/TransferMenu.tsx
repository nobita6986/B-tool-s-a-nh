import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n';
import { ShareIcon, ChevronDownIcon, ShirtIcon, VideoIcon, GlobeIcon, EditIcon, CameraIcon } from './Icons';
import type { Page } from '../App';

interface TransferMenuProps {
  imageUrl: string;
  onNavigate: (page: Page) => void;
}

const TransferMenu: React.FC<TransferMenuProps> = ({ imageUrl, onNavigate }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const tools: { id: Page; label: string; icon: React.FC<{className?: string}> }[] = [
    { id: 'imageEditor', label: t('nav.imageEditor'), icon: EditIcon },
    { id: 'fashionStudio', label: t('nav.fashionStudio'), icon: ShirtIcon },
    { id: 'onlineTravel', label: t('nav.onlineTravel'), icon: GlobeIcon },
    { id: 'adCreative', label: t('nav.adCreative'), icon: VideoIcon },
    { id: 'productPhotoshoot', label: t('nav.productPhotoshoot'), icon: CameraIcon },
  ];

  const handleTransfer = (target: Page) => {
    // Save the image data to localStorage for retrieval by the target page
    try {
        localStorage.setItem('tlab-transfer-image', JSON.stringify({
            image: imageUrl,
            target: target,
            timestamp: Date.now()
        }));
        onNavigate(target);
    } catch (e) {
        console.error("Failed to save transfer image to localStorage", e);
        alert("Ảnh quá lớn để chuyển trực tiếp. Vui lòng tải về và tải lên thủ công.");
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex justify-center w-full rounded-md border border-slate-600 shadow-sm px-3 py-2 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition-colors"
          id="menu-button"
          aria-expanded="true"
          aria-haspopup="true"
        >
          {t('common.transferTo')}
          <ChevronDownIcon className="-mr-1 ml-2 h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="origin-top-right absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-slate-700"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
          >
            <div className="py-1" role="none">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleTransfer(tool.id)}
                  className="group flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                  role="menuitem"
                >
                  <tool.icon className="mr-3 h-4 w-4 text-slate-400 group-hover:text-white" />
                  {tool.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
      )}
    </div>
  );
};

export default TransferMenu;
