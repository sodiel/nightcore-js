export const cookieWarning = "YouTube cookies can grant access to your account. Sharing them can give someone else that access. Enable this only on a machine you control.";

export function youtubeAuth(env: NodeJS.ProcessEnv, host: string) {
  if (env.YT_DLP_LOCAL_AUTH !== "1") return { enabled: false, args: [] as string[] };
  if ((env.DEPLOYMENT && env.DEPLOYMENT !== "native") || (host !== "127.0.0.1" && host !== "::1")) {
    throw new Error("YouTube local authentication requires a native backend bound to loopback.");
  }
  const browser = env.YT_DLP_COOKIES_FROM_BROWSER?.trim();
  const file = env.YT_DLP_COOKIES_PATH?.trim();
  if (Boolean(browser) === Boolean(file)) {
    throw new Error("Set one local YouTube cookie source in backend/.env.");
  }
  const args = browser ? ["--cookies-from-browser", browser] : ["--cookies", file!];
  const userAgent = env.YT_DLP_USER_AGENT?.trim();
  if (userAgent) args.push("--user-agent", userAgent);
  return { enabled: true, args };
}

const loopback = "(?:localhost|127\\.0\\.0\\.1|\\[::1\\])";
const localHost = new RegExp(`^${loopback}(?::[0-9]+)?$`, "i");
const localOrigin = new RegExp(`^https?://${loopback}(?::[0-9]+)?$`, "i");

export function isLocalRequest(host: string, origin?: string, fetchSite?: string) {
  return localHost.test(host) && (!origin || localOrigin.test(origin)) && fetchSite !== "cross-site";
}
