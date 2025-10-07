import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Card, Text, Avatar, ActivityIndicator, Searchbar, SegmentedButtons, IconButton } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/superbase"; // ⬅️ your Supabase client path
import { router } from "expo-router";

// ────────────────────────────────────────────────────────────────────────────────
// Types matching your schema
// ────────────────────────────────────────────────────────────────────────────────
export type UserListItem = {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  occupation: string | null;
  is_expert: boolean;
};

const PAGE_SIZE = 20;

export default function HomeScreen() {
  const navigation = useNavigation();

  const [items, setItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [filter, setFilter] = useState<"experts" | "all">("experts"); // ✅ default: experts only

  const whereExpert = filter === "experts";

  const fetchPage = useCallback(async (pageIndex: number, replace = false) => {
    try {
      if (loading) return;
      setLoading(true);

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Base query
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
        // simple ilike search on name/occupation
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
  }, [loading, query, whereExpert]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(0, true);
    setRefreshing(false);
  }, [fetchPage]);

  useEffect(() => {
    // initial load
    fetchPage(0, true);
  }, []);

  useEffect(() => {
    // refetch when filters change
    fetchPage(0, true);
  }, [query, filter]);

  const onEndReached = useCallback(() => {
    if (loading || !hasMore) return;
    fetchPage(page + 1);
  }, [loading, hasMore, page, fetchPage]);

  const renderItem = useCallback(({ item }: { item: UserListItem }) => {
    const name = `${item.first_name} ${item.last_name}`.trim();
    const avatar = item.profile_picture_url || "https://via.placeholder.com/150";

    return (
    <TouchableOpacity   onPress={() =>
    router.push({ pathname: "/user/[id]", params: { id: item.id } })
  }>
        <Card style={styles.card}>
          <Card.Title
            title={name}
            subtitle={item.occupation || (item.is_expert ? "Expert" : "User")}
            left={(props) => <Avatar.Image {...props} size={44} source={{ uri: avatar }} />}
            right={(props) => (
              item.is_expert ? <Avatar.Icon {...props} size={28} icon="star" /> : null
            )}
          />
        </Card>
      </TouchableOpacity>
    );
  }, [navigation]);

  const keyExtractor = useCallback((it: UserListItem) => it.id, []);

  const ListHeader = useMemo(() => (
    <View style={styles.header}>
      <Searchbar
        placeholder="Search name or occupation"
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
        ]}
      />
    </View>
  ), [query, filter]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
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

      {/* Quick scroll-to-top */}
      <View style={styles.fabRow}>
        <IconButton icon="arrow-up" mode="contained" onPress={() => { /* optional */ }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  listContent: { padding: 12, paddingBottom: 24 },
  card: { borderRadius: 16 },
  header: { paddingTop: 8 },
  search: { marginHorizontal: 12, borderRadius: 12 },
  fabRow: { position: "absolute", right: 6, bottom: 6 },
});
   