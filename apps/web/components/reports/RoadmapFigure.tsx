/**
 * "Adoption roadmap · 3 phases × 3 teams, exit gates per phase" from the
 * GenAI for Cloud DevOps & AIDLC survey, redrawn with the portal's theme tokens.
 */
const W = 188;
const COLS = [140, 344, 548] as const;
const HEAD_Y = 60;
const ROWS = [120, 204, 288] as const;
const GATE_Y = 372;

const PHASES = [
  { name: "Phase 1 基礎建置", time: "0–3 個月" },
  { name: "Phase 2 規模化", time: "3–9 個月" },
  { name: "Phase 3 受治理自主", time: "9–18 個月" },
];

const LANES = [
  {
    name: "Cloud／平台",
    cells: [
      ["CI 加入 SAST/SCA 關卡", "DevOps Agent 唯讀 RCA", "建立 DORA 基準線"],
      ["Kiro 試點 2–3 個團隊", "headless agent 進 CI", "Transform 批次升級"],
      ["Agent 自動修復低風險事件", "release 風險評估自動化", "全團隊 spec-driven"],
    ],
  },
  {
    name: "CCoE",
    cells: [
      ["安全基線寫成 steering", "IaC policy-as-code 守門", "Agent IAM 角色模型"],
      ["Terraform／CDK MCP 上線", "MCP server 白名單", "FinOps 成本異常調查"],
      ["Landing Zone 自動合規", "持續現代化每季批次", "跨雲 agent 治理"],
    ],
  },
  {
    name: "AICoE",
    cells: [
      ["AI 使用政策與工具清單", "Lethal Trifecta 審查表", "AI-DLC 工作坊"],
      ["AgentCore + MCP Gateway", "Agent 評測與紅隊", "OWASP ASI 威脅模型"],
      ["多 agent（A2A）協作", "依 Scoping Matrix 分級", "AI engineer 培訓路徑"],
    ],
  },
];

const GATES = [
  ["RCA 準確率經人工覆核", "CI 關卡涵蓋所有 repo"],
  ["變更失敗率未上升", "rework rate 持平或下降"],
  ["每季覆核 agent ROI", "不達標的用例即退場"],
];

const edge = "var(--control)";
const tint = "var(--raised)";
const accent = "var(--dot)";
const ink = "var(--text)";
const quiet = "var(--muted)";

function Cell({ x, y, h, filled }: { x: number; y: number; h: number; filled?: boolean }) {
  return <rect x={x} y={y} width={W} height={h} rx={8} fill={filled ? tint : "none"} stroke={edge} strokeWidth={1.25} />;
}

export function RoadmapFigure() {
  return (
    <svg
      viewBox="0 0 760 456"
      role="img"
      aria-label="Three phases: read-only and guardrails first, then scale, then governed autonomy"
      fontSize={11.5}
      className="h-auto w-full"
    >
      <defs>
        <marker id="road-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={edge} />
        </marker>
      </defs>
      <text x={24} y={28} fontSize={15} fontWeight={600} fill={ink}>
        三階段導入：先唯讀與守門，再規模化，最後受治理自主
      </text>
      <text x={24} y={46} fill={quiet}>
        Recommended roadmap by team · 每階段需通過出關條件才進入下一階段
      </text>
      <g fill="none" stroke={edge} strokeWidth={1.25}>
        <path d={`M${COLS[0] + W + 1} ${HEAD_Y + 24}H${COLS[1] - 1}`} markerEnd="url(#road-arrow)" />
        <path d={`M${COLS[1] + W + 1} ${HEAD_Y + 24}H${COLS[2] - 1}`} markerEnd="url(#road-arrow)" />
      </g>
      <text x={24} y={HEAD_Y + 28} fontSize={13} fontWeight={600} fill={quiet}>
        階段
      </text>
      {LANES.map((lane, i) => (
        <text key={lane.name} x={24} y={ROWS[i]! + 40} fontSize={13} fontWeight={600} fill={ink}>
          {lane.name}
        </text>
      ))}
      <text x={24} y={GATE_Y + 34} fontSize={13} fontWeight={600} fill={ink}>
        出關條件
      </text>

      {PHASES.map((p, c) => (
        <g key={p.name}>
          <Cell x={COLS[c]!} y={HEAD_Y} h={48} filled />
          <text x={COLS[c]! + 12} y={HEAD_Y + 21} fontSize={13} fontWeight={600} fill={ink}>
            {p.name}
          </text>
          <text x={COLS[c]! + 12} y={HEAD_Y + 38} fill={quiet}>
            {p.time}
          </text>
        </g>
      ))}

      {LANES.map((lane, r) =>
        lane.cells.map((lines, c) => (
          <g key={`${lane.name}-${c}`}>
            <Cell x={COLS[c]!} y={ROWS[r]!} h={72} />
            {lines.map((line, k) => (
              <text key={line} x={COLS[c]! + 12} y={ROWS[r]! + 22 + k * 18} fill={ink}>
                {line}
              </text>
            ))}
          </g>
        )),
      )}

      {GATES.map((lines, c) => {
        const x = COLS[c]!;
        return (
          <g key={lines[0]}>
            <Cell x={x} y={GATE_Y} h={60} />
            <path d={`M${x + 18} ${GATE_Y + 15}l7 7l-7 7l-7 -7z`} fill={accent} />
            {lines.map((line, k) => (
              <text key={line} x={x + 32} y={GATE_Y + 26 + k * 18} fill={ink}>
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
