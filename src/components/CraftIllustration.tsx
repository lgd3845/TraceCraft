import { useId } from "react";

export default function CraftIllustration({
  kind,
  className = "",
}: {
  kind: "beads" | "wire-craft" | "embroidery" | "compass" | "carving";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const flower = [
    "000001110000000",
    "000011111000000",
    "000011111001100",
    "000001110011110",
    "011100000011110",
    "111110333001100",
    "111113333300000",
    "011103333300000",
    "000003333301110",
    "001110333011111",
    "011111000011111",
    "011111011101110",
    "001110111110000",
    "000000111110000",
    "000000011100000",
    "000000020000000",
    "000000020000000",
    "000022222000000",
    "000222222200000",
    "000022222000000",
  ];
  return (
    <svg
      className={className}
      viewBox="0 0 440 300"
      fill="none"
      role="img"
      aria-label={
        kind === "wire-craft"
          ? "外圈钉阵绕线画圆盘"
          : kind === "beads"
            ? "雏菊拼豆作品"
            : kind === "compass"
              ? "圆规量角底稿与同心圆弧画作"
              : kind === "carving"
                ? "阳刻连桥刻纸底稿与笔刀"
                : "榉木绣绷与山茶刺绣"
      }
    >
      <defs>
        <filter
          id={`${id}-shadow`}
          x="-50%"
          y="-50%"
          width="200%"
          height="220%"
        >
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="8"
            floodColor="#4e4025"
            floodOpacity=".15"
          />
        </filter>
        <filter id={`${id}-small`} x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow
            dx="1"
            dy="3"
            stdDeviation="2"
            floodColor="#3e422b"
            floodOpacity=".22"
          />
        </filter>
        <radialGradient id={`${id}-shine`} cx=".3" cy=".25">
          <stop stopColor="#fff" stopOpacity=".75" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".08" />
          <stop offset="1" stopColor="#363d21" stopOpacity=".2" />
        </radialGradient>
        <linearGradient id={`${id}-gold`} x2="1" y2="1">
          <stop stopColor="#b58834" />
          <stop offset=".45" stopColor="#f6df99" />
          <stop offset="1" stopColor="#ae7935" />
        </linearGradient>
        <pattern
          id={`${id}-paper`}
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="3" r=".7" fill="#b7bb9a" opacity=".25" />
        </pattern>
      </defs>
      {kind === "wire-craft" && (
        <>
          <ellipse cx="220" cy="248" rx="108" ry="12" fill="#5d5b40" opacity=".08" />
          <g filter={`url(#${id}-shadow)`}>
            <circle cx="220" cy="146" r="102" fill="#fbf7ef" stroke="#d5cab5" strokeWidth="7" />
            <circle cx="220" cy="146" r="93" fill="none" stroke="#e4dccb" strokeWidth="1.2" strokeDasharray="4 4" />
            {Array.from({ length: 40 }, (_, i) => {
              const a1 = -Math.PI / 2 + (i * Math.PI * 2) / 40
              const a2 = -Math.PI / 2 + (((i * 7 + 9) % 40) * Math.PI * 2) / 40
              return (
                <line
                  key={`wc-${i}`}
                  x1={220 + Math.cos(a1) * 86}
                  y1={146 + Math.sin(a1) * 86}
                  x2={220 + Math.cos(a2) * 86}
                  y2={146 + Math.sin(a2) * 86}
                  stroke="#2c2b29"
                  strokeOpacity={i % 3 === 0 ? "0.28" : "0.14"}
                  strokeWidth="1.25"
                />
              )
            })}
            {Array.from({ length: 24 }, (_, i) => {
              const a1 = -Math.PI / 2 + (i * Math.PI * 2) / 24
              const a2 = -Math.PI / 2 + (((i + 5) % 24) * Math.PI * 2) / 24
              return (
                <line
                  key={`wr-${i}`}
                  x1={220 + Math.cos(a1) * 86}
                  y1={146 + Math.sin(a1) * 86}
                  x2={220 + Math.cos(a2) * 86}
                  y2={146 + Math.sin(a2) * 86}
                  stroke="#a94d3b"
                  strokeOpacity="0.34"
                  strokeWidth="1.2"
                />
              )
            })}
            {Array.from({ length: 40 }, (_, i) => {
              const ang = -Math.PI / 2 + (i * Math.PI * 2) / 40
              return (
                <circle
                  key={`wp-${i}`}
                  cx={220 + Math.cos(ang) * 86}
                  cy={146 + Math.sin(ang) * 86}
                  r={i === 0 ? 3.2 : 2}
                  fill={i === 0 ? "#b84534" : "#9c794e"}
                />
              )
            })}
          </g>
          <g transform="translate(334 198) rotate(-14)" filter={`url(#${id}-small)`}>
            <rect x="0" y="0" width="34" height="30" rx="5" fill="#d9c6a8" stroke="#b99f79" strokeWidth="1.5" />
            <rect x="5" y="5" width="24" height="20" rx="2" fill="#a94d3b" />
            <path d="M28 18q15 8 27-2" stroke="#a94d3b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </g>
        </>
      )}
      {kind === "beads" && (
        <>
          <g
            transform="translate(101 30) rotate(9 112 117)"
            filter={`url(#${id}-shadow)`}
          >
            <rect width="228" height="245" rx="7" fill="#fcfcf7" />
            <rect width="228" height="245" rx="7" fill={`url(#${id}-paper)`} />
            {Array.from({ length: 23 }, (_, row) =>
              Array.from({ length: 21 }, (_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={14 + col * 10}
                  cy={13 + row * 10}
                  r="1"
                  fill="#dcded1"
                />
              )),
            )}
            {flower.map((row, y) =>
              row.split("").map(
                (cell, x) =>
                  cell !== "0" && (
                    <g key={`${x}-${y}`}>
                      <circle
                        cx={44 + x * 10}
                        cy={22 + y * 10}
                        r="4.8"
                        fill={
                          cell === "1"
                            ? "#edb859"
                            : cell === "2"
                              ? "#88a48a"
                              : "#986c41"
                        }
                      />
                      <circle
                        cx={44 + x * 10 - 0.3}
                        cy={22 + y * 10 - 0.5}
                        r="1.75"
                        fill={
                          cell === "1"
                            ? "#c08d36"
                            : cell === "2"
                              ? "#5e7c64"
                              : "#705233"
                        }
                      />
                      <path
                        d={`M${42 + x * 10} ${20 + y * 10}l1-1`}
                        stroke="#fff"
                        strokeOpacity=".6"
                        strokeLinecap="round"
                      />
                    </g>
                  ),
              ),
            )}
          </g>
          {[
            ["#eab553", 341, 219],
            ["#91a488", 351, 242],
            ["#eab553", 367, 212],
            ["#8c6544", 86, 234],
          ].map(([c, x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="7" fill={String(c)} />
              <circle cx={x} cy={y} r="2.5" fill="#fff" opacity=".5" />
            </g>
          ))}
        </>
      )}
      {kind === "embroidery" && (
        <>
          <ellipse cx="220" cy="252" rx="108" ry="12" fill="#5d5b40" opacity=".08" />
          <g transform="translate(220 42)">
            <rect x="-13" y="-8" width="26" height="14" rx="3" fill={`url(#${id}-gold)`} stroke="#8f6b32" strokeWidth="1.2" />
            <rect x="-26" y="-4" width="52" height="4.5" rx="2" fill="#c79e54" />
          </g>
          <g filter={`url(#${id}-shadow)`}>
            <circle cx="220" cy="148" r="102" fill="#c59e6b" stroke="#9e7949" strokeWidth="2.5" />
            <circle cx="220" cy="148" r="91" fill="#f7f1e4" stroke="#9d7a4c" strokeWidth="2" />
            <circle cx="220" cy="148" r="89" fill={`url(#${id}-paper)`} />
          </g>
          <g filter={`url(#${id}-small)`}>
            <ellipse cx="176" cy="178" rx="26" ry="13" transform="rotate(-32 176 178)" fill="#4c8851" />
            <ellipse cx="264" cy="128" rx="24" ry="12" transform="rotate(24 264 128)" fill="#679b65" />
            <path d="M156 190L192 168M246 122L282 135" stroke="#2c5935" strokeWidth="1.6" strokeLinecap="round" />
            {[0, 72, 144, 216, 288].map(deg => (
              <ellipse
                key={`pet-${deg}`}
                cx={220 + Math.cos((deg * Math.PI) / 180) * 28}
                cy={148 + Math.sin((deg * Math.PI) / 180) * 28}
                rx="22"
                ry="16"
                transform={`rotate(${deg} ${220 + Math.cos((deg * Math.PI) / 180) * 28} ${148 + Math.sin((deg * Math.PI) / 180) * 28})`}
                fill={deg % 144 === 0 ? "#c83848" : "#df5461"}
              />
            ))}
            {[36, 108, 180, 252, 324].map(deg => (
              <path
                key={`th-${deg}`}
                d={`M${220 + Math.cos((deg * Math.PI) / 180) * 14} ${148 + Math.sin((deg * Math.PI) / 180) * 14}L${220 + Math.cos((deg * Math.PI) / 180) * 38} ${148 + Math.sin((deg * Math.PI) / 180) * 38}`}
                stroke="#f2a2aa"
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity=".7"
              />
            ))}
            <circle cx="220" cy="148" r="11" fill="#ebc45c" stroke="#c78d32" strokeWidth="1.5" />
            <circle cx="216" cy="145" r="2.2" fill="#f9e69b" />
            <circle cx="224" cy="147" r="2.2" fill="#f9e69b" />
            <circle cx="219" cy="152" r="2.2" fill="#f9e69b" />
          </g>
          <g transform="translate(310 194) rotate(-32)">
            <line x1="0" y1="0" x2="54" y2="0" stroke="#9aa2a8" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M52 0q18 22 -4 34t-24-8" stroke="#c83848" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        </>
      )}
      {kind === "compass" && (
        <>
          <ellipse cx="220" cy="252" rx="108" ry="12" fill="#5d5b40" opacity=".08" />
          <g filter={`url(#${id}-shadow)`}>
            <circle cx="220" cy="146" r="102" fill="#fcfaf4" stroke="#cfd8d1" strokeWidth="6" />
            <circle cx="220" cy="146" r="88" fill="none" stroke="#9eb2a7" strokeWidth="1" strokeDasharray="3 3" />
            {Array.from({ length: 12 }, (_, idx) => {
              const r = 14 + idx * 6.3
              const sw = idx % 3 === 1 ? "2.6" : idx % 2 === 0 ? "1.6" : "0.9"
              const angOffset = idx * 19
              return (
                <circle
                  key={`cr-${idx}`}
                  cx="220"
                  cy="146"
                  r={r}
                  fill="none"
                  stroke={idx % 4 === 0 ? "#24435c" : "#3a6585"}
                  strokeWidth={sw}
                  strokeDasharray={`${Math.round(r * 2.2)} ${Math.round(r * 1.1)}`}
                  strokeDashoffset={angOffset}
                  opacity={0.45 + (idx % 3) * 0.2}
                />
              )
            })}
            <path d="M214 146H226M220 140V152" stroke="#b54c3b" strokeWidth="1.4" />
            <circle cx="220" cy="146" r="2.2" fill="#b54c3b" />
          </g>
          <g transform="translate(318 82) rotate(24)" filter={`url(#${id}-small)`}>
            <circle cx="0" cy="0" r="6" fill={`url(#${id}-gold)`} stroke="#8f6b32" strokeWidth="1.2" />
            <line x1="0" y1="0" x2="0" y2="-11" stroke="#8f6b32" strokeWidth="3" strokeLinecap="round" />
            <path d="M-2 5L-22 86" stroke="#7c878e" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M2 5L22 84" stroke="#7c878e" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="-22" y1="86" x2="-24" y2="95" stroke="#535d63" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="19" y="72" width="6" height="15" rx="2" fill="#24435c" />
            <line x1="22" y1="87" x2="23" y2="94" stroke="#24435c" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        </>
      )}
      {kind === "carving" && (
        <>
          <ellipse cx="220" cy="254" rx="116" ry="12" fill="#5d5b40" opacity=".08" />
          <g filter={`url(#${id}-shadow)`}>
            <rect x="122" y="48" width="196" height="196" rx="8" fill="#faf5eb" stroke="#dfd5c2" strokeWidth="2.5" />
            <rect x="136" y="62" width="168" height="168" rx="4" fill="#b63b2f" />
            <circle cx="220" cy="146" r="64" fill="#faf5eb" />
            <path d="M220 90C244 108 258 134 252 162C246 184 220 198 220 198C220 198 194 184 188 162C182 134 196 108 220 90Z" fill="#b63b2f" />
            <path d="M192 146H248M220 112V186" stroke="#faf5eb" strokeWidth="4" strokeLinecap="round" />
            <circle cx="220" cy="146" r="16" fill="#faf5eb" />
            <circle cx="220" cy="146" r="9" fill="#b63b2f" />
            <path d="M220 146V166M156 146H172M268 146H284" stroke="#b63b2f" strokeWidth="4.5" strokeLinecap="round" />
          </g>
          <g transform="translate(324 198) rotate(-36)" filter={`url(#${id}-small)`}>
            <rect x="0" y="-4" width="66" height="8" rx="3" fill="#c79e54" stroke="#8f6b32" strokeWidth="1.2" />
            <path d="M0 -3L-16 0L0 3Z" fill="#d8dee3" stroke="#7d868e" strokeWidth="1" />
          </g>
        </>
      )}
    </svg>
  );
}
