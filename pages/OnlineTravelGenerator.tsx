
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateMultipleImageEdits, generatePromptFromImage, BilingualPrompt } from '../services/geminiService';
import { CameraIcon, LoaderIcon, SparklesIcon, DownloadIcon, AspectRatioSquareIcon, AspectRatioWideIcon, AspectRatioTallIcon, MagicWandIcon, CopyIcon, DiceIcon, EditIcon } from '../components/Icons';
import TrialEndedCta from '../components/TrialEndedCta';
import type { AspectRatio } from '../services/geminiService';
import ProgressBar from '../components/ProgressBar';
import TransferMenu from '../components/TransferMenu';
import { Page } from '../App';

interface OnlineTravelGeneratorProps {
  isTrial: boolean;
  trialCreations: number;
  onTrialGenerate: (amount?: number) => void;
  onRequireLogin: () => void;
  onRequirePricing: () => void;
  onNavigate: (page: Page) => void;
}

type BackgroundOption = {
  id: string;
  label: string;
  subLabel: string;
  icon: string; // Using emojis for simplicity and performance as per the requested UI style
  prompt: string;
};

const BACKGROUNDS: BackgroundOption[] = [
  { id: 'random', label: 'Ngẫu nhiên', subLabel: 'AI tự chọn', icon: '🎲', prompt: 'random' },
  { id: 'transparent', label: 'Trong suốt', subLabel: 'Xóa nền', icon: '💎', prompt: 'isolated on a clean white background, professional product photography style, no shadows' }, // Note: AI generation usually creates rect images, 'transparent' here acts as clean studio white/green screen for easy removal or just "clean"
  { id: 'store', label: 'Cửa hàng', subLabel: 'Store', icon: '🏪', prompt: 'inside a modern luxury fashion boutique store with clothing racks, warm lighting, and elegant interior design' },
  { id: 'beach', label: 'Bãi biển', subLabel: 'Beach', icon: 'mV', prompt: 'on a beautiful sunny beach with turquoise water, white sand, and palm trees in the background, tropical vibe' },
  { id: 'cafe', label: 'Quán cà phê', subLabel: 'Cafe', icon: '☕', prompt: 'sitting in a cozy, aesthetic coffee shop with warm ambient lighting, wooden furniture, and a blurred street view outside the window' },
  { id: 'garden', label: 'Vườn hoa', subLabel: 'Garden', icon: '🌸', prompt: 'in a blooming flower garden with vibrant colors, sunlight filtering through leaves, nature atmosphere' },
  { id: 'studio', label: 'Photo Studio', subLabel: 'Studio', icon: '📸', prompt: 'in a professional photo studio with solid colored background and high-end studio lighting setup, softbox lighting' },
  { id: 'street', label: 'Phố đi bộ', subLabel: 'Street', icon: '🏙️', prompt: 'walking on a busy, clean city pedestrian street with modern architecture and daylight' },
  { id: 'park', label: 'Công viên', subLabel: 'Park', icon: '🌳', prompt: 'in a peaceful green park with large trees, green grass, and sunlight, relaxation atmosphere' },
  { id: 'restaurant', label: 'Nhà hàng', subLabel: 'Restaurant', icon: '🍽️', prompt: 'dining in a fine dining restaurant with elegant table setting, crystal glasses, and romantic dim lighting' },
  { id: 'hotel', label: 'Khách sạn', subLabel: 'Hotel', icon: '🏨', prompt: 'in a luxurious hotel lobby with grand chandeliers, marble floors, and upscale furniture' },
  { id: 'boutique', label: 'Shop quần áo', subLabel: 'Boutique', icon: '👗', prompt: 'inside a trendy clothing boutique with stylish decor, mirrors, and fashion items in the background' },
  { id: 'rooftop', label: 'Sân thượng', subLabel: 'Rooftop', icon: '🌃', prompt: 'on a rooftop bar at sunset overlooking a city skyline, golden hour lighting, chic atmosphere' },
  { id: 'mall', label: 'TT Thương mại', subLabel: 'Mall', icon: '🛍️', prompt: 'inside a modern, spacious shopping mall with glass railings, bright lights, and shop fronts' },
  { id: 'nature', label: 'Thiên nhiên', subLabel: 'Nature', icon: '🌿', prompt: 'surrounded by lush green nature, a forest clearing or a meadow, natural sunlight' },
  { id: 'urban', label: 'Đô thị', subLabel: 'Urban', icon: '🧱', prompt: 'in an urban setting with concrete walls, street art, and a cool, edgy city vibe' },
  { id: 'sunset', label: 'Hoàng hôn', subLabel: 'Sunset', icon: '🌅', prompt: 'outdoors during a breathtaking golden sunset, warm orange and pink hues in the sky' },
  { id: 'office', label: 'Văn phòng', subLabel: 'Office', icon: '💼', prompt: 'in a modern corporate office workspace with glass walls, desks, and a professional environment' },
  { id: 'gym', label: 'Phòng gym', subLabel: 'Gym', icon: '🏋️', prompt: 'inside a modern fitness gym with equipment, mirrors, and bright lighting' },
  { id: 'neon', label: 'Neon City', subLabel: 'Neon', icon: '🌃', prompt: 'in a cyberpunk style city street at night illuminated by bright pink and blue neon signs' },
  { id: 'vintage', label: 'Phong cách cổ', subLabel: 'Vintage', icon: '🎨', prompt: 'in a vintage, retro setting with antique furniture, warm tones, and a nostalgic atmosphere' },
  { id: 'bedroom', label: 'Phòng ngủ', subLabel: 'Bedroom', icon: '🛏️', prompt: 'in a cozy, modern bedroom with soft bedding, morning sunlight, and a relaxed vibe' },
  { id: 'kitchen', label: 'Nhà bếp', subLabel: 'Kitchen', icon: '🍳', prompt: 'in a modern, clean kitchen with marble countertops and stainless steel appliances' },
  { id: 'balcony', label: 'Ban công', subLabel: 'Balcony', icon: '🌺', prompt: 'standing on a balcony with potted plants, overlooking a scenic view' },
  { id: 'pool', label: 'Hồ bơi', subLabel: 'Pool', icon: '🏊', prompt: 'relaxing by a luxury swimming pool with clear blue water and lounge chairs' },
  { id: 'library', label: 'Thư viện', subLabel: 'Library', icon: '📚', prompt: 'inside a classic library with tall bookshelves filled with books, quiet and intellectual atmosphere' },
  { id: 'cinema', label: 'Rạp phim', subLabel: 'Cinema', icon: '🎬', prompt: 'inside a movie theater or cinema lobby with poster displays and dim lighting' },
  { id: 'bar', label: 'Quán bar', subLabel: 'Bar', icon: '🍸', prompt: 'sitting at a stylish cocktail bar with shelves of bottles and mood lighting' },
  { id: 'luxury', label: 'Biệt thự', subLabel: 'Villa', icon: '🏡', prompt: 'in front of a luxurious modern villa with a manicured garden' },
  { id: 'cruise', label: 'Du thuyền', subLabel: 'Cruise', icon: '🚢', prompt: 'on the deck of a luxury cruise ship with the ocean in the background' },
  { id: 'airplane', label: 'Máy bay', subLabel: 'Airplane', icon: '✈️', prompt: 'inside a private jet cabin with leather seats and a view of clouds out the window' },
  { id: 'snow', label: 'Tuyết rơi', subLabel: 'Snow', icon: '❄️', prompt: 'in a winter wonderland with falling snow, pine trees, and a cold, magical atmosphere' },
];

