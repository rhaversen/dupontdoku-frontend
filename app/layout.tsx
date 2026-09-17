import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";

export const metadata: Metadata = {
	title: "Dupontdoku 98",
	description: "Windows 98 styled app",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<ThemeProvider>
			<AuthProvider>
				<html lang="en" className="h-full">
					<body className="h-full overflow-hidden">{children}</body>
				</html>
			</AuthProvider>
		</ThemeProvider>
	);
}
