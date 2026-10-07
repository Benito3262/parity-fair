import "./globals.css";

export const metadata = {
  title: "Parity",
  description: "The fair price for every tokenized stock on BNB Chain.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
