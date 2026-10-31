export function canDeleteClaim(status: string): boolean {
  return status === 'draft' || status === 'saved';
}

export const SUBMITTED_DELETE_MESSAGE = 'Change this report to draft or saved before deleting it.';