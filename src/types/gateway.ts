export interface GatewayError extends Error {
  code?: string;
  status?: number;
}
