"use client";

import { LiveAgentRunner } from '@/components/LiveAgentRunner';

export default function VisualTesterPage() {
  return (
    <div className="h-[calc(100vh-6rem)] min-h-[600px]">
      <LiveAgentRunner />
    </div>
  );
}
