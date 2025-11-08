import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Project,
  ProjectDeletionStrategy,
  ProjectSummary,
  ArtworkMetadata,
} from '../types';
import { FileManager } from './FileManager';

const PROJECTS_STORAGE_KEY = '@brushflow:projects';

type StoredProject = Omit<Project, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export class ProjectManager {
  private static instance: ProjectManager;
  private projects: Project[] = [];
  private listeners = new Set<(projects: Project[]) => void>();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    try {
      const stored = await AsyncStorage.getItem(PROJECTS_STORAGE_KEY);
      if (stored) {
        const parsed: StoredProject[] = JSON.parse(stored);
        this.projects = parsed.map(project => ({
          ...project,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        }));
        this.sortProjects();
      } else {
        this.projects = [];
      }
    } catch (error) {
      console.error('Failed to load projects from storage:', error);
      this.projects = [];
    }
  }

  async getProjects(): Promise<Project[]> {
    await this.initialize();
    return [...this.projects];
  }

  async getProjectSummaries(): Promise<ProjectSummary[]> {
    await this.initialize();
    const fileManager = FileManager.getInstance();
    const artworks = await fileManager.listArtworks();
    const counts = artworks.reduce<Record<string, number>>((acc, artwork) => {
      const projectId = artwork.projectId ?? 'unfiled';
      acc[projectId] = (acc[projectId] || 0) + 1;
      return acc;
    }, {});

    return this.projects.map(project => ({
      ...project,
      artworkCount: counts[project.id] || 0,
    }));
  }

  async createProject(name: string): Promise<Project> {
    await this.initialize();
    const normalized = name.trim();
    if (!normalized) {
      throw new Error('Project name is required.');
    }
    const MAX_LENGTH = 60;
    if (normalized.length > MAX_LENGTH) {
      throw new Error(`Project names must be under ${MAX_LENGTH} characters.`);
    }

    const duplicate = this.projects.find(
      project => project.name.toLowerCase() === normalized.toLowerCase(),
    );
    if (duplicate) {
      throw new Error('A project with that name already exists.');
    }

    const now = new Date();
    const project: Project = {
      id: this.generateProjectId(),
      name: normalized,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.push(project);
    this.sortProjects();
    await this.persist();
    this.emit();
    return project;
  }

  async renameProject(projectId: string, newName: string): Promise<Project> {
    await this.initialize();
    const normalized = newName.trim();
    if (!normalized) {
      throw new Error('Project name is required.');
    }

    const project = this.projects.find(entry => entry.id === projectId);
    if (!project) {
      throw new Error('Project not found.');
    }

    const duplicate = this.projects.find(
      entry =>
        entry.id !== projectId &&
        entry.name.toLowerCase() === normalized.toLowerCase(),
    );
    if (duplicate) {
      throw new Error('A project with that name already exists.');
    }

    project.name = normalized;
    project.updatedAt = new Date();
    this.sortProjects();
    await this.persist();
    this.emit();
    return project;
  }

  async deleteProject(
    projectId: string,
    strategy: ProjectDeletionStrategy,
  ): Promise<void> {
    await this.initialize();
    const projectIndex = this.projects.findIndex(entry => entry.id === projectId);
    if (projectIndex === -1) {
      throw new Error('Project not found.');
    }

    const fileManager = FileManager.getInstance();
    const artworks = await fileManager.listArtworks();
    const affectedArtworks = artworks.filter(
      artwork => artwork.projectId === projectId,
    );

    if (strategy === 'delete-artworks') {
      for (const artwork of affectedArtworks) {
        await fileManager.moveToTrash(artwork.id);
      }
    } else {
      for (const artwork of affectedArtworks) {
        await fileManager.updateArtworkProject(artwork.id, null);
      }
    }

    this.projects.splice(projectIndex, 1);
    await this.persist();
    this.emit();
  }

  async assignArtworkToProject(
    artworkId: string,
    projectId: string | null,
  ): Promise<void> {
    await this.initialize();
    const fileManager = FileManager.getInstance();
    await fileManager.updateArtworkProject(artworkId, projectId);
    let touched = false;
    if (projectId) {
      const project = this.projects.find(entry => entry.id === projectId);
      if (project) {
        project.updatedAt = new Date();
        touched = true;
      }
    }
    if (touched) {
      await this.persist();
    }
    this.emit();
  }

  async copyArtworkToProject(
    artworkId: string,
    projectId: string | null,
    name?: string,
  ): Promise<ArtworkMetadata> {
    await this.initialize();
    const fileManager = FileManager.getInstance();
    const duplicated = await fileManager.duplicateArtwork(artworkId, {
      targetProjectId: projectId,
      name,
    });
    let touched = false;
    if (projectId) {
      const project = this.projects.find(entry => entry.id === projectId);
      if (project) {
        project.updatedAt = new Date();
        touched = true;
      }
    }
    if (touched) {
      await this.persist();
    }
    this.emit();
    return duplicated;
  }

  subscribe(listener: (projects: Project[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = [...this.projects];
    this.listeners.forEach(listener => listener(snapshot));
  }

  private sortProjects() {
    this.projects.sort((a, b) =>
      a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()),
    );
  }

  private async persist() {
    try {
      const payload: StoredProject[] = this.projects.map(project => ({
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      }));
      await AsyncStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to persist projects:', error);
    }
  }

  private generateProjectId(): string {
    return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
}
