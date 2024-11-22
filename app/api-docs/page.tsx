'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api-docs/spec')
      .then(res => res.json())
      .then(data => setSpec(data))
      .catch(err => console.error('Error loading API spec:', err));
  }, []);

  if (!spec) {
    return <div className="p-4">Loading API documentation...</div>;
  }

  return (
    <div className="w-full">
      <SwaggerUI spec={spec} />
    </div>
  );
}
