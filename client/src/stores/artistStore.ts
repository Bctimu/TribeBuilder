import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  uploadedAt: string; // Store as ISO string for localStorage compatibility
}

export interface UploadedFile {
  id: string;
  source_url: string;
  source_type: string;
  processed_at: string;
  created_at: string;
  transcript_length: number;
  persona_name?: string;
  artist_name?: string;
}

interface ArtistStore {
  artistData: ArtistData;
  mediaFiles: MediaFile[];
  uploadedFiles: UploadedFile[];
  updateArtistData: (data: Partial<ArtistData>) => void;
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (id: string) => void;
  setUploadedFiles: (files: UploadedFile[]) => void;
  clearArtistData: () => void;
}

export const useArtistStore = create<ArtistStore>()(
  persist(
    (set) => ({
      artistData: {
        artistName: '',
        genre: '',
        bio: '',
      },
      mediaFiles: [],
      uploadedFiles: [],
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
      setUploadedFiles: (files) =>
        set({
          uploadedFiles: files,
        }),
      clearArtistData: () =>
        set({
          artistData: {
            artistName: '',
            genre: '',
            bio: '',
          },
          mediaFiles: [],
          uploadedFiles: [],
        }),
    }),
    {
      name: 'artist-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);