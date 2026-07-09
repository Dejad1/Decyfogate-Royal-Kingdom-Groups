import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AttendanceEntryType, AttendanceStatus } from "@decyfogate/shared-types";
import { ClassUnitMine, RosterStudent } from "@decyfogate/api-client";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

const STATUS_BUTTONS: { status: AttendanceStatus; label: string; activeBg: string }[] = [
  { status: AttendanceStatus.PRESENT, label: "Present", activeBg: colors.emerald },
  { status: AttendanceStatus.LATE, label: "Late", activeBg: colors.amberDark },
  { status: AttendanceStatus.ABSENT, label: "Absent", activeBg: colors.red },
];

export function SubjectTeacherScreen() {
  const { client } = useAuth();
  const [links, setLinks] = useState<ClassUnitMine[]>([]);
  const [selected, setSelected] = useState<ClassUnitMine | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    client
      .listMyClassUnits()
      .then((data) => {
        if (cancelled) return;
        setLinks(data);
        if (data[0]) setSelected(data[0]);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [client]);

  const loadRosterAndToday = useCallback(
    async (link: ClassUnitMine) => {
      const [roster, today] = await Promise.all([client.getRoster(link.id), client.getTodayAttendance(link.id)]);
      setStudents(roster.students);
      const next: Record<string, AttendanceStatus> = {};
      for (const record of today) {
        if (record.type === AttendanceEntryType.SUBJECT && record.subjectId === link.subject?.id) {
          next[record.studentId] = record.status;
        }
      }
      setMarks(next);
    },
    [client]
  );

  useEffect(() => {
    if (selected) loadRosterAndToday(selected).catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster"));
  }, [selected, loadRosterAndToday]);

  async function mark(studentId: string, status: AttendanceStatus) {
    if (!selected?.subject) return;
    setPending(studentId);
    setMarks((prev) => ({ ...prev, [studentId]: status }));
    try {
      await client.markAttendance({
        studentId,
        classUnitId: selected.id,
        subjectId: selected.subject.id,
        date: new Date().toISOString(),
        status,
        type: AttendanceEntryType.SUBJECT,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark attendance");
      await loadRosterAndToday(selected);
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
  if (links.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>You are not linked to any classes yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>SUBJECT TEACHER</Text>
        <Text style={styles.title}>Your classes</Text>
        <Text style={styles.subtitle}>
          Subject-level attendance is separate from the Form Teacher&apos;s daily register. It feeds reports and
          the low-attendance flag, but does not send guardians a duplicate notification.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
        {links.map((link) => {
          const active = selected?.id === link.id && selected.subject?.id === link.subject?.id;
          return (
            <Pressable
              key={`${link.id}:${link.subject?.id}`}
              onPress={() => setSelected(link)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {link.classLevel.name}
                {link.name} · {link.subject?.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={students}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item: student }) => {
          const currentStatus = marks[student.id];
          return (
            <View style={styles.studentRow}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {student.fullName}
                </Text>
                <Text style={styles.studentMeta}>{student.admissionNumber}</Text>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  headerBlock: { paddingHorizontal: 16, paddingTop: 16 },
  eyebrow: { fontSize: 11, fontWeight: "700", color: colors.amberDark, letterSpacing: 0.5 },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 17 },
  chipsScroll: { marginTop: 14, flexGrow: 0 },
  chipsContent: { paddingHorizontal: 16, gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "white" },
  errorBox: { marginHorizontal: 16, marginTop: 12, backgroundColor: colors.redBg, borderRadius: 8, padding: 10 },
  errorText: { color: colors.red, fontSize: 12 },
  list: { flex: 1, marginTop: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  studentRow: { paddingVertical: 12, gap: 10 },
  studentInfo: {},
  studentName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  studentMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: 8 },
  statusButton: { flex: 1, backgroundColor: colors.slateBg, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  statusButtonText: { fontSize: 12, fontWeight: "600", color: colors.slateText },
  statusButtonTextActive: { color: "white" },
  separator: { height: 1, backgroundColor: colors.border },
});
