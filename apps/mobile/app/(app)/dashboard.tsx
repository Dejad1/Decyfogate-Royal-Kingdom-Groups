import { StyleSheet, Text, View } from "react-native";
import { Role } from "@decyfogate/shared-types";
import { useAuth } from "@/lib/auth-context";
import { FormTeacherScreen } from "@/components/FormTeacherScreen";
import { SubjectTeacherScreen } from "@/components/SubjectTeacherScreen";
import { colors } from "@/lib/theme";

export default function DashboardScreen() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === Role.FORM_TEACHER) return <FormTeacherScreen />;
  if (user.role === Role.SUBJECT_TEACHER) return <SubjectTeacherScreen />;

  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>
        The {user.role} role does not have a mobile screen in this build. Per the brief, School Admin stays
        web-only for v1 -- sign in on the web app instead.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  fallbackText: { color: colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
