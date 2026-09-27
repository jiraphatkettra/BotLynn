import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@lynnbot/database";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify email guilds",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      try {
        const discordProfile = profile as any;

        // Upsert user in database
        await prisma.user.upsert({
          where: { discordId: account.providerAccountId },
          update: {
            username: discordProfile.username,
            displayName: discordProfile.global_name || discordProfile.username,
            avatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${account.providerAccountId}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
          },
          create: {
            discordId: account.providerAccountId,
            username: discordProfile.username,
            displayName: discordProfile.global_name || discordProfile.username,
            avatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${account.providerAccountId}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
            role: "ADMIN",
          },
        });

        // Log the authentication
        const dbUser = await prisma.user.findUnique({
          where: { discordId: account.providerAccountId },
        });

        if (dbUser) {
          await prisma.auditLog.create({
            data: {
              userId: dbUser.id,
              action: "User logged in",
              category: "AUTH",
              details: `${discordProfile.username} logged in via Discord OAuth2`,
            },
          });
        }

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async session({ session, token }) {
      const discordId = (token.providerAccountId || token.discordId) as string;
      if (discordId) {
        const dbUser = await prisma.user.findUnique({
          where: { discordId },
          include: { permissions: true },
        });

        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).discordId = dbUser.discordId;
          (session.user as any).role = dbUser.role;
          (session.user as any).displayName = dbUser.displayName;
          (session.user as any).avatar = dbUser.avatar;
          (session.user as any).permissions = dbUser.permissions.map(
            (p) => p.permission
          );
        }
      }
      return session;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.providerAccountId = account.providerAccountId;
        token.discordId = account.providerAccountId;
        token.accessToken = account.access_token;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Determine the real production base URL if deployed on Vercel
      let effectiveBaseUrl = baseUrl;
      if (process.env.VERCEL_URL && (baseUrl.includes("localhost") || !baseUrl)) {
        effectiveBaseUrl = `https://${process.env.VERCEL_URL}`;
      }

      // Allows relative callback URLs
      if (url.startsWith("/")) {
        return `${effectiveBaseUrl}${url}`;
      }

      // Allows callback URLs on the same origin or Vercel domain
      try {
        const parsedUrl = new URL(url);
        if (
          parsedUrl.origin === effectiveBaseUrl ||
          parsedUrl.hostname.endsWith(".vercel.app")
        ) {
          return url;
        }
      } catch {}

      return effectiveBaseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

async function authHandler(req: any, ctx: any) {
  try {
    const host =
      (typeof req.headers?.get === "function"
        ? req.headers.get("x-forwarded-host") || req.headers.get("host")
        : null) || process.env.VERCEL_URL;

    const proto =
      (typeof req.headers?.get === "function"
        ? req.headers.get("x-forwarded-proto")
        : null) || "https";

    if (host && !host.includes("localhost")) {
      const realDomain = host.startsWith("http") ? host : `${proto}://${host}`;
      if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost")) {
        process.env.NEXTAUTH_URL = realDomain;
      }
    }
  } catch (e) {
    // ignore
  }

  return handler(req, ctx);
}

export { authHandler as GET, authHandler as POST };
