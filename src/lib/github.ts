import type { ProfileInfo, Social } from "./types";

type GithubUser = {
  login: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
};

export async function scrapeGithub(
  rawUsername: string,
): Promise<Partial<ProfileInfo>> {
  const username = rawUsername.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
  if (!username) throw new Error("empty username");
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    throw new Error("invalid github username");
  }

  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) throw new Error(`@${username} not found on github`);
  if (res.status === 403) {
    throw new Error("github api rate limit hit - try again in an hour");
  }
  if (!res.ok) throw new Error(`github api error (${res.status})`);
  const data = (await res.json()) as GithubUser;

  const socials: Social[] = [
    { kind: "github", value: `github.com/${data.login}` },
  ];
  if (data.blog) {
    const url = data.blog.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    socials.push({ kind: "website", value: url });
  }
  if (data.twitter_username) {
    socials.push({ kind: "x", value: `@${data.twitter_username}` });
  }
  if (data.email) {
    socials.push({ kind: "email", value: data.email });
  }

  return {
    name: data.name || data.login,
    org: (data.company || "").replace(/^@/, "").trim(),
    location: data.location || "",
    tagline: data.bio || "",
    socials,
  };
}
