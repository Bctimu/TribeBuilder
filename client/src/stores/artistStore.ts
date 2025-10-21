import { create } from 'zustand';

export interface ArtistData {
  artistName: string;
  genre: string;
  bio: string;
}

export interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  uploadedAt: Date;
}

interface ArtistStore {
  artistData: ArtistData;
  mediaFiles: MediaFile[];
  updateArtistData: (data: Partial<ArtistData>) => void;
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
}

export const useArtistStore = create<ArtistStore>((set) => ({
  artistData: {
    artistName: '',
    genre: '',
    bio: '',
  },
  mediaFiles: [],
  updateArtistData: (data) =>
    set((state) => ({
      artistData: { ...state.artistData, ...data },
    })),
  addMediaFile: (file) =>
    set((state) => ({
      mediaFiles: [...state.mediaFiles, file],
    })),
  removeMediaFile: (id) =>
    set((state) => ({
      mediaFiles: state.mediaFiles.filter((file) => file.id !== id),
    })),
}));