import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import {
  Card,
  Text,
  Avatar,
  ActivityIndicator,
  Searchbar,
  SegmentedButtons,
  IconButton,
  Button,
  TextInput,
  Portal,
  Modal,
  HelperText,
  Appbar
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/superbase"; // ⬅️ your Supabase client path
import { router } from "expo-router";

// ───────────────────────────────────────────────────────────────────────────────
// Types matching your schema
// ───────────────────────────────────────────────────────────────────────────────
export type UserListItem = {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  occupation: string | null;
  is_expert: boolean;
};
type MyProfile = {
  id: string;
  profile_picture_url: string | null;
  is_expert: boolean;
  first_name: string;
  last_name: string;
};



export type EventItem = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string; // ISO
  end_at: string | null; // ISO
  cover_url: string | null;
  created_at: string;
  updated_at?: string;
};

const PAGE_SIZE = 20;

export default function HomeScreen() {
  const navigation = useNavigation();
const [me, setMe] = useState<MyProfile | null>(null);
  // ── users state
  const [items, setItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // ── events state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [eventsPage, setEventsPage] = useState<number>(0);
  const [eventsHasMore, setEventsHasMore] = useState<boolean>(true);

  // ── search + filter
  const [query, setQuery] = useState<string>("");
  const [filter, setFilter] = useState<"experts" | "all" | "events">("experts");
  const whereExpert = filter === "experts";

  // ── scroll ref (optional for scroll-to-top)
  const listRef = useRef<FlatList<any>>(null);

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch: Users
  // ────────────────────────────────────────────────────────────────────────────
  const fetchUsersPage = useCallback(
    async (pageIndex: number, replace = false) => {
      try {
        if (loading) return;
        setLoading(true);

        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let q = supabase
          .from("users")
          .select(
            "id, first_name, last_name, profile_picture_url, occupation, is_expert",
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(from, to);

        if (whereExpert) q = q.eq("is_expert", true);
        if (query.trim().length > 0) {
          q = q.or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,occupation.ilike.%${query}%`
          );
        }

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data ?? []) as UserListItem[];
        setHasMore(rows.length === PAGE_SIZE);
        setPage(pageIndex);
        setItems((prev) => (replace ? rows : [...prev, ...rows]));
      } catch (e) {
        console.warn("fetch users error", e);
      } finally {
        setLoading(false);
      }
    },
    [loading, query, whereExpert]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Fetch: Events
  // ────────────────────────────────────────────────────────────────────────────
  const fetchEventsPage = useCallback(
    async (pageIndex: number, replace = false) => {
      try {
        if (eventsLoading) return;
        setEventsLoading(true);

        const from = pageIndex * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let q = supabase
          .from("events")
          .select("*", { count: "exact" })
          // Upcoming first (ascending by start time). Change to false for newest-first.
          .order("start_at", { ascending: true })
          .range(from, to);

        if (query.trim().length > 0) {
          q = q.or(`title.ilike.%${query}%,location.ilike.%${query}%`);
        }

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data ?? []) as EventItem[];
        setEventsHasMore(rows.length === PAGE_SIZE);
        setEventsPage(pageIndex);
        setEvents((prev) => (replace ? rows : [...prev, ...rows]));
      } catch (e) {
        console.warn("fetch events error", e);
      } finally {
        setEventsLoading(false);
      }
    },
    [eventsLoading, query]
  );
useEffect(() => {
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("users")
      .select("id, profile_picture_url, is_expert, first_name, last_name")
      .eq("id", user.id)
      .single();
    if (!error && data) setMe(data as MyProfile);
  })();
}, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Refresh logic depending on active tab
  // ────────────────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setRefreshing(true);
    if (filter === "events") {
      await fetchEventsPage(0, true);
    } else {
      await fetchUsersPage(0, true);
    }
    setRefreshing(false);
  }, [fetchUsersPage, fetchEventsPage, filter]);

  // Initial load (users first)
  useEffect(() => {
    fetchUsersPage(0, true);
  }, []);

  // Re-fetch on query/filter change
  useEffect(() => {
    if (filter === "events") {
      fetchEventsPage(0, true);
    } else {
      fetchUsersPage(0, true);
    }
  }, [query, filter]);

  // Infinite scroll
  const onEndReached = useCallback(() => {
    if (filter === "events") {
      if (eventsLoading || !eventsHasMore) return;
      fetchEventsPage(eventsPage + 1);
    } else {
      if (loading || !hasMore) return;
      fetchUsersPage(page + 1);
    }
  }, [
    filter,
    // users deps
    loading,
    hasMore,
    page,
    fetchUsersPage,
    // events deps
    eventsLoading,
    eventsHasMore,
    eventsPage,
    fetchEventsPage,
  ]);

  // ────────────────────────────────────────────────────────────────────────────
  // Renderers
  // ────────────────────────────────────────────────────────────────────────────
  const renderUserItem = useCallback(
    ({ item }: { item: UserListItem }) => {
      const name = `${item.first_name} ${item.last_name}`.trim();
      const avatar = item.profile_picture_url || "https://via.placeholder.com/150";

      return (
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/user/[id]", params: { id: item.id } })
          }
        >
          <Card style={styles.card}>
            <Card.Title
              title={name}
              subtitle={item.occupation || (item.is_expert ? "Expert" : "User")}
              left={(props) => (
                <Avatar.Image {...props} size={44} source={{ uri: avatar }} />
              )}
              right={(props) =>
                item.is_expert ? (
                  <Avatar.Icon {...props} size={28} icon="star" />
                ) : null
              }
            />
          </Card>
        </TouchableOpacity>
      );
    },
    [navigation]
  );

  const renderEventItem = useCallback(({ item }: { item: EventItem }) => {
    const start = new Date(item.start_at);
    const end = item.end_at ? new Date(item.end_at) : null;
    const when =
      start.toLocaleString() + (end ? ` → ${end.toLocaleString()}` : "");
    return (
      <Card style={styles.card}>
        <Card.Title
          title={item.title}
          subtitle={item.location ? `${item.location} • ${when}` : when}
          left={(props) => <Avatar.Icon {...props} size={44} icon="calendar" />}
        />
        {item.description ? (
          <Card.Content>
            <Text>{item.description}</Text>
          </Card.Content>
        ) : null}
      </Card>
    );
  }, []);

  const keyExtractorUsers = useCallback((it: UserListItem) => it.id, []);
  const keyExtractorEvents = useCallback((it: EventItem) => it.id, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Create Event Modal state & handlers
  // ────────────────────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState(""); // "2025-10-12 18:00"
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formTouched, setFormTouched] = useState(false);
  const titleError = formTouched && !title.trim();
  const startError = formTouched && !startAt.trim();

  const resetForm = () => {
    setTitle("");
    setLocation("");
    setStartAt("");
    setEndAt("");
    setDescription("");
    setFormTouched(false);
  };

  const handleCreate = useCallback(async () => {
    // Basic validation
    if (!title.trim() || !startAt.trim()) {
      setFormTouched(true);
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        creator_id: user.id, // FK -> public.users(id), matches RLS check
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
        cover_url: null as string | null,
      };

      const { data, error } = await supabase
        .from("events")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      // optimistic prepend
      setEvents((prev) => [data as EventItem, ...prev]);
      setCreateOpen(false);
      resetForm();
    } catch (e) {
      console.warn("create event error", e);
    } finally {
      setSubmitting(false);
    }
  }, [title, location, startAt, endAt, description]);

  // ────────────────────────────────────────────────────────────────────────────
  // Header (search + segmented buttons)
  // ────────────────────────────────────────────────────────────────────────────
  const ListHeader = useMemo(
    () => (
      <View style={styles.header}>
        <Searchbar
          placeholder={
            filter === "events"
              ? "Search events (title/location)"
              : "Search name or occupation"
          }
          value={query}
          onChangeText={setQuery}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <SegmentedButtons
          style={{ marginHorizontal: 12, marginTop: 6 }}
          value={filter}
          onValueChange={(v) => setFilter(v as any)}
          buttons={[
            { value: "experts", label: "Experts", icon: "star" },
            { value: "all", label: "All", icon: "account-group" },
            { value: "events", label: "Events", icon: "calendar" },
          ]}
        />
      </View>
    ),
    [query, filter]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  const showingEvents = filter === "events";

  const isLoading = showingEvents ? eventsLoading : loading;

  return (
    <View style={styles.container}>
      {/* Users list */}
      
{!showingEvents && (
  <FlatList<UserListItem>
    ref={listRef as any}
    data={items}
    keyExtractor={(item) => item.id}
    renderItem={renderUserItem}
    contentContainerStyle={styles.listContent}
    ListHeaderComponent={ListHeader}
    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    onEndReachedThreshold={0.5}
    onEndReached={onEndReached}
    ListFooterComponent={
      loading ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      ) : null
    }
  />
)}

{/* Events list */}
{showingEvents && (
  <FlatList<EventItem>
    ref={listRef as any}
    data={events}
    keyExtractor={(item) => item.id}
    renderItem={renderEventItem}
    contentContainerStyle={styles.listContent}
    ListHeaderComponent={ListHeader}
    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    onEndReachedThreshold={0.5}
    onEndReached={onEndReached}
    ListFooterComponent={
      eventsLoading ? (
        <View style={{ paddingVertical: 16 }}>
          <ActivityIndicator />
        </View>
      ) : null
    }
  />
)}


      {/* Bottom controls */}
     {/* Floating “+ Event” button — only visible in Events tab */}
{showingEvents && (
  <IconButton
    icon="plus"
    mode="contained-tonal"
    size={32}
    onPress={() => setCreateOpen(true)}
    style={styles.addEventButton}
  />
)}


      {/* Create Event Modal */}
      
      <Portal>
        <Modal
          visible={createOpen}
          onDismiss={() => setCreateOpen(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={{ marginBottom: 12 }}>
            Create Event
          </Text>

          <TextInput
            label="Title *"
            value={title}
            onChangeText={setTitle}
            style={{ marginBottom: 4 }}
          />
          <HelperText type="error" visible={!!titleError}>
            Title is required
          </HelperText>

          <TextInput
            label="Location"
            value={location}
            onChangeText={setLocation}
            style={{ marginBottom: 8 }}
          />

          <TextInput
            label='Start (e.g. "2025-10-12 18:00") *'
            value={startAt}
            onChangeText={setStartAt}
            style={{ marginBottom: 4 }}
            placeholder="YYYY-MM-DD HH:mm"
          />
          <HelperText type="error" visible={!!startError}>
            Start time is required
          </HelperText>

          <TextInput
            label='End (e.g. "2025-10-12 20:00")'
            value={endAt}
            onChangeText={setEndAt}
            style={{ marginBottom: 8 }}
            placeholder="YYYY-MM-DD HH:mm"
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ marginBottom: 12 }}
          />

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
            <Button onPress={() => setCreateOpen(false)}>Cancel</Button>
            <Button mode="contained" loading={submitting} onPress={handleCreate}>
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  listContent: { padding: 12, paddingBottom: 24 },
  card: { borderRadius: 16 },
  header: { paddingTop: 8 },
  search: { marginHorizontal: 12, borderRadius: 12 },

  // Bottom controls: left "+" and right "↑"
  addEventButton: {
  position: "absolute",
  right: 20,
  bottom: 20,
  borderRadius: 28,
  elevation: 4,
},

  bottomBar: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftFab: { alignSelf: "flex-start" },

  // Modal styling
  modal: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  topBar: {
  paddingTop: 6,
  paddingHorizontal: 8,
  flexDirection: "row",
  alignItems: "center",
},

avatarWrap: {
  width: 34,
  height: 34,
  borderRadius: 17,
  overflow: "visible",
},

expertBadge: {
  position: "absolute",
  right: -4,
  bottom: -4,
  borderRadius: 10,
  // subtle shadow for visibility
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 2,
},

badgeExpert: {
  // Paper Avatar.Icon will carry the star; wrapper can stay transparent
},

badgeNonExpert: {
  opacity: 0.75, // slightly dim for non-expert
},

});
