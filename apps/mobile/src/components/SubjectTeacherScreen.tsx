import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AttendanceEntryType, AttendanceStatus, BehaviorTag } from "@decyfogate/shared-types";
import { ClassUnitMine, RosterStudent, TodayAttendanceRecord } from "@decyfogate/api-client";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

const STATUS_BUTTONS: { status: AttendanceStatus; label: string; activeBg: string }[] = [
  { status: AttendanceStatus.PRESENT, label: "Present", activeBg: colors.emerald },
  { status: AttendanceStatus.LATE, label: "Late", activeBg: colors.amberDark },
  { status: AttendanceStatus.ABSENT, label: "Absent", activeBg: colors.red },
];

const TAG_BUTTONS: { tag: BehaviorTag; label: string; activeBg: string; activeText: string }[] = [
  { tag: BehaviorTag.ATTENTIVE, label: "Attentive", activeBg: colors.emeraldBg, activeText: colors.emerald },
  { tag: BehaviorTag.DISRUPTIVE, label: "Disruptive", activeBg: colors.amberBg, activeText: colors.amberDark },
  { tag: BehaviorTag.SLEEPING, label: "Sleeping", activeBg: colors.skyBg, activeText: colors.sky },
  { tag: BehaviorTag.BULLYING_FLAG, label: "🚩 Bullying flag", activeBg: colors.redBg, activeText: colors.red },
];

const TAG_LABELS: Record<BehaviorTag, string> = {
  [BehaviorTag.ATTENTIVE]: "Attentive",
  [BehaviorTag.DISRUPTIVE]: "Disruptive",
  [BehaviorTag.SLEEPING]: "Sleeping",
  [BehaviorTag.BULLYING_FLAG]: "🚩 Bullying flag",
};

export function SubjectTeacherScreen() {
  const { client } = useAuth();
  const [links, setLinks] = useState<ClassUnitMine[]>([]);
  const [selected, setSelected] = useState<ClassUnitMine | null>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [records, setRecords] = useState<Record<string, TodayAttendanceRecord>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [behaviorFor, setBehaviorFor] = useState<string | null>(null);

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
      const next: Record<string, TodayAttendanceRecord> = {};
      for (const record of today) {
        if (record.type === AttendanceEntryType.SUBJECT && record.subjectId === link.subject?.id) {
          next[record.studentId] = record;
        }
      }
      setRecords(next);
    },
    [client]
  );

  useEffect(() => {
    if (selected) loadRosterAndToday(selected).catch((err) => setError(err instanceof Error ? err.message : "Failed to load roster"));
  }, [selected, loadRosterAndToday]);

  async function mark(studentId: string, status: AttendanceStatus, behaviorTag?: BehaviorTag | null, behaviorComment?: string) {
    if (!selected?.subject) return;
    setPending(studentId);
    try {
      await client.markAttendance({
        studentId,
        classUnitId: selected.id,
        subjectId: selected.subject.id,
        date: new Date().toISOString(),
        status,
        type: AttendanceEntryType.SUBJECT,
        behaviorTag: behaviorTag ?? undefined,
        behaviorComment: behaviorComment || undefined,
      });
      await loadRosterAndToday(selected);
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
          Subject-level attendance is separate from the Form Teacher&apos;s daily register. An optional behavior note
          feeds the secondary end-of-day digest -- a bullying flag alerts the School Admin immediately.
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
          const record = records[student.id];
          const currentStatus = record?.status;
          return (
            <View style={styles.studentRow}>
              <View style={styles.rowHeader}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {student.fullName}
                  </Text>
                  <Text style={styles.studentMeta}>{student.admissionNumber}</Text>
                </View>
              </View>
              <View style={styles.buttonRow}>
                {STATUS_BUTTONS.map((btn) => {
                  const active = currentStatus === btn.status;
                  return (
                    <Pressable
                      key={btn.status}
                      disabled={pending === student.id}
                      onPress={() => mark(student.id, btn.status, record?.behaviorTag, record?.behaviorComment ?? undefined)}
                      style={[styles.statusButton, active && { backgroundColor: btn.activeBg }]}
                    >
                      <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>{btn.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {currentStatus && (
                <Pressable onPress={() => setBehaviorFor(behaviorFor === student.id ? null : student.id)}>
                  <Text style={styles.behaviorLink}>
                    {record?.behaviorTag ? TAG_LABELS[record.behaviorTag] : "+ Behavior note"}
                  </Text>
                </Pressable>
              )}
              {behaviorFor === student.id && currentStatus && (
                <BehaviorNoteForm
                  submitting={pending === student.id}
                  initialTag={record?.behaviorTag ?? null}
                  initialComment={record?.behaviorComment ?? ""}
                  onSave={async (tag, comment) => {
                    await mark(student.id, currentStatus, tag, comment);
                    setBehaviorFor(null);
                  }}
                  onCancel={() => setBehaviorFor(null)}
                />
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function BehaviorNoteForm({
  submitting,
  initialTag,
  initialComment,
  onSave,
  onCancel,
}: {
  submitting: boolean;
  initialTag: BehaviorTag | null;
  initialComment: string;
  onSave: (tag: BehaviorTag | null, comment: string) => void;
  onCancel: () => void;
}) {
  const [tag, setTag] = useState<BehaviorTag | null>(initialTag);
  const [comment, setComment] = useState(initialComment);

  return (
    <View style={styles.behaviorForm}>
      <Text style={styles.behaviorFormLabel}>Optional -- feeds the end-of-day digest, no direct guardian ping.</Text>
      <View style={styles.tagRow}>
        {TAG_BUTTONS.map((btn) => {
          const active = tag === btn.tag;
          return (
            <Pressable
              key={btn.tag}
              onPress={() => setTag(active ? null : btn.tag)}
              style={[styles.tagChip, active && { backgroundColor: btn.activeBg }]}
            >
              <Text style={[styles.tagChipText, active && { color: btn.activeText }]}>{btn.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {tag === BehaviorTag.BULLYING_FLAG && (
        <Text style={styles.bullyingWarning}>
          Saving this immediately notifies the School Admin. The guardian only hears about it through the normal
          end-of-day digest.
        </Text>
      )}
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Comment (optional)"
        style={styles.commentInput}
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
        <Pressable disabled={submitting} onPress={() => onSave(tag, comment)} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
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
  studentRow: { paddingVertical: 12, gap: 8 },
  rowHeader: { flexDirection: "row", alignItems: "center" },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  studentMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: 8 },
  statusButton: { flex: 1, backgroundColor: colors.slateBg, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  statusButtonText: { fontSize: 12, fontWeight: "600", color: colors.slateText },
  statusButtonTextActive: { color: "white" },
  separator: { height: 1, backgroundColor: colors.border },
  behaviorLink: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, textDecorationLine: "underline" },
  behaviorForm: { backgroundColor: colors.slateBg, borderRadius: 10, padding: 12 },
  behaviorFormLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  tagChipText: { fontSize: 11, fontWeight: "600", color: colors.slateText },
  bullyingWarning: { fontSize: 11, color: colors.red, marginTop: 8, lineHeight: 16 },
  commentInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 8,
    minHeight: 44,
  },
  saveButton: { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  saveButtonText: { color: "white", fontSize: 12, fontWeight: "700" },
  cancelText: { fontSize: 12, color: colors.textMuted, alignSelf: "center" },
});
