import { useState, useCallback, useRef } from "react";
import type { PageComponent, PageComponentType } from "@/types";
import {
  generateId,
  getDefaultProps,
  getDefaultSize,
  COMPONENT_TYPES,
  CANVAS_WIDTH,
  CANVAS_MAX_HEIGHT,
} from "../constants";

export function useComponents(initialComponents: PageComponent[] = []) {
  const [components, setComponents] = useState<PageComponent[]>(initialComponents);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 剪贴板
  const clipboardRef = useRef<PageComponent | null>(null);

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

  // 计算吸附位置
  const calculateSnap = useCallback(
    (
      id: string,
      newX: number,
      newY: number,
      width: number,
      height: number
    ): { x: number; y: number } => {
      const SNAP_THRESHOLD = 8;
      let snapX = newX;
      let snapY = newY;

      // 画布中心线
      const centerX = CANVAS_WIDTH / 2;

      // 当前组件的边界
      const left = newX;
      const right = newX + width;
      const centerComponentX = newX + width / 2;
      const top = newY;
      const bottom = newY + height;
      const centerComponentY = newY + height / 2;

      // 吸附到画布中心
      if (Math.abs(centerComponentX - centerX) < SNAP_THRESHOLD) {
        snapX = centerX - width / 2;
      }

      // 吸附到其他组件
      components.forEach((comp) => {
        if (comp.id === id) return;
        const compX = comp.x ?? 0;
        const compY = comp.y ?? 0;
        const compW = comp.width ?? 200;
        const compH = comp.height ?? 100;
        const compRight = compX + compW;
        const compBottom = compY + compH;
        const compCenterX = compX + compW / 2;
        const compCenterY = compY + compH / 2;

        // 水平吸附
        if (Math.abs(left - compX) < SNAP_THRESHOLD) snapX = compX;
        else if (Math.abs(right - compRight) < SNAP_THRESHOLD) snapX = compRight - width;
        else if (Math.abs(left - compRight) < SNAP_THRESHOLD) snapX = compRight;
        else if (Math.abs(right - compX) < SNAP_THRESHOLD) snapX = compX - width;
        else if (Math.abs(centerComponentX - compCenterX) < SNAP_THRESHOLD)
          snapX = compCenterX - width / 2;

        // 垂直吸附
        if (Math.abs(top - compY) < SNAP_THRESHOLD) snapY = compY;
        else if (Math.abs(bottom - compBottom) < SNAP_THRESHOLD) snapY = compBottom - height;
        else if (Math.abs(top - compBottom) < SNAP_THRESHOLD) snapY = compBottom;
        else if (Math.abs(bottom - compY) < SNAP_THRESHOLD) snapY = compY - height;
        else if (Math.abs(centerComponentY - compCenterY) < SNAP_THRESHOLD)
          snapY = compCenterY - height / 2;
      });

      return { x: snapX, y: snapY };
    },
    [components]
  );

  // 移动组件位置（带吸附）
  const moveComponent = useCallback(
    (id: string, deltaX: number, deltaY: number) => {
      setComponents((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            const width = c.width || 100;
            const height = c.height || 100;
            let newX = (c.x || 0) + deltaX;
            let newY = (c.y || 0) + deltaY;

            // 限制在画布范围内
            // X 轴：不能超出画布左右边界
            newX = Math.max(0, Math.min(CANVAS_WIDTH - width, newX));
            // Y 轴：不能超出画布顶部，也不能延伸到 TabBar 区域
            // 组件底部（newY + height）不能超过画布最大高度
            const maxY = CANVAS_MAX_HEIGHT - height;
            newY = Math.max(0, Math.min(maxY, newY));

            // 应用吸附
            const snapped = calculateSnap(id, newX, newY, width, height);

            // 再次限制边界（确保吸附后也不超出范围）
            const finalMaxY = CANVAS_MAX_HEIGHT - height;
            return {
              ...c,
              x: Math.max(0, Math.min(CANVAS_WIDTH - width, snapped.x)),
              y: Math.max(0, Math.min(finalMaxY, snapped.y)),
            };
          }
          return c;
        })
      );
      setHasChanges(true);
    },
    [calculateSnap]
  );

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

  // 锁定/解锁组件
  const toggleLock = useCallback((id: string) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c)));
    setHasChanges(true);
  }, []);

  // 复制组件到剪贴板
  const copyComponent = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (comp) {
        clipboardRef.current = JSON.parse(JSON.stringify(comp));
      }
    },
    [components]
  );

  // 粘贴组件
  const pasteComponent = useCallback(() => {
    if (!clipboardRef.current) return null;

    pushHistory(components);
    const original = clipboardRef.current;
    const newComponent: PageComponent = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateId(),
      x: (original.x ?? 0) + 20,
      y: (original.y ?? 0) + 20,
      zIndex: components.length + 1,
    };
    setComponents((prev) => [...prev, newComponent]);
    setSelectedId(newComponent.id);
    setHasChanges(true);
    return newComponent;
  }, [components, pushHistory]);

  // 复制当前组件（快捷复制）
  const duplicateComponent = useCallback(
    (id: string) => {
      const comp = components.find((c) => c.id === id);
      if (!comp) return null;

      pushHistory(components);
      const newComponent: PageComponent = {
        ...JSON.parse(JSON.stringify(comp)),
        id: generateId(),
        x: (comp.x ?? 0) + 20,
        y: (comp.y ?? 0) + 20,
        zIndex: components.length + 1,
      };
      setComponents((prev) => [...prev, newComponent]);
      setSelectedId(newComponent.id);
      setHasChanges(true);
      return newComponent;
    },
    [components, pushHistory]
  );

  // 上移一层
  const bringForward = useCallback((id: string) => {
    setComponents((prev) => {
      const sorted = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      const index = sorted.findIndex((c) => c.id === id);
      if (index === -1 || index === sorted.length - 1) return prev;

      const currentZ = sorted[index].zIndex ?? 0;
      const nextZ = sorted[index + 1].zIndex ?? 0;

      return prev.map((c) => {
        if (c.id === id) return { ...c, zIndex: nextZ };
        if (c.id === sorted[index + 1].id) return { ...c, zIndex: currentZ };
        return c;
      });
    });
    setHasChanges(true);
  }, []);

  // 下移一层
  const sendBackward = useCallback((id: string) => {
    setComponents((prev) => {
      const sorted = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      const index = sorted.findIndex((c) => c.id === id);
      if (index === -1 || index === 0) return prev;

      const currentZ = sorted[index].zIndex ?? 0;
      const prevZ = sorted[index - 1].zIndex ?? 0;

      return prev.map((c) => {
        if (c.id === id) return { ...c, zIndex: prevZ };
        if (c.id === sorted[index - 1].id) return { ...c, zIndex: currentZ };
        return c;
      });
    });
    setHasChanges(true);
  }, []);

  // 置顶
  const bringToFront = useCallback(
    (id: string) => {
      const maxZ = Math.max(...components.map((c) => c.zIndex ?? 0));
      setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, zIndex: maxZ + 1 } : c)));
      setHasChanges(true);
    },
    [components]
  );

  // 置底
  const sendToBack = useCallback(
    (id: string) => {
      const minZ = Math.min(...components.map((c) => c.zIndex ?? 0));
      setComponents((prev) =>
        prev.map((c) => {
          if (c.id === id) return { ...c, zIndex: minZ - 1 };
          return c;
        })
      );
      setHasChanges(true);
    },
    [components]
  );

  // 微移动组件
  const nudgeComponent = useCallback(
    (id: string, direction: "up" | "down" | "left" | "right", amount: number = 1) => {
      setComponents((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.locked) return c;
          const x = c.x ?? 0;
          const y = c.y ?? 0;
          const width = c.width ?? 100;
          const height = c.height ?? 100;

          switch (direction) {
            case "up":
              return { ...c, y: Math.max(0, y - amount) };
            case "down":
              // Y 轴无最大限制（可以向下无限滚动）
              return { ...c, y: y + amount };
            case "left":
              return { ...c, x: Math.max(0, x - amount) };
            case "right":
              return { ...c, x: Math.min(CANVAS_WIDTH - width, x + amount) };
            default:
              return c;
          }
        })
      );
      setHasChanges(true);
    },
    []
  );

  // 调整组件尺寸（带历史记录）
  const resizeComponent = useCallback((id: string, width: number, height: number) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.locked) return c;
        return {
          ...c,
          width: Math.max(20, Math.min(CANVAS_WIDTH, width)),
          height: Math.max(20, height),
        };
      })
    );
    setHasChanges(true);
  }, []);

  // 调整尺寸开始时记录历史
  const startResize = useCallback(
    (id: string) => {
      pushHistory(components);
    },
    [components, pushHistory]
  );

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
    hasClipboard: clipboardRef.current !== null,

    // 基础操作
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

    // 新增功能
    toggleLock,
    copyComponent,
    pasteComponent,
    duplicateComponent,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    nudgeComponent,
    resizeComponent,
    startResize,
  };
}

export type UseComponentsReturn = ReturnType<typeof useComponents>;
