import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadIcon, EyeIcon, CloseIcon } from './Icons';
import { useLanguage } from '../i18n';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onDownload: (() => void) | null;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, onDownload }) => {
  const { t } = useLanguage();

  if (!imageUrl) return null;

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <EyeIcon className="w-5 h-5 text-sky-400" />
                    {t('common.previewAndDownload')}
                </h2>
                <button 
                    onClick={onClose}
                    className="text-slate-400 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded-lg"
                    aria-label={t('common.close')}
                >
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 overflow-hidden bg-black/50 relative flex items-center justify-center p-4">
                <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-[65vh] object-contain rounded shadow-lg" 
                />
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-end gap-3">
               <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm border border-transparent hover:border-slate-600"
                >
                  {t('common.close')}
                </button>
               <button
                  onClick={handleDownloadClick}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-sky-500/20 text-sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                  {t('common.previewAndDownload')}
                </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImagePreviewModal;
