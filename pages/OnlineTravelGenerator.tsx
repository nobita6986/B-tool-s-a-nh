
import React, { useState, useRef } from 'react';
import { editImageWithText, removeBackground, AspectRatio, ImageInput } from '../services/geminiService';
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
    const [customPrompt, setCustomPrompt] = useState<string>('');
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const trialEnded = isTrial && trialCreations <= 0;

    const backgrounds = [
        { icon: '🎲', name: 'Ngẫu nhiên', sub: 'AI tự chọn', prompt: 'RANDOM' },
        { icon: '💎', name: 'Trong suốt', sub: 'Xóa nền', prompt: 'REMOVE_BG' },
        { icon: '🛍️', name: 'Cửa hàng', sub: 'Store', prompt: 'fashion store interior' },
        { icon: '🏖️', name: 'Bãi biển', sub: 'Beach', prompt: 'sunny tropical beach with turquoise water' },
        { icon: '☕', name: 'Quán cà phê', sub: 'Cafe', prompt: 'cozy coffee shop interior with warm lighting' },
        { icon: '🌸', name: 'Vườn hoa', sub: 'Garden', prompt: 'blooming flower garden with colorful flowers' },
        { icon: '📸', name: 'Photo Studio', sub: 'Studio', prompt: 'professional photo studio background with soft lighting' },
        { icon: '🚶', name: 'Phố đi bộ', sub: 'Street', prompt: 'bustling pedestrian street with city vibe' },
        { icon: '🌳', name: 'Công viên', sub: 'Park', prompt: 'green public park with trees and grass, sunny day' },
        { icon: '🍽️', name: 'Nhà hàng', sub: 'Restaurant', prompt: 'luxury restaurant interior with fine dining setup' },
        { icon: '🏨', name: 'Khách sạn', sub: 'Hotel', prompt: 'luxury hotel lobby' },
        { icon: '👗', name: 'Shop quần áo', sub: 'Boutique', prompt: 'chic clothing boutique interior' },
        { icon: '🏙️', name: 'Sân thượng', sub: 'Rooftop', prompt: 'rooftop terrace with city skyline view' },
        { icon: '🏬', name: 'TT Thương mại', sub: 'Mall', prompt: 'modern shopping mall interior' },
        { icon: '🌿', name: 'Thiên nhiên', sub: 'Nature', prompt: 'serene natural landscape with forests' },
        { icon: '🏙️', name: 'Đô thị', sub: 'Urban', prompt: 'modern urban city street with skyscrapers' },
        { icon: '🌅', name: 'Hoàng hôn', sub: 'Sunset', prompt: 'scenic landscape at sunset' },
        { icon: '💼', name: 'Văn phòng', sub: 'Office', prompt: 'modern office workspace' },
        { icon: '🏋️', name: 'Phòng gym', sub: 'Gym', prompt: 'modern fitness gym interior' },
        { icon: '🎪', name: 'Photo Booth', sub: 'Booth', prompt: 'fun and colorful photo booth background' },
        { icon: '🌃', name: 'Neon City', sub: 'Neon', prompt: 'futuristic city street at night with neon lights' },
        { icon: '🎞️', name: 'Phong cách cổ', sub: 'Vintage', prompt: 'vintage retro style room' },
        { icon: '🛏️', name: 'Phòng ngủ', sub: 'Bedroom', prompt: 'cozy and modern bedroom' },
        { icon: '🍳', name: 'Nhà bếp', sub: 'Kitchen', prompt: 'modern clean kitchen' },
        { icon: '🏡', name: 'Ban công', sub: 'Balcony', prompt: 'balcony view of outdoors' },
        { icon: '🏊', name: 'Hồ bơi', sub: 'Pool', prompt: 'luxury swimming pool area' },
        { icon: '🧘', name: 'Phòng yoga', sub: 'Yoga', prompt: 'peaceful yoga studio' },
        { icon: '📚', name: 'Thư viện', sub: 'Library', prompt: 'classic library with books' },
        { icon: '🏛️', name: 'Bảo tàng', sub: 'Museum', prompt: 'art museum interior' },
        { icon: '🎬', name: 'Rạp chiếu phim', sub: 'Cinema', prompt: 'movie theater interior' },
        { icon: '🍸', name: 'Quán bar', sub: 'Bar', prompt: 'stylish bar with dim lighting' },
        { icon: '💒', name: 'Vườn cưới', sub: 'Wedding', prompt: 'romantic wedding garden setup' },
        { icon: '🏝️', name: 'Đảo nhiệt đới', sub: 'Island', prompt: 'tropical island paradise' },
        { icon: '💧', name: 'Thác nước', sub: 'Waterfall', prompt: 'majestic waterfall' },
        { icon: '🏔️', name: 'Núi non', sub: 'Mountain', prompt: 'majestic mountain landscape' },
        { icon: '❄️', name: 'Tuyết rơi', sub: 'Snow', prompt: 'winter landscape with falling snow' },
        { icon: '🌵', name: 'Sa mạc', sub: 'Desert', prompt: 'desert landscape with dunes' },
        { icon: '💜', name: 'Cánh lavender', sub: 'Lavender', prompt: 'lavender field' },
        { icon: '🌸', name: 'Hoa anh đào', sub: 'Sakura', prompt: 'cherry blossom park' },
        { icon: '🍂', name: 'Mùa thu', sub: 'Autumn', prompt: 'autumn park with falling leaves' },
        { icon: '🏰', name: 'Lâu đài', sub: 'Castle', prompt: 'fairytale castle' },
        { icon: '🏡', name: 'Biệt thự', sub: 'Villa', prompt: 'luxury villa exterior' },
        { icon: '🛳️', name: 'Du thuyền', sub: 'Cruise', prompt: 'luxury cruise ship deck' },
        { icon: '✈️', name: 'Máy bay', sub: 'Airplane', prompt: 'private jet interior' },
        { icon: '🚂', name: 'Tàu hỏa', sub: 'Train', prompt: 'luxury train interior' },
        { icon: '🏢', name: 'Tòa nhà cao', sub: 'Tower', prompt: 'view from high-rise building' },
        { icon: '🚜', name: 'Nông trại', sub: 'Farm', prompt: 'rustic farm landscape' },
        { icon: '🌿', name: 'Nhà kính', sub: 'Greenhouse', prompt: 'plant greenhouse' },
        { icon: '🏫', name: 'Trường học', sub: 'School', prompt: 'school classroom or hallway' },
        { icon: '🏟️', name: 'Sân vận động', sub: 'Stadium', prompt: 'sports stadium' },
        { icon: '🪐', name: 'Vũ trụ', sub: 'Space', prompt: 'outer space background' },
        { icon: '🎨', name: 'Xưởng vẽ', sub: 'Art', prompt: 'art studio with paintings' },
        { icon: '🎮', name: 'Gaming Room', sub: 'Gamer', prompt: 'neon gaming room setup' },
        { icon: '⛩️', name: 'Nhật Bản', sub: 'Japan', prompt: 'traditional japanese street' },
        { icon: '💂', name: 'London', sub: 'UK', prompt: 'London street with red bus' },
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

    const handlePresetSelect = (prompt: string) => {
        if (selectedPreset === prompt) {
            setSelectedPreset(null); // Deselect if clicking the same one
        } else {
            setSelectedPreset(prompt);
        }
    };

    const handleGenerate = async () => {
        if (!file) {
            setError('Vui lòng tải ảnh lên trước.');
            return;
        }
        
        let promptToUse = selectedPreset;
        
        // Logic: Must have either a selected preset OR a custom prompt text
        if (!promptToUse && !customPrompt.trim()) {
            setError('Vui lòng chọn bối cảnh hoặc nhập prompt.');
            return;
        }

        if (promptToUse === 'RANDOM') {
             const randomBg = backgrounds.filter(b => b.prompt !== 'RANDOM' && b.prompt !== 'REMOVE_BG')[Math.floor(Math.random() * (backgrounds.length - 2))];
             promptToUse = randomBg.prompt;
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
        
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                try {
                    const base64 = (reader.result as string).split(',')[1];
                    const mimeType = file.type;
                    
                    let result = '';

                    if (promptToUse === 'REMOVE_BG') {
                         setStatusText('Đang xóa nền...');
                         setProgress(30);
                         result = await removeBackground(base64, mimeType);
                    } else {
                         setStatusText('Đang xử lý yêu cầu...');
                         setProgress(30);
                         
                         // Construct prompt intelligently
                         let parts = [];
                         if (promptToUse) {
                             parts.push(`Change the background to: ${promptToUse}.`);
                         }
                         if (customPrompt.trim()) {
                             parts.push(customPrompt.trim());
                         }
                         parts.push("Maintain the subject perfectly. Photorealistic, high resolution.");
                         
                         const fullPrompt = parts.join(' ');
                         result = await editImageWithText(base64, mimeType, fullPrompt);
                    }
                    
                    setProgress(100);
                    setStatusText('Hoàn tất!');
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

                     {/* Destinations Grid */}
                     <div>
                         <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                             🎨 Chọn Bối Cảnh ({backgrounds.length} môi trường)
                         </h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                             {backgrounds.map((bg) => (
                                 <button
                                    key={bg.name}
                                    onClick={() => handlePresetSelect(bg.prompt)}
                                    disabled={loading || trialEnded || !file}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all group disabled:opacity-50 disabled:cursor-not-allowed
                                        ${selectedPreset === bg.prompt 
                                            ? 'bg-emerald-900/50 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                            : 'bg-slate-800/80 border-slate-700/50 hover:bg-slate-700 hover:border-slate-500'
                                        }`}
                                 >
                                     <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{bg.icon}</span>
                                     <span className="text-xs font-bold text-slate-200 text-center">{bg.name}</span>
                                     <span className="text-[10px] text-slate-500 text-center">{bg.sub}</span>
                                 </button>
                             ))}
                         </div>
                     </div>

                     {/* Custom */}
                     <div>
                         <label className="block text-sm font-medium text-slate-300 mb-2">Nhập prompt tùy chọn (nếu cần):</label>
                         <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={customPrompt} 
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Ví dụ: thay đổi biểu cảm nhân vật, làm cho trời tối hơn..."
                                className="flex-grow bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 text-sm"
                                disabled={loading || trialEnded}
                             />
                             <button 
                                onClick={handleGenerate}
                                disabled={loading || trialEnded || !file || (!selectedPreset && !customPrompt)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 shadow-lg hover:shadow-emerald-500/30 whitespace-nowrap"
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
