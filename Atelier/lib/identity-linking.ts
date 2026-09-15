export function verifiedLinkTarget(expectedUid:string, actualUid:string, emailVerified:boolean) {
  return !!expectedUid && expectedUid === actualUid && emailVerified;
}
export function verifiedCollisionEmail(expectedEmail:string, actualEmail:string | null, emailVerified:boolean) {
  return !!expectedEmail && emailVerified && expectedEmail.trim().toLowerCase() === actualEmail?.trim().toLowerCase();
}
