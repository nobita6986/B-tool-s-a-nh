
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloseIcon, 
  KeyIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  LoaderIcon, 
  PowerIcon,
  SettingsIcon 
} from './Icons';
import { useLanguage } from '../i18n';
import { 
  getKeys, 
  addKey, 
  removeKey, 
  toggleKeyActive, 
  ApiKeyConfig,
  getModelConfig,
  saveModelConfig,
  ModelConfig,
  AVAILABLE_MODELS
} from '../services/apiKeyService';

interface ApiManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiManager: React.FC<ApiManagerProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [newKey, setNewKey] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [validationMsg, setValidationMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  // Model Config State
  const [modelConfig, setModelConfig] = useState<ModelConfig>(getModelConfig());

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = () => {
    setKeys(getKeys());
    setModelConfig(getModelConfig());
  };

  const handleAddKey = async () => {
    if (!newKey.trim()) return;
    setIsAdding(true);
    setValidationMsg(null);
    
    try {
      const isValid = await addKey(newKey.trim());
      if (isValid) {
        setValidationMsg({ text: t('apiManager.validationSuccess'), type: 'success' });
        setNewKey('');
        loadData();
      } else {
        setValidationMsg({ text: t('apiManager.validationFailed'), type: 'error' });
      }
    } catch (e) {
      setValidationMsg({ text: t('apiManager.validationFailed'), type: 'error' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (key: string) => {
    removeKey(key);
    loadData();
  };

  const handleToggle = (key: string) => {
    toggleKeyActive(key);
    loadData();
  };

  const handleModelChange = (field: keyof ModelConfig, value: string) => {
    const newConfig = { ...modelConfig, [field]: value };
    setModelConfig(newConfig);
    saveModelConfig(newConfig);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg">
                  <KeyIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{t('apiManager.title')}</h2>
                  <p className="text-xs text-slate-400">{t('apiManager.description')}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              
              {/* Add Key Section */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={t('apiManager.addKeyPlaceholder')}
                    className="flex-grow bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                  />
                  <button
                    onClick={handleAddKey}
                    disabled={isAdding || !newKey.trim()}
                    className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold px-6 py-2.5 rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isAdding ? <LoaderIcon className="animate-spin w-5 h-5" /> : t('apiManager.addButton')}
                  </button>
                </div>
                {validationMsg && (
                  <p className={`text-sm ${validationMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {validationMsg.text}
                  </p>
                )}
              </div>

              {/* Key List */}
              <div className="bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 font-semibold text-slate-300 text-sm">
                  Danh sách Key ({keys.length})
                </div>
                {keys.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    {t('apiManager.noKeys')}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {keys.map((k) => (
                      <div key={k.key} className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${k.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div className="flex flex-col">
                            <span className="font-mono text-sm text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">
                              {k.key.substring(0, 8)}...{k.key.substring(k.key.length - 6)}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${k.isActive ? 'bg-green-900/50 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {k.isActive ? t('apiManager.active') : t('apiManager.inactive')}
                                </span>
                                {k.errorCount > 0 && (
                                    <span className="text-[10px] text-red-400">Errors: {k.errorCount}</span>
                                )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(k.key)}
                            className={`p-2 rounded-lg transition-colors ${k.isActive ? 'text-green-400 hover:bg-green-900/20' : 'text-slate-500 hover:bg-slate-700'}`}
                            title={k.isActive ? "Deactivate" : "Activate"}
                          >
                            <PowerIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(k.key)}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Model Configuration */}
              <div className="bg-slate-800/30 rounded-xl border border-slate-700 p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <SettingsIcon className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-bold text-slate-200">{t('apiManager.modelConfigTitle')}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('apiManager.textModel')}</label>
                        <select 
                            value={modelConfig.textModel} 
                            onChange={(e) => handleModelChange('textModel', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                            {AVAILABLE_MODELS.text.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('apiManager.imageGenModel')}</label>
                        <select 
                            value={modelConfig.imageGenModel} 
                            onChange={(e) => handleModelChange('imageGenModel', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                            {AVAILABLE_MODELS.imageGen.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('apiManager.imageEditModel')}</label>
                        <select 
                            value={modelConfig.imageEditModel} 
                            onChange={(e) => handleModelChange('imageEditModel', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        >
                            {AVAILABLE_MODELS.imageEdit.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApiManager;
