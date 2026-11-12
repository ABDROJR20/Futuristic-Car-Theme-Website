'use client';

import React from 'react';

interface Props {
  modelPath: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlbErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(`[VANTA GLB Loader] Could not load ${this.props.modelPath}:`, error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.25, 64]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.5} />
        </mesh>
      );
    }

    return this.props.children;
  }
}
