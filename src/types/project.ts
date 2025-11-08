export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSummary extends Project {
  artworkCount: number;
}

export type ProjectDeletionStrategy = 'delete-artworks' | 'move-to-unfiled';
