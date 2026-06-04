// Synthetic JWT (header.payload.signature) with role=player, exp 24h out.
// Used only when VITE_USE_MOCK=true. Not signed — interceptor doesn't verify.
function makeMockJWT(payload) {
  const header = { alg: "none", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const body = { ...payload, exp };
  const b64 = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=+$/, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  return `${b64(header)}.${b64(body)}.mocksig`;
}

const MOCK_USERS = {
  "player@demo.com": { role: "player", name: "Demo Player", id: "u-player-1" },
  "manager@demo.com": { role: "manager", name: "Demo Manager", id: "u-manager-1" },
  "admin@demo.com": { role: "superadmin", name: "Demo Admin", id: "u-admin-1" },
};

export async function mockLogin({ email }) {
  await new Promise((r) => setTimeout(r, 350));
  const profile = MOCK_USERS[email?.toLowerCase()] || MOCK_USERS["player@demo.com"];
  const user = {
    id: profile.id,
    _id: profile.id,
    email: email || "player@demo.com",
    name: profile.name,
    role: profile.role,
    mobile: "+91 90000 00000",
    profileImage: "",
    sports: ["Cricket", "Football"],
    win: 12,
    lose: 3,
    draw: 1,
  };
  return { token: makeMockJWT({ sub: profile.id, role: profile.role }), user };
}

export async function mockSendOtp() {
  await new Promise((r) => setTimeout(r, 300));
  return { message: "OTP sent (mock: any 6 digits accepted)" };
}

export async function mockVerifyOtp() {
  await new Promise((r) => setTimeout(r, 250));
  return { verified: true };
}

export async function mockResetPassword() {
  await new Promise((r) => setTimeout(r, 300));
  return { success: true };
}
