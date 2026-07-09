import { useEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, StyleSheet, Text, View } from "react-native";
import { NotificationLogRow } from "@decyfogate/api-client";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

const STATUS_STYLES: Record<NotificationLogRow["status"], { bg: string; text: string }> = {
  QUEUED: { bg: colors.slateBg, text: colors.slateText },
  SENT: { bg: colors.amberBg, text: colors.amberDark },
  DELIVERED: { bg: colors.emeraldBg, text: colors.emerald },
  FAILED: { bg: colors.redBg, text: colors.red },
};

const CHANNEL_STYLES: Record<NotificationLogRow["channel"], { bg: string; text: string; label: string }> = {
  SMS: { bg: colors.skyBg, text: colors.sky, label: "SMS" },
  WHATSAPP: { bg: colors.greenBg, text: colors.green, label: "WhatsApp" },
  PUSH: { bg: colors.violetBg, text: colors.violet, label: "Push" },
  EMAIL: { bg: colors.amberBg, text: colors.amberDark, label: "Email" },
};

const TRIGGER_META: Record<NotificationLogRow["trigger"], { label: string; borderColor: string } | null> = {
  ATTENDANCE_MARKED: null,
  NOT_YET_ARRIVED: { label: "⚠ Not yet arrived", borderColor: colors.amberDark },
  BROADCAST: { label: "📢 Broadcast", borderColor: colors.sky },
  DISMISSAL_CONFIRMED: { label: "🏠 Dismissal", borderColor: colors.emerald },
  END_OF_DAY_DIGEST: { label: "📊 Daily digest", borderColor: colors.violet },
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleString();
}

function Pulse({ style }: { style: object }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, easing: Easing.ease, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]} />;
}

function NotificationSkeleton() {
  return (
    <View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={skeletonStyles.row}>
          <View style={{ flex: 1, gap: 6 }}>
            <Pulse style={skeletonStyles.lineWide} />
            <Pulse style={skeletonStyles.lineFull} />
            <Pulse style={skeletonStyles.lineNarrow} />
          </View>
          <Pulse style={skeletonStyles.badge} />
        </View>
      ))}
    </View>
  );
}

/**
 * Live "notifications sent" panel -- polls while mounted so a QUEUED row
 * visibly walks through SENT -> DELIVERED. Rows briefly highlight when
 * their status changes, and NOT_YET_ARRIVED/BROADCAST rows get a distinct
 * accent since they mean something different from a routine attendance
 * confirmation.
 */
export function NotificationsPanel({ classUnitId }: { classUnitId?: string }) {
  const { client, user } = useAuth();
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const statusByIdRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.schoolId) return;
    let cancelled = false;

    async function load() {
      try {
        const data = await client.listNotificationLogs(user!.schoolId!);
        if (cancelled) return;

        const changedIds: string[] = [];
        for (const row of data) {
          const prevStatus = statusByIdRef.current.get(row.id);
          if (prevStatus && prevStatus !== row.status) changedIds.push(row.id);
          statusByIdRef.current.set(row.id, row.status);
        }
        if (changedIds.length > 0) {
          setHighlighted((prev) => new Set([...prev, ...changedIds]));
          setTimeout(() => {
            setHighlighted((prev) => {
              const next = new Set(prev);
              changedIds.forEach((id) => next.delete(id));
              return next;
            });
          }, 1500);
        }

        setLogs(data);
      } catch {
        // best-effort polling; ignore transient failures
      } finally {
        if (!cancelled) setLoading(false);
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
      {loading ? (
        <NotificationSkeleton />
      ) : visible.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.empty}>No notifications yet.</Text>
          <Text style={styles.emptySub}>They&apos;ll appear here the moment attendance is marked.</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const badge = STATUS_STYLES[item.status];
            const channel = CHANNEL_STYLES[item.channel];
            const triggerMeta = TRIGGER_META[item.trigger];
            return (
              <View
                style={[
                  styles.row,
                  triggerMeta && { borderLeftWidth: 2, borderLeftColor: triggerMeta.borderColor, paddingLeft: 8 },
                  highlighted.has(item.id) && styles.rowHighlighted,
                ]}
              >
                <View style={styles.rowText}>
                  {triggerMeta && <Text style={styles.triggerLabel}>{triggerMeta.label}</Text>}
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.student.fullName} <Text style={styles.arrow}>{"->"}</Text> {item.guardian.fullName}
                  </Text>
                  <Text style={styles.rowMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.channelBadge, { backgroundColor: channel.bg }]}>
                      <Text style={[styles.channelBadgeText, { color: channel.text }]}>{channel.label}</Text>
                    </View>
                    <Text style={styles.rowMeta}>{timeAgo(item.createdAt)}</Text>
                  </View>
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
  emptyBlock: { paddingVertical: 24, alignItems: "center" },
  empty: { color: colors.textMuted, fontSize: 13 },
  emptySub: { color: colors.textMuted, fontSize: 11, marginTop: 4, opacity: 0.8 },
  separator: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: "row", gap: 10, paddingVertical: 10, alignItems: "flex-start", borderRadius: 8 },
  rowHighlighted: { backgroundColor: colors.highlightBg },
  rowText: { flex: 1 },
  triggerLabel: { fontSize: 10, fontWeight: "700", color: colors.amberDark, marginBottom: 2, textTransform: "uppercase" },
  rowTitle: { fontSize: 13, fontWeight: "500", color: colors.textPrimary },
  arrow: { color: colors.textMuted },
  rowMessage: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  channelBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  channelBadgeText: { fontSize: 10, fontWeight: "700" },
  rowMeta: { fontSize: 10, color: colors.textMuted },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: "600" },
});

const skeletonStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, paddingVertical: 10, alignItems: "flex-start" },
  lineWide: { height: 10, width: "70%", borderRadius: 4, backgroundColor: colors.slateBg },
  lineFull: { height: 9, width: "100%", borderRadius: 4, backgroundColor: colors.slateBg },
  lineNarrow: { height: 8, width: "40%", borderRadius: 4, backgroundColor: colors.slateBg },
  badge: { height: 18, width: 60, borderRadius: 999, backgroundColor: colors.slateBg },
});
