import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, realpath, stat } from 'node:fs/promises';

// path.relative handles platform separators, drive letters and Windows case folding.
// Accept an explicit path implementation so Windows path rules are testable on Linux.
export function isWithinDirectory(root, candidate, paths = path) {
  function comparable(value) {
    if (paths.sep !== '\\') return value;
    // Windows can name the same directory through normal or extended-length
    // DOS/UNC paths. Compare both in the same namespace after realpath as well.
    const normalized = paths.normalize(value);
    if (/^\\\\\?\\UNC\\/i.test(normalized)) return '\\\\' + normalized.slice(8);
    if (/^\\\\\?\\/.test(normalized)) return normalized.slice(4);
    return normalized;
  }
  const relative = paths.relative(comparable(root), comparable(candidate));
  return relative === '' || (!paths.isAbsolute(relative) && relative !== '..' &&
    !relative.startsWith('..' + paths.sep));
}

async function checkWindowsDirectoryAcl(directory) {
  // Run before generating/writing passwords. No secret is passed to PowerShell.
  const command = `
    $ErrorActionPreference = 'Stop'
    $allowed = @([System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value,
                 'S-1-5-18', 'S-1-5-32-544')
    $acl = Get-Acl -LiteralPath $env:RESEARCHX_CREDENTIAL_DIRECTORY
    foreach ($entry in $acl.Access) {
      if ($entry.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow) {
        $sid = $entry.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
        if ($allowed -notcontains $sid) { throw 'Credential directory is not private' }
      }
    }
  `;
  try {
    await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      env: { ...process.env, RESEARCHX_CREDENTIAL_DIRECTORY: directory }, windowsHide: true,
    });
  } catch {
    throw new Error('Cannot verify a private Windows credential directory; follow docs/level3/WINDOWS_SETUP.md before initialization');
  }
}

export async function credentialFilePath(file, checkoutRoot) {
  if (!file || !path.isAbsolute(file)) {
    throw new Error('Set DEMO_CREDENTIALS_FILE to an absolute private path outside the checkout');
  }
  const parent = path.dirname(file);
  if (isWithinDirectory(checkoutRoot, parent)) throw new Error('Keep credentials outside the checkout');
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const resolvedParent = await realpath(parent);
  if (isWithinDirectory(checkoutRoot, resolvedParent)) throw new Error('Keep credentials outside the checkout');
  // POSIX modes do not implement NTFS ACLs; fail closed on Windows if ACL verification fails.
  if (process.platform === 'win32') await checkWindowsDirectoryAcl(resolvedParent);
  if (process.platform !== 'win32' && ((await stat(resolvedParent)).mode & 0o077)) {
    throw new Error('Credential directory must be accessible only to its owner (chmod 700)');
  }
  return path.join(resolvedParent, path.basename(file));
}
