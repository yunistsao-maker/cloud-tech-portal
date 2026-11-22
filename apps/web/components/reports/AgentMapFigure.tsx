/**
 * Positioning map from the always-on agents survey (2026-11): where each
 * product runs (vendor-hosted vs self-hosted) against who uses it
 * (personal vs team). Redrawn with the portal's theme tokens.
 */
const ink = "var(--text)";
const quiet = "var(--muted)";
const edge = "var(--control)";
const accent = "var(--dot)";
const tint = "var(--raised)";

type ChipProps = { x: number; y: number; w: number; label: string; main?: boolean };

function Chip({ x, y, w, label, main }: ChipProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={26}
        rx={13}
        fill={main ? tint : "none"}
        stroke={main ? accent : edge}
        strokeWidth={main ? 2 : 1}
      />
      <text x={x + w / 2} y={y + 17} textAnchor="middle" fontWeight={main ? 600 : 400} fill={ink}>
        {label}
      </text>
    </g>
  );
}

function Quadrant({ x, y, h, name, sub }: { x: number; y: number; h: number; name: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={y} width={320} height={h} rx={8} fill="none" stroke={edge} strokeWidth={1.25} />
      <text x={x + 16} y={y + 24} fontSize={13} fontWeight={600} fill={ink}>
        {name}
      </text>
      <text x={x + 16} y={y + 42} fontSize={11.5} fill={quiet}>
        {sub}
      </text>
    </g>
  );
}

export function AgentMapFigure() {
  return (
    <svg viewBox="0 0 760 500" role="img" aria-label="能力趨同後，差別在跑在誰的機器、給誰用" fontSize={12.5} className="h-auto w-full">
      <defs>
        <marker id="agentmap-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill={edge} />
        </marker>
      </defs>
      <text x={24} y={28} fontSize={15} fontWeight={600} fill={ink}>
        能力趨同後，差別在跑在誰的機器、給誰用
      </text>
      <text x={24} y={48} fontSize={11.5} fill={quiet}>
        強調色為本報告深入的三款；同一象限內的位置不代表排序
      </text>

      <g fill="none" stroke={edge} strokeWidth={1.25}>
        <path d="M68 440V66" markerEnd="url(#agentmap-arrow)" />
        <path d="M80 458H736" markerEnd="url(#agentmap-arrow)" />
      </g>
      <text x={52} y={172} textAnchor="middle" transform="rotate(-90 52 172)" fontSize={11.5} fill={quiet}>
        廠商託管
      </text>
      <text x={52} y={365} textAnchor="middle" transform="rotate(-90 52 365)" fontSize={11.5} fill={quiet}>
        自架
      </text>
      <text x={240} y={480} textAnchor="middle" fontSize={11.5} fill={quiet}>
        個人使用
      </text>
      <text x={576} y={480} textAnchor="middle" fontSize={11.5} fill={quiet}>
        團隊與企業
      </text>

      <Quadrant x={80} y={70} h={204} name="消費型個人 agent" sub="廠商 VM · 以個人帳號行動" />
      <Chip x={96} y={128} w={88} label="Meta Muse" main />
      <Chip x={192} y={128} w={100} label="Claude Duet" />
      <Chip x={96} y={162} w={150} label="OpenAI Dots（個人）" />
      <Chip x={254} y={162} w={100} label="Gemini Task" />

      <Quadrant x={416} y={70} h={204} name="團隊型 AI 同事" sub="廠商 VM · 進駐 Slack／Teams 與會議" />
      <Chip x={432} y={128} w={84} label="Grok Bot" main />
      <Chip x={524} y={128} w={92} label="Claude Tag" />
      <Chip x={432} y={162} w={150} label="OpenAI Dots（團隊）" />
      <Chip x={590} y={162} w={116} label="Gemini Agents" />
      <Chip x={432} y={196} w={156} label="Microsoft Autopilot" />
      <Chip x={432} y={230} w={164} label="Perplexity Teammates" />

      <Quadrant x={80} y={290} h={150} name="開源自架 · 個人" sub="跑在自己的筆電或伺服器" />
      <Chip x={96} y={348} w={80} label="OpenClaw" />
      <Chip x={184} y={348} w={108} label="Hermes Agent" />

      <Quadrant x={416} y={290} h={150} name="自架 · 團隊與工程平台" sub="自管 VM，或客戶雲端帳號內的 runtime" />
      <Chip x={432} y={348} w={92} label="Kiro Crew" main />
      <Chip x={532} y={348} w={144} label="AgentCore Runtime" />
      <Chip x={432} y={382} w={172} label="Foundry Agent Service" />
    </svg>
  );
}
