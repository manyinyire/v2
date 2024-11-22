import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto p-4">
      {children}
    </div>
  );
}
