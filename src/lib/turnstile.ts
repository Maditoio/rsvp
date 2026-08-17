export async function verifyTurnstile(token?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) throw new Error("Bot protection challenge required");

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body },
  );
  const data = (await res.json()) as { success?: boolean };
  if (!data.success) {
    throw new Error("Bot protection failed");
  }
  return true;
}
