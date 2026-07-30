// This file is mock-implemented to prevent server-side crashes due to missing env variables.
export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop) {
    return () => {
      console.warn(`[Supabase Admin Mock] Attempted to call method: ${String(prop)}`);
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null })
          })
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null })
        })
      };
    };
  }
});
