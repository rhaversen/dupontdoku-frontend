import "../mock.css";

export default function MockLayout({ children }: LayoutProps<"/mock">) {
	return <div className="mock-host">{children}</div>;
}
