"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { ActionBar } from "./ActionBar";
import { DrawerOnboarding, useDrawerOnboarding } from "./DrawerOnboarding";
import { PropertiesPanel } from "./PropertiesPanel";
import { ShortcutHelp } from "./ShortcutHelp";
import { StyleDock } from "./StyleDock";
import { ToolDock } from "./ToolDock";
import { SquareBoard } from "./SquareBoard";
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { isEditableTarget } from "./toolMeta";
import {
  useWhiteboard,
  type UseWhiteboardOptions,
  type WhiteboardController,
} from "./useWhiteboard";

export interface WhiteboardProps extends UseWhiteboardOptions {
  className?: string;
  /**
   * When false, omit all drawer chrome (tools/docks/properties).
   * Guessers should never see disabled drawing controls.
   */
  showToolbar?: boolean;
  /**
   * Grow to fill a flex parent: canvas takes remaining height.
   */
  fill?: boolean;
  /** Access the controller for sync / round resets. */
  controllerRef?: React.MutableRefObject<WhiteboardController | null>;
  /**
   * Optional game chrome (round / timer / word) rendered in the drawer top bar
   * beside undo/copy actions.
   */
  headerInfo?: React.ReactNode;
  /**
   * Optional right-column content under Properties (typically Chat).
   * Desktop drawer only.
   */
  aside?: React.ReactNode;
  /**
   * When true, Whiteboard owns the full drawer desktop/mobile chrome.
   * When false (legacy), canvas (+ optional thin toolbar) only.
   */
  immersive?: boolean;
  /** Undo / redo / copy / paste / delete strip. */
  showActionBar?: boolean;
  /** Properties dock + mobile Props sheet. */
  showProperties?: boolean;
  /** First-time drawer tip overlay. */
  showOnboarding?: boolean;
  /** Override StyleDock primary swatches. */
  colors?: readonly string[];
  /** Extra manual color sheets for StyleDock "More". */
  colorSheets?: readonly (readonly string[])[];
  /** Native color picker in StyleDock. */
  showColorPicker?: boolean;
  /** Demo-only: show bezier tool as "Line" (icon + label); logic unchanged. */
  bezierAsLine?: boolean;
}

/**
 * Production SVG whiteboard. Pass `isDrawer={false}` for read-only spectators.
 *
 * Sync surface (do not wire WebSockets here — leave to game layer):
 * - onShapeCreated / onShapeUpdated / onShapeDeleted
 * - onClear / onUndo / onRedo
 * - onShapesChange (throttled ~30fps snapshot)
 */
