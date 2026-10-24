export default function SignalDiagram() {
  return (
    <div className="signal-diagram" aria-hidden="true">
      <div className="diagram-index">
        <span>FIG. 01</span>
        <span>DA LÓGICA AO IMPACTO</span>
      </div>
      <svg viewBox="0 0 660 600" fill="none">
        <defs>
          <linearGradient
            id="signal-face"
            x1="280"
            y1="145"
            x2="460"
            y2="410"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#647f6c" />
            <stop offset="1" stopColor="#263b31" />
          </linearGradient>
          <linearGradient
            id="signal-edge"
            x1="150"
            y1="100"
            x2="440"
            y2="480"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#d8eadb" />
            <stop offset="1" stopColor="#526b59" />
          </linearGradient>
        </defs>
        <g stroke="#899c8b" strokeWidth=".6" opacity=".22">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M${50 + i * 60} 485 L${250 + i * 60} 140 M${50 + i * 60} 140 L${250 + i * 60} 485`}
            />
          ))}
          <ellipse
            cx="335"
            cy="315"
            rx="273"
            ry="166"
            transform="rotate(-28 335 315)"
          />
          <ellipse
            cx="335"
            cy="315"
            rx="273"
            ry="166"
            transform="rotate(28 335 315)"
          />
        </g>
        <g className="signal-inputs" stroke="#7f9586" strokeWidth="1.1">
          <path className="draw-path" d="M25 192H100L235 268" />
          <path className="draw-path" d="M5 310H235" />
          <path className="draw-path" d="M55 425H103L235 353" />
          <circle cx="25" cy="192" r="4" fill="#a8bdab" />
          <circle cx="5" cy="310" r="4" fill="#a8bdab" />
          <circle cx="55" cy="425" r="4" fill="#a8bdab" />
        </g>
        <g className="signal-prism">
          <path
            d="M335 148L455 218V365L335 435L215 365V218Z"
            fill="#1d2d24"
            stroke="url(#signal-edge)"
          />
          <path
            d="M335 148L455 218L335 288L215 218Z"
            fill="url(#signal-face)"
            stroke="url(#signal-edge)"
          />
          <path
            d="M215 218L335 288V435L215 365Z"
            fill="#2b4032"
            stroke="url(#signal-edge)"
          />
          <path
            d="M455 218L335 288V435L455 365Z"
            fill="#354c3b"
            stroke="url(#signal-edge)"
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M215 ${238 + i * 22}L335 ${308 + i * 22}L455 ${238 + i * 22}`}
              stroke="#b9d2bd"
              strokeWidth=".6"
              opacity={0.12 + i * 0.05}
            />
          ))}
          <path
            d="M276 222L335 188L394 222L335 256Z"
            stroke="#d5e5d5"
            opacity=".7"
          />
          <path d="M305 222L335 205L365 222L335 239Z" fill="#bcd5bd" />
        </g>
        <g stroke="#bcd5bd" strokeWidth="1.3">
          <path className="draw-path" d="M455 292H512L575 252H637" />
          <circle cx="637" cy="252" r="5" fill="#bcd5bd" />
          <circle cx="637" cy="252" r="15" opacity=".3" />
        </g>
        <g
          fill="#a7b6ac"
          fontFamily="monospace"
          fontSize="10"
          letterSpacing="1"
        >
          <text x="25" y="172">
            DADOS
          </text>
          <text x="7" y="290">
            CONTEXTO
          </text>
          <text x="55" y="452">
            PESSOAS
          </text>
          <text x="550" y="231">
            APLICAÇÃO
          </text>
        </g>
        <path
          d="M330 90V113M319 102H341M553 419V435M545 427H561"
          stroke="#9cb3a2"
          opacity=".5"
        />
      </svg>
      <div className="diagram-caption">
        <span>COMPLEXIDADE</span>
        <span className="diagram-line" />
        <span>CLAREZA</span>
      </div>
    </div>
  );
}
