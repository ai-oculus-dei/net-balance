import { useEffect, useState } from 'react';
import { fetchProfiles } from '../lib/supabase/queries/profiles';
import type { Profile } from '../lib/supabase/database.types';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    fetchProfiles()
      .then((data) => {
        if (!cancelado) setProfiles(data);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return { profiles, loading };
}
