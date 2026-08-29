export const VEMETRIC_TOKEN = (
  process.env.NEXT_PUBLIC_VEMETRIC_TOKEN ||
  process.env.NEXT_PUBLIC_VEMETRICS_PROJECT_ID
)?.trim();
