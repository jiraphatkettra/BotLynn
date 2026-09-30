import NextAuth, { type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@lynnbot/database";
import { isRootOwner, ROOT_OWNER_DISCORD_ID } from "@/lib/utils";

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
        const isRoot = isRootOwner(account.providerAccountId);

        // Upsert user in database (Root Owner is always guaranteed role OWNER and isActive true)
        await prisma.user.upsert({
          where: { discordId: account.providerAccountId },
          update: {
            username: discordProfile.username,
            displayName: discordProfile.global_name || discordProfile.username,
            avatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${account.providerAccountId}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
            ...(isRoot ? { role: "OWNER", isActive: true } : {}),
          },
          create: {
            discordId: account.providerAccountId,
            username: discordProfile.username,
            displayName: discordProfile.global_name || discordProfile.username,
            avatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${account.providerAccountId}/${discordProfile.avatar}.png`
              : null,
            email: discordProfile.email,
            role: isRoot ? "OWNER" : "ADMIN",
            isActive: true,
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
              details: `${discordProfile.username} logged in via Discord OAuth2${isRoot ? " (Root Owner)" : ""}`,
            },
          });
        }

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.providerAccountId = account.providerAccountId;
        token.discordId = account.providerAccountId;
        token.accessToken = account.access_token;
      }

      const discordId = (token.providerAccountId || token.discordId) as string;
      const now = Date.now();
      const lastSynced = (token.lastSynced as number) || 0;

      // Cache user details in JWT token for 5 minutes to prevent redundant DB roundtrips on every navigation
      if (discordId && (!token.dbUser || now - lastSynced > 300000)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId },
            include: { permissions: true },
          });

          if (dbUser) {
            const isRoot = isRootOwner(dbUser.discordId);

            // Guarantee Root Owner always maintains OWNER role in database
            if (isRoot && (dbUser.role !== "OWNER" || !dbUser.isActive)) {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { role: "OWNER", isActive: true },
              });
              dbUser.role = "OWNER";
              dbUser.isActive = true;
            }

            token.dbUser = {
              id: dbUser.id,
              discordId: dbUser.discordId,
              role: isRoot ? "OWNER" : dbUser.role,
              isRootOwner: isRoot,
              displayName: dbUser.displayName,
              avatar: dbUser.avatar,
              permissions: dbUser.permissions.map((p) => p.permission),
            };
            token.lastSynced = now;
          }
        } catch (error) {
          console.error("Error refreshing user in JWT callback:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.dbUser) {
        const u = token.dbUser as any;
        const isRoot = isRootOwner(u.discordId);
        (session.user as any).id = u.id;
        (session.user as any).discordId = u.discordId;
        (session.user as any).role = isRoot ? "OWNER" : u.role;
        (session.user as any).isRootOwner = isRoot;
        (session.user as any).displayName = u.displayName;
        (session.user as any).avatar = u.avatar;
        (session.user as any).permissions = u.permissions || [];
      } else {
        const discordId = (token.providerAccountId || token.discordId) as string;
        if (discordId) {
          const isRoot = isRootOwner(discordId);
          (session.user as any).discordId = discordId;
          (session.user as any).isRootOwner = isRoot;
          if (isRoot) (session.user as any).role = "OWNER";
        }
      }
      return session;
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
