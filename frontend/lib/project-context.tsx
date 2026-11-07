"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getContributions, getProjects } from "./api";
import type { Contribution, Project } from "./types";

interface Ctx {
  project: Project | null;
  contributions: Contribution[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setProject: (p: Project) => void;
}

const ProjectContext = createContext<Ctx | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const projects = await getProjects();
      if (!projects.length) throw new Error("No demo project found. Restart the backend to re-seed.");
      setProject(projects[0]);
      setContributions(await getContributions(projects[0].id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // initial fetch from the API on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ project, contributions, loading, error, refresh, setProject }), [project, contributions, loading, error, refresh]);
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used inside ProjectProvider");
  return ctx;
}
