import React, { useState, useRef } from 'react';
import { editImageWithText, AspectRatio, ImageInput } from '../services/geminiService';
import { useLanguage } from '../i18n';
import { LoaderIcon, GlobeIcon, UploadIcon, DownloadIcon, AspectRatioSquareIcon, AspectRatioTallIcon, AspectRatioWideIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { Page } from '../App';
import TransferMenu from '../components/TransferMenu';
import ProgressBar from '../components/ProgressBar';

interface OnlineTravelGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onNavigate: (page: Page) => void;
}

const OnlineTravelGenerator: React.FC<OnlineTravelGeneratorProps> = ({
    isTrial,
    trialCreations,
    onTrialGenerate,
    onRequireLogin,
    onRequirePricing,
    onNavigate
}) => {
    const { t } = useLanguage();
    
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [customDestination, setCustomDestination] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const trialEnded = isTrial && trialCreations <= 0;

    const destinations = [
        { id: 'paris', name: 'Paris, France (Tháp Eiffel)', prompt: 'Place the subject in front of the Eiffel Tower in Paris, France. Romantic atmosphere, daytime.' },
        { id: 'tokyo', name: 'Tokyo, Japan (Đường phố đêm)', prompt: 'Place the subject in a vibrant street in Tokyo at night, with neon lights and bustling atmosphere.' },
        { id: 'bali', name: 'Bali, Indonesia (Bãi biển)', prompt: 'Place the subject on a beautiful beach in Bali, Indonesia. Tropical vibes, sunny day, turquoise water.' },
        { id: 'ny', name: 'New York, USA (Times Square)', prompt: 'Place the subject in Times Square, New York City. Busy urban background, billboards, daytime.' },
        { id: 'santorini', name: 'Santorini, Greece', prompt: 'Place the subject in Santorini, Greece, with white buildings and blue domes overlooking the sea.' }
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const reader = new FileReader();
            reader.onload = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(selected);
            setResultUrl(null);
            setError(null);
        }
    };

    const handleGenerate = async (destinationPrompt?: string) => {
        if (!file) {
            setError('Vui lòng tải ảnh lên trước.');
            return;
        }
        
        const promptToUse = destinationPrompt || customDestination;
        
        if (!promptToUse.trim()) {
            setError('Vui lòng chọn địa điểm hoặc nhập mô tả.');
            return;
        }

        if (trialEnded) {
            setError(t('trialEnded.title'));
            return;
        }

        if (isTrial) onTrialGenerate();

        setLoading(true);
        setError(null);
        setResultUrl(null);
        setProgress(0);
        setStatusText('Đang chuẩn bị hành lý...');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    const mimeType = file.type;
                    
                    setProgress(30);
                    setStatusText('Đang bay đến địa điểm...');
                    
                    const fullPrompt = `Change the background to: ${promptToUse}. ${additionalPrompt}. Maintain the subject perfectly. Photorealistic, high resolution.`;
                    
                    const result = await editImageWithText(base64, mimeType, fullPrompt);
                    
                    setProgress(100);
                    setStatusText('Đã đến nơi!');
                    setResultUrl(result);
                    setLoading(false);
                } catch (err: any) {
                    setError(err.message || 'Lỗi khi tạo ảnh.');
                    setLoading(false);
                }
            };
        } catch (err: any) {
             setError(err.message);
             setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!resultUrl) return;
        const link = document.createElement('a');
        link.href = resultUrl;
        link.download = `t-lab_travel_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
                    {t('nav.onlineTravel')}
                </h1>
                <p className="text-lg text-slate-400">
                    Du lịch vòng quanh thế giới ngay tại chỗ. Thay đổi bối cảnh ảnh của bạn đến bất kỳ đâu.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 flex flex-col gap-6">
                     {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
                     
                     {/* Upload */}
                     <div 
                        onClick={() => !loading && !trialEnded && fileInputRef.current?.click()}
                        className={`w-full aspect-video border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all ${loading || trialEnded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700 hover:border-emerald-500'}`}
                     >
                         <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={loading || trialEnded} />
                         {previewUrl ? (
                             <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                         ) : (
                             <>
                                <UploadIcon className="w-12 h-12 text-slate-400 mb-2" />
                                <p className="text-slate-300">Tải ảnh của bạn lên</p>
                             </>
                         )}
                     </div>

                     {/* Destinations */}
                     <div>
                         <h3 className="text-sm font-medium text-slate-300 mb-3">Chọn điểm đến phổ biến:</h3>
                         <div className="grid grid-cols-2 gap-2">
                             {destinations.map(dest => (
                                 <button
                                    key={dest.id}
                                    onClick={() => handleGenerate(dest.prompt)}
                                    disabled={loading || trialEnded || !file}
                                    className="bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300 py-2 px-3 rounded-md text-sm transition-colors text-left truncate disabled:opacity-50"
                                 >
                                     📍 {dest.name}
                                 </button>
                             ))}
                         </div>
                     </div>

                     {/* Custom */}
                     <div>
                         <label className="block text-sm font-medium text-slate-300 mb-2">Hoặc nhập địa điểm bất kỳ:</label>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={customDestination} 
                                onChange={(e) => setCustomDestination(e.target.value)}
                                placeholder="Ví dụ: Đỉnh núi Everest, Quảng trường Đỏ..."
                                className="flex-grow bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 text-sm"
                                disabled={loading || trialEnded}
                             />
                             <button 
                                onClick={() => handleGenerate()}
                                disabled={loading || trialEnded || !file || !customDestination}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                             >
                                 Đi!
                             </button>
                         </div>
                     </div>
                     
                     {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
                </div>

                <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[500px]">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 self-start">{t('common.results')}</h2>
                    
                    {loading && (
                        <div className="w-full max-w-sm">
                            <ProgressBar progress={progress} statusText={statusText} accentColor="emerald" />
                        </div>
                    )}
                    
                    {!loading && resultUrl && (
                        <div className="w-full flex flex-col items-center gap-4">
                             <img src={resultUrl} alt="Result" className="w-full max-h-[500px] object-contain rounded-lg shadow-lg border border-slate-600" />
                             <div className="flex gap-2">
                                <button onClick={handleDownload} className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-md">
                                    <DownloadIcon className="w-5 h-5" /> {t('common.previewAndDownload')}
                                </button>
                                <TransferMenu imageUrl={resultUrl} onNavigate={onNavigate} />
                             </div>
                        </div>
                    )}

                    {!loading && !resultUrl && (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                            <GlobeIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Ảnh check-in sẽ xuất hiện ở đây</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnlineTravelGenerator;
