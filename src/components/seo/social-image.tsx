import { ImageResponse } from "next/og";

type SocialImageOptions = {
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  glow: string;
};

export const socialImageSize = { width: 1200, height: 630 };
export const socialImageContentType = "image/png";

export function createSocialImage({
  eyebrow,
  title,
  description,
  accent,
  glow,
}: SocialImageOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#ffffff",
          background: `radial-gradient(circle at 82% 18%, ${glow}, transparent 38%), linear-gradient(135deg, #050506, #090b13 60%, #050506)`,
          fontFamily: "Arial, sans-serif",
          borderTop: `8px solid ${accent}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 24, height: 24, background: accent, transform: "rotate(45deg)" }} />
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "0.12em" }}>
            RUKH LABS
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div style={{ color: accent, fontSize: 24, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>
            {eyebrow}
          </div>
          <div style={{ marginTop: 20, fontSize: 68, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.035em" }}>
            {title}
          </div>
          <div style={{ marginTop: 24, maxWidth: 880, color: "rgba(255,255,255,0.7)", fontSize: 27, lineHeight: 1.35 }}>
            {description}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.48)", fontSize: 21 }}>
          <span>Clean tools. Sharper standards.</span>
          <span>rukhlabs.com</span>
        </div>
      </div>
    ),
    socialImageSize,
  );
}
