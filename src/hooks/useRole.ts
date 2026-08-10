import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "staff";

/**
 * Reads the signed-in user's roles from the database (never from client state).
 * Frontend checks are convenience only — the database enforces access via RLS.
 */
export function useRoles() {
  return useQuery({
    queryKey: ["user-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      return (data ?? []).map((r) => r.role as AppRole);
    },
    staleTime: 60_000,
  });
}

export function useIsOwner() {
  const { data: roles = [], isLoading } = useRoles();
  return { isOwner: roles.includes("owner"), isLoading };
}
