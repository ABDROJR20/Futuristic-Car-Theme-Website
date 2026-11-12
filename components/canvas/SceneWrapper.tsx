'use client';

import dynamic from 'next/dynamic';

const Scene = dynamic(() => import('./Scene'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-0 bg-[#05060a]" aria-hidden="true" />
  ),
});

export default function SceneWrapper() {
  return <Scene />;
}

