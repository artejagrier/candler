/**
 * Sparse code fragment particles.
 * Hero: 6 tokens, very low opacity — meant to be discovered, not read.
 * Lava lamp: 5 tokens, bolder glow because they're inside the green liquid.
 * Static positions prevent hydration mismatches.
 */

interface Token {
  text: string;
  left: string;
  bottom: string;
  dur: string;
  delay: string;
  rise: string;
  drift: string;
  pk: string;
}

const HERO_TOKENS: Token[] = [
  { text: "const vault", left: "5%", bottom: "38%", dur: "16s", delay: "0s", rise: "-72vh", drift: "1.5vw", pk: ".22" },
  { text: "encrypt()", left: "88%", bottom: "28%", dur: "14s", delay: "4s", rise: "-68vh", drift: "-1.2vw", pk: ".26" },
  { text: "✓ protected", left: "72%", bottom: "11%", dur: "18s", delay: "1.5s", rise: "-80vh", drift: "-1.8vw", pk: ".30" },
  { text: "git.push()", left: "16%", bottom: "7%", dur: "12s", delay: "7s", rise: "-65vh", drift: "2vw", pk: ".19" },
  { text: "await agent", left: "48%", bottom: "5%", dur: "20s", delay: "3s", rise: "-76vh", drift: "1vw", pk: ".16" },
  { text: "</>", left: "92%", bottom: "52%", dur: "22s", delay: "8s", rise: "-82vh", drift: "-1vw", pk: ".34" },
];

interface LavaToken {
  text: string;
  left: string;
  dur: string;
  delay: string;
}

const LAVA_TOKENS: LavaToken[] = [
  { text: "vault.lock()", left: "18%", dur: "9s", delay: "0s" },
  { text: "01010101", left: "52%", dur: "12s", delay: "2.5s" },
  { text: "RLS", left: "72%", dur: "7s", delay: "5s" },
  { text: "deploy()", left: "36%", dur: "10s", delay: "1.2s" },
  { text: "API", left: "84%", dur: "14s", delay: "6s" },
];

export function LiquidCodeStream() {
  return (
    <div className="lq-stream" aria-hidden>
      {HERO_TOKENS.map((t) => (
        <span
          key={t.text}
          className="lq-token"
          style={
            {
              left: t.left,
              bottom: t.bottom,
              "--dur": t.dur,
              "--delay": t.delay,
              "--rise": t.rise,
              "--drift": t.drift,
              "--pk": t.pk,
            } as React.CSSProperties
          }
        >
          {t.text}
        </span>
      ))}
    </div>
  );
}

export function LavaCodeStream() {
  return (
    <div className="lq-lava-stream" aria-hidden>
      {LAVA_TOKENS.map((t) => (
        <span
          key={t.text}
          className="lq-lava-token"
          style={
            {
              left: t.left,
              top: "50%",
              "--dur": t.dur,
              "--delay": t.delay,
            } as React.CSSProperties
          }
        >
          {t.text}
        </span>
      ))}
    </div>
  );
}
