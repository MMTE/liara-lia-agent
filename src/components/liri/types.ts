/** Types for the Liri message union produced by `mapConversation` (src/lib/liri-events.js). */

export type ToolKind = "docs" | "read" | "write";

export type TraceStepState = "active" | "done";

export interface TraceStep {
  /** mono tool key, e.g. `search_docs` */
  tool: string;
  /** Persian label from TOOL_META */
  label: string;
  kind: ToolKind;
  state: TraceStepState;
  /** one-line Persian summary of the tool output */
  result: string;
}

export interface LiriCitation {
  title: string;
  url: string;
  /** docs.liara.ir path without origin (null for external urls) */
  route: string | null;
}

export interface HitlOption {
  id: string;
  label: string;
}

export type PlanRisk = "safe" | "caution";

export interface PlanChange {
  tool: string;
  label: string;
  risk: PlanRisk;
  /** LTR mono detail, e.g. `KEY = value` */
  detail: string;
}

export type LiriMessage =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "trace"; variant: "inspect" | "verify"; steps: TraceStep[] }
  | { id: string; kind: "answer"; text: string; citations: LiriCitation[] }
  | {
      id: string;
      kind: "clarify";
      requestId: string;
      question: string;
      options: HitlOption[];
      answered: string | null;
    }
  | {
      id: string;
      kind: "plan";
      requestId: string;
      summary: string;
      changes: PlanChange[];
      options: HitlOption[];
      status: "pending" | "approved" | "rejected";
    };

export type LiriMood = "idle" | "thinking" | "warning" | "success";

export type LiriSurface = "docs" | "console";

export type LiriResourceState = "ok" | "failed";
