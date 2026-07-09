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

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
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
        <Text style={styles.subtitle}>Secure sign-in for school staff</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@royalkingdomcollege.edu.ng"
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
          disabled={submitting || !email || !password}
          style={[styles.button, (submitting || !email || !password) && styles.buttonDisabled]}
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
  brandBlock: { alignItems: "center", marginBottom: 32 },
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
  subtitle: { color: "#94A3B8", fontSize: 13, marginTop: 4 },
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
