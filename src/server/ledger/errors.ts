/**
 * A business-rule failure with a translation key the UI can show
 * (e.g. "accountClosed" -> Errors.accountClosed in messages/*.json).
 */
export class LedgerError extends Error {
  constructor(
    public code:
      | "notFound"
      | "accountArchived"
      | "accountNoTransfers"
      | "accountNoCheques"
      | "beforeOpeningDate"
      | "chequeNumberTaken"
      | "notEditable"
      | "notIssued"
      | "notActive"
      | "clearedBeforeIssue"
      | "adminOnly"
      | "emailTaken"
      | "accountNumberTaken"
      | "inviteNeedsSecretKey"
      | "inviteFailed",
    public field?: string,
  ) {
    super(code);
  }
}
