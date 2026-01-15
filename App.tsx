
import React, { useState, useEffect } from 'react';
import { AppView, Album, Photo } from './types';
import GalleryHome from './components/GalleryHome';
import CameraInterface from './components/CameraInterface';
import AlbumView from './components/AlbumView';
import CreateAlbumModal from './components/CreateAlbumModal';

const INITIAL_ALBUMS: Album[] = [
  { id: '1', name: 'Travel', photoCount: 2, themeColor: '#3B82F6', coverPhotoUrl: 'https://picsum.photos/seed/vacation/400/400' },
  { id: '2', name: 'Work', photoCount: 1, themeColor: '#10B981', coverPhotoUrl: 'https://picsum.photos/seed/work/400/400' },
  { id: '3', name: 'Family', photoCount: 0, themeColor: '#EF4444', coverPhotoUrl: '' },
];

const INITIAL_PHOTOS: Photo[] = [
  { id: 'p1', albumId: '1', url: 'https://picsum.photos/seed/beach/800/800', timestamp: Date.now() - 100000 },
  { id: 'p2', albumId: '1', url: 'https://picsum.photos/seed/mountain/800/800', timestamp: Date.now() - 50000 },
  { id: 'p3', albumId: '2', url: 'https://picsum.photos/seed/office/800/800', timestamp: Date.now() - 20000 },
];

export default function App() {
  const [view, setView] = useState<AppView>('gallery');
  const [albums, setAlbums] = useState<Album[]>(INITIAL_ALBUMS);
  const [photos, setPhotos] = useState<Photo[]>(INITIAL_PHOTOS);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  useEffect(() => {
    const savedAlbums = localStorage.getItem('cnc_albums');
    const savedPhotos = localStorage.getItem('cnc_photos');
    if (savedAlbums) setAlbums(JSON.parse(savedAlbums));
    if (savedPhotos) setPhotos(JSON.parse(savedPhotos));
  }, []);

  const saveToLocal = (newAlbums: Album[], newPhotos: Photo[]) => {
    localStorage.setItem('cnc_albums', JSON.stringify(newAlbums));
    localStorage.setItem('cnc_photos', JSON.stringify(newPhotos));
  };

  const createAlbum = (name: string, themeColor: string) => {
    const newAlbum: Album = {
      id: Date.now().toString(),
      name,
      photoCount: 0,
      themeColor,
      coverPhotoUrl: '',
    };
    const updated = [...albums, newAlbum];
    setAlbums(updated);
    saveToLocal(updated, photos);
    setView('gallery');
  };

  const addPhotoToAlbum = (albumId: string, url: string) => {
    const newPhoto: Photo = {
      id: Date.now().toString(),
      albumId,
      url,
      timestamp: Date.now(),
    };
    const updatedPhotos = [newPhoto, ...photos];
    const updatedAlbums = albums.map(a => 
      a.id === albumId 
        ? { ...a, photoCount: a.photoCount + 1, coverPhotoUrl: a.coverPhotoUrl || url } 
        : a
    );
    setPhotos(updatedPhotos);
    setAlbums(updatedAlbums);
    saveToLocal(updatedAlbums, updatedPhotos);
  };

  const deletePhotosByUrls = (urls: string[]) => {
    if (urls.length === 0) return;
    
    // Find all unique album IDs affected to update counts correctly
    const affectedAlbumIds = new Set(photos.filter(p => urls.includes(p.url)).map(p => p.albumId));
    
    const updatedPhotos = photos.filter(p => !urls.includes(p.url));
    const updatedAlbums = albums.map(a => {
      if (affectedAlbumIds.has(a.id)) {
        const remainingInAlbum = updatedPhotos.filter(p => p.albumId === a.id);
        return {
          ...a,
          photoCount: remainingInAlbum.length,
          coverPhotoUrl: remainingInAlbum.length > 0 ? remainingInAlbum[0].url : ''
        };
      }
      return a;
    });

    setPhotos(updatedPhotos);
    setAlbums(updatedAlbums);
    saveToLocal(updatedAlbums, updatedPhotos);
    
    // Clean up blobs if they are revoked
    urls.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
  };

  const deletePhotoByUrl = (url: string) => {
    deletePhotosByUrls([url]);
  };

  const deleteAlbum = (id: string) => {
    const photosToDelete = photos.filter(p => p.albumId === id);
    photosToDelete.forEach(p => {
      if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
    });
    
    const updatedAlbums = albums.filter(a => a.id !== id);
    const updatedPhotos = photos.filter(p => p.albumId !== id);
    setAlbums(updatedAlbums);
    setPhotos(updatedPhotos);
    saveToLocal(updatedAlbums, updatedPhotos);
    if (selectedAlbumId === id) setView('gallery');
  };

  const renderView = () => {
    switch (view) {
      case 'gallery':
        return (
          <GalleryHome 
            albums={albums} 
            onSelectAlbum={(id) => { setSelectedAlbumId(id); setView('album-view'); }}
            onCreateAlbum={() => setView('create-album')}
            onOpenCamera={() => setView('camera')}
            onDeleteAlbum={deleteAlbum}
          />
        );
      case 'camera':
        return (
          <CameraInterface 
            albums={albums}
            onClose={() => setView('gallery')}
            onCapture={(albumId, url) => addPhotoToAlbum(albumId, url)}
            onDeletePhoto={(url) => deletePhotoByUrl(url)}
          />
        );
      case 'album-view':
        return selectedAlbumId ? (
          <AlbumView 
            album={albums.find(a => a.id === selectedAlbumId)!}
            photos={photos.filter(p => p.albumId === selectedAlbumId)}
            onBack={() => setView('gallery')}
            onDelete={() => deleteAlbum(selectedAlbumId)}
            onDeletePhoto={deletePhotoByUrl}
            onDeleteMultiplePhotos={deletePhotosByUrls}
          />
        ) : null;
      case 'create-album':
        return (
          <CreateAlbumModal 
            onClose={() => setView('gallery')}
            onSave={createAlbum}
          />
        );
      default:
        return <GalleryHome albums={albums} onSelectAlbum={() => {}} onCreateAlbum={() => {}} onOpenCamera={() => {}} onDeleteAlbum={() => {}} />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col max-w-md mx-auto relative overflow-hidden">
      {renderView()}
    </div>
  );
}