const aspectRatios: { value: AspectRatio; label: string; icon: React.FC<{className?: string}> }[] = [
  { value: '1:1', label: 'Vuông', icon: AspectRatioSquareIcon },
  { value: '16:9', label: 'Ngang', icon: AspectRatioWideIcon },
  { value: '9:16', label: 'Dọc', icon: AspectRatioTallIcon },
];

const getAspectRatioClass = (ratio: AspectRatio) => {
    switch (ratio) {
        case '16:9': return 'aspect-[16/9]';
        case '9:16': return 'aspect-[9/16]';
        case '1:1':
        default:
          return 'aspect-square';
    }
};

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
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

const base64ToFile = async (base64: string, filename: string): Promise<File> => {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
};

const LOCAL_STORAGE_KEY = 'tlab-OnlineTravelGenerator-state';
const GENERATION_COST = 2;

const OnlineTravelGenerator: React.FC<OnlineTravelGeneratorProps> = ({ isTrial, trialCreations, onTrialGenerate, onRequireLogin, onRequirePricing, onNavigate }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);
  const [customDestination, setCustomDestination] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
  
  const [generatingPrompts, setGeneratingPrompts] = useState<{ [key: number]: boolean }>({});
  const [generatedPrompts, setGeneratedPrompts] = useState<{ [key: number]: BilingualPrompt | null }>({});
  const [copiedPrompts, setCopiedPrompts] = useState<{ [key: number]: boolean }>({});

  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const trialEnded = isTrial && trialCreations < GENERATION_COST;

  useEffect(() => {
    // Check for transfer
    const pendingTransfer = localStorage.getItem('tlab-transfer-image');
    if (pendingTransfer) {
        try {
            const { image, target } = JSON.parse(pendingTransfer);
            if (target === 'onlineTravel' && image) {
                setOriginalImage(image);
                base64ToFile(image, 'transferred_image.png').then(f => setFile(f));
                localStorage.removeItem('tlab-transfer-image');
                return;
            }
        } catch (e) { console.error(e); }
    }

    const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedStateJSON) {
        try {
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.selectedBackgroundId) setSelectedBackgroundId(savedState.selectedBackgroundId);
            if (savedState.customDestination) setCustomDestination(savedState.customDestination);
            if (savedState.aspectRatio) setAspectRatio(savedState.aspectRatio);
            if (savedState.additionalPrompt) setAdditionalPrompt(savedState.additionalPrompt);
        } catch(e) {
            console.error('Failed to parse OnlineTravelGenerator state', e);
        }
    }
  }, []);

  useEffect(() => {
    const stateToSave = { selectedBackgroundId, aspectRatio, customDestination, additionalPrompt };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [selectedBackgroundId, aspectRatio, customDestination, additionalPrompt]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setGeneratedImages([]);
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => setOriginalImage(reader.result as string);
    }
  };

  const triggerFileSelect = () => {
    if (trialEnded) return;
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    let targetPrompt = '';
    let backgroundLabel = '';

    if (selectedBackgroundId === 'custom') {
        if (!customDestination.trim()) {
            setError('Vui lòng nhập mô tả bối cảnh mong muốn.');
            return;
        }
        targetPrompt = customDestination.trim();
        backgroundLabel = 'bối cảnh tùy chọn';
    } else if (selectedBackgroundId === 'random') {
        // Pick a random background excluding 'random', 'custom', and 'transparent' (optional)
        const validOptions = BACKGROUNDS.filter(bg => bg.id !== 'random' && bg.id !== 'transparent');
        const randomBg = validOptions[Math.floor(Math.random() * validOptions.length)];
        targetPrompt = randomBg.prompt;
        backgroundLabel = randomBg.label;
    } else {
        const selectedBg = BACKGROUNDS.find(bg => bg.id === selectedBackgroundId);
        if (!selectedBg) {
            setError('Vui lòng chọn một bối cảnh.');
            return;
        }
        targetPrompt = selectedBg.prompt;
        backgroundLabel = selectedBg.label;
    }

    const basePrompt = `Photorealistic image of the person seamlessly integrated into the following setting: ${targetPrompt}. The lighting should be natural and appropriate for the location. Ensure the person looks like they are actually there, preserving their facial features and pose.`;
    
    // Combine base prompt with additional instructions
    let finalPrompt = basePrompt;
    if (additionalPrompt.trim()) {
        finalPrompt += ` Also, incorporate the following details: ${additionalPrompt.trim()}.`;
    }

    // Add aspect ratio requirement at the end
    finalPrompt += ` IMPORTANT: The final output image MUST strictly adhere to a ${aspectRatio} aspect ratio. Do not alter this aspect ratio.`;


    if (trialEnded) {
      setError(`Bạn cần ít nhất ${GENERATION_COST} lượt tạo. Vui lòng đăng nhập.`);
      return;
    }
    if (!file) {
      setError('Vui lòng tải ảnh của bạn lên trước.');
      return;
    }

    if (isTrial) onTrialGenerate(GENERATION_COST);

    setLoading(true);
    setError(null);
    setGeneratedImages([]);
    setGeneratedPrompts({});
    setGeneratingPrompts({});
    setCopiedPrompts({});
    setProgress(0);
    setStatusText('Chuẩn bị bối cảnh...');
    
    try {
      setProgress(20);
      setStatusText('Đang xử lý ảnh của bạn...');
      const { base64, mimeType } = await fileToBase64(file);

      setProgress(50);
      setStatusText(`Đang đưa bạn đến ${backgroundLabel}...`);

      const resultUrls = await generateMultipleImageEdits(base64, mimeType, finalPrompt, 2);
      
      setProgress(90);
      setStatusText('Hoàn thiện hình ảnh...');
      setGeneratedImages(resultUrls);

      setProgress(100);
      setStatusText('Thành công!');
      setTimeout(() => setLoading(false), 1000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo ảnh. Vui lòng thử lại.');
      console.error(err);
      setLoading(false);
      setProgress(0);
      setStatusText('');
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const originalFilename = file?.name.split('.').slice(0, -1).join('.') || 'travel';
    const bgName = selectedBackgroundId || 'custom';
    link.download = `t-lab_${originalFilename}_${bgName}_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGeneratePrompt = async (imageUrl: string, index: number) => {
    setGeneratingPrompts(prev => ({ ...prev, [index]: true }));
    setError(null);
    try {
      const [header, data] = imageUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      const promptObject = await generatePromptFromImage(data, mimeType);
      setGeneratedPrompts(prev => ({ ...prev, [index]: promptObject }));
    } catch (err: any) {
       setError(err.message || `Không thể tạo prompt cho ảnh ${index + 1}.`);
       console.error(err);
    } finally {
        setGeneratingPrompts(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleCopyPrompt = (promptObject: BilingualPrompt, index: number) => {
    navigator.clipboard.writeText(promptObject.en);
    setCopiedPrompts(prev => ({ ...prev, [index]: true }));
    setTimeout(() => {
        setCopiedPrompts(prev => ({ ...prev, [index]: false }));
    }, 2000);
  };
    
  const canGenerate = originalImage && ((selectedBackgroundId && selectedBackgroundId !== 'custom') || (selectedBackgroundId === 'custom' && customDestination.trim()));

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl text-center mb-10">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 mb-2">
          Đổi bối cảnh
        </h1>
        <p className="text-lg text-slate-400">
          Chọn một bối cảnh có sẵn hoặc nhập ý tưởng của riêng bạn để thay đổi không gian xung quanh.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-7xl">
        {/* Controls */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col">
          {trialEnded && <TrialEndedCta onLoginClick={onRequireLogin} onPricingClick={onRequirePricing} />}
          
          <div className="flex-grow flex flex-col gap-6">
              {/* Step 1: Upload */}
              <div>
                <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">1</span> Tải ảnh của bạn</h2>
                <div
                  onClick={triggerFileSelect}
                  className={`w-full h-40 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center transition-all duration-300 ${trialEnded ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-slate-700/50 hover:border-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" disabled={trialEnded} />
                  {originalImage ? (
                    <img src={originalImage} alt="Original" className="w-full h-full object-contain rounded-md" />
                  ) : (
                    <><CameraIcon className="w-12 h-12 text-slate-400 mb-2" /><p className="text-slate-300">Nhấn để tải ảnh chân dung</p></>
                  )}
                </div>
              </div>
              
              {/* Step 2: Select Background */}
              <div className="flex-grow flex flex-col">
                <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">2</span> Chọn bối cảnh</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {BACKGROUNDS.map((bg) => (
                        <button
                            key={bg.id}
                            onClick={() => setSelectedBackgroundId(bg.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 group
                                ${selectedBackgroundId === bg.id 
                                    ? 'bg-emerald-900/40 border-emerald-400 ring-1 ring-emerald-400/50' 
                                    : 'bg-slate-800/40 border-slate-700 hover:bg-slate-700 hover:border-slate-500'}
                            `}
                            disabled={loading || trialEnded}
                        >
                            <span className="text-2xl mb-1 transform group-hover:scale-110 transition-transform">{bg.icon}</span>
                            <span className={`text-xs font-semibold text-center leading-tight ${selectedBackgroundId === bg.id ? 'text-emerald-300' : 'text-slate-300'}`}>{bg.label}</span>
                            <span className="text-[10px] text-slate-500 text-center">{bg.subLabel}</span>
                        </button>
                    ))}
                    {/* Custom Option Button */}
                    <button
                        onClick={() => setSelectedBackgroundId('custom')}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 group
                            ${selectedBackgroundId === 'custom' 
                                ? 'bg-emerald-900/40 border-emerald-400 ring-1 ring-emerald-400/50' 
                                : 'bg-slate-800/40 border-slate-700 hover:bg-slate-700 hover:border-slate-500'}
                        `}
                        disabled={loading || trialEnded}
                    >
                        <span className="text-2xl mb-1 text-slate-400 transform group-hover:scale-110 transition-transform"><EditIcon className="w-6 h-6"/></span>
                        <span className={`text-xs font-semibold text-center leading-tight ${selectedBackgroundId === 'custom' ? 'text-emerald-300' : 'text-slate-300'}`}>Tự nhập</span>
                        <span className="text-[10px] text-slate-500 text-center">Custom</span>
                    </button>
                </div>

                {selectedBackgroundId === 'custom' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                        <textarea
                            value={customDestination}
                            onChange={(e) => setCustomDestination(e.target.value)}
                            placeholder="Mô tả bối cảnh bạn muốn... (VD: trên đỉnh núi Everest, trong rừng trúc, v.v.)"
                            className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 resize-none text-sm"
                            rows={2}
                            disabled={loading || trialEnded}
                        />
                    </motion.div>
                )}
              </div>

              {/* Step 3: Aspect Ratio & Details */}
              <div>
                <h2 className="text-xl font-bold text-emerald-400 mb-3"><span className="bg-emerald-500 text-slate-900 rounded-full w-7 h-7 inline-flex items-center justify-center mr-2">3</span> Tùy chỉnh (Tùy chọn)</h2>
                 <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {aspectRatios.map((ratio) => {
                        const Icon = ratio.icon;
                        return (
                            <button
                                key={ratio.value}
                                onClick={() => setAspectRatio(ratio.value)}
                                disabled={loading || trialEnded}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 border
                                ${aspectRatio === ratio.value
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <Icon className="w-4 h-4" />
                                {ratio.label}
                            </button>
                        )
                        })}
                    </div>
                    <textarea
                        value={additionalPrompt}
                        onChange={(e) => setAdditionalPrompt(e.target.value)}
                        placeholder="Thêm chi tiết: 'trời đang mưa', 'ánh sáng neon', 'tông màu ấm'..."
                        className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 resize-none text-sm"
                        rows={1}
                        disabled={loading || trialEnded}
                    />
                 </div>
              </div>
          </div>
          
          {/* Step 5: Generate */}
          <div className="mt-auto pt-6 border-t border-slate-700/50">
             <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate || trialEnded}
              className="w-full flex items-center justify-center bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-emerald-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><LoaderIcon className="animate-spin mr-2" />Đang xử lý...</> : <><SparklesIcon className="mr-2" />Tạo 2 ảnh mới</>}
            </button>
          </div>
          {error && <p className="text-red-400 mt-4 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
        </div>

        {/* Result */}
        <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/40 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-4 self-start">Kết quả</h2>
            <div className="w-full flex-grow flex items-center justify-center">
                {loading && (
                    <div className="w-full">
                        <ProgressBar progress={progress} statusText={statusText} accentColor="emerald" />
                    </div>
                )}
                {generatedImages.length > 0 && !loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                        {generatedImages.map((image, index) => (
                            <div key={index} className="flex flex-col gap-2 bg-slate-800/40 p-2 rounded-xl">
                                <div className={`w-full bg-slate-900/50 rounded-lg overflow-hidden ${getAspectRatioClass(aspectRatio)}`}>
                                     <img src={image} alt={`Generated travel photo ${index + 1}`} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => handleDownload(image, index)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-teal-600 text-white font-bold py-2 px-3 rounded-lg hover:from-green-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-green-500/30 text-sm"
                                    >
                                        <DownloadIcon className="w-4 h-4" /> Lưu ảnh
                                    </button>
                                    <TransferMenu imageUrl={image} onNavigate={onNavigate} />
                                </div>
                                {generatedPrompts[index] && (
                                    <div className="bg-slate-900/50 p-2.5 rounded-md text-xs">
                                        <p className="text-slate-300 italic">"{generatedPrompts[index]?.vi}"</p>
                                        <button
                                            onClick={() => handleCopyPrompt(generatedPrompts[index]!, index)}
                                            className="flex items-center gap-1.5 mt-2 text-cyan-300 bg-cyan-900/50 px-2 py-1 rounded-md hover:bg-cyan-800/50 transition-colors"
                                        >
                                            <CopyIcon className="w-3 h-3" />
                                            {copiedPrompts[index] ? 'Đã sao chép (English)!' : 'Sao chép (English)'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {generatedImages.length === 0 && !loading && (
                  <div className={`w-full flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg border border-dashed border-slate-600 ${getAspectRatioClass(aspectRatio)}`}>
                    <p className="text-center p-4">Ảnh của bạn sẽ xuất hiện ở đây.</p>
                  </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineTravelGenerator;
