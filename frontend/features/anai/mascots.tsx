import type { ReactNode } from "react";
import { colors } from "@/lib/colors";

const C = colors;

/* ─── Shared frame ───────────────────────────────────────────── */

function Frame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="70 8 180 214"
      className="anai-svg h-full w-full"
      fill="none"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

function wavePath(cx: number, cy: number, w: number): string {
  const x = cx - w / 2;
  return `M ${x} ${cy} l ${w * 0.15} 0 l ${w * 0.09} -7 ${w * 0.12} 14 ${w * 0.1} -10 ${w * 0.07} 6 l ${w * 0.18} 0`;
}

/* Two-prong gripper — opening faces along `rotate` (0 = up) */

function LegoHand({
  cx,
  cy,
  rotate,
  color,
}: {
  cx: number;
  cy: number;
  rotate: number;
  color: string;
}) {
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <rect x={cx - 4.2} y={cy - 1.5} width={8.4} height={5} rx={2} fill={color} />
      <rect x={cx - 4.2} y={cy - 10} width={3.2} height={9} rx={1.6} fill={color} />
      <rect x={cx + 1} y={cy - 10} width={3.2} height={9} rx={1.6} fill={color} />
    </g>
  );
}

function RoboArm({
  side,
  pose,
  shoulderX,
  shoulderY,
  armColor,
  jointColor,
  handColor,
  children,
}: {
  side: "left" | "right";
  pose: "up" | "down";
  shoulderX: number;
  shoulderY: number;
  armColor: string;
  jointColor: string;
  handColor: string;
  children?: ReactNode;
}) {
  const dir = side === "left" ? -1 : 1;

  const elbowX = shoulderX + dir * 14;
  const elbowY = pose === "up" ? shoulderY - 12 : shoulderY + 8;
  const wristX = elbowX + dir * 10;
  const wristY = pose === "up" ? elbowY - 8 : elbowY + 8;

  const clawRotate =
    pose === "up"
      ? side === "left"
        ? -145
        : 145
      : side === "left"
        ? -50
        : 50;

  return (
    <g
      className={side === "left" ? "anai-arm-left" : "anai-arm-right"}
      style={{ transformOrigin: `${shoulderX}px ${shoulderY}px` }}
    >
      <circle cx={shoulderX} cy={shoulderY} r={4} fill={jointColor} />
      <line
        x1={shoulderX}
        y1={shoulderY}
        x2={elbowX}
        y2={elbowY}
        stroke={armColor}
        strokeWidth={5.5}
        strokeLinecap="round"
      />
      <circle cx={elbowX} cy={elbowY} r={3.5} fill={jointColor} />
      <line
        x1={elbowX}
        y1={elbowY}
        x2={wristX}
        y2={wristY}
        stroke={armColor}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <circle cx={wristX} cy={wristY} r={2.8} fill={jointColor} />
      <LegoHand cx={wristX} cy={wristY} rotate={clawRotate} color={handColor} />
      {children}
    </g>
  );
}

