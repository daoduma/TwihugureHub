// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
import { Role, Language } from "./index";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      preferredLanguage: Language;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    preferredLanguage: Language;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    preferredLanguage: Language;
  }
}
