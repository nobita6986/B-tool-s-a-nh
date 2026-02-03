
import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../i18n';
import { 
  ShirtIcon, 
  VideoIcon, 
  GlobeIcon, 
  SparklesIcon, 
  EditIcon,
  MagicWandIcon
} from './Icons';
import type { Page } from '../App';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  const tools = [
    {
      id: 'fashionStudio',
      icon: ShirtIcon,
      color: 'from-purple-500 to-pink-500',
      titleKey: 'nav.fashionStudio',
      descKey: 'fashionStudio.description'
    },
    {
      id: 'adCreative',
      icon: VideoIcon, // Using VideoIcon as placeholder for Ad Creative visual
      color: 'from-blue-400 to-emerald-400',
      titleKey: 'nav.adCreative',
      descKey: 'videoIdea.description' // Reusing description or adding new one
    },
    {
      id: 'onlineTravel',
      icon: GlobeIcon,
      color: 'from-emerald-400 to-cyan-500',
      titleKey: 'nav.onlineTravel',
      descKey: 'videoIdea.description' // Placeholder description
    },
    {
      id: 'textToImage',
      icon: SparklesIcon,
      color: 'from-sky-400 to-emerald-500',
      titleKey: 'nav.textToImage',
      descKey: 'textToImage.description'
    },
    {
      id: 'imageEditor',
      icon: EditIcon,
      color: 'from-fuchsia-500 to-indigo-500',
      titleKey: 'nav.imageEditor',
      descKey: 'imageEditor.description'
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-fuchsia-500 to-amber-400 mb-6 pb-2 leading-tight">
          {t('header.tagline')}
        </h2>
        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
          Chọn một công cụ bên dưới để bắt đầu sáng tạo. Bạn có thể chuyển đổi giữa các công cụ mà không làm mất kết quả hiện tại.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.map((tool) => (
          <motion.div
            key={tool.id}
            whileHover={{ scale: 1.03, translateY: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
                // @ts-ignore
                if (tool.toolAction) {
                    // Set the active tool preference for ImageEditor
                    // @ts-ignore
                    localStorage.setItem('tlab-ImageEditor-state', JSON.stringify({ activeTool: tool.toolAction }));
                    // Dispatch event to notify ImageEditor if it's already mounted/hidden
                    // @ts-ignore
                    window.dispatchEvent(new CustomEvent('tlab-tool-change', { detail: tool.toolAction }));
                }
                // @ts-ignore
                onNavigate((tool.targetPage || tool.id) as Page);
            }}
            className="group relative bg-slate-800/40 border border-slate-700 hover:border-slate-500 rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-300 shadow-xl hover:shadow-2xl"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            
            <div className="relative z-10 flex flex-col items-center text-center h-full">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${tool.color} bg-opacity-20 mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                <tool.icon className="w-10 h-10 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-100 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-colors">
                {t(tool.titleKey)}
              </h3>
              
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                {t(tool.descKey)}
              </p>
              
              <div className="mt-auto">
                <span className="inline-flex items-center text-sm font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
                  Mở công cụ <MagicWandIcon className="w-4 h-4 ml-2" />
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
