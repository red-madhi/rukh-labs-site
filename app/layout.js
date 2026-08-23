import "./globals.css";

export const metadata = {
  title: "IAZMA Guard",
  description: "Bluesky follower hygiene and IAZMA suppression control.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
