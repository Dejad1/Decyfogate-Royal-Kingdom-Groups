import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { AttendanceEntryType, AttendanceStatus } from "@decyfogate/shared-types";
import { ClassUnitMine, RosterStudent } from "@decyfogate/api-client";
import { useAuth } from "@/lib/auth-context";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { colors } from "@/lib/theme";

const STATUS_BUTTONS: { status: AttendanceStatus; label: string; activeBg: string }[] = [
  { status: AttendanceStatus.PRESENT, label: "Present", activeBg: colors.emerald },
  { status: AttendanceStatus.LATE, label: "Late", activeBg: colors.amberDark },
  { status: AttendanceStatus.ABSENT, label: "Absent", activeBg: colors.red },
];

export function FormTeacherScreen() {
  const { client } = useAuth();
  const [unit, setUnit] = useState<ClassUnitMine | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshToday = useCallback(
    async (classUnitId: string) => {
      const records = await client.getTodayAttendance(classUnitId);
      const next: Record<string, AttendanceStatus> = {};
      for (const record of records) {
        if (record.type === AttendanceEntryType.DAILY_REGISTER) next[record.studentId] = record.status;
      }
      setMarks(next);
    },
    [client]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const units = await client.listMyClassUnits();
        const myUnit = units[0];
        if (!myUnit) throw new Error("No class unit assigned to this account");
        if (cancelled) return;
        setUnit(myUnit);

        const roster = await client.getRoster(myUnit.id);
        if (cancelled) return;
        setStudents(roster.students);
        await refreshToday(myUnit.id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load roster");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client, refreshToday]);

  async function mark(studentId: string, status: AttendanceStatus) {
    if (!unit) return;
    setPending(studentId);
    setMarks((prev) => ({ ...prev, [studentId]: status }));
    try {
      await client.markAttendance({
        studentId,
        classUnitId: unit.id,
        date: new Date().toISOString(),
        status,
        type: AttendanceEntryType.DAILY_REGISTER,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark attendance");
      await refreshToday(unit.id);
    } finally {
      setPending(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.amber} />
      </View>
    );
  }
  if (error && !unit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (!unit) return null;

  const markedCount = Object.keys(marks).length;

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={students}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>FORM TEACHER · DAILY REGISTER</Text>
          <Text style={styles.title}>
            {unit.classLevel.name}
            {unit.name}
          </Text>
          <Text style={styles.subtitle}>
            {markedCount} of {students.length} pupils marked today
          </Text>
          {error && <Text style={styles.errorInline}>{error}</Text>}
        </View>
      }
      renderItem={({ item: student }) => {
        const currentStatus = marks[student.id];
        const primaryGuardian = student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];
        return (
          <View style={styles.studentRow}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName} numberOfLines={1}>
                {student.fullName}
              </Text>
              <Text style={styles.studentMeta} numberOfLines={1}>
                {student.admissionNumber}
                {primaryGuardian ? ` · ${primaryGuardian.relationship}: ${primaryGuardian.guardian.phone}` : ""}
              </Text>
            </View>
            <View style={styles.buttonRow}>
              {STATUS_BUTTONS.map((btn) => {
                const active = currentStatus === btn.status;
                return (
                  <Pressable
                    key={btn.status}
                    disabled={pending === student.id}
                    onPress={() => mark(student.id, btn.status)}
                    style={[styles.statusButton, active && { backgroundColor: btn.activeBg }]}
                  >
                    <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>{btn.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListFooterComponent={
        <View style={styles.footerBlock}>
          <NotificationsPanel classUnitId={unit.id} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: colors.red, fontSize: 14, textAlign: "center", paddingHorizontal: 24 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  headerBlock: { paddingTop: 16, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.amberDark, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  errorInline: { color: colors.red, fontSize: 12, marginTop: 8 },
  studentRow: { paddingVertical: 12, gap: 10 },
  studentInfo: {},
  studentName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  studentMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: 8 },
  statusButton: {
    flex: 1,
    backgroundColor: colors.slateBg,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  statusButtonText: { fontSize: 12, fontWeight: "600", color: colors.slateText },
  statusButtonTextActive: { color: "white" },
  separator: { height: 1, backgroundColor: colors.border },
  footerBlock: { marginTop: 16 },
});