function Wheel({
  cx,
  cy,
  r,
  rimColor,
  hubColor,
  side,
}: {
  cx: number;
  cy: number;
  r: number;
  rimColor: string;
  hubColor: string;
  side: "left" | "right";
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={rimColor} />
      <g
        className={side === "left" ? "anai-wheel-left" : "anai-wheel-right"}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <line
          x1={cx - r * 0.5}
          y1={cy}
          x2={cx + r * 0.5}
          y2={cy}
          stroke={hubColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy - r * 0.5}
          x2={cx}
          y2={cy + r * 0.5}
          stroke={hubColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
      <circle cx={cx} cy={cy} r={r * 0.28} fill={hubColor} />
    </g>
  );
}

const CX = 160;
const HEAD_Y = 78;
const HEAD_R = 32;
const BODY_W = 54;
const BODY_H = 48;
const BODY_RX = 12;
const SCREEN_W = 32;
const SCREEN_H = 18;
const WHEEL_R = 10;
const WHEEL_GAP = 16;
const ANT_H = 20;
const BALL_R = 5.5;
const VENTS = 3;

const HEAD_TOP = HEAD_Y - HEAD_R;
const BODY_TOP = HEAD_Y + HEAD_R - 6;
const BODY_LEFT = CX - BODY_W / 2;
const BODY_RIGHT = CX + BODY_W / 2;
const BODY_BOT = BODY_TOP + BODY_H;
const SCREEN_CY = BODY_TOP + BODY_H * 0.5;
const ARM_Y = BODY_TOP + BODY_H * 0.28;
const WHEEL_Y = BODY_BOT + 16;
const ANT_TIP = HEAD_TOP - ANT_H;
const VISOR_W = HEAD_R * 1.5;
const VISOR_H = HEAD_R * 0.62;
const EYE_S = Math.max(5, HEAD_R * 0.24);

/** Head + antenna + visor only — used as the in-game bot avatar. */
export function AnaiFace({ className }: { className?: string }) {
  return (
    <svg
      viewBox="118 8 84 110"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <AnaiFaceMarks />
    </svg>
  );
}

function AnaiFaceMarks({ antennaClassName }: { antennaClassName?: string }) {
  return (
    <>
      <line
        x1={CX}
        y1={HEAD_TOP}
        x2={CX}
        y2={ANT_TIP}
        stroke={C.plum}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle
        className={antennaClassName}
        cx={CX}
        cy={ANT_TIP - BALL_R}
        r={BALL_R}
        fill={C.pink}
      />
      <circle cx={CX} cy={HEAD_Y} r={HEAD_R} fill={C.chartreuse} />
      <rect
        x={CX - VISOR_W / 2}
        y={HEAD_Y - VISOR_H / 2}
        width={VISOR_W}
        height={VISOR_H}
        rx={VISOR_H / 2}
        fill={C.ink}
        fillOpacity={0.88}
      />
      <rect
        x={CX - EYE_S * 1.4 - EYE_S / 2}
        y={HEAD_Y - EYE_S / 2}
        width={EYE_S}
        height={EYE_S}
        rx={1.4}
        fill={C.pink}
      />
      <rect
        x={CX + EYE_S * 1.4 - EYE_S / 2}
        y={HEAD_Y - EYE_S / 2}
        width={EYE_S}
        height={EYE_S}
        rx={1.4}
        fill={C.pink}
      />
      <circle
        cx={CX - EYE_S * 1.4 + 1}
        cy={HEAD_Y - EYE_S * 0.22}
        r={1.6}
        fill={C.whitePure}
        fillOpacity={0.75}
      />
      <circle
        cx={CX + EYE_S * 1.4 + 1}
        cy={HEAD_Y - EYE_S * 0.22}
        r={1.6}
        fill={C.whitePure}
        fillOpacity={0.75}
      />
    </>
  );
}

export function AnaiFigure({
  leftHand,
  rightHand,
}: {
  leftHand?: ReactNode;
  rightHand?: ReactNode;
} = {}) {
  return (
    <>
      <AnaiFaceMarks antennaClassName="anai-antenna-ball" />

      <RoboArm
        side="left"
        pose="up"
        shoulderX={BODY_LEFT}
        shoulderY={ARM_Y}
        armColor={C.plum}
        jointColor={C.chartreuse}
        handColor={C.plum}
      >
        {leftHand}
      </RoboArm>
      <RoboArm
        side="right"
        pose="down"
        shoulderX={BODY_RIGHT}
        shoulderY={ARM_Y}
        armColor={C.plum}
        jointColor={C.chartreuse}
        handColor={C.plum}
      >
        {rightHand}
      </RoboArm>

      <rect
        x={BODY_LEFT}
        y={BODY_TOP}
        width={BODY_W}
        height={BODY_H}
        rx={BODY_RX}
        fill={C.green}
      />
      {Array.from({ length: VENTS }).map((_, i) => {
        const vy = BODY_TOP + 10 + i * ((BODY_H - 20) / Math.max(VENTS, 1));
        return (
          <g key={i}>
            <line
              x1={BODY_RIGHT + 2}
              y1={vy}
              x2={BODY_RIGHT + 12}
              y2={vy}
              stroke={C.plum}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeOpacity={0.4}
            />
            <line
              x1={BODY_LEFT - 12}
              y1={vy}
              x2={BODY_LEFT - 2}
              y2={vy}
              stroke={C.plum}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeOpacity={0.4}
            />
          </g>
        );
      })}

      <rect
        x={CX - SCREEN_W / 2}
        y={SCREEN_CY - SCREEN_H / 2}
        width={SCREEN_W}
        height={SCREEN_H}
        rx={4}
        fill={C.plum}
        fillOpacity={0.18}
      />
      <path
        d={wavePath(CX, SCREEN_CY, SCREEN_W - 8)}
        stroke={C.pink}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <rect
        x={CX - WHEEL_GAP - 4}
        y={BODY_BOT}
        width={8}
        height={14}
        rx={3}
        fill={C.green}
      />
      <rect
        x={CX + WHEEL_GAP - 4}
        y={BODY_BOT}
        width={8}
        height={14}
        rx={3}
        fill={C.green}
      />

      <Wheel
        cx={CX - WHEEL_GAP}
        cy={WHEEL_Y}
        r={WHEEL_R}
        rimColor={C.plum}
        hubColor={C.chartreuse}
        side="left"
      />
      <Wheel
        cx={CX + WHEEL_GAP}
        cy={WHEEL_Y}
        r={WHEEL_R}
        rimColor={C.plum}
        hubColor={C.chartreuse}
        side="right"
      />
    </>
  );
}

export function MascotAnAI() {
  return (
    <Frame label="AnAI robot mascot">
      <AnaiFigure />
    </Frame>
  );
}

export const ANAI_MASCOTS = [
  {
    id: "anai",
    name: "AnAI",
    title: "AnAI 1.3 Pro",
    description:
      "Animated: antenna blinks, wheels spin, arms sway. Left arm up, right arm down. Lego gripper hands. Emotionless.",
    Component: MascotAnAI,
  },
];
