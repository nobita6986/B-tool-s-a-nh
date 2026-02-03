import React, { useState } from 'react';
import { generateImageFromText, AspectRatio } from '../services/geminiService';
import { useLanguage } from '../i18n';
import { LoaderIcon, SparklesIcon, DownloadIcon, AspectRatioSquareIcon, AspectRatioTallIcon, AspectRatioWideIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { Page } from '../App';
import TransferMenu from '../components/TransferMenu';

interface TextToImageGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
  onNavigate: (page: Page) => void;
  onEditImage: (image: { url: string; file: File }) => void;
}

const TextToImageGenerator: React.FC<TextToImageGeneratorProps> = ({
  isTrial,
  trialCreations,
  onTrialGenerate,
  onRequireLogin,
  onRequirePricing,
  onOpenPreview,
  onNavigate,
  onEditImage
}) => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const trialEnded = isTrial && trialCreations <= 0;

  const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
    { value: '9:16', label: t('common.tall'), icon: AspectRatioTallIcon },
    { value: '1:1', label: t('common.square'), icon: AspectRatioSquareIcon },
    { value: '16:9', label: t('common.wide'), icon: AspectRatioWideIcon },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Vui lòng nhập mô tả cho hình ảnh.');
      return;
    }
    if (trialEnded) {
      setError(t('trialEnded.title'));
      return;
    }

    if (isTrial) onTrialGenerate(2); // Consume 2 credits for 2 images

    setLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generateImageFromText(prompt, aspectRatio, 2);
      setGeneratedImages(images);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tạo ảnh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `t-lab_generated_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const base64ToFile = async (base64: string, filename: string): Promise<File> => {
      const res = await fetch(base64);
      const blob = await res.blob();
      return new File([blob], filename, { type: blob.type });
  };

  const handleEdit = async (url: string) => {
      try {
          const file = await base64ToFile(url, 'generated_image.png');
          onEditImage({ url, file });
      } catch (e) {
          console.error("Failed to prepare image for editing", e);
      }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-500 mb-2">
          {t('textToImage.title')}
        </h1>
        <p className="text-lg text-slate-400">
          {t('textToImage.description')}
        </p>
      </div>

      <div className="w-full max-w-4xl">
         {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
         
         <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 mb-8">
            <div className="mb-6">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('textToImage.placeholder')}
                    className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-4 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all text-lg resize-none h-32"
                    disabled={loading || trialEnded}
                />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium mr-2">{t('common.ratio')}:</span>
                    <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                        {aspectRatios.map((ratio) => (
                            <button
                                key={ratio.value}
                                onClick={() => setAspectRatio(ratio.value)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                    aspectRatio === ratio.value
                                        ? 'bg-sky-500 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                                disabled={loading || trialEnded}
                            >
                                <ratio.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{ratio.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading || trialEnded || !prompt.trim()}
                    className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-bold py-3 px-8 rounded-lg hover:from-sky-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                    {loading ? (
                        <><LoaderIcon className="animate-spin mr-2" /> {t('common.processing')}...</>
                    ) : (
                        <><SparklesIcon className="mr-2" /> {t('textToImage.generateButton')}</>
                    )}
                </button>
            </div>
            {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
         </div>

         {/* Results Area */}
         {(loading || generatedImages.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                     // Loading Skeletons
                     <>
                        <div className="aspect-[9/16] bg-slate-800/50 rounded-xl animate-pulse border border-slate-700 flex items-center justify-center">
                             <LoaderIcon className="w-10 h-10 text-slate-600 animate-spin" />
                        </div>
                        <div className="aspect-[9/16] bg-slate-800/50 rounded-xl animate-pulse border border-slate-700 flex items-center justify-center">
                             <LoaderIcon className="w-10 h-10 text-slate-600 animate-spin" />
                        </div>
                     </>
                ) : (
                    generatedImages.map((imgUrl, index) => (
                        <div key={index} className="group relative bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-sky-500/20 transition-all duration-300">
                             <img 
                                src={imgUrl} 
                                alt={`Generated ${index + 1}`} 
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => onOpenPreview(imgUrl, () => handleDownload(imgUrl))}
                             />
                             <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-between">
                                 <button 
                                    onClick={() => handleDownload(imgUrl)}
                                    className="text-white hover:text-sky-300 transition-colors p-2"
                                    title={t('common.previewAndDownload')}
                                 >
                                     <DownloadIcon className="w-5 h-5" />
                                 </button>
                                 <div className="flex items-center gap-2">
                                     <TransferMenu imageUrl={imgUrl} onNavigate={onNavigate} />
                                 </div>
                             </div>
                        </div>
                    ))
                )}
            </div>
         )}
         
         {!loading && generatedImages.length === 0 && !error && (
             <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-700">
                 <SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                 <p>{t('textToImage.resultsPlaceholder')}</p>
             </div>
         )}
      </div>
    </div>
  );
};

export default TextToImageGenerator;
