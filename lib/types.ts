export type AdStatus = "pending" | "active" | "expired";

export type Ad = {
  id: string;
  title: string;
  url: string;
  banner_color: string;
  duration_seconds?: number;
  starts_at: string;
  ends_at: string;
  status: AdStatus;
  payment_id: string | null;
};
