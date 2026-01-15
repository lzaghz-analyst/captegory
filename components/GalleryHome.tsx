
import React, { useState } from 'react';
import { Album } from '../types';

interface GalleryHomeProps {
  albums: Album[];
  onSelectAlbum: (id: string) => void;
  onCreateAlbum: () => void;
  onOpenCamera: () => void;
  onDeleteAlbum: (id: string) => void;
}

const THEMES = [
  { name: 'Onyx', bg: 'bg-black', accent: 'text-white' },
  { name: 'Slate', bg: 'bg-zinc-900', accent: 'text-blue-400' },
  { name: 'Rose', bg: 'bg-stone-900', accent: 'text-rose-400' },
];

const GalleryHome: React.FC<GalleryHomeProps> = ({ albums, onSelectAlbum, onCreateAlbum, onOpenCamera, onDeleteAlbum }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES[0]);

  return (
    <div className={`flex-1 flex flex-col p-6 relative transition-colors duration-500 min-h-screen ${currentTheme.bg}`}>
      <header className="flex justify-between items-start mb-8 pt-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">Captures</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${isEditMode ? 'bg-red-500 border-red-500 text-white' : 'text-zinc-500 border-zinc-800'}`}
            >
              {isEditMode ? 'Finish' : 'Edit'}
            </button>
            <div className="flex gap-1.5 items-center bg-zinc-800/40 px-2 py-1 rounded-full border border-white/5">
              {THEMES.map(t => (
                <button 
                  key={t.name}
                  onClick={() => setCurrentTheme(t)}
                  className={`w-4 h-4 rounded-full ${t.bg} border border-white/10 ${currentTheme.name === t.name ? 'ring-2 ring-white scale-110' : 'opacity-40'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 pb-40">
        {albums.map((album) => (
          <div 
            key={album.id} 
            onClick={() => !isEditMode && onSelectAlbum(album.id)}
            className="group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-zinc-900 active:scale-95 transition-all duration-300 shadow-2xl border border-white/5"
          >
            {album.coverPhotoUrl ? (
              album.coverPhotoUrl.startsWith('blob:') ? (
                <video src={album.coverPhotoUrl} className="w-full h-full object-cover brightness-75" />
              ) : (
                <img src={album.coverPhotoUrl} alt={album.name} className="w-full h-full object-cover brightness-75" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-20" style={{ backgroundColor: album.themeColor }} />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="font-black text-lg truncate mb-0.5 tracking-tight">{album.name}</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{album.photoCount} Captures</p>
            </div>

            {isEditMode && (
              <button 
                onClick={(e) => { e.stopPropagation(); if(confirm(`Delete "${album.name}"?`)) onDeleteAlbum(album.id); }}
                className="absolute top-4 right-4 bg-red-600 p-2.5 rounded-full shadow-2xl z-10 active:scale-75 transition-transform"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        ))}
        
        <div 
          onClick={onCreateAlbum}
          className="aspect-[4/5] rounded-[2.5rem] border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center active:bg-zinc-800/30 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
            <span className="text-2xl font-light text-zinc-400">+</span>
          </div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Add Album</span>
        </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-30 w-full px-12 pointer-events-none">
        <button 
          onClick={onOpenCamera}
          className="pointer-events-auto w-full bg-white text-black h-16 rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_60px_rgba(0,0,0,0.8)] active:scale-95 transition-all flex items-center justify-center gap-4 border border-white/20"
        >
          <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
          Camera
        </button>
      </div>
    </div>
  );
};

export default GalleryHome;
