export class GoogleDriveOAuth {
  getAuthorizationUrl(state: string): string {
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`;
  }
}
