const DRIVE_PATTERNS = [
  /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/,
  /drive\.google\.com\/thumbnail\?id=([a-zA-Z0-9_-]+)/
];

export function getGoogleDriveFileId(url: string) {
  if (!url.includes('drive.google.com')) return null;
  for (const pattern of DRIVE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('id');
  } catch {
    return null;
  }
}

export function toGoogleDriveThumbnail(url: string) {
  const fileId = getGoogleDriveFileId(url.trim());
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}
