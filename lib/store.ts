// 项目数据管理（内存存储，可扩展为数据库）
export interface Scene {
  id: string;
  order: number;
  timeStart: string;   // "0:00"
  timeEnd: string;     // "0:25"
  title: string;
  prompt: string;
  negativePrompt: string;
  duration: "5" | "10";
  status: "pending" | "generating" | "done" | "failed";
  taskId?: string;
  videoUrl?: string;
  errorMsg?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  totalDuration: string; // "3:30"
  scenes: Scene[];
  createdAt: number;
}

// 内存存储
const projects: Map<string, Project> = new Map();

export function getProject(id: string) {
  return projects.get(id) || null;
}

export function getAllProjects() {
  return Array.from(projects.values());
}

export function createProject(name: string, totalDuration: string): Project {
  const id = Date.now().toString(36);
  const project: Project = { id, name, totalDuration, scenes: [], createdAt: Date.now() };
  projects.set(id, project);
  return project;
}

export function addScene(projectId: string, scene: Omit<Scene, "id" | "status" | "createdAt" | "updatedAt">): Scene | null {
  const project = projects.get(projectId);
  if (!project) return null;
  const newScene: Scene = {
    ...scene,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  project.scenes.push(newScene);
  return newScene;
}

export function updateScene(projectId: string, sceneId: string, updates: Partial<Scene>) {
  const project = projects.get(projectId);
  if (!project) return null;
  const idx = project.scenes.findIndex(s => s.id === sceneId);
  if (idx === -1) return null;
  project.scenes[idx] = { ...project.scenes[idx], ...updates, updatedAt: Date.now() };
  return project.scenes[idx];
}

export function deleteScene(projectId: string, sceneId: string) {
  const project = projects.get(projectId);
  if (!project) return false;
  project.scenes = project.scenes.filter(s => s.id !== sceneId);
  return true;
}
