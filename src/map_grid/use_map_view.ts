import type { JSX } from "preact";
import { useEffect, useRef, useState } from "react";
import { baseCellPixels, dragging, notDragging } from "./constants.ts";
import type { Coordinate, CursorPosition, DragState, ViewportSize, ViewState } from "./types.ts";
import { centerViewOnCoordinate, screenToWorld, worldToScreen, zoomView } from "./view_math.ts";

type UseMapViewResult = {
  canvasRef: { current: HTMLDivElement | null };
  view: ViewState;
  size: ViewportSize;
  cellSize: number;
  origin: Coordinate;
  canvasStyle: string;
  isDragging: boolean;
  cursorPosition: CursorPosition | null;
  handlePointerDown: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
  handlePointerMove: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
  handlePointerEnd: (event: JSX.TargetedPointerEvent<HTMLDivElement>) => void;
  handlePointerLeave: () => void;
  handleWheel: (event: JSX.TargetedWheelEvent<HTMLDivElement>) => void;
  changeZoom: (multiplier: number) => void;
  getCenterCoordinate: () => Coordinate;
  centerOnCoordinate: (coordinate: Coordinate) => void;
};

export function useMapView(): UseMapViewResult {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [view, setView] = useState<ViewState>({ panX: 0, panY: 0, zoom: 1 });
  const [size, setSize] = useState<ViewportSize>(() => ({
    width: typeof globalThis.innerWidth === "number" ? globalThis.innerWidth : 0,
    height: typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 0,
  }));
  const [isDragging, setIsDragging] = useState(notDragging);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition | null>(null);
  const cellSize = baseCellPixels * view.zoom;
  const origin = worldToScreen({ x: 0, y: 0 }, view, size);
  const canvasStyle = [
    `--grid-cell: ${cellSize}px`,
    `--grid-major: ${cellSize * 5}px`,
    `--grid-origin-x: ${origin.x}px`,
    `--grid-origin-y: ${origin.y}px`,
  ].join(";");

  useEffect((): (() => void) | undefined => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const updateSize = (): void => {
      const rect = canvas.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new globalThis.ResizeObserver(updateSize);
    observer.observe(canvas);

    return (): void => observer.disconnect();
  }, []);

  function handlePointerDown(event: JSX.TargetedPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setIsDragging(dragging);
    setCursorPosition(getEventCursorPosition(event, view));
  }

  function handlePointerMove(event: JSX.TargetedPointerEvent<HTMLDivElement>): void {
    setCursorPosition(getEventCursorPosition(event, view));

    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setView((currentView) => ({
      ...currentView,
      panX: currentView.panX + deltaX,
      panY: currentView.panY + deltaY,
    }));
  }

  function handlePointerEnd(event: JSX.TargetedPointerEvent<HTMLDivElement>): void {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(notDragging);
    }
  }

  function handlePointerLeave(): void {
    if (!isDragging) {
      setCursorPosition(null);
    }
  }

  function handleWheel(event: JSX.TargetedWheelEvent<HTMLDivElement>): void {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const zoomFactor = Math.exp(-event.deltaY * 0.0012);

    setView((currentView) =>
      zoomView(
        currentView,
        currentView.zoom * zoomFactor,
        event.clientX - rect.left,
        event.clientY - rect.top,
        {
          width: rect.width,
          height: rect.height,
        },
      )
    );
  }

  function changeZoom(multiplier: number): void {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    setView((currentView) =>
      zoomView(currentView, currentView.zoom * multiplier, rect.width / 2, rect.height / 2, {
        width: rect.width,
        height: rect.height,
      })
    );
  }

  function getCenterCoordinate(): Coordinate {
    return screenToWorld(size.width / 2, size.height / 2, view, size);
  }

  function centerOnCoordinate(coordinate: Coordinate): void {
    setView((currentView) => centerViewOnCoordinate(currentView, coordinate));
  }

  return {
    canvasRef,
    view,
    size,
    cellSize,
    origin,
    canvasStyle,
    isDragging,
    cursorPosition,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    handlePointerLeave,
    handleWheel,
    changeZoom,
    getCenterCoordinate,
    centerOnCoordinate,
  };
}

function getEventCursorPosition(
  event: JSX.TargetedPointerEvent<HTMLDivElement>,
  currentView: ViewState,
): CursorPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };

  return {
    coordinate: screenToWorld(screen.x, screen.y, currentView, {
      width: rect.width,
      height: rect.height,
    }),
    screen,
  };
}
