export const normalizeEmail = (email) => {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email) => {
  const normalized = normalizeEmail(email);
  return Boolean(normalized) && EMAIL_REGEX.test(normalized);
};

export const isChatOwner = (session, user) => {
  if (!session?.user || !user?._id) return false;
  return session.user.equals
    ? session.user.equals(user._id)
    : String(session.user) === String(user._id);
};

export const isCollaborator = (session, user) => {
  if (!user?.email || !Array.isArray(session?.peopleCollaborate)) return false;
  const userEmail = normalizeEmail(user.email);
  if (!userEmail) return false;
  return session.peopleCollaborate.some(
    (entry) => normalizeEmail(entry) === userEmail,
  );
};

export const canAccessChatSession = (session, user) =>
  isChatOwner(session, user) || isCollaborator(session, user);

/**
 * Normalize peopleCollaborate emails in-place when casing/whitespace differs.
 * Returns true if the document was modified and should be saved.
 */
export const normalizePeopleCollaborateIfNeeded = (session) => {
  if (!session || !Array.isArray(session.peopleCollaborate)) return false;

  const normalized = [
    ...new Set(
      session.peopleCollaborate
        .map((email) => normalizeEmail(email))
        .filter(Boolean),
    ),
  ];

  const unchanged =
    normalized.length === session.peopleCollaborate.length &&
    normalized.every((email, i) => email === session.peopleCollaborate[i]);

  if (unchanged) return false;

  session.peopleCollaborate = normalized;
  return true;
};
