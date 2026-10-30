// Where the old Render-hosted site should send a request, or null to serve it normally.
// Set REDIRECT_TO on Render so links on CVs already sent still reach the new site.
export function redirectTarget(base: string | undefined, originalUrl: string): string | null {
  if (!base) return null;
  return base.replace(/\/+$/, '') + originalUrl;
}
