import React, { useState } from 'react';
import { generateVideoScript, VideoScript, AspectRatio } from '../services/geminiService';
import { useLanguage } from '../i18n';
import { LoaderIcon, VideoIcon, CopyIcon, FileTextIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import ImageInputBox from '../components/ImageInputBox'; // Assuming this helper exists or I should inline it. I will inline a simple one.

interface VideoIdeaGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
}

const VideoIdeaGenerator: React.FC<VideoIdeaGeneratorProps> = ({
  isTrial,
  trialCreations,
  onTrialGenerate,
  onRequireLogin,
  onRequirePricing
}) => {
    const { t } = useLanguage();
    
    // Inputs
    const [productName, setProductName] = useState('');
    const [productInfo, setProductInfo] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [durations] = useState(['3 scenes', '5 scenes', '7 scenes']);
    const [duration, setDuration] = useState(durations[1]);
    const [cta, setCta] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [productImage, setProductImage] = useState<{file: File | null, url: string | null}>({file: null, url: null});

    // Result states
    const [script, setScript] = useState<VideoScript | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const trialEnded = isTrial && trialCreations <= 0;

    const handleGenerate = async () => {
        if (!productName || !productInfo || !targetAudience || !cta) {
            setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
            return;
        }
        if (trialEnded) { setError(t('trialEnded.title')); return; }

        if (isTrial) onTrialGenerate();
        setLoading(true);
        setError(null);
        setScript(null);

        try {
             // Convert image to simple format for service if needed
             const imgs = productImage.file ? [await fileToImageInput(productImage.file)] : [];
             
             const result = await generateVideoScript(
                 imgs,
                 productName,
                 productInfo,
                 "General", // Industry
                 "Professional & Engaging", // Brand Tone
                 targetAudience,
                 duration,
                 cta
             );
             setScript(result);
        } catch (err: any) {
            setError(err.message || 'Lỗi khi tạo kịch bản.');
        } finally {
            setLoading(false);
        }
    };
    
    // Helper
    const fileToImageInput = (file: File) => {
        return new Promise<any>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                 const base64 = (reader.result as string).split(',')[1];
                 const mimeType = file.type;
                 resolve({ base64, mimeType });
            };
            reader.onerror = reject;
        });
    };

    const handleFileSelect = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => setProductImage({ file, url: reader.result as string });
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
                    Lên Ý Tưởng Video
                </h1>
                <p className="text-lg text-slate-400">
                    AI Scriptwriter: Tự động tạo kịch bản video TikTok/Shorts/Reels hấp dẫn.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
                 {/* Input Form */}
                 <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 space-y-4">
                     {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
                     
                     {/* Image Upload using inline logic */}
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Ảnh sản phẩm (Tùy chọn - Giúp AI hiểu rõ hơn)</label>
                        <div 
                            className="w-full h-32 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-700 transition-colors relative"
                            onClick={() => document.getElementById('vid-img-upload')?.click()}
                        >
                             <input type="file" id="vid-img-upload" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} accept="image/*" />
                             {productImage.url ? (
                                 <img src={productImage.url} className="h-full object-contain" />
                             ) : (
                                 <span className="text-slate-400 text-sm">Tải ảnh lên</span>
                             )}
                        </div>
                     </div>

                     <div>
                         <label className="block text-sm font-medium text-slate-300">Tên sản phẩm *</label>
                         <input className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2" value={productName} onChange={e => setProductName(e.target.value)} />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-300">Thông tin chi tiết *</label>
                         <textarea className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 h-24" value={productInfo} onChange={e => setProductInfo(e.target.value)} />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-300">Đối tượng khách hàng *</label>
                         <input className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2" value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300">Độ dài</label>
                            <select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2" value={duration} onChange={e => setDuration(e.target.value)}>
                                {durations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-300">CTA (Kêu gọi) *</label>
                             <input className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2" value={cta} onChange={e => setCta(e.target.value)} />
                        </div>
                     </div>
                     
                     <button onClick={handleGenerate} disabled={loading || trialEnded} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg">
                         {loading ? <LoaderIcon className="animate-spin inline mr-2" /> : <FileTextIcon className="inline mr-2" />} Tạo Kịch Bản
                     </button>
                     {error && <p className="text-red-400 text-center">{error}</p>}
                 </div>

                 {/* Result Script */}
                 <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6 min-h-[500px] overflow-y-auto custom-scrollbar">
                     {!script && !loading && (
                         <div className="h-full flex flex-col items-center justify-center text-slate-500">
                             <VideoIcon className="w-16 h-16 mb-4 opacity-20" />
                             <p>Kịch bản sẽ xuất hiện ở đây</p>
                         </div>
                     )}
                     {loading && (
                         <div className="h-full flex items-center justify-center">
                             <LoaderIcon className="w-12 h-12 animate-spin text-pink-500" />
                         </div>
                     )}
                     {script && (
                         <div className="space-y-6">
                             <div className="border-b border-slate-700 pb-4">
                                 <h2 className="text-2xl font-bold text-white mb-2">{script.title}</h2>
                                 <p className="text-slate-400 italic">{script.summary}</p>
                             </div>
                             
                             <div className="space-y-4">
                                 {script.scenes.map((scene) => (
                                     <div key={scene.scene_number} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                         <h3 className="text-pink-400 font-bold mb-2">Cảnh {scene.scene_number}</h3>
                                         <div className="grid grid-cols-1 gap-3">
                                             <div>
                                                 <span className="text-xs text-slate-500 uppercase font-bold">Hình ảnh (Visuals)</span>
                                                 <p className="text-slate-300 text-sm mt-1">{scene.visuals}</p>
                                             </div>
                                             <div>
                                                 <span className="text-xs text-slate-500 uppercase font-bold">Lời thoại (Voiceover)</span>
                                                 <p className="text-white text-md mt-1 font-medium">"{scene.voiceover}"</p>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>
            </div>
        </div>
    );
};

export default VideoIdeaGenerator;
