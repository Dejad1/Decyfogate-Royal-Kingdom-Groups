import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { NotificationLogRow } from "@decyfogate/api-client";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

const STATUS_STYLES: Record<NotificationLogRow["status"], { bg: string; text: string }> = {
  QUEUED: { bg: colors.slateBg, text: colors.slateText },
  SENT: { bg: colors.amberBg, text: colors.amberDark },
  DELIVERED: { bg: colors.emeraldBg, text: colors.emerald },
  FAILED: { bg: colors.redBg, text: colors.red },
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleString();
}

export function NotificationsPanel({ classUnitId }: { classUnitId?: string }) {
  const { client, user } = useAuth();
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);

  useEffect(() => {
    if (!user?.schoolId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await client.listNotificationLogs(user!.schoolId!);
        if (!cancelled) setLogs(data);
      } catch {
        // best-effort polling; ignore transient failures
      }
    }

    load();
    const interval = setInterval(load, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, user?.schoolId]);

  const filtered = classUnitId ? logs.filter((l) => l.student.classUnitId === classUnitId) : logs;
  const visible = filtered.slice(0, 20);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications sent</Text>
        <Text style={styles.subtitle}>Simulated SMS + WhatsApp</Text>
      </View>
      {visible.length === 0 ? (
        <Text style={styles.empty}>No notifications yet.</Text>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const badge = STATUS_STYLES[item.status];
            return (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.student.fullName} <Text style={styles.arrow}>{"->"}</Text> {item.guardian.fullName}
                  </Text>
                  <Text style={styles.rowMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.channel} · {timeAgo(item.createdAt)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  subtitle: { fontSize: 11, color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, paddingVertical: 20, fontSize: 13 },
  separator: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: "row", gap: 10, paddingVertical: 10, alignItems: "flex-start" },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: "500", color: colors.textPrimary },
  arrow: { color: colors.textMuted },
  rowMessage: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowMeta: { fontSize: 10, color: colors.textMuted, marginTop: 4, textTransform: "uppercase" },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: "600" },
});
