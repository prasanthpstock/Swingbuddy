async function loadConnections() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      console.error("No active session", error);
      setConnections([]);
      setLoading(false);
      return;
    }

    const response = await fetch(`${API_BASE_URL}/auth/broker-connections`, {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
      cache: "no-store",
    });

    const result = await response.json();
    setConnections(Array.isArray(result) ? result : []);
  } catch (err) {
    console.error("Failed to load broker connections", err);
    setConnections([]);
  } finally {
    setLoading(false);
  }
}
