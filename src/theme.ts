import { StyleSheet } from 'react-native';
export const colors = {
  bg: '#0D151C', panel: '#15222C', raised: '#1E303C', border: '#2B414D', text: '#EDF4F5', muted: '#A0B5BF',
  orange: '#E7BC65', orangeBg: '#342E22', green: '#6BDAC3', greenBg: '#173C37', purple: '#BAA4F4', red: '#FFABB5',
};
export const common = StyleSheet.create({
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 20 },
  title: { color: colors.text, fontSize: 29, fontWeight: '700', letterSpacing: -0.8 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.7 },
  input: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, minHeight: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
