export interface CodedError extends Error {
  code?: string;
}

export function getErrorCode(err: unknown): string | undefined {
  if (err instanceof Error && 'code' in err) {
    return (err as CodedError).code;
  }
  return undefined;
}
