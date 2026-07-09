import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@decyfogate/api-client";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

type Mode = "staff" | "guardian";

export default function LoginScreen() {
  const { login, guardianLogin } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("staff");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setIdentifier("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "staff") {
        await login(identifier.trim(), password);
      } else {
        await guardianLogin(identifier.trim(), password);
      }
      router.replace("/(app)/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brandBlock}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>DG</Text>
        </View>
        <Text style={styles.title}>DecyfoGate for Schools</Text>
        <Text style={styles.subtitle}>
          {mode === "staff" ? "Secure sign-in for school staff" : "Sign in to follow your child's day"}
        </Text>
      </View>

      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => switchMode("staff")}
          style={[styles.modeButton, mode === "staff" && styles.modeButtonActive]}
        >
          <Text style={[styles.modeButtonText, mode === "staff" && styles.modeButtonTextActive]}>School Staff</Text>
        </Pressable>
        <Pressable
          onPress={() => switchMode("guardian")}
          style={[styles.modeButton, mode === "guardian" && styles.modeButtonActive]}
        >
          <Text style={[styles.modeButtonText, mode === "guardian" && styles.modeButtonTextActive]}>
            Parent/Guardian
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{mode === "staff" ? "Email address" : "Phone number"}</Text>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={mode === "staff" ? "email-address" : "phone-pad"}
          placeholder={mode === "staff" ? "you@royalkingdomcollege.edu.ng" : "0803 123 4567"}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••••"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting || !identifier || !password}
          style={[styles.button, (submitting || !identifier || !password) && styles.buttonDisabled]}
        >
          {submitting ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
      </View>

      <Text style={styles.footer}>Demo tenant: Royal Kingdom Group of Schools</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.navy,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brandBlock: { alignItems: "center", marginBottom: 20 },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { color: colors.amber, fontWeight: "700", fontSize: 18 },
  title: { color: "white", fontSize: 18, fontWeight: "600" },
  subtitle: { color: "#94A3B8", fontSize: 13, marginTop: 4, textAlign: "center" },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 3,
    marginBottom: 16,
  },
  modeButton: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  modeButtonActive: { backgroundColor: colors.amber },
  modeButtonText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  modeButtonTextActive: { color: colors.navy },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
  },
  label: { color: "#94A3B8", fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    fontSize: 14,
  },
  errorBox: {
    marginTop: 16,
    backgroundColor: "rgba(220,38,38,0.12)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.3)",
    borderRadius: 10,
    padding: 10,
  },
  errorText: { color: "#FCA5A5", fontSize: 13 },
  button: {
    marginTop: 20,
    backgroundColor: colors.amber,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: colors.navy, fontWeight: "700", fontSize: 14 },
  footer: { color: "#64748B", fontSize: 12, textAlign: "center", marginTop: 24 },
});
