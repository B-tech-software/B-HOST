const parseOwnerEmails = () => {
  const raw = import.meta.env.VITE_OWNER_EMAILS || 'munengebee@gmail.com,munegebee@gmail.com';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

export const ownerEmails = parseOwnerEmails();

export const isOwnerEmail = (email) => {
  if (!email) return false;
  return ownerEmails.includes(String(email).trim().toLowerCase());
};
