/**
 * Kiro Crew collaboration architecture from the Kiro Crew survey, redrawn with
 * the portal's theme tokens. Kiro Crew's gateway is the centre; AgentCore is
 * one of several places it can be deployed.
 */
const ink = "var(--text)";
const quiet = "var(--muted)";
const edge = "var(--control)";
const accent = "var(--dot)";
const tint = "var(--raised)";

type Rect = { x: number; y: number; w: number; h: number };

function Box({ x, y, w, h, dashed, filled, strong }: Rect & { dashed?: boolean; filled?: boolean; strong?: boolean }) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={8}
      fill={filled ? tint : "none"}
      stroke={strong ? accent : edge}
      strokeWidth={strong ? 2 : 1.25}
      strokeDasharray={dashed ? "5 4" : undefined}
    />
  );
}

/** Centred box with a bold first line and optional quiet second line. */
function Label({ x, y, w, h, name, line, dashed }: Rect & { name: string; line?: string; dashed?: boolean }) {
  const cx = x + w / 2;
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} dashed={dashed} />
      <text x={cx} y={line ? y + h / 2 - 3 : y + h / 2 + 4.5} textAnchor="middle" fontWeight={600} fill={ink}>
        {name}
      </text>
      {line && (
        <text x={cx} y={y + h / 2 + 14} textAnchor="middle" fontSize={11.5} fill={quiet}>
          {line}
        </text>
      )}
    </g>
  );
}

/** Container with a title and a few quiet lines. */
function Panel({ x, y, w, h, title, lines, dashed }: Rect & { title: string; lines: string[]; dashed?: boolean }) {
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} dashed={dashed} />
      <text x={x + 14} y={y + 26} fontWeight={600} fill={ink}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={x + 14} y={y + 52 + i * 22} fontSize={12} fill={quiet}>
          {l}
        </text>
      ))}
    </g>
  );
}

export function CrossEnvFigure() {
  const drops = [107, 289, 471, 653];
  return (
    <svg
      viewBox="0 0 760 416"
      role="img"
      aria-label="Kiro Crew 為中心：一個 gateway 連接介面、agent、工具與部署環境"
      fontSize={13}
      className="h-auto w-full"
    >
      <defs>
        <marker id="xenv-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={edge} />
        </marker>
      </defs>
      <text x={24} y={28} fontSize={15} fontWeight={600} fill={ink}>
        Kiro Crew 為中心：一個 gateway 連接介面、agent、工具與部署環境
      </text>
      <text x={24} y={48} fontSize={11.5} fill={quiet}>
        實線為原生支援；虛線為需自建或社群範例
      </text>

      {/* connectors */}
      <g fill="none" stroke={edge} strokeWidth={1.25}>
        <path d="M139 112V130H300V150" markerEnd="url(#xenv-arrow)" />
        <path d="M385 112V150" markerEnd="url(#xenv-arrow)" />
        <path d="M626 120V132H460V150" strokeDasharray="5 4" markerEnd="url(#xenv-arrow)" />
        <path d="M250 220H214" markerEnd="url(#xenv-arrow)" />
        <path d="M510 220H546" markerEnd="url(#xenv-arrow)" />
        <path d="M380 290V316" />
        <path d="M107 316H653" />
        {drops.map((x, i) => (
          <path key={x} d={`M${x} 316V340`} strokeDasharray={i === drops.length - 1 ? "5 4" : undefined} markerEnd="url(#xenv-arrow)" />
        ))}
      </g>

      {/* interfaces */}
      <Label x={24} y={72} w={230} h={40} name="桌面 app／dashboard／CLI" />
      <Label x={270} y={72} w={230} h={40} name="Slack、Teams、Discord 等" />
      <Label x={516} y={72} w={220} h={48} name="其他平台的 agent" line="A2A：需自建端點" dashed />

      {/* hub */}
      <Box x={250} y={150} w={260} h={140} filled strong />
      <text x={380} y={176} textAnchor="middle" fontSize={14} fontWeight={600} fill={ink}>
        Kiro Crew gateway
      </text>
      {["記憶 · lessons · skills · Knowledge", "cron · webhook · heartbeat", "Task Runner · Workflows · Apps", "owner lock · OS sandbox · 稽核日誌"].map((l, i) => (
        <text key={l} x={380} y={202 + i * 22} textAnchor="middle" fontSize={12} fill={quiet}>
          {l}
        </text>
      ))}

      {/* sides */}
      <Panel x={24} y={150} w={190} h={142} title="Agent harness" lines={["kiro-cli（預設）", "Claude Code、Codex、", "goose 等（Preview）"]} dashed />
      <Panel x={546} y={150} w={190} h={142} title="工具" lines={["MCP servers", "Browser、Computer Use", "Apps（App SDK）"]} />

      {/* edge labels */}
      <text x={232} y={212} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={ink}>
        ACP
      </text>
      <text x={528} y={212} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={ink}>
        MCP
      </text>
      <rect x={346} y={297} width={84} height={16} fill="var(--surface)" />
      <text x={388} y={309} textAnchor="middle" fontSize={11.5} fill={quiet}>
        可部署於
      </text>

      {/* deployment targets */}
      <Label x={24} y={340} w={166} h={52} name="本機" line="桌面 app、系統服務" />
      <Label x={206} y={340} w={166} h={52} name="Docker／VPS／VM" line="官方建議的常駐方式" />
      <Label x={388} y={340} w={166} h={52} name="遠端 crew" line="經 SSH、SSM、Fargate" />
      <Label x={570} y={340} w={166} h={52} name="AgentCore microVM" line="aws-samples 社群範例" dashed />
    </svg>
  );
}
