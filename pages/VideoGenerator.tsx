import React, { useState } from 'react';
import { startVideoGeneration, pollVideoGeneration, AspectRatio, VideoStyle } from '../services/geminiService';
import { useLanguage } from '../i18n';
import { LoaderIcon, VideoIcon, AspectRatioSquareIcon, AspectRatioTallIcon, AspectRatioWideIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';

interface VideoGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  isTrial,
  trialCreations,
  onTrialGenerate,
  onRequireLogin,
  onRequirePricing
}) => {
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState<string>('');
    const [style, setStyle] = useState<VideoStyle>('Mặc định');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [statusText, setStatusText] = useState<string>('');

    const trialEnded = isTrial && trialCreations <= 0;

    const styles: VideoStyle[] = ['Mặc định', 'Điện ảnh', 'Sống động', 'Tối giản'];
    const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
        { value: '9:16', label: t('common.tall'), icon: AspectRatioTallIcon },
        { value: '16:9', label: t('common.wide'), icon: AspectRatioWideIcon },
    ];

    const handleGenerate = async () => {
        if (!prompt.trim()) { setError('Vui lòng nhập mô tả video.'); return; }
        if (trialEnded) { setError(t('trialEnded.title')); return; }

        if (isTrial) onTrialGenerate(5); // Videos are expensive

        setLoading(true);
        setError(null);
        setVideoUrl(null);
        setStatusText('Đang gửi yêu cầu tới Veo...');

        try {
            let operation = await startVideoGeneration(prompt, style, aspectRatio, null);
            
            setStatusText('Veo đang tạo video (có thể mất 1-2 phút)...');
            
            // Poll for completion
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await pollVideoGeneration(operation);
            }

            if (operation.error) {
                throw new Error(operation.error.message || 'Lỗi khi tạo video.');
            }

            const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (uri) {
                 // Note: In a real app, you might need to fetch the blob if the URI is not directly accessible
                 // or append key if using Google's URI directly as per SDK docs.
                 // Assuming the service handles fetching or the URI is usable.
                 setVideoUrl(uri); 
            } else {
                throw new Error('Không tìm thấy đường dẫn video.');
            }

        } catch (err: any) {
            setError(err.message || 'Đã xảy ra lỗi.');
        } finally {
            setLoading(false);
            setStatusText('');
        }
    };

    return (
        <div className="flex flex-col items-center">
             <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 mb-2">
                    Tạo Video AI (Veo)
                </h1>
                <p className="text-lg text-slate-400">
                    Sáng tạo video chất lượng cao từ văn bản với mô hình Veo mới nhất.
                </p>
            </div>

            <div className="w-full max-w-3xl bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6">
                 {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
                 
                 <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Mô tả video</label>
                        <textarea 
                            value={prompt} 
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Mô tả chi tiết video bạn muốn tạo..."
                            className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-red-500 text-sm resize-none h-32"
                            disabled={loading || trialEnded}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Phong cách</label>
                            <select value={style} onChange={e => setStyle(e.target.value as VideoStyle)} disabled={loading || trialEnded} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200">
                                {styles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Tỷ lệ</label>
                            <div className="flex gap-2">
                                {aspectRatios.map(r => (
                                    <button key={r.value} onClick={() => setAspectRatio(r.value)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${aspectRatio === r.value ? 'bg-red-600/20 border-red-500 text-red-300' : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:bg-slate-700'}`} disabled={loading || trialEnded}>
                                        <r.icon className="w-4 h-4" />{r.label}
                                    </button>
                                ))}
                            </div>
                         </div>
                     </div>

                     <button onClick={handleGenerate} disabled={loading || trialEnded || !prompt.trim()}
                        className="w-full flex items-center justify-center bg-gradient-to-r from-red-500 to-yellow-500 text-white font-bold py-3 px-6 rounded-lg hover:from-red-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-red-500/30 disabled:opacity-50 text-lg">
                        {loading ? <><LoaderIcon className="animate-spin mr-3" />{statusText || 'Đang tạo...'}</> : <><VideoIcon className="mr-3" />Tạo Video</>}
                    </button>
                    
                    {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
                 </div>

                 {videoUrl && (
                     <div className="mt-8">
                         <h3 className="text-xl font-bold text-slate-200 mb-4">Kết quả</h3>
                         <video controls src={videoUrl} className="w-full rounded-lg border border-slate-700 shadow-lg" />
                     </div>
                 )}
            </div>
        </div>
    );
};

export default VideoGenerator;
