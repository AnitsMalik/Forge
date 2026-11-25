export class ConnectorError extends Error {
  constructor(
    public provider: string,
    message: string,
    public code?: string,
    public statusCode: number = 400
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'ConnectorError';
  }
}
