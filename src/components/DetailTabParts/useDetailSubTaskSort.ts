import React, { useCallback, useState } from 'react';
import { Project, Task } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface UseDetailSubTaskSortParams {
  tasks: Task[];
  filteredProjects: Project[];
  activeProjectInView: Project | null;
  handleSortSubTasks: (p: Project, groupTasks: Task[]) => Promise<void>;
}

export function useDetailSubTaskSort({
  tasks,
  filteredProjects,
  activeProjectInView,
  handleSortSubTasks,
}: UseDetailSubTaskSortParams) {
  const [isSortingSubTasks, setIsSortingSubTasks] = useState(false);

  const handleSortActiveOrAll = useCallback(async () => {
    setIsSortingSubTasks(true);
    try {
      const cleanFix = String(useAppStore.getState().fixedProjectCode || '').trim().toLowerCase();
      let targetProj: Project | null = null;

      if (cleanFix) {
        targetProj =
          filteredProjects.find(
            (p) =>
              String(p.code || '').trim().toLowerCase() === cleanFix ||
              String(p.id || '').trim().toLowerCase() === cleanFix ||
              String(p.name || '').trim().toLowerCase() === cleanFix
          ) ||
          filteredProjects[0] ||
          null;
      } else if (
        activeProjectInView &&
        (filteredProjects.length === 0 ||
          filteredProjects.some((p) => p.id === activeProjectInView.id))
      ) {
        targetProj = activeProjectInView;
      } else if (filteredProjects.length === 1) {
        targetProj = filteredProjects[0];
      } else {
        targetProj = activeProjectInView;
      }

      if (targetProj) {
        const projTasks = tasks.filter(
          (t) =>
            !t.isDeleted &&
            ((targetProj!.id && t.projectId ? t.projectId === targetProj!.id : false) ||
              (!t.projectId &&
                t.projectCode &&
                String(t.projectCode).trim().toLowerCase() ===
                  String(targetProj!.code).trim().toLowerCase()))
        );
        await handleSortSubTasks(targetProj, projTasks);
      } else if (filteredProjects && filteredProjects.length > 0) {
        for (const p of filteredProjects) {
          const projTasks = tasks.filter(
            (t) =>
              !t.isDeleted &&
              ((p.id && t.projectId ? t.projectId === p.id : false) ||
                (!t.projectId &&
                  t.projectCode &&
                  String(t.projectCode).trim().toLowerCase() ===
                    String(p.code).trim().toLowerCase()))
          );
          if (projTasks.length > 0) {
            await handleSortSubTasks(p, projTasks);
          }
        }
      }
    } catch (err) {
      console.error("Error sorting subtasks:", err);
    } finally {
      setIsSortingSubTasks(false);
    }
  }, [activeProjectInView, filteredProjects, tasks, handleSortSubTasks]);

  return {
    isSortingSubTasks,
    handleSortActiveOrAll,
  };
}
