import type {
  AffordabilityRequest, AffordabilityResult, ConsortiumResult, Contribution, ContributionCreate, DemoHousehold,
  DonationImpact, FundingProgram, GapRequest, GapResult, Project, RateSensitivityRequest, RateSensitivityResult,
  ScenarioRequest, ScenarioResult, Status, StrategyRequest, StrategyResponse,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Cannot reach the NestFlix API at ${API_BASE}. Is the backend running (uvicorn app.main:app --port 8000)?`, 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* keep statusText */
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const getProjects = () => request<Project[]>("/api/projects");
export const getProject = (id: number) => request<Project>(`/api/projects/${id}`);
export const calculateFundingGap = (data: GapRequest) => post<GapResult>("/api/finance/calculate", data);
export const calculateAffordability = (data: Partial<AffordabilityRequest>) =>
  post<AffordabilityResult>("/api/finance/affordability", data);
export const calculateRateSensitivity = (data: RateSensitivityRequest) =>
  post<RateSensitivityResult>("/api/finance/rate-sensitivity", data);
export const getFundingPrograms = (audience?: string) =>
  request<FundingProgram[]>(`/api/funding-programs${audience ? `?audience=${audience}` : ""}`);
export const getBuyerAssistance = () => request<FundingProgram[]>("/api/buyers/assistance");
export const getDemoHousehold = () => request<DemoHousehold>("/api/buyers/demo-household");
export const getContributions = (projectId: number) =>
  request<Contribution[]>(`/api/projects/${projectId}/contributions`);
export const createContribution = (projectId: number, data: ContributionCreate) =>
  post<Contribution>(`/api/projects/${projectId}/contributions`, data);
export const updateContributionStatus = (projectId: number, contributionId: number, status: Status) =>
  request<Contribution>(`/api/projects/${projectId}/contributions/${contributionId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const deleteContribution = (projectId: number, contributionId: number) =>
  request<void>(`/api/projects/${projectId}/contributions/${contributionId}`, { method: "DELETE" });
export const resetContributions = (projectId: number) =>
  request<void>(`/api/projects/${projectId}/contributions/reset`, { method: "POST" });
export const runScenario = (projectId: number, data: ScenarioRequest) =>
  post<ScenarioResult>(`/api/projects/${projectId}/scenario`, data);
export const saveCosts = (projectId: number, costs: Record<string, number>) =>
  request<Project>(`/api/projects/${projectId}/costs`, { method: "PATCH", body: JSON.stringify({ costs }) });
export const resetCosts = (projectId: number) => post<Project>(`/api/projects/${projectId}/costs/reset`, {});
export const getDonationImpact = (projectId: number, amount: number) =>
  post<DonationImpact>("/api/finance/donation-impact", { project_id: projectId, amount });
export const calculateConsortium = (projectId: number, employers: { name: string; amount: number }[]) =>
  post<ConsortiumResult>("/api/finance/consortium", { project_id: projectId, employers });
export const generateFundingStrategy = (data: StrategyRequest) =>
  post<StrategyResponse>("/api/ai/funding-strategy", data);
export const reportUrl = (projectId: number) => `${API_BASE}/api/projects/${projectId}/report`;
