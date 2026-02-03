import React, { useState, useRef } from 'react';
import { generateProductPhotoshoot, AspectRatio } from '../services/geminiService';
import { useLanguage } from '../i18n';
import { LoaderIcon, CameraIcon, UploadIcon, DownloadIcon, AspectRatioSquareIcon, AspectRatioTallIcon, AspectRatioWideIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { Page } from '../App';
import TransferMenu from '../components/TransferMenu';
import ProgressBar from '../components/ProgressBar';

interface ProductPhotoshootGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
  onNavigate: (page: Page) => void;
}

const ProductPhotoshootGenerator: React.FC<ProductPhotoshootGeneratorProps> = ({
    isTrial,
    trialCreations,
    onTrialGenerate,
    onRequireLogin,
    onRequirePricing,
    onOpenPreview,
    onNavigate
}) => {
    const { t } = useLanguage();
    
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [scenePrompt, setScenePrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [statusText, setStatusText] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const trialEnded = isTrial && trialCreations <= 0;

    const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
        { value: '9:16', label: t('common.tall'), icon: AspectRatioTallIcon },
        { value: '1:1', label: t('common.square'), icon: AspectRatioSquareIcon },
        { value: '16:9', label: t('common.wide'), icon: AspectRatioWideIcon },
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

    const handleGenerate = async () => {
        if (!file) { setError('Vui lòng tải ảnh sản phẩm lên.'); return; }
        if (!scenePrompt.trim()) { setError('Vui lòng mô tả bối cảnh.'); return; }
        if (trialEnded) { setError(t('trialEnded.title')); return; }

        if (isTrial) onTrialGenerate();

        setLoading(true);
        setError(null);
        setResultUrl(null);
        setProgress(0);
        setStatusText('Đang chuẩn bị studio...');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    const mimeType = file.type;
                    
                    setProgress(20);
                    setStatusText('Đang tách nền và phân tích sản phẩm...');
                    
                    // We call generateProductPhotoshoot which handles background removal and scene generation
                    const results = await generateProductPhotoshoot(
                        { base64, mimeType },
                        scenePrompt,
                        aspectRatio,
                        1
                    );
                    
                    setProgress(100);
                    setStatusText('Chụp ảnh hoàn tất!');
                    setResultUrl(results[0]);
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
        link.download = `t-lab_product_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col items-center">
             <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 mb-2">
                    {t('nav.productPhotoshoot')}
                </h1>
                <p className="text-lg text-slate-400">
                    Tạo ảnh sản phẩm chuyên nghiệp với studio ảo.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
                 <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 flex flex-col gap-6">
                    {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
                    
                    {/* Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">1. Tải ảnh sản phẩm gốc</label>
                        <div 
                            onClick={() => !loading && !trialEnded && fileInputRef.current?.click()}
                            className={`w-full aspect-square border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all ${loading || trialEnded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700 hover:border-orange-500'}`}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={loading || trialEnded} />
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-4" />
                            ) : (
                                <>
                                    <UploadIcon className="w-12 h-12 text-slate-400 mb-2" />
                                    <p className="text-slate-300">Nhấn để tải ảnh</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">2. Cấu hình chụp</label>
                        <div className="mb-4">
                            <span className="text-xs text-slate-400 block mb-1">Tỷ lệ khung hình</span>
                            <div className="flex gap-2">
                                {aspectRatios.map(r => (
                                    <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${aspectRatio === r.value ? 'bg-orange-600/20 border-orange-500 text-orange-300' : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:bg-slate-700'}`} disabled={loading || trialEnded}>
                                        <r.icon className="w-4 h-4" />{r.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                             <span className="text-xs text-slate-400 block mb-1">Mô tả bối cảnh (Prompt)</span>
                             <textarea 
                                value={scenePrompt} 
                                onChange={e => setScenePrompt(e.target.value)}
                                placeholder="Ví dụ: Đặt sản phẩm trên bàn gỗ, ánh sáng tự nhiên buổi sáng, có bóng đổ nhẹ..."
                                className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 text-sm resize-none h-24"
                                disabled={loading || trialEnded}
                             />
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-700/50">
                        <button onClick={handleGenerate} disabled={loading || trialEnded || !file || !scenePrompt.trim()}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-orange-500/30 disabled:opacity-50 text-lg">
                            {loading ? <><LoaderIcon className="animate-spin mr-3" />Đang chụp...</> : <><CameraIcon className="mr-3" />Chụp ảnh</>}
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
                 </div>

                 <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[500px]">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400 mb-4 self-start">{t('common.results')}</h2>
                    
                    {loading && (
                        <div className="w-full max-w-sm">
                            <ProgressBar progress={progress} statusText={statusText} accentColor="amber" />
                        </div>
                    )}
                    
                    {!loading && resultUrl && (
                        <div className="w-full flex flex-col items-center gap-4">
                             <img src={resultUrl} alt="Result" className="w-full max-h-[500px] object-contain rounded-lg shadow-lg border border-slate-600" onClick={() => onOpenPreview(resultUrl, handleDownload)} />
                             <div className="flex gap-2">
                                <button onClick={() => onOpenPreview(resultUrl, handleDownload)} className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-md">
                                    <DownloadIcon className="w-5 h-5" /> {t('common.previewAndDownload')}
                                </button>
                                <TransferMenu imageUrl={resultUrl} onNavigate={onNavigate} />
                             </div>
                        </div>
                    )}

                    {!loading && !resultUrl && (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                            <CameraIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Ảnh sản phẩm sẽ xuất hiện ở đây</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default ProductPhotoshootGenerator;
