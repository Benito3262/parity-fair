import "./globals.css";

export const metadata = {
  title: "Parity Fair",
  description: "The fair price for every tokenized stock on BNB Chain.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
