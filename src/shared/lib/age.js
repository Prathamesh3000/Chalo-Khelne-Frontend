// Age / minor helpers for the web app — mirrors the mobile client's age util so
// Families Policy gating (safety reminder before posting/stories) behaves the
// same on web. Minor = under 18.

export const getAge = (dob) => {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};

export const isMinorAge = (dobOrAge) => {
  const age = typeof dobOrAge === "number" ? dobOrAge : getAge(dobOrAge);
  return age != null && age < 18;
};

// Effective minor status for the current-user object. Prefer a server-provided
// isMinor flag; otherwise derive from the date of birth (auth normalizes it to
// `dob`, raw payloads may use `dateOfBirth`).
export const userIsMinor = (user) => {
  if (!user) return false;
  if (typeof user.isMinor === "boolean") return user.isMinor;
  return isMinorAge(user.dob || user.dateOfBirth);
};
