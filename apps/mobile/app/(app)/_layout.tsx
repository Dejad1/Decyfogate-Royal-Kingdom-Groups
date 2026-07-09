import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, Slot, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { roleLabel } from "@/lib/roles";
import { colors } from "@/lib/theme";

export default function AppLayout() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>DG</Text>
          </View>
          <Text style={styles.brandText}>DecyfoGate</Text>
        </View>
        <View style={styles.identity}>
          <View>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.role}>{roleLabel(user.role)}</Text>
          </View>
          <Pressable onPress={handleLogout} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.body}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.navy },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: colors.amber, fontWeight: "700", fontSize: 11 },
  brandText: { color: "white", fontWeight: "600", fontSize: 14 },
  identity: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { color: "white", fontSize: 13, fontWeight: "600", textAlign: "right" },
  role: { color: "#94A3B8", fontSize: 11, textAlign: "right" },
  signOut: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signOutText: { color: "#E2E8F0", fontSize: 11, fontWeight: "500" },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
});
