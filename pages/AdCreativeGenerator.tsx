import React, { useState, useRef } from 'react';
import { generateAdCreative, AspectRatio, ImageInput } from '../services/geminiService';
import { useLanguage } from '../i18n';
import { LoaderIcon, VideoIcon, UserIcon, ShirtIcon, DiamondIcon, AspectRatioSquareIcon, AspectRatioTallIcon, AspectRatioWideIcon, DownloadIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { Page } from '../App';
import TransferMenu from '../components/TransferMenu';
import ProgressBar from '../components/ProgressBar';

interface AdCreativeGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onOpenPreview: (url: string, onDownload: () => void) => void;
  onNavigate: (page: Page) => void;
  onEditImage: (image: { url: string; file: File }) => void;
}

type ImageState = { file: File | null; url: string | null };

const AdCreativeGenerator: React.FC<AdCreativeGeneratorProps> = ({
    isTrial,
    trialCreations,
    onTrialGenerate,
    onRequireLogin,
    onRequirePricing,
    onOpenPreview,
    onNavigate
}) => {
    const { t } = useLanguage();
    
    // State
    const [modelImage, setModelImage] = useState<ImageState>({ file: null, url: null });
    const [clothingImage, setClothingImage] = useState<ImageState>({ file: null, url: null });
    const [accessoryImage, setAccessoryImage] = useState<ImageState>({ file: null, url: null });

    const [userPrompt, setUserPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');

    const trialEnded = isTrial && trialCreations <= 0;

    const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
        { value: '9:16', label: t('common.tall'), icon: AspectRatioTallIcon },
        { value: '1:1', label: t('common.square'), icon: AspectRatioSquareIcon },
        { value: '16:9', label: t('common.wide'), icon: AspectRatioWideIcon },
    ];

    const handleFileSelect = (setter: React.Dispatch<React.SetStateAction<ImageState>>) => (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setter({ file, url: reader.result as string });
        };
        reader.readAsDataURL(file);
        setResultImage(null);
        setError(null);
    };

    const clearImage = (setter: React.Dispatch<React.SetStateAction<ImageState>>) => () => {
        setter({ file: null, url: null });
    };

    const fileToImageInput = (file: File): Promise<ImageInput> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                const [header, data] = result.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
                resolve({ base64: data, mimeType });
            };
            reader.onerror = error => reject(error);
        });
    };

    const handleGenerate = async () => {
        if (!modelImage.file && !clothingImage.file && !accessoryImage.file) {
            setError('Vui lòng tải lên ít nhất một hình ảnh (Người mẫu, Trang phục hoặc Phụ kiện).');
            return;
        }
        if (trialEnded) {
            setError(t('trialEnded.title'));
            return;
        }

        if (isTrial) onTrialGenerate();

        setLoading(true);
        setError(null);
        setResultImage(null);
        setProgress(0);
        setStatusText('Đang khởi tạo...');

        try {
            setProgress(10);
            setStatusText('Đang xử lý ảnh đầu vào...');
            
            const modelInput = modelImage.file ? await fileToImageInput(modelImage.file) : null;
            const clothingInput = clothingImage.file ? await fileToImageInput(clothingImage.file) : null;
            const accessoryInput = accessoryImage.file ? await fileToImageInput(accessoryImage.file) : null;

            setProgress(40);
            setStatusText('Đang tạo ảnh quảng cáo...');
            
            const results = await generateAdCreative(
                modelInput,
                clothingInput,
                accessoryInput,
                userPrompt,
                aspectRatio
            );

            if (results && results.length > 0) {
                setResultImage(results[0]);
                setProgress(100);
                setStatusText('Hoàn tất!');
                setTimeout(() => setLoading(false), 500);
            } else {
                throw new Error('Không có ảnh nào được tạo.');
            }

        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi khi tạo ảnh.');
            setLoading(false);
            setProgress(0);
            setStatusText('');
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `t-lab_ad_creative_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                    {t('nav.adCreative')}
                </h1>
                <p className="text-lg text-slate-400">
                    Tạo hình ảnh quảng cáo chuyên nghiệp từ hình ảnh sản phẩm và người mẫu của bạn.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
                {/* Controls */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 flex flex-col gap-6">
                    {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}

                    <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2">1. Tải ảnh lên (Chọn ít nhất 1)</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <ImageInputBox label="Người mẫu" imageState={modelImage} onFileSelect={handleFileSelect(setModelImage)} Icon={UserIcon} onClear={clearImage(setModelImage)} disabled={loading || trialEnded} />
                        <ImageInputBox label="Trang phục" imageState={clothingImage} onFileSelect={handleFileSelect(setClothingImage)} Icon={ShirtIcon} onClear={clearImage(setClothingImage)} disabled={loading || trialEnded} />
                        <ImageInputBox label="Phụ kiện" imageState={accessoryImage} onFileSelect={handleFileSelect(setAccessoryImage)} Icon={DiamondIcon} onClear={clearImage(setAccessoryImage)} disabled={loading || trialEnded} />
                    </div>

                    <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2 pt-2">2. Cấu hình</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('common.ratio')}</label>
                        <div className="flex items-center gap-2">
                             {aspectRatios.map(r => (
                                 <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${aspectRatio === r.value ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:bg-slate-700'}`} disabled={loading || trialEnded}>
                                     <r.icon className="w-4 h-4" />{r.label}
                                 </button>
                             ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Mô tả bối cảnh (Tùy chọn)</label>
                        <textarea 
                            value={userPrompt} 
                            onChange={e => setUserPrompt(e.target.value)} 
                            rows={3} 
                            placeholder="Ví dụ: Bối cảnh studio tối giản, ánh sáng ấm áp..." 
                            className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                            disabled={loading || trialEnded}
                        />
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-700/50">
                        <button onClick={handleGenerate} disabled={loading || trialEnded || (!modelImage.file && !clothingImage.file && !accessoryImage.file)}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 text-lg">
                            {loading ? <><LoaderIcon className="animate-spin mr-3" />Đang tạo...</> : <><VideoIcon className="mr-3" />Tạo quảng cáo</>}
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
                </div>

                {/* Result */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 flex flex-col items-center justify-center min-h-[500px]">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 self-start">{t('common.results')}</h2>
                    
                    {loading && (
                        <div className="w-full max-w-sm">
                            <ProgressBar progress={progress} statusText={statusText} accentColor="blue" />
                        </div>
                    )}

                    {!loading && resultImage && (
                        <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                             <img src={resultImage} alt="Result" className="max-h-[500px] w-auto object-contain rounded-lg shadow-lg border border-slate-600" onClick={() => onOpenPreview(resultImage, handleDownload)}/>
                             <div className="flex gap-2">
                                <button onClick={() => onOpenPreview(resultImage, handleDownload)} className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-md">
                                    <DownloadIcon className="w-5 h-5" /> {t('common.previewAndDownload')}
                                </button>
                                <TransferMenu imageUrl={resultImage} onNavigate={onNavigate} />
                             </div>
                        </div>
                    )}

                    {!loading && !resultImage && (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                            <VideoIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Kết quả sẽ hiển thị tại đây</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-component for inputs
const ImageInputBox: React.FC<{ label: string; imageState: ImageState; onFileSelect: (file: File) => void; Icon: React.FC<{className?: string}>; onClear: () => void; disabled: boolean }> = 
({ label, imageState, onFileSelect, Icon, onClear, disabled }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">{label}</span>
            <div 
                onClick={() => !disabled && inputRef.current?.click()}
                className={`w-full aspect-square border border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700 hover:border-blue-500'}`}
            >
                <input type="file" ref={inputRef} onChange={e => e.target.files?.[0] && onFileSelect(e.target.files[0])} accept="image/*" className="hidden" disabled={disabled} />
                {imageState.url ? (
                    <>
                        <img src={imageState.url} alt="Preview" className="w-full h-full object-cover" />
                        <button onClick={(e) => {e.stopPropagation(); onClear();}} className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-1 hover:bg-red-500"><div className="w-3 h-3 bg-white mask-close" /></button>
                    </>
                ) : (
                    <Icon className="w-8 h-8 text-slate-500" />
                )}
            </div>
        </div>
    );
};

export default AdCreativeGenerator;
