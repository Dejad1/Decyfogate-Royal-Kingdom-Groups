import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { DismissalRecordRow, GuardianShortlistEntry, RosterStudent } from "@decyfogate/api-client";
import { DismissalType, SchoolType } from "@decyfogate/shared-types";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";

function todayIso() {
  return new Date().toISOString();
}

export function DismissalPanel({
  classUnitId,
  schoolType,
  students,
}: {
  classUnitId: string;
  schoolType: SchoolType;
  students: RosterStudent[];
}) {
  const { client } = useAuth();
  const [dismissals, setDismissals] = useState<Record<string, DismissalRecordRow>>({});
  const [expandedFor, setExpandedFor] = useState<string | null>(null);

  const loadToday = async () => {
    const data = await client.getTodayDismissals(classUnitId);
    const next: Record<string, DismissalRecordRow> = {};
    for (const row of data) next[row.studentId] = row;
    setDismissals(next);
  };

  useEffect(() => {
    loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classUnitId]);

  async function selfDismiss(studentId: string) {
    await client.logDismissal({ studentId, classUnitId, date: todayIso(), type: DismissalType.SELF_DISMISSED });
    await loadToday();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>End-of-day dismissal</Text>
      <Text style={styles.subtitle}>
        {schoolType === SchoolType.SECONDARY
          ? "Record who picked up each pupil, or mark them self-dismissed."
          : "Every pupil must be recorded with who picked them up -- self-dismissal is not available at this level."}
      </Text>

      {students.map((student, index) => {
        const record = dismissals[student.id];
        return (
          <View key={student.id} style={[styles.row, index === 0 && styles.rowFirst]}>
            <View style={styles.rowHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{student.fullName}</Text>
                <Text style={styles.studentMeta}>{student.admissionNumber}</Text>
              </View>
              {record ? (
                <View style={styles.doneBadge}>
                  <Text style={styles.doneBadgeText}>
                    {record.type === "SELF_DISMISSED"
                      ? "Self-dismissed"
                      : `Picked up: ${record.pickupPersonName ?? "?"}`}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setExpandedFor(expandedFor === student.id ? null : student.id)}
                    style={styles.actionButtonPrimary}
                  >
                    <Text style={styles.actionButtonPrimaryText}>Log pickup</Text>
                  </Pressable>
                  {schoolType === SchoolType.SECONDARY && (
                    <Pressable onPress={() => selfDismiss(student.id)} style={styles.actionButtonSecondary}>
                      <Text style={styles.actionButtonSecondaryText}>Self-dismissed</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
            {expandedFor === student.id && !record && (
              <PickupForm
                studentId={student.id}
                classUnitId={classUnitId}
                onDone={() => {
                  setExpandedFor(null);
                  loadToday();
                }}
                onCancel={() => setExpandedFor(null)}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

function PickupForm({
  studentId,
  classUnitId,
  onDone,
  onCancel,
}: {
  studentId: string;
  classUnitId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { client } = useAuth();
  const [shortlist, setShortlist] = useState<GuardianShortlistEntry[] | null>(null);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [matchedGuardianId, setMatchedGuardianId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    client.getGuardianShortlist(studentId).then(setShortlist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  function pickFromShortlist(g: GuardianShortlistEntry) {
    setName(g.fullName);
    setRelationship(g.relationship);
    setPhone(g.phone);
    setMatchedGuardianId(g.guardianId);
  }

  // Free typing always overrides the shortlist match -- a name only counts
  // as "matched" when it still equals the guardian that was tapped.
  function onNameChange(value: string) {
    setName(value);
    setMatchedGuardianId((prev) => {
      if (!prev) return prev;
      const match = shortlist?.find((g) => g.guardianId === prev);
      return match && match.fullName === value ? prev : undefined;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await client.logDismissal({
        studentId,
        classUnitId,
        date: todayIso(),
        type: DismissalType.PICKUP,
        pickupPersonName: name.trim(),
        pickupPersonRelationship: relationship.trim() || undefined,
        pickupPersonPhone: phone.trim() || undefined,
        matchedGuardianId,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log pickup");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.picker}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {shortlist && shortlist.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={styles.pickerLabel}>Quick fill</Text>
          <View style={styles.chipRow}>
            {shortlist.map((g) => (
              <Pressable key={g.guardianId} onPress={() => pickFromShortlist(g)} style={styles.chip}>
                <Text style={styles.chipText}>
                  {g.fullName} ({g.relationship})
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {!shortlist && <ActivityIndicator size="small" color={colors.amber} />}

      <View style={{ gap: 8 }}>
        <Text style={styles.pickerLabel}>Who is picking up this pupil? Any name is accepted.</Text>
        <TextInput value={name} onChangeText={onNameChange} placeholder="Full name" style={styles.input} placeholderTextColor={colors.textMuted} />
        <TextInput
          value={relationship}
          onChangeText={setRelationship}
          placeholder="Relationship (optional)"
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone (optional)"
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable disabled={submitting || !name.trim()} onPress={submit} style={styles.actionButtonPrimary}>
            <Text style={styles.actionButtonPrimaryText}>Confirm pickup</Text>
          </Pressable>
          <Pressable onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
  title: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17 },
  row: { paddingTop: 14, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  rowFirst: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  studentName: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
  studentMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  doneBadge: { backgroundColor: colors.emeraldBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  doneBadgeText: { fontSize: 11, fontWeight: "600", color: colors.emerald },
  actionButtonPrimary: { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionButtonPrimaryText: { color: "white", fontSize: 11, fontWeight: "700" },
  actionButtonSecondary: { backgroundColor: colors.slateBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionButtonSecondaryText: { color: colors.slateText, fontSize: 11, fontWeight: "700" },
  picker: { marginTop: 10, backgroundColor: colors.slateBg, borderRadius: 10, padding: 12 },
  pickerLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: colors.textPrimary },
  errorText: { fontSize: 11, color: colors.red, marginBottom: 8 },
  cancelText: { fontSize: 11, color: colors.textMuted },
});
