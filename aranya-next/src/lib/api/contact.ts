import { apiFetch } from "./http";

export interface ContactInput {
  name: string;
  email: string;
  order?: string;
  subject: string;
  message: string;
  consent: boolean;
}

export function submitContact(input: ContactInput): Promise<{ ref: string; message: string }> {
  return apiFetch(`/contact`, { method: "POST", body: input });
}
