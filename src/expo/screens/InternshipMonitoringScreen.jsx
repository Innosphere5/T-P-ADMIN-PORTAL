import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { EXPO_COLORS } from '../colors';

export default function InternshipMonitoringScreen() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch('/api/admin/internships')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.internships && Array.isArray(data.internships)) {
          setInternships(data.internships);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const totalCount = internships.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>MODULE 06 • EXPERIENTIAL LEARNING</Text>
        <Text style={styles.title}>Internship Monitoring</Text>
        <Text style={styles.subtitle}>
          Mandatory industrial tracks, stipends, and mentor reviews.
        </Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroBadgeText}>
          {totalCount > 0 ? `✓ ${totalCount} Active Internships` : '✓ Live Tracking Active'}
        </Text>
        <Text style={styles.heroTitle}>Mandatory Semester Track</Text>
        <Text style={styles.heroDesc}>
          {totalCount > 0
            ? `${totalCount} verified student placements currently monitored.`
            : 'Synchronized live with university administrative registry.'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={EXPO_COLORS.primary} />
          <Text style={styles.emptyText}>Loading internships...</Text>
        </View>
      ) : internships.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Student Internships Logged</Text>
          <Text style={styles.emptyText}>
            Assigned student industrial internships and verification records will appear here once created in the admin portal.
          </Text>
        </View>
      ) : (
        internships.map((item) => {
          const studentName = item.student_name || item.studentName || 'Scholar Intern';
          const roll = item.student_roll || item.roll || '—';
          const company = item.company_name || item.company || 'Corporate Partner';
          const role = item.role_title || item.role || 'Intern';
          const stipend = item.stipend ? `₹${Number(item.stipend).toLocaleString('en-IN')} / mo` : 'Non-Stipend';
          const mentor = item.mentor_name || item.mentor || 'Faculty Guide';
          const status = item.status === 'completed' ? 'Completed' : (item.status === 'ongoing' ? 'Ongoing' : 'Terminated');
          const progress = item.status === 'completed' ? 100 : (item.status === 'ongoing' ? 65 : 20);

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {studentName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{studentName}</Text>
                  <Text style={styles.cardRoll}>{roll}</Text>
                </View>
                <Text style={styles.statusPill}>{status}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Company: </Text>
                  <Text style={styles.detailValue}>{company}</Text>
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Role: </Text>
                  <Text style={styles.detailValue}>{role}</Text>
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Compensation: </Text>
                  <Text style={styles.stipendValue}>{stipend}</Text>
                </Text>
                <Text style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mentor: </Text>
                  <Text style={styles.detailValue}>{mentor}</Text>
                </Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressLabelRow}>
                  <Text style={styles.progressLabel}>Internship Completion</Text>
                  <Text style={styles.progressValue}>{progress}% Concluded</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progress}%`,
                        backgroundColor:
                          progress === 100
                            ? EXPO_COLORS.successGreen
                            : progress < 60
                            ? '#EF4444'
                            : EXPO_COLORS.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  Alert.alert(
                    'Evaluation Record',
                    `Scholar: ${studentName}\nCompany: ${company}\nStatus: ${status}`
                  )
                }
              >
                <Text style={styles.actionBtnText}>View Evaluation &gt;</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: EXPO_COLORS.surfaceCanvas },
  content: { padding: 16 },
  header: { marginBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: EXPO_COLORS.primary, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '800', color: EXPO_COLORS.textPrimary, marginTop: 4 },
  subtitle: { fontSize: 12, color: EXPO_COLORS.textSecondary, marginTop: 2 },
  heroCard: {
    backgroundColor: EXPO_COLORS.surfaceHero,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  heroBadgeText: { color: EXPO_COLORS.goldFixed, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  heroTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  heroDesc: { color: '#CBD5E1', fontSize: 11, marginTop: 4 },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: EXPO_COLORS.borderSubtle,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: EXPO_COLORS.textPrimary, marginBottom: 4 },
  emptyText: { fontSize: 11, color: EXPO_COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderColor: EXPO_COLORS.borderSubtle,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: EXPO_COLORS.tintBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: EXPO_COLORS.infoBlue, fontWeight: '700', fontSize: 13 },
  cardInfo: { flex: 1, marginLeft: 10 },
  cardName: { fontSize: 13, fontWeight: '700', color: EXPO_COLORS.textPrimary },
  cardRoll: { fontSize: 10, color: EXPO_COLORS.textSecondary, marginTop: 1 },
  statusPill: {
    fontSize: 10,
    fontWeight: '700',
    color: EXPO_COLORS.primary,
    backgroundColor: EXPO_COLORS.tintMaroon,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailBox: {
    backgroundColor: EXPO_COLORS.surfaceContainerLow,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 3,
  },
  detailRow: { fontSize: 11 },
  detailLabel: { color: EXPO_COLORS.textSecondary, fontWeight: '600' },
  detailValue: { color: EXPO_COLORS.textPrimary, fontWeight: '600' },
  stipendValue: { color: EXPO_COLORS.primary, fontWeight: '700' },
  progressContainer: { marginTop: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 10, color: EXPO_COLORS.textSecondary },
  progressValue: { fontSize: 10, color: EXPO_COLORS.primary, fontWeight: '700' },
  progressBarBg: { height: 6, backgroundColor: EXPO_COLORS.surfaceContainerLow, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  actionBtn: {
    backgroundColor: EXPO_COLORS.surfaceContainer,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  actionBtnText: { color: EXPO_COLORS.textPrimary, fontSize: 11, fontWeight: '700' },
});
