export interface TeacherCredentials {
  fullName: string;
  email: string;
  password: string;
  signInUrl?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Opens a clean, self-contained window with a printable credentials sheet and
 * triggers the print dialog. Uses its own document so it never inherits or
 * fights the app's global print CSS.
 */
export function printTeacherCredentials(cred: TeacherCredentials) {
  const signInUrl = cred.signInUrl ?? `${window.location.origin}/auth`;
  const win = window.open('', '_blank', 'width=720,height=800');
  if (!win) return false;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Sign-in details — ${escapeHtml(cred.fullName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 48px; }
  .sheet { max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748b; margin: 0 0 24px; font-size: 14px; }
  .row { margin: 0 0 16px; }
  .label { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin-bottom: 4px; }
  .value { font-size: 18px; font-weight: 600; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; word-break: break-all; }
  .pw { background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px 14px; letter-spacing: .04em; }
  .note { margin-top: 24px; font-size: 13px; color: #475569; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  .brand { font-weight: 800; letter-spacing: .05em; color: #0f172a; }
  @media print { body { padding: 24px; } .sheet { border-color: #cbd5e1; } }
</style>
</head>
<body>
  <div class="sheet">
    <h1>Your Nexus sign-in</h1>
    <p class="sub"><span class="brand">EXPLR NEXUS</span> — lending library account for ${escapeHtml(cred.fullName)}</p>
    <div class="row">
      <div class="label">Sign in at</div>
      <div class="value">${escapeHtml(signInUrl)}</div>
    </div>
    <div class="row">
      <div class="label">Email / username</div>
      <div class="value">${escapeHtml(cred.email)}</div>
    </div>
    <div class="row">
      <div class="label">Password</div>
      <div class="value pw">${escapeHtml(cred.password)}</div>
    </div>
    <p class="note">
      Keep this sheet somewhere safe. You can sign in right away with these details and change your
      password anytime from your account menu.
    </p>
  </div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
