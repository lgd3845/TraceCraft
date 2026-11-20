import { useId } from "react";

export default function CraftIllustration({
  kind,
  className = "",
}: {
  kind: "bracelet" | "beads" | "gift-box";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const colors = [
    "#e9e3d1",
    "#cbd6b7",
    "#9fae89",
    "#dbbd7f",
    "#e8dbb7",
    "#eae5d6",
    "#a0b5a0",
    "#cf8a57",
  ];
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
        kind === "bracelet"
          ? "天然石与珍珠串成的手链"
          : kind === "beads"
            ? "雏菊拼豆作品"
            : "装有手作作品的礼盒"
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
      {kind === "bracelet" && (
        <>
          <ellipse
            cx="217"
            cy="244"
            rx="107"
            ry="13"
            fill="#5d5b40"
            opacity=".07"
          />
          <path
            d="M51 71c22 32 35 23 45 55M45 57c25 8 35 18 44 37"
            stroke="#a6b293"
            strokeWidth="2"
            opacity=".5"
          />
          <path
            d="M59 89C15 78 38 50 59 89M79 113C103 69 126 102 79 113M69 92C76 62 99 74 69 92"
            fill="#b4bca2"
            opacity=".6"
          />
          <g transform="rotate(-18 220 151)">
            <ellipse
              cx="220"
              cy="144"
              rx="96"
              ry="91"
              stroke="#d4be8b"
              strokeWidth="3"
            />
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * Math.PI) / 12;
              const x = 220 + Math.cos(a) * 96;
              const y = 144 + Math.sin(a) * 91;
              const spacer = i === 3 || i === 10 || i === 16;
              return (
                <g key={i} filter={`url(#${id}-small)`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={spacer ? 7 : 12.5}
                    fill={
                      spacer ? `url(#${id}-gold)` : colors[i % colors.length]
                    }
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={spacer ? 7 : 12.5}
                    fill={`url(#${id}-shine)`}
                  />
                  {!spacer && (
                    <ellipse
                      cx={x - 4}
                      cy={y - 4.5}
                      rx="3.4"
                      ry="2.1"
                      fill="#fff"
                      opacity=".45"
                    />
                  )}
                </g>
              );
            })}
            <circle
              cx="220"
              cy="246"
              r="9"
              stroke={`url(#${id}-gold)`}
              strokeWidth="3"
            />
            <path
              d="m220 253 10 13-10 14-10-14Z"
              fill={`url(#${id}-gold)`}
              filter={`url(#${id}-small)`}
            />
          </g>
          <path
            d="m351 70 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"
            fill="#bc9e59"
            opacity=".7"
          />
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
      {kind === "gift-box" && (
        <>
          <g
            transform="translate(55 27) rotate(-9 170 120)"
            filter={`url(#${id}-shadow)`}
          >
            <path d="m17 41 290-13 13 195-287 21Z" fill="#b99773" />
            <path d="m26 48 271-12 12 176-266 20Z" fill="#e6ceb0" />
            <path d="m35 55 253-10 11 157-249 20Z" fill="#f3e5c9" />
            {Array.from({ length: 39 }, (_, i) => (
              <path
                key={i}
                d={`M${42 + (i % 13) * 19} ${60 + Math.floor(i / 13) * 53}q-17 19 5 22t-3 26`}
                stroke={i % 2 ? "#ccb890" : "#e4d3ab"}
                strokeWidth="2"
                fill="none"
              />
            ))}
            <g transform="translate(93 128)">
              {Array.from({ length: 16 }, (_, i) => (
                <g key={i}>
                  <circle
                    cx={Math.cos((i * Math.PI) / 8) * 43}
                    cy={Math.sin((i * Math.PI) / 8) * 43}
                    r="8.8"
                    fill={colors[i % colors.length]}
                  />
                  <circle
                    cx={Math.cos((i * Math.PI) / 8) * 43}
                    cy={Math.sin((i * Math.PI) / 8) * 43}
                    r="8.8"
                    fill={`url(#${id}-shine)`}
                  />
                </g>
              ))}
            </g>
            <g transform="translate(177 73) rotate(10)">
              <rect width="87" height="105" rx="3" fill="#fdfbf3" />
              <path d="M44 84V38m0 31 14-13" stroke="#829772" strokeWidth="3" />
              {Array.from({ length: 7 }, (_, i) => (
                <ellipse
                  key={i}
                  cx={44 + Math.cos((i * Math.PI * 2) / 7) * 13}
                  cy={36 + Math.sin((i * Math.PI * 2) / 7) * 13}
                  rx="7"
                  ry="10"
                  transform={`rotate(${(i * 360) / 7} ${44 + Math.cos((i * Math.PI * 2) / 7) * 13} ${36 + Math.sin((i * Math.PI * 2) / 7) * 13})`}
                  fill="#e9b367"
                />
              ))}
              <circle cx="44" cy="36" r="7" fill="#a27645" />
            </g>
            <path d="M143 33v203" stroke="#95a18c" strokeWidth="17" />
            <path d="M147 34v201" stroke="#c1cbb5" strokeWidth="2" />
            <path
              d="M144 73c-78-6-48-62-16-24l16 24c7-61 61-49 33-20-13 13-33 20-33 20Z"
              fill="#9ca994"
              stroke="#768970"
              strokeWidth="2"
            />
            <path
              d="m142 76-22 47 13-3 5 10 8-53 20 36 6-13 11 3-30-33"
              fill="#93a28a"
            />
          </g>
        </>
      )}
    </svg>
  );
}
