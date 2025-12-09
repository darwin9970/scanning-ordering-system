import { useState, useCallback } from "react";
import type { PageComponent, PageComponentType } from "@/types";
import {
  generateId,
  getDefaultProps,
  getDefaultSize,
  COMPONENT_TYPES,
  CANVAS_WIDTH,
} from "../constants";

export function useComponents(initialComponents: PageComponent[] = []) {
  const [components, setComponents] = useState<PageComponent[]>(initialComponents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 历史记录
  const [history, setHistory] = useState<PageComponent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 记录历史
  const pushHistory = useCallback(
    (currentComponents: PageComponent[]) => {
      const snapshot = JSON.parse(JSON.stringify(currentComponents));
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex);
        newHistory.push(snapshot);
        if (newHistory.length > 50) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 50));
    },
    [historyIndex]
  );

  // 撤销
  const undo = useCallback(() => {
    if (historyIndex > 0 && history.length > 0) {
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      if (prevState) {
        setHistory((prev) => {
          const newHistory = [...prev];
          if (newHistory.length <= historyIndex) {
            newHistory.push(JSON.parse(JSON.stringify(components)));
          } else {
            newHistory[historyIndex] = JSON.parse(JSON.stringify(components));
          }
          return newHistory;
        });
        setHistoryIndex(prevIndex);
        setComponents(JSON.parse(JSON.stringify(prevState)));
        return true;
      }
    }
    return false;
  }, [historyIndex, history, components]);

  // 重做
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      if (nextState) {
        setHistoryIndex(nextIndex);
        setComponents(JSON.parse(JSON.stringify(nextState)));
        return true;
      }
    }
    return false;
  }, [historyIndex, history]);

  // 添加组件（自由画布模式）
  const addComponent = useCallback(
    (type: PageComponentType, position?: { x: number; y: number }) => {
      pushHistory(components);
      const defaultSize = getDefaultSize(type);
      const offset = (components.length % 5) * 20;
      const newComponent: PageComponent = {
        id: generateId(),
        type,
        title: COMPONENT_TYPES.find((t) => t.value === type)?.label || type,
        visible: true,
        props: getDefaultProps(type),
        x: position?.x ?? offset,
        y: position?.y ?? offset,
        width: defaultSize.width,
        height: defaultSize.height,
        zIndex: components.length + 1,
      };
      setComponents((prev) => [...prev, newComponent]);
      setSelectedId(newComponent.id);
      setHasChanges(true);
      return newComponent;
    },
    [components, pushHistory]
  );

  // 删除组件
  const deleteComponent = useCallback(
    (id: string) => {
      pushHistory(components);
      setComponents((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
      setHasChanges(true);
    },
    [components, pushHistory, selectedId]
  );

  // 更新组件（位置、尺寸等）
  const updateComponent = useCallback((id: string, updates: Partial<PageComponent>) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setHasChanges(true);
  }, []);

  // 移动组件位置
  const moveComponent = useCallback((id: string, deltaX: number, deltaY: number) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            x: Math.max(0, Math.min(CANVAS_WIDTH - (c.width || 100), (c.x || 0) + deltaX)),
            y: Math.max(0, (c.y || 0) + deltaY),
          };
        }
        return c;
      })
    );
    setHasChanges(true);
  }, []);

  // 切换可见性
  const toggleVisibility = useCallback((id: string) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));
  }, []);

  // 更新组件属性
  const updateProps = useCallback((id: string, props: Record<string, unknown>) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, props: { ...c.props, ...props } } : c))
    );
  }, []);

  // 更新组件标题
  const updateTitle = useCallback((id: string, title: string) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  // 重排序组件
  const reorderComponents = useCallback((newComponents: PageComponent[]) => {
    setComponents(newComponents);
  }, []);

  // 设置全部组件（导入/模板）
  const setAllComponents = useCallback(
    (newComponents: PageComponent[], recordHistory = true) => {
      if (recordHistory) pushHistory(components);
      setComponents(newComponents);
      setSelectedId(null);
      setHasChanges(true);
    },
    [components, pushHistory]
  );

  // 重置修改状态
  const resetChanges = useCallback(() => {
    setHasChanges(false);
  }, []);

  // 标记有修改
  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  // 获取选中的组件
  const selectedComponent = components.find((c) => c.id === selectedId);

  return {
    // 状态
    components,
    setComponents,
    selectedId,
    selectedComponent,
    hasChanges,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,

    // 操作
    addComponent,
    deleteComponent,
    toggleVisibility,
    updateProps,
    updateTitle,
    updateComponent,
    moveComponent,
    reorderComponents,
    setAllComponents,
    selectComponent: setSelectedId,
    pushHistory,
    undo,
    redo,
    resetChanges,
    markChanged,
  };
}

export type UseComponentsReturn = ReturnType<typeof useComponents>;
