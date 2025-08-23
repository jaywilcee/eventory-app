export function getSelectedClubId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('eventory:clubId');
}
export function setSelectedClubId(clubId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('eventory:clubId', clubId);
}
