'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { getApiDocs } from '@/lib/swagger';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  const [spec] = useState(() => {
    try {
      return getApiDocs();
    } catch (error) {
      console.error('Error loading API spec:', error);
      return null;
    }
  });

  if (!spec) {
    return <div className="p-4">Error loading API documentation.</div>;
  }

  return <SwaggerUI spec={spec} />;
}
