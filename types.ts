
export interface Photo {
  id: string;
  albumId: string;
  url: string;
  timestamp: number;
}

export interface Album {
  id: string;
  name: string;
  coverPhotoUrl?: string;
  photoCount: number;
  themeColor: string;
}

export type AppView = 'gallery' | 'camera' | 'album-view' | 'create-album';
