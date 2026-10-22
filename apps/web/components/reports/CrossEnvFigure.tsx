/**
 * "Cross-environment agent collaboration" reference architecture from the
 * Kiro Crew survey, redrawn with the portal's theme tokens.
 */
const ink = "var(--text)";
const quiet = "var(--muted)";
const edge = "var(--control)";
const accent = "var(--dot)";
const tint = "var(--raised)";

function Box({ x, y, w, h, filled }: { x: number; y: number; w: number; h: number; filled?: boolean }) {
  return <rect x={x} y={y} width={w} height={h} rx={8} fill={filled ? tint : "none"} stroke={edge} strokeWidth={1.25} />;
}

/** Two-line box: a bold name and a quiet detail line, left-aligned. */
function Card({ x, y, w, h, name, line, filled }: { x: number; y: number; w: number; h: number; name: string; line: string; filled?: boolean }) {
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} filled={filled} />
      <text x={x + 12} y={y + 24} fontWeight={600} fill={ink}>
        {name}
      </text>
      <text x={x + 12} y={y + 42} fontSize={11.5} fill={quiet}>
        {line}
      </text>
    </g>
  );
}

export function CrossEnvFigure() {
  return (
    <svg
      viewBox="0 0 760 488"
      role="img"
      aria-label="跨環境協作：A2A 連接受管 agent，Kiro Crew 自成一區"
      fontSize={13}
      className="h-auto w-full"
    >
      <defs>
        <marker id="xenv-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={edge} />
        </marker>
        <marker id="xenv-arrow-accent" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={accent} />
        </marker>
      </defs>
      <text x={24} y={28} fontSize={15} fontWeight={600} fill={ink}>
        跨環境協作：A2A 連接受管 agent，Kiro Crew 自成一區
      </text>
      <text x={24} y={48} fontSize={11.5} fill={quiet}>
        強調色為 A2A 路徑；虛線為需自建的連接
      </text>

      <rect x={24} y={140} width={380} height={264} rx={8} fill="none" stroke={edge} strokeDasharray="2 3" />
      <text x={130} y={164} fontWeight={600} fill={ink}>
        自架工作區（Kiro Crew）
      </text>
      <text x={40} y={380} fontSize={11.5} fill={quiet}>
        跨主機為自有通道代理，不是 A2A
      </text>
      <text x={40} y={396} fontSize={11.5} fill={quiet}>
        虛線：接入 AgentCore 需自建 A2A 端點
      </text>

      <rect x={424} y={140} width={312} height={264} rx={8} fill="none" stroke={edge} strokeDasharray="2 3" />
      <text x={440} y={162} fontWeight={600} fill={ink}>
        AWS 帳號（AgentCore）
      </text>

      <g fill="none" stroke={edge} strokeWidth={1.25}>
        <path d="M114 112V180" markerEnd="url(#xenv-arrow)" />
        <path d="M314 112V180" markerEnd="url(#xenv-arrow)" />
        <path d="M214 236V268H122V300" markerEnd="url(#xenv-arrow)" />
        <path d="M214 268H306V300" markerEnd="url(#xenv-arrow)" />
        <path d="M580 316V340" markerEnd="url(#xenv-arrow)" />
        <path d="M580 392V424" markerEnd="url(#xenv-arrow)" />
        <path d="M364 208H444" strokeDasharray="5 4" markerEnd="url(#xenv-arrow)" />
      </g>
      <g fill="none" stroke={accent} strokeWidth={2}>
        <path d="M646 120V180" markerEnd="url(#xenv-arrow-accent)" />
        <path d="M580 236V264" markerEnd="url(#xenv-arrow-accent)" />
      </g>

      <Box x={24} y={72} w={180} h={40} />
      <text x={114} y={96} textAnchor="middle" fill={ink}>
        IDE／桌面 app
      </text>
      <Box x={224} y={72} w={180} h={40} />
      <text x={314} y={96} textAnchor="middle" fill={ink}>
        Slack／Teams
      </text>
      <Box x={556} y={72} w={180} h={48} />
      <text x={646} y={92} textAnchor="middle" fontWeight={600} fill={ink}>
        其他雲的 agent
      </text>
      <text x={646} y={110} textAnchor="middle" fontSize={11.5} fill={quiet}>
        Google、Microsoft
      </text>

      <Card x={64} y={180} w={300} h={56} name="Kiro Crew hub gateway" line="記憶、lessons、排程、owner lock" />
      <Card x={40} y={300} w={164} h={56} name="遠端 crew · EC2" line="經 SSM port-forward" />
      <Card x={224} y={300} w={164} h={56} name="遠端 crew · Fargate" line="ECS task、預設 6 小時" />
      <Card x={444} y={180} w={272} h={56} name="Runtime microVM · orchestrator" line="每 session 一個 microVM、最長 8 小時" />
      <Card x={444} y={264} w={272} h={52} name="Runtime Instances · worker" line="受管 EC2、最長 14 天、可用 GPU" />
      <Card x={444} y={340} w={272} h={52} name="Gateway + Policy + Guardrails" line="工具邊界的預設拒絕政策" filled />
      <Box x={444} y={424} w={272} h={40} />
      <text x={580} y={448} textAnchor="middle" fill={ink}>
        工具：Lambda、API、既有 MCP server
      </text>

      <text x={122} y={132} fontSize={11.5} fill={quiet}>
        ACP · stdio over SSH
      </text>
      <text x={322} y={132} fontSize={11.5} fill={quiet}>
        owner lock 白名單
      </text>
      <text x={654} y={168} fontSize={11.5} fontWeight={600} fill={ink}>
        A2A v1.0
      </text>
      <text x={222} y={258} fontSize={11.5} fill={quiet}>
        SSH／SSM 通道 · HTTP 代理
      </text>
      <text x={588} y={254} fontSize={11.5} fontWeight={600} fill={ink}>
        A2A
      </text>
      <text x={588} y={332} fontSize={11.5} fill={quiet}>
        MCP
      </text>
    </svg>
  );
}
