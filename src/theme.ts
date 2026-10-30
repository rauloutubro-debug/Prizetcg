import { StyleSheet } from 'react-native';
export const colors = {
  bg: '#101318', panel: '#191D24', raised: '#222730', border: '#2E343F', text: '#F1F2F5', muted: '#9AA4B4',
  orange: '#FFA45A', orangeBg: '#33271F', green: '#9AE5C3', greenBg: '#1D332C', purple: '#BAA4F4', red: '#FF9EAC',
};
export const common = StyleSheet.create({
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 20 },
  title: { color: colors.text, fontSize: 29, fontWeight: '700', letterSpacing: -0.8 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.7 },
  input: { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, minHeight: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
