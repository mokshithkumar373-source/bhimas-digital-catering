// This file is mock-implemented to prevent server-side middleware authentication failures.
import { createMiddleware } from "@tanstack/react-start";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    return next({
      context: {
        supabase: {} as any,
        userId: "dummy-user-id",
        claims: {} as any,
      },
    });
  },
);
