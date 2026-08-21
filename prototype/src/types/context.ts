import type { LucideIcon } from 'lucide-react';
import type { Surface } from './agent';

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  scenarioId?: string;
  icon: LucideIcon;
  tone?: 'default' | 'alert';
}

export interface LiriContext {
  surface: Surface;
  /** e.g. «مستندات» یا «کنسول لیارا» */
  scopeLabel: string;
  /** e.g. «production / my-api» */
  resource: string;
  /** short line under the resource */
  detail?: string;
  state?: 'ok' | 'failed';
  headline: string;
  actions: QuickAction[];
}