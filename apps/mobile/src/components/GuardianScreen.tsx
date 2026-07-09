import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChildSummaryDto, DevicePlatform, GuardianPreferencesDto, NotificationChannel } from "@decyfogate/shared-types";
import { GuardianNotificationRow } from "@decyfogate/api-client";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type Tab = "children" | "notifications" | "settings";

const ATTENDANCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PRESENT: { bg: colors.emeraldBg, text: colors.emerald, label: "Present" },
  LATE: { bg: colors.amberBg, text: colors.amberDark, label: "Late" },
  ABSENT: { bg: colors.redBg, text: colors.red, label: "Absent" },
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.PUSH]: "Push notification",
  [NotificationChannel.SMS]: "SMS",
  [NotificationChannel.EMAIL]: "Email",
  [NotificationChannel.WHATSAPP]: "WhatsApp",
};

const CHANNEL_STYLES: Record<string, { bg: string; text: string }> = {
  SMS: { bg: colors.skyBg, text: colors.sky },
  WHATSAPP: { bg: colors.greenBg, text: colors.green },
  PUSH: { bg: colors.violetBg, text: colors.violet },
  EMAIL: { bg: colors.amberBg, text: colors.amberDark },
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(iso).toLocaleString();
}

export function GuardianScreen() {
  const { client } = useAuth();
  const [tab, setTab] = useState<Tab>("children");
  const [children, setChildren] = useState<ChildSummaryDto[]>([]);
  const [notifications, setNotifications] = useState<GuardianNotificationRow[]>([]);
  const [preferences, setPreferences] = useState<GuardianPreferencesDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingChannels, setSavingChannels] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);
  const [registeringPush, setRegisteringPush] = useState(false);

  const loadAll = useCallback(async () => {
    const [childrenData, notificationsData, preferencesData] = await Promise.all([
      client.getMyChildren(),
      client.getMyNotifications(),
      client.getGuardianPreferences(),
    ]);
    setChildren(childrenData);
    setNotifications(notificationsData);
    setPreferences(preferencesData);
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  async function toggleChannel(channel: NotificationChannel) {
    if (!preferences) return;
    const has = preferences.preferredChannels.includes(channel);
    const next = has
      ? preferences.preferredChannels.filter((c: NotificationChannel) => c !== channel)
      : [...preferences.preferredChannels, channel];
    if (next.length === 0) return;
    setSavingChannels(true);
    try {
      const updated = await client.updateGuardianPreferences(next);
      setPreferences(updated);
    } finally {
      setSavingChannels(false);
    }
  }

  async function registerThisDevice() {
    setRegisteringPush(true);
    try {
      // Simulated -- there's no real Firebase project wired up for this
      // demo (push dispatch is simulated exactly like SMS/WhatsApp), so
      // this is a locally-generated opaque token, not a real FCM token.
      const token = `sim-${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await client.registerDeviceToken(token, Platform.OS === "ios" ? DevicePlatform.IOS : DevicePlatform.ANDROID);
      setPushRegistered(true);
    } finally {
      setRegisteringPush(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>PARENT/GUARDIAN</Text>
        <Text style={styles.title}>Your family</Text>
        <Text style={styles.subtitle}>
          A read-only view of your linked children and how they're notified -- no ability to mark attendance or take
          any staff action.
        </Text>
      </View>

      <View style={styles.tabRow}>
        {(["children", "notifications", "settings"] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tabButton, tab === t && styles.tabButtonActive]}>
            <Text style={[styles.tabButtonText, tab === t && styles.tabButtonTextActive]}>
              {t === "children" ? "My Children" : t === "notifications" ? "Notifications" : "Settings"}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {tab === "children" &&
          (children.length === 0 ? (
            <Text style={styles.emptyText}>No linked children found on this account.</Text>
          ) : (
            children.map((child) => {
              const badge = child.todayAttendanceStatus ? ATTENDANCE_BADGE[child.todayAttendanceStatus] : null;
              return (
                <View key={child.studentId} style={styles.childCard}>
                  <View style={styles.childHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childName}>{child.fullName}</Text>
                      <Text style={styles.childMeta}>
                        {child.classUnitName} · {child.schoolName}
                      </Text>
                    </View>
                    {badge ? (
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, { backgroundColor: colors.slateBg }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.slateText }]}>Not marked yet</Text>
                      </View>
                    )}
                  </View>
                  {child.todayDismissal && (
                    <Text style={styles.dismissalText}>
                      {child.todayDismissal.type === "SELF_DISMISSED"
                        ? "Left school unaccompanied today."
                        : `Picked up by ${child.todayDismissal.pickupPersonName}${
                            child.todayDismissal.pickupPersonRelationship ? ` (${child.todayDismissal.pickupPersonRelationship})` : ""
                          } today.`}
                    </Text>
                  )}
                </View>
              );
            })
          ))}

        {tab === "notifications" &&
          (notifications.length === 0 ? (
            <Text style={styles.emptyText}>No notifications yet.</Text>
          ) : (
            notifications.map((n) => {
              const channelStyle = CHANNEL_STYLES[n.channel] ?? { bg: colors.slateBg, text: colors.slateText };
              return (
                <View key={n.id} style={styles.notificationRow}>
                  <Text style={styles.notificationChild}>{n.student.fullName}</Text>
                  <Text style={styles.notificationMessage}>{n.message}</Text>
                  <View style={styles.notificationMeta}>
                    <View style={[styles.channelBadge, { backgroundColor: channelStyle.bg }]}>
                      <Text style={[styles.channelBadgeText, { color: channelStyle.text }]}>{n.channel}</Text>
                    </View>
                    <Text style={styles.notificationTime}>{timeAgo(n.createdAt)}</Text>
                  </View>
                </View>
              );
            })
          ))}

        {tab === "settings" && preferences && (
          <View style={{ gap: 16 }}>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>This device</Text>
              <Text style={styles.settingsSubtitle}>
                Register this device to receive push notifications -- the free, default channel once linked.
              </Text>
              <Pressable
                disabled={registeringPush || pushRegistered}
                onPress={registerThisDevice}
                style={[styles.pushButton, pushRegistered && styles.pushButtonDone]}
              >
                <Text style={styles.pushButtonText}>
                  {pushRegistered ? "✓ Push enabled on this device" : registeringPush ? "Registering..." : "Enable push notifications"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>How you want to be notified</Text>
              <Text style={styles.settingsSubtitle}>
                Choose one or more. WhatsApp only appears if a linked child's school includes it in their plan.
              </Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {preferences.availableChannels.map((channel: NotificationChannel) => {
                  const active = preferences.preferredChannels.includes(channel);
                  return (
                    <Pressable
                      key={channel}
                      disabled={savingChannels}
                      onPress={() => toggleChannel(channel)}
                      style={[styles.channelRow, active && styles.channelRowActive]}
                    >
                      <Text style={[styles.channelRowText, active && styles.channelRowTextActive]}>
                        {CHANNEL_LABELS[channel]}
                      </Text>
                      <Text style={[styles.channelCheck, active && styles.channelCheckActive]}>{active ? "✓" : ""}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBlock: { paddingHorizontal: 16, paddingTop: 16 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.amberDark, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 17 },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: { paddingHorizontal: 4, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabButtonActive: { borderBottomColor: colors.navy },
  tabButtonText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabButtonTextActive: { color: colors.textPrimary },
  errorBox: { marginHorizontal: 16, marginTop: 12, backgroundColor: colors.redBg, borderRadius: 8, padding: 10 },
  errorText: { color: colors.red, fontSize: 12 },
  body: { flex: 1, marginTop: 12 },
  bodyContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 24 },
  childCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  childHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  childName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  childMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  dismissalText: { fontSize: 12, color: colors.textSecondary, marginTop: 10, lineHeight: 17 },
  notificationRow: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 },
  notificationChild: { fontSize: 12, fontWeight: "700", color: colors.textPrimary },
  notificationMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  notificationMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  channelBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  channelBadgeText: { fontSize: 10, fontWeight: "700" },
  notificationTime: { fontSize: 10, color: colors.textMuted },
  settingsCard: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  settingsTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  settingsSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  pushButton: {
    marginTop: 12,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  pushButtonDone: { backgroundColor: colors.emerald },
  pushButtonText: { color: "white", fontSize: 13, fontWeight: "700" },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.slateBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  channelRowActive: { borderColor: colors.navy, backgroundColor: colors.navyLight },
  channelRowText: { fontSize: 13, fontWeight: "600", color: colors.slateText },
  channelRowTextActive: { color: "white" },
  channelCheck: { fontSize: 14, fontWeight: "700", color: "transparent" },
  channelCheckActive: { color: colors.amber },
});
