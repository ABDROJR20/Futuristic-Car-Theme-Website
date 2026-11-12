'use client';

import React from 'react';
import { Html } from '@react-three/drei';

interface Props {
  modelPath: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class GlbErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Failed to load GLB model',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="w-[420px] max-w-[90vw] rounded-2xl border border-[#00f0ff]/40 bg-[#05060a]/95 p-6 text-left text-white shadow-[0_0_50px_rgba(0,240,255,0.2)] backdrop-blur-2xl">
            <div className="flex items-center gap-2.5 text-xs font-mono tracking-[0.24em] text-[#00f0ff] uppercase">
              <span className="h-2 w-2 rounded-full bg-[#00f0ff] animate-ping" />
              <span>AWAITING GLB ASSET // {this.props.modelPath}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/75 font-mono">
              Place your real 3D model files at:
            </p>
            <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 font-mono text-[11px] text-[#00f0ff]">
              <div>vanta-ev/public/models/exterior.glb</div>
              <div>vanta-ev/public/models/interior.glb</div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/55">
              Once placed, reload or run{' '}
              <code className="text-white">node scripts/inspect-glb.mjs</code> to inspect
              all mesh nodes, bounding boxes, materials, and door hinge pivots.
            </p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

