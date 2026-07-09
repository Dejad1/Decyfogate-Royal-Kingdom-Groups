import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AuthorizedPickupListResponse, DismissalRecordRow, RosterStudent } from "@decyfogate/api-client";
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
          ? "Select who picked up each pupil, or mark them self-dismissed."
          : "Every pupil must be marked with who picked them up -- self-dismissal is not available at this level."}
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
                      : `Picked up: ${record.pickedUpByName ?? "?"}`}
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
              <PickupPicker
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

function PickupPicker({
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
  const [list, setList] = useState<AuthorizedPickupListResponse | null>(null);
  const [mode, setMode] = useState<"pick" | "add-visitor" | "escalate">("pick");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [visitorName, setVisitorName] = useState("");
  const [visitorRelationship, setVisitorRelationship] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");

  const [escalateName, setEscalateName] = useState("");
  const [escalatePhone, setEscalatePhone] = useState("");
  const [escalateNote, setEscalateNote] = useState("");
  const [escalated, setEscalated] = useState(false);

  const loadList = async () => {
    const data = await client.getAuthorizedPickupList(studentId, todayIso());
    setList(data);
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function confirmPickup(guardianId?: string, oneOffPickupPersonId?: string) {
    setSubmitting(true);
    setError(null);
    try {
      await client.logDismissal({
        studentId,
        classUnitId,
        date: todayIso(),
        type: DismissalType.PICKUP,
        guardianId,
        oneOffPickupPersonId,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log pickup");
    } finally {
      setSubmitting(false);
    }
  }

  async function addVisitor() {
    setSubmitting(true);
    setError(null);
    try {
      await client.addOneOffPickupPerson({
        studentId,
        fullName: visitorName,
        relationship: visitorRelationship,
        phone: visitorPhone || undefined,
        date: todayIso(),
      });
      setMode("pick");
      setVisitorName("");
      setVisitorRelationship("");
      setVisitorPhone("");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add visitor");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEscalation() {
    setSubmitting(true);
    setError(null);
    try {
      await client.escalateUnauthorizedPickup({
        studentId,
        classUnitId,
        attemptedPickupPersonName: escalateName,
        attemptedPickupPersonPhone: escalatePhone || undefined,
        note: escalateNote || undefined,
      });
      setEscalated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to escalate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.picker}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {mode === "pick" && (
        <View style={{ gap: 10 }}>
          <View>
            <Text style={styles.pickerLabel}>Authorized guardians</Text>
            <View style={styles.chipRow}>
              {list?.guardians.map((g) => (
                <Pressable key={g.guardianId} disabled={submitting} onPress={() => confirmPickup(g.guardianId, undefined)} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {g.fullName} ({g.relationship})
                  </Text>
                </Pressable>
              ))}
              {list && list.guardians.length === 0 && <Text style={styles.emptyHint}>No guardians on file.</Text>}
              {!list && <ActivityIndicator size="small" color={colors.amber} />}
            </View>
          </View>

          {list && list.oneOffPeopleToday.length > 0 && (
            <View>
              <Text style={styles.pickerLabel}>Authorized today only</Text>
              <View style={styles.chipRow}>
                {list.oneOffPeopleToday.map((p) => (
                  <Pressable key={p.id} disabled={submitting} onPress={() => confirmPickup(undefined, p.id)} style={styles.chipVisitor}>
                    <Text style={styles.chipVisitorText}>
                      {p.fullName} ({p.relationship})
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.pickerFooter}>
            <Pressable onPress={() => setMode("add-visitor")}>
              <Text style={styles.linkText}>+ Add a visitor pickup for today</Text>
            </Pressable>
            <Pressable onPress={() => setMode("escalate")}>
              <Text style={styles.linkTextDanger}>Person not on this list</Text>
            </Pressable>
            <Pressable onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mode === "add-visitor" && (
        <View style={{ gap: 8 }}>
          <Text style={styles.pickerLabel}>Authorize a visitor for today only (not a permanent guardian)</Text>
          <TextInput value={visitorName} onChangeText={setVisitorName} placeholder="Full name" style={styles.input} placeholderTextColor={colors.textMuted} />
          <TextInput
            value={visitorRelationship}
            onChangeText={setVisitorRelationship}
            placeholder="Relationship"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            value={visitorPhone}
            onChangeText={setVisitorPhone}
            placeholder="Phone (optional)"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable disabled={submitting || !visitorName || !visitorRelationship} onPress={addVisitor} style={styles.actionButtonPrimary}>
              <Text style={styles.actionButtonPrimaryText}>Authorize for today</Text>
            </Pressable>
            <Pressable onPress={() => setMode("pick")}>
              <Text style={styles.cancelText}>Back</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mode === "escalate" && !escalated && (
        <View style={{ gap: 8 }}>
          <Text style={styles.escalateWarning}>
            This person is not on the authorized list. This will not dismiss the pupil -- it flags the School Admin
            to review first.
          </Text>
          <TextInput value={escalateName} onChangeText={setEscalateName} placeholder="Their name" style={styles.input} placeholderTextColor={colors.textMuted} />
          <TextInput
            value={escalatePhone}
            onChangeText={setEscalatePhone}
            placeholder="Phone (optional)"
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            value={escalateNote}
            onChangeText={setEscalateNote}
            placeholder="Note (optional)"
            style={[styles.input, { height: 60 }]}
            multiline
            placeholderTextColor={colors.textMuted}
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable disabled={submitting || !escalateName} onPress={submitEscalation} style={styles.actionButtonDanger}>
              <Text style={styles.actionButtonPrimaryText}>Escalate to School Admin</Text>
            </Pressable>
            <Pressable onPress={() => setMode("pick")}>
              <Text style={styles.cancelText}>Back</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mode === "escalate" && escalated && (
        <View style={{ gap: 8 }}>
          <Text style={styles.escalatedNotice}>
            Escalation sent to the School Admin. This pupil remains not dismissed until it&apos;s resolved.
          </Text>
          <Pressable onPress={onCancel}>
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </View>
      )}
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
  actionButtonDanger: { backgroundColor: colors.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  picker: { marginTop: 10, backgroundColor: colors.slateBg, borderRadius: 10, padding: 12 },
  pickerLabel: { fontSize: 10, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  chipVisitor: { borderWidth: 1, borderColor: colors.amber, backgroundColor: colors.amberBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipVisitorText: { fontSize: 11, fontWeight: "600", color: colors.amberDark },
  emptyHint: { fontSize: 11, color: colors.textMuted },
  pickerFooter: { flexDirection: "row", flexWrap: "wrap", gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  linkText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary, textDecorationLine: "underline" },
  linkTextDanger: { fontSize: 11, fontWeight: "600", color: colors.red, textDecorationLine: "underline" },
  cancelText: { fontSize: 11, color: colors.textMuted },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: colors.textPrimary },
  errorText: { fontSize: 11, color: colors.red, marginBottom: 8 },
  escalateWarning: { fontSize: 11, color: colors.red, fontWeight: "600", lineHeight: 16 },
  escalatedNotice: { fontSize: 12, color: colors.amberDark, backgroundColor: colors.amberBg, borderRadius: 8, padding: 10 },
});
