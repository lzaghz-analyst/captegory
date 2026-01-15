
import React, { useState } from 'react';
import { Album, Photo } from '../types';

interface AlbumViewProps {
  album: Album;
  photos: Photo[];
  onBack: () => void;
  onDelete: () => void;
  onDeletePhoto: (url: string) => void;
  onDeleteMultiplePhotos: (urls: string[]) => void;
}

const AlbumView: React.FC<AlbumViewProps> = ({ 
  album, 
  photos, 
  onBack, 
  onDelete, 
  onDeletePhoto,
  onDeleteMultiplePhotos 
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedUrls([]);
  };

  const togglePhotoSelection = (url: string) => {
    setSelectedUrls(prev => 
      prev.includes(url) 
        ? prev.filter(u => u !== url) 
        : [...prev, url]
    );
  };

  const handleSelectAll = () => {
    if (selectedUrls.length === photos.length) {
      setSelectedUrls([]);
    } else {
      setSelectedUrls(photos.map(p => p.url));
    }
  };

  const handleShareAlbum = async () => {
    const shareData = {
      title: `Album: ${album.name}`,
      text: `Check out my "${album.name}" album with ${photos.length} captures! Shared via Capture & Categorize.`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert("Sharing not supported on this device.");
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  const handleShareSelected = async () => {
    setIsSharing(true);
    try {
      if (selectedUrls.length === 0) return;
      
      const files: File[] = [];
      for (const url of selectedUrls) {
        const response = await fetch(url);
        const blob = await response.blob();
        const extension = url.startsWith('data:image/png') ? 'png' : (url.startsWith('blob:') ? 'webm' : 'jpg');
        files.push(new File([blob], `Capture-${Date.now()}.${extension}`, { type: blob.type }));
      }

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: `Shared from ${album.name}`,
        });
      } else {
        alert("Bulk sharing files not supported on this browser version.");
      }
    } catch (err) {
      console.error("Multi-share failed", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSharePhoto = async (url: string) => {
    setIsSharing(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const extension = url.startsWith('data:image/png') ? 'png' : (url.startsWith('blob:') ? 'webm' : 'jpg');
      const file = new File([blob], `Capture-${Date.now()}.${extension}`, { type: blob.type });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Shared Capture',
        });
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Capture-${Date.now()}.${extension}`;
        link.click();
      }
    } catch (err) {
      console.error("Photo share failed", err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedUrls.length === 0) return;
    if (confirm(`Permanently delete ${selectedUrls.length} items?`)) {
      onDeleteMultiplePhotos(selectedUrls);
      setIsSelectMode(false);
      setSelectedUrls([]);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black min-h-screen">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-xl z-10 pt-12 border-b border-white/5">
        <div className="flex items-center overflow-hidden">
          <button onClick={onBack} className="p-2 active:scale-75 transition-transform bg-zinc-900 rounded-full flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="ml-4 truncate">
            <h2 className="text-lg font-black truncate tracking-tight">{isSelectMode ? `${selectedUrls.length} Selected` : album.name}</h2>
            {!isSelectMode && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{photos.length} Items</p>}
          </div>
        </div>
        
        <div className="flex gap-2">
          {photos.length > 0 && (
            <button 
              onClick={toggleSelectMode}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isSelectMode ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}
            >
              {isSelectMode ? 'Cancel' : 'Select'}
            </button>
          )}
          {!isSelectMode && (
            <button onClick={handleShareAlbum} className="p-2.5 bg-zinc-900 rounded-full active:scale-90 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {isSelectMode && (
        <div className="bg-zinc-900 p-3 flex justify-between items-center px-6 border-b border-white/5 animate-in slide-in-from-top duration-200">
           <button 
             onClick={handleSelectAll}
             className="text-[10px] font-black uppercase tracking-widest text-blue-400"
           >
             {selectedUrls.length === photos.length ? 'Deselect All' : 'Select All'}
           </button>
        </div>
      )}

      <div className="flex-1 p-0.5">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-zinc-600">
            <div className="w-16 h-16 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center mb-4">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ready for Capture</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 pb-32">
            {photos.map((photo) => {
              const isSelected = selectedUrls.includes(photo.url);
              return (
                <div 
                  key={photo.id} 
                  className={`aspect-square bg-zinc-900 relative active:opacity-50 transition-all overflow-hidden ${isSelectMode && isSelected ? 'ring-4 ring-blue-500 ring-inset scale-95 z-10' : ''}`}
                  onClick={() => isSelectMode ? togglePhotoSelection(photo.url) : setSelectedPhoto(photo.url)}
                >
                  {photo.url.startsWith('blob:') ? (
                    <div className="w-full h-full relative">
                      <video src={photo.url} className="w-full h-full object-cover" />
                      {!isSelectMode && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <svg className="w-8 h-8 text-white/80" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    <img src={photo.url} className="w-full h-full object-cover" loading="lazy" alt="Gallery item" />
                  )}

                  {isSelectMode && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-black/20 border-white/50'}`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSelectMode && selectedUrls.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 pb-12 bg-zinc-900/90 backdrop-blur-2xl border-t border-white/10 flex gap-4 z-50 animate-in slide-in-from-bottom duration-300">
           <button 
             disabled={isSharing}
             onClick={handleShareSelected}
             className="flex-1 bg-white text-black h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
           >
             {isSharing ? (
               <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
             ) : (
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth={2}/></svg>
             )}
             Share Selected
           </button>
           <button 
             onClick={handleDeleteSelected}
             className="flex-1 bg-red-600 text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
             Delete
           </button>
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <header className="p-4 flex justify-between items-center pt-14 px-6 absolute top-0 left-0 right-0 z-10">
            <button onClick={() => setSelectedPhoto(null)} className="p-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 active:scale-75 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex gap-3">
              <button 
                disabled={isSharing}
                onClick={() => handleSharePhoto(selectedPhoto)}
                className="p-3 bg-white text-black rounded-full shadow-2xl active:scale-90 transition-transform disabled:opacity-50"
              >
                {isSharing ? (
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )}
              </button>
              <button 
                onClick={() => { if(confirm('Delete permanently?')) { onDeletePhoto(selectedPhoto); setSelectedPhoto(null); } }} 
                className="p-3 bg-red-600/20 text-red-500 rounded-full backdrop-blur-md active:scale-90 transition-transform"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-0">
             {selectedPhoto.startsWith('blob:') ? (
               <video src={selectedPhoto} controls autoPlay className="max-w-full max-h-full object-contain" />
             ) : (
               <img src={selectedPhoto} className="max-w-full max-h-full object-contain" alt="Enlarged" />
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumView;
