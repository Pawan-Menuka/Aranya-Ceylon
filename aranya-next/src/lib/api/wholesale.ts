import { apiFetch } from "./http";

export interface WholesaleInput {
  company: string;
  contact: string;
  email: string;
  phone?: string;
  country: string;
  type: string;
  volume?: string;
  website?: string;
  message?: string;
  consent: boolean;
}

export function submitWholesale(input: WholesaleInput): Promise<{ ref: string; message: string }> {
  return apiFetch(`/wholesale/apply`, { method: "POST", body: input });
}
