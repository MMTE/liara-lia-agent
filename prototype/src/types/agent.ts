export type ToolKind = 'read' | 'docs' | 'write';

export type Surface = 'docs' | 'dashboard';

export interface ToolStep {
  id: string;
  /** Persian, user facing label */
  label: string;
  /** typed tool name exposed to the model */
  tool: string;
  kind: ToolKind;
  /** short result summary shown under the step */
  result?: string;
  /** optional expandable raw output (LTR) */
  output?: string[];
  durationMs: number;
}

export interface Citation {
  title: string;
  path: string;
  section?: string;
}

export interface AnswerBlock {
  headline?: string;
  paragraphs: string[];
  bullets?: string[];
  code?: {lang: string;caption?: string;code: string;};
  citations: Citation[];
}

export type ChangeRisk = 'safe' | 'caution' | 'danger';

export interface PlanChange {
  id: string;
  title: string;
  tool: string;
  before?: string;
  after?: string;
  risk: ChangeRisk;
}

export interface AgentPlan {
  title: string;
  summary: string;
  changes: PlanChange[];
  note: string;
}

export interface Clarify {
  question: string;
  options: {id: string;label: string;hint?: string;}[];
}

export interface Scenario {
  id: string;
  surface: Surface;
  /** what the user typed / tapped */
  prompt: string;
  /** short intent label shown in the trace header */
  intent: string;
  clarify?: Clarify;
  steps: ToolStep[];
  answer: AnswerBlock;
  plan?: AgentPlan;
  verify?: ToolStep[];
  verifiedMessage?: string;
  proactive?: {text: string;cta: string;};
  suggestions: string[];
}

export type Message =
{id: string;role: 'user';text: string;} |
{id: string;role: 'agent';kind: 'text';text: string;} |
{
  id: string;
  role: 'agent';
  kind: 'trace';
  intent: string;
  steps: ToolStep[];
  activeIndex: number;
  done: boolean;
} |
{id: string;role: 'agent';kind: 'answer';answer: AnswerBlock;} |
{
  id: string;
  role: 'agent';
  kind: 'plan';
  scenarioId: string;
  plan: AgentPlan;
  status: 'pending' | 'approved' | 'rejected';
} |
{
  id: string;
  role: 'agent';
  kind: 'run';
  steps: ToolStep[];
  activeIndex: number;
  done: boolean;
  summary?: string;
} |
{id: string;role: 'agent';kind: 'clarify';clarify: Clarify;answered?: string;} |
{id: string;role: 'agent';kind: 'proactive';text: string;cta: string;};

export type Mood = 'idle' | 'thinking' | 'warning' | 'success';

export interface ActivityEntry {
  id: string;
  time: string;
  title: string;
  kind: ToolKind;
}