
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import { LanguageProvider, useLanguage } from './i18n';
import { LoaderIcon } from './components/Icons';
import Dashboard from './components/Dashboard';
import ApiManager from './components/ApiManager';

// Lazy load page components for code splitting
const TextToImageGenerator = lazy(() => import('./pages/TextToImageGenerator'));
const ImageEditor = lazy(() => import('./pages/ImageEditor'));
const AdCreativeGenerator = lazy(() => import('./pages/AdCreativeGenerator'));
const OnlineTravelGenerator = lazy(() => import('./pages/OnlineTravelGenerator'));
const FashionStudioGenerator = lazy(() => import('./pages/FashionStudioGenerator'));
const ImagePreviewModal = lazy(() => import('./components/ImagePreviewModal'));
const ProductPhotoshootGenerator = lazy(() => import('./pages/ProductPhotoshootGenerator'));

// Using language-independent keys for pages
export type Page = 
  | 'dashboard'
  | 'fashionStudio'
  | 'adCreative'
  | 'onlineTravel'
  | 'textToImage'
  | 'imageEditor'
  | 'productPhotoshoot';

export type ImageToEdit = {
  url: string;
  file: File;
};

const toolPages: Page[] = [
  'fashionStudio',
  'adCreative',
  'onlineTravel',
  'textToImage',
  'imageEditor',
  'productPhotoshoot'
];

type PreviewState = {
  url: string;
  onDownload: () => void;
} | null;

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  
  const [activePage, setActivePage] = useState<Page>(() => {
    // Default to dashboard instead of restoring last page to ensure users see the menu
    return 'dashboard';
  });

  // Track which pages have been visited to lazy load them only when needed
  const [visitedPages, setVisitedPages] = useState<Set<Page>>(new Set(['dashboard']));

  const [imageToEdit, setImageToEdit] = useState<ImageToEdit | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewState>(null);
  const [isApiManagerOpen, setIsApiManagerOpen] = useState(false);
  
  useEffect(() => {
    setVisitedPages(prev => {
      const newSet = new Set(prev);
      newSet.add(activePage);
      return newSet;
    });
    localStorage.setItem('tlab-activePage', activePage);
  }, [activePage]);

  const handleOpenPreview = (url: string, onDownload: () => void) => setPreviewImage({ url, onDownload });
  const handleClosePreview = () => setPreviewImage(null);

  const handleEditImage = (image: ImageToEdit) => {
    setImageToEdit(image);
    setActivePage('imageEditor');
  };

  const handleNavigate = (page: Page) => {
      setActivePage(page);
  }

  // Shared props for unlimited access
  const unlimitedProps = {
    isTrial: false,
    trialCreations: Infinity, 
    onTrialGenerate: () => {}, 
    onRequireLogin: () => {}, 
    onRequirePricing: () => {}, 
  };

  const SuspenseFallback = () => (
    <div className="flex justify-center items-center h-96">
      <LoaderIcon className="w-12 h-12 animate-spin text-sky-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02042b] via-[#0A1F44] to-[#1d143d] text-gray-200 font-sans">
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenApiManager={() => setIsApiManagerOpen(true)}
      />
      <main className="w-full">
        {/* Dashboard is always mounted but hidden when not active */}
        <div style={{ display: activePage === 'dashboard' ? 'block' : 'none' }}>
           <Dashboard onNavigate={setActivePage} />
        </div>

        {/* Render tool pages with 'Keep Alive' logic (display: none when inactive) */}
        {toolPages.map(page => {
          // Only render if visited once to save initial resources
          if (!visitedPages.has(page)) return null;

          return (
            <div 
              key={page} 
              style={{ display: activePage === page ? 'block' : 'none' }}
              className="mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300"
            >
              <Suspense fallback={<SuspenseFallback />}>
                {page === 'fashionStudio' && <FashionStudioGenerator {...unlimitedProps} onOpenPreview={handleOpenPreview} onNavigate={handleNavigate} />}
                {page === 'adCreative' && <AdCreativeGenerator onEditImage={handleEditImage} onOpenPreview={handleOpenPreview} {...unlimitedProps} onNavigate={handleNavigate} />}
                {page === 'onlineTravel' && <OnlineTravelGenerator {...unlimitedProps} onNavigate={handleNavigate} />}
                {page === 'textToImage' && <TextToImageGenerator onEditImage={handleEditImage} onOpenPreview={handleOpenPreview} {...unlimitedProps} onNavigate={handleNavigate} />}
                {page === 'imageEditor' && <ImageEditor initialImage={imageToEdit} onEditComplete={() => setImageToEdit(null)} onOpenPreview={handleOpenPreview} {...unlimitedProps} onNavigate={handleNavigate} />}
                {page === 'productPhotoshoot' && <ProductPhotoshootGenerator {...unlimitedProps} onOpenPreview={handleOpenPreview} onNavigate={handleNavigate} />}
              </Suspense>
            </div>
          );
        })}
      </main>
      
      <Suspense fallback={<></>}>
        {previewImage && <ImagePreviewModal isOpen={!!previewImage} onClose={handleClosePreview} imageUrl={previewImage.url} onDownload={previewImage.onDownload} />}
      </Suspense>

      <ApiManager isOpen={isApiManagerOpen} onClose={() => setIsApiManagerOpen(false)} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