export function Whiteboard({
  className,
  showToolbar = true,
  fill = false,
  controllerRef,
  headerInfo,
  aside,
  immersive = true,
  showActionBar = true,
  showProperties = true,
  showOnboarding = true,
  colors,
  colorSheets,
  showColorPicker = true,
  bezierAsLine = false,
  ...options
}: WhiteboardProps) {
  const controller = useWhiteboard(options);
  const [propsOpen, setPropsOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const isDrawer = Boolean(options.isDrawer ?? true) && showToolbar;
  const onboarding = useDrawerOnboarding(
    isDrawer && immersive && showOnboarding,
  );

  if (controllerRef) {
    controllerRef.current = controller;
  }

  React.useEffect(() => {
    if (!isDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const isSlashHelp = mod && e.key === "/";
      const isQuestion = e.key === "?" || (e.key === "/" && e.shiftKey);
      if (isSlashHelp || isQuestion) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawer]);

  const styleDockProps = {
    tool: controller.tool,
    color: controller.strokeColor,
    onColorChange: controller.setStrokeColor,
    strokeColor: controller.strokeColor,
    strokeWidth: controller.strokeWidth,
    onStrokeWidthChange: controller.setStrokeWidth,
    snapToGrid: controller.snapToGrid,
    onSnapToGridChange: controller.setSnapToGrid,
    colors,
    colorSheets,
    showColorPicker,
  };

  // Spectator / guesser: canvas only — no disabled chrome
  if (!isDrawer) {
    return (
      <div
        className={cn(
          "flex w-full flex-col",
          fill ? "h-full min-h-0" : null,
          className,
        )}
      >
        <SquareBoard>
          <WhiteboardCanvas controller={controller} className="h-full w-full" />
        </SquareBoard>
      </div>
    );
  }

  if (!immersive) {
    return (
      <div
        className={cn(
          "relative flex w-full flex-col gap-2",
          fill ? "h-full min-h-0" : null,
          className,
        )}
      >
        <SquareBoard>
          <WhiteboardCanvas
            controller={controller}
            className="h-full w-full"
            onRequestProperties={
              showProperties ? () => setPropsOpen(true) : undefined
            }
          />
        </SquareBoard>
        <StyleDock {...styleDockProps} className="shrink-0" />
        <ShortcutHelp
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
      </div>
    );
  }

  const showRightColumn = showProperties || Boolean(aside);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-2",
        fill ? "h-full min-h-0" : null,
        className,
      )}
    >
      {/* Top bar: game info + optional actions */}
      {(headerInfo || showActionBar) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-plum/15 bg-white/95 px-2 py-1.5 shadow-sm sm:px-3">
          {headerInfo ? (
            <div className="min-w-0 flex-1">{headerInfo}</div>
          ) : null}
          {showActionBar ? (
            <ActionBar
              controller={controller}
              className="ml-auto"
              onOpenShortcuts={() => setShortcutsOpen(true)}
            />
          ) : null}
        </div>
      )}

      {/* Desktop drawer workspace */}
      <div className="hidden min-h-0 flex-1 gap-2 lg:flex">
        <ToolDock
          tool={controller.tool}
          onToolChange={controller.setTool}
          orientation="vertical"
          className="shrink-0 self-start"
          bezierAsLine={bezierAsLine}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <SquareBoard>
            <WhiteboardCanvas
              controller={controller}
              className="h-full w-full"
              onRequestProperties={
                showProperties ? () => setPropsOpen(true) : undefined
              }
            />
          </SquareBoard>
          <StyleDock
            {...styleDockProps}
            className="shrink-0 justify-center"
          />
        </div>

        {showRightColumn ? (
          <div className="flex w-[17rem] shrink-0 flex-col gap-2 xl:w-[19rem]">
            {showProperties ? (
              <PropertiesPanel
                controller={controller}
                variant="dock"
                className="max-h-[45%] overflow-y-auto"
              />
            ) : null}
            {aside ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {aside}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Mobile drawer workspace */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-1.5 lg:hidden">
        <SquareBoard className="min-h-0 flex-1">
          <WhiteboardCanvas
            controller={controller}
            className="h-full w-full"
            onRequestProperties={
              showProperties ? () => setPropsOpen(true) : undefined
            }
          />
        </SquareBoard>

        {/* Floating color palette — sits above the tool strip */}
        <div className="pointer-events-none absolute bottom-[5.75rem] left-2 right-2 z-10 flex justify-center sm:bottom-[6.25rem]">
          <div className="pointer-events-auto max-w-full overflow-x-auto">
            <StyleDock {...styleDockProps} floating />
          </div>
        </div>

        {/* Swipeable tool strip */}
        <ToolDock
          tool={controller.tool}
          onToolChange={controller.setTool}
          orientation="horizontal"
          className="shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]"
          bezierAsLine={bezierAsLine}
        />

        {/* Properties bottom sheet */}
        {showProperties ? (
          propsOpen ? (
            <div className="absolute inset-x-0 bottom-0 z-30">
              <button
                type="button"
                aria-label="Dismiss properties"
                className="absolute inset-x-0 bottom-full h-screen bg-ink/25"
                onClick={() => setPropsOpen(false)}
              />
              <PropertiesPanel
                controller={controller}
                variant="sheet"
                onClose={() => setPropsOpen(false)}
                className="relative shadow-lg"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPropsOpen(true)}
              className="absolute right-2 top-2 z-10 min-h-11 rounded-full border border-plum/20 bg-white/95 px-3 text-xs font-semibold text-plum shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
            >
              Props
            </button>
          )
        ) : null}
      </div>

      {onboarding.visible ? (
        <DrawerOnboarding onDismiss={onboarding.dismiss} />
      ) : null}

      <ShortcutHelp
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
