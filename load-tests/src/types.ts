export interface RunConfig {
  serverUrl: string;
  stubUrl: string;
  scenarios?: string[];
  jsonOutput?: string;
  realJudge0?: boolean;
}

export interface Assertion {
  id: string;
  nfrId: string;
  description: string;
  target: string;
  actual: string;
  passed: boolean;
}

export interface ScenarioResult {
  id: string;
  name: string;
  durationMs: number;
  assertions: Assertion[];
  passed: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  run(config: RunConfig): Promise<ScenarioResult>;
}
