import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Target, LayoutGrid, Layers3, WifiOff, CircleHelp } from 'lucide-react-native';
import { Store, useStore } from './src/state/Store';
import { colors, common } from './src/theme';
import { Badge, ConfirmButton, Dialog, Button } from './src/components/UI';
import { TrackerScreen } from './src/screens/TrackerScreen';
import { BoardScreen } from './src/screens/BoardScreen';
import { DeckScreen } from './src/screens/DeckScreen';

type Tab = 'tracker' | 'board' | 'deck';
const navigation = [
  { id: 'tracker' as Tab, label: 'Rastreador', subtitle: 'Seus Prêmios', Icon: Target },
  { id: 'board' as Tab, label: 'Mesa de jogo', subtitle: 'Dano e condições', Icon: LayoutGrid },
  { id: 'deck' as Tab, label: 'Meu deck', subtitle: 'Importar e conferir', Icon: Layers3 },
];
function Shell() {
  const { state, dispatch, ready, storageError } = useStore();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const [tab, setTab] = useState<Tab>('tracker');
  const [help, setHelp] = useState(false);
  if (!ready) return <View style={s.loading}><ActivityIndicator color={colors.orange} /><Text style={common.body}>Preparando sua mesa…</Text></View>;
  const nav = (mobile: boolean) => <View style={mobile ? s.bottomNav : s.nav}>{navigation.map(({ id, label, subtitle, Icon }) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === id }} key={id} onPress={() => setTab(id)} style={[mobile ? s.mobileNavItem : s.navItem, tab === id && (mobile ? {} : s.navActive)]}>
    <Icon size={20} color={tab === id ? colors.orange : colors.muted} strokeWidth={1.8} /><View style={mobile ? { alignItems: 'center' } : { flex: 1 }}><Text style={{ color: tab === id ? colors.orange : colors.muted, fontSize: mobile ? 11 : 14, fontWeight: tab === id ? '700' : '500' }}>{label}</Text>{!mobile && <Text style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}>{subtitle}</Text>}</View>{!mobile && tab === id && <View style={{ width: 5, height: 5, borderRadius: 4, backgroundColor: colors.orange }} />}
  </Pressable>)}</View>;
  return <SafeAreaView style={s.root} edges={['top', 'bottom']}><StatusBar style="light" /><View style={{ flex: 1, flexDirection: 'row' }}>
    {wide && <View style={s.sidebar}><View style={s.brand}><View style={s.logo}><Target color={colors.bg} size={25} strokeWidth={2.3} /></View><View><Text style={s.brandName}>PrizeCheck<Text style={{ color: colors.orange }}>.</Text></Text><Text style={s.brandSub}>TCG COMPANION</Text></View></View>
      <Text style={[common.label, { marginHorizontal: 22, marginTop: 48, marginBottom: 16 }]}>SUA MESA</Text>{nav(false)}
      <View style={{ flex: 1 }} /><View style={[common.panel, { margin: 16, padding: 15, gap: 10 }]}><View style={common.row}><WifiOff size={16} color={colors.green} /><Text style={{ color: colors.green, fontSize: 12, fontWeight: '600' }}>Pronto para jogar offline</Text></View><Text style={[common.body, { fontSize: 11, lineHeight: 18 }]}>Sua sessão fica neste aparelho. Sem conta, sem distrações.</Text></View>
      <Pressable accessibilityRole="button" onPress={() => setHelp(true)} style={[common.row, { padding: 22, minHeight: 48 }]}><CircleHelp color={colors.muted} size={17} /><Text style={{ color: colors.muted, fontSize: 12 }}>Como funciona</Text></Pressable><Text style={{ color: '#687282', fontSize: 10, paddingHorizontal: 22, paddingBottom: 22 }}>PRIZECHECK TCG · v1.0</Text>
    </View>}
    <View style={{ flex: 1 }}><View style={[s.topbar, { paddingHorizontal: wide ? 36 : 18 }]}>{wide ? <View style={common.row}><Text style={{ color: colors.muted, fontSize: 12 }}>Sua mesa</Text><Text style={{ color: '#626C7B' }}>/</Text><Text style={{ color: colors.text, fontSize: 12 }}>{navigation.find(n => n.id === tab)?.label}</Text></View> : <View style={common.row}><Target color={colors.orange} size={22} /><Text style={[s.brandName, { fontSize: 18 }]}>PrizeCheck<Text style={{ color: colors.orange }}>.</Text></Text></View>}
      <View style={common.row}><Badge>{`TURNO ${String(state.match.turn).padStart(2, '0')}`}</Badge>{!wide && <Pressable accessibilityRole="button" accessibilityLabel="Como funciona" onPress={() => setHelp(true)} style={{ padding: 8 }}><CircleHelp size={19} color={colors.muted} /></Pressable>}</View>
    </View>
    <ScrollView key={tab} contentContainerStyle={{ padding: wide ? 36 : 18, paddingBottom: 30, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 850, gap: 24 }}>{storageError && <View style={[common.panel, { borderColor: colors.red }]}><Text accessibilityRole="alert" style={{ color: colors.red, lineHeight: 20 }}>{storageError}</Text></View>}
        {tab === 'tracker' ? <TrackerScreen onDecks={() => setTab('deck')} /> : tab === 'board' ? <BoardScreen /> : <DeckScreen onTracker={() => setTab('tracker')} />}
        <View style={s.footer}><Text style={{ color: colors.muted, fontSize: 11, flex: 1, lineHeight: 18 }}>Nova partida limpa os marcadores. A lista do deck é mantida.</Text><ConfirmButton label="Nova partida ↗" title="Iniciar nova partida?" message="Todos os registros de Prêmios, danos, condições, Habilidades e recursos serão zerados. Seu deck será mantido." onConfirm={() => dispatch({ type: 'reset' })} /></View>
        <Text style={s.disclaimer}>Projeto independente, sem vínculo com a The Pokémon Company. Em torneios, consulte a organização sobre dispositivos eletrônicos e ferramentas de auxílio durante a partida.</Text>
      </View>
    </ScrollView>{!wide && nav(true)}
    </View></View>
    <Dialog open={help} title="Sua primeira conferência" onClose={() => setHelp(false)}><ScrollView><Text style={[common.body, { marginBottom: 14 }]}>1. Importe sua lista de 60 cartas ou explore o deck de exemplo.</Text><Text style={[common.body, { marginBottom: 14 }]}>2. Durante uma única busca inicial, registre as cópias distintas fora dos Prêmios. Inclua deck, mão, campo, descarte e Zona Perdida. As contagens representam um retrato da partida, não um histórico de quantas vezes você viu a carta.</Text><Text style={[common.body, { marginBottom: 14 }]}>3. Ao contabilizar 54 cartas fora dos Prêmios ou identificar diretamente os 6 Prêmios, finalize a conferência. O mapa é de composição, sem indicar posições físicas.</Text><Text style={[common.body, { marginBottom: 14 }]}>4. Depois, marque os Prêmios retirados. Mudanças na composição dos Prêmios por efeitos de cartas não são automatizadas nesta versão.</Text><Text style={[common.body, { marginBottom: 14 }]}>5. Use a mesa para dano e condições. “Próximo turno” libera apenas as Habilidades. “Nova partida” limpa a sessão.</Text><Text style={common.body}>É uma ferramenta para treino e partidas em que seu uso é permitido. Confirme as regras do evento com a organização.</Text></ScrollView><View style={{ marginTop: 20 }}><Button onPress={() => setHelp(false)}>Entendi, vamos jogar</Button></View></Dialog>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><Store><Shell /></Store></SafeAreaProvider>; }
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 18 },
  sidebar: { width: 248, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: '#14181E' },
  brand: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 22, paddingTop: 30 },
  logo: { backgroundColor: colors.orange, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.8 },
  brandSub: { color: colors.muted, fontSize: 9, letterSpacing: 2, marginTop: 4 },
  nav: { gap: 8, paddingHorizontal: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 67, borderRadius: 12 },
  navActive: { backgroundColor: colors.orangeBg },
  topbar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#14181E', borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 3 },
  mobileNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 70 },
  footer: { paddingTop: 22, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  disclaimer: { fontSize: 10, lineHeight: 17, color: '#7C8798' },
});
