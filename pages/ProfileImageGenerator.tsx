import React, { useState, useRef } from 'react';
import { generateMultipleImageEdits, AspectRatio } from '../services/geminiService';
import { useLanguage } from '../i18n';
import { LoaderIcon, UserIcon, UploadIcon, DownloadIcon, SparklesIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import ProgressBar from '../components/ProgressBar';

interface ProfileImageGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
}

const ProfileImageGenerator: React.FC<ProfileImageGeneratorProps> = ({
  isTrial,
  trialCreations,
  onTrialGenerate,
  onRequireLogin,
  onRequirePricing
}) => {
    const { t } = useLanguage();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
    const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [loading, setLoading] = useState<boolean>(false);
    const [results, setResults] = useState<string[]>([]);
    
    const [progress, setProgress] = useState<number>(0);
    const [statusText, setStatusText] = useState<string>('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const trialEnded = isTrial && trialCreations <= 0;

    const styles = [
        { id: 'professional', name: 'Doanh nhân / LinkedIn', prompt: 'Professional headshot, wearing a suit, studio lighting, neutral background.' },
        { id: 'casual', name: 'Đời thường / Mạng xã hội', prompt: 'Casual portrait, outdoor park setting, natural lighting, wearing casual stylish clothes, smiling.' },
        { id: 'artistic', name: 'Nghệ thuật / Creative', prompt: 'Artistic portrait, dramatic lighting, colorful background, creative fashion.' },
        { id: 'cyberpunk', name: 'Cyberpunk / Futuristic', prompt: 'Cyberpunk style, neon lights, futuristic clothing, night city background.' },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const reader = new FileReader();
            reader.onload = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(selected);
            setResults([]);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!file) { setError('Vui lòng tải ảnh lên.'); return; }
        if (!selectedStyleId) { setError('Vui lòng chọn phong cách.'); return; }
        if (trialEnded) { setError(t('trialEnded.title')); return; }

        if (isTrial) onTrialGenerate(4); // 4 images

        setLoading(true);
        setError(null);
        setResults([]);
        setProgress(0);
        setStatusText('Đang phân tích khuôn mặt...');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    const mimeType = file.type;
                    const stylePrompt = styles.find(s => s.id === selectedStyleId)?.prompt || '';
                    const fullPrompt = `Transform this person into the following style: ${stylePrompt}. ${additionalPrompt}. Keep the face recognizable but improve quality.`;

                    setProgress(20);
                    setStatusText('Đang tạo các phiên bản...');
                    
                    const generated = await generateMultipleImageEdits(base64, mimeType, fullPrompt, 4);
                    
                    setProgress(100);
                    setStatusText('Hoàn tất!');
                    setResults(generated);
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

    return (
        <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl text-center mb-10">
                <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 mb-2">
                    Tạo Avatar AI
                </h1>
                <p className="text-lg text-slate-400">
                    Tạo bộ ảnh đại diện chuyên nghiệp đa phong cách chỉ từ 1 bức ảnh.
                </p>
            </div>

            <div className="w-full max-w-5xl bg-slate-800/60 border border-slate-700 rounded-xl shadow-xl p-6">
                {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left: Input */}
                    <div className="col-span-1 space-y-4">
                        <div 
                            onClick={() => !loading && !trialEnded && fileInputRef.current?.click()}
                            className={`w-full aspect-square border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all ${loading || trialEnded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700 hover:border-indigo-500'}`}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" disabled={loading || trialEnded} />
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <UploadIcon className="w-10 h-10 text-slate-400 mb-2" />
                                    <p className="text-slate-300 text-sm">Tải ảnh chân dung</p>
                                </>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Chọn phong cách</label>
                            <div className="grid grid-cols-1 gap-2">
                                {styles.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedStyleId(s.id)}
                                        className={`p-3 rounded-lg text-left text-sm transition-all border ${selectedStyleId === s.id ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                                        disabled={loading || trialEnded}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleGenerate} disabled={loading || trialEnded || !file || !selectedStyleId}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50">
                            {loading ? <LoaderIcon className="animate-spin" /> : <SparklesIcon className="mr-2" />} Tạo Avatar
                        </button>
                    </div>

                    {/* Right: Output */}
                    <div className="col-span-1 md:col-span-2 bg-slate-900/50 rounded-lg border border-slate-700 p-4 min-h-[400px] flex flex-col items-center justify-center">
                        {loading && <ProgressBar progress={progress} statusText={statusText} accentColor="purple" />}
                        
                        {!loading && results.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 w-full h-full">
                                {results.map((url, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-600">
                                        <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                        <a href={url} download={`avatar_${idx}.png`} className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <DownloadIcon className="w-5 h-5" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {!loading && results.length === 0 && !error && (
                            <div className="text-slate-500 text-center">
                                <UserIcon className="w-16 h-16 mx-auto mb-3 opacity-20" />
                                <p>Kết quả sẽ hiển thị tại đây</p>
                            </div>
                        )}
                        {error && <p className="text-red-400">{error}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileImageGenerator;
