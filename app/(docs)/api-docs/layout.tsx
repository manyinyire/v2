export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container mx-auto p-4">
      <div className="prose dark:prose-invert max-w-none">
        {children}
      </div>
    </div>
  )
}
