import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  House,
  Layers3,
  Swords,
  Settings2,
  Map,
  ArrowLeft,
  CloudOff,
} from 'lucide-react-native';
import { Store, useStore } from './src/state/Store';
import { WorkspaceProvider, useWorkspace } from './src/workspace/Workspace';
import { colors, common } from './src/theme';
import { Route } from './src/navigation';
import { Badge, Button } from './src/components/UI';
import { DialogProvider } from './src/components/DialogHost';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { TrainingScreen } from './src/screens/TrainingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TrackerScreen } from './src/screens/TrackerScreen';
import { BoardScreen } from './src/screens/BoardScreen';
const tabs = [
  { key: 'home' as Route, label: 'Início', Icon: House },
  { key: 'decks' as Route, label: 'Meus Decks', Icon: Layers3 },
  { key: 'train' as Route, label: 'Treinar', Icon: Swords },
  { key: 'settings' as Route, label: 'Configurações', Icon: Settings2 },
];
function Shell() {
  const { ready, data, error, dispatch, saveStatus } = useWorkspace();
  const legacy = useStore();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const [route, setRoute] = useState<Route>('home');
  const compact = wide && route === 'train';
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.green} />
        <Text style={common.body}>Preparando seu espaço de treino…</Text>
      </View>
    );
  const title =
    tabs.find((t) => t.key === route)?.label ??
    (route === 'tracker' ? 'Rastreador de Prêmios' : 'Ferramentas de mesa');
  const nav = (mobile: boolean) => (
    <View style={mobile ? s.bottom : s.nav}>
      {tabs.map(({ key, label, Icon }) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: route === key }}
          aria-selected={route === key}
          onPress={() => setRoute(key)}
          style={[
            mobile ? s.mobileTab : s.tab,
            route === key && !mobile && { backgroundColor: colors.greenBg },
          ]}
        >
          <Icon size={20} color={route === key ? colors.green : colors.muted} />
          <Text
            style={{
              color: route === key ? colors.green : colors.muted,
              fontSize: mobile ? 10 : 14,
              fontWeight: route === key ? '700' : '500',
              display: compact && !mobile ? 'none' : 'flex',
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={s.root}>
      <StatusBar style="light" />
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {wide && (
          <View style={[s.sidebar, compact && { width: 82 }]}>
            <View style={s.brand}>
              <View style={s.logo}>
                <Map size={24} color={colors.bg} />
              </View>
              <View style={compact && { display: 'none' }}>
                <Text style={s.brandText}>
                  PTCG<Text style={{ color: colors.green }}>MAP</Text>
                </Text>
                <Text style={s.tagline}>SEU MAPA DE JOGO</Text>
              </View>
            </View>
            <Text
              style={[
                common.label,
                { margin: 22, marginTop: 38 },
                compact && { display: 'none' },
              ]}
            >
              ESPAÇO PESSOAL
            </Text>
            {nav(false)}
            <View style={{ flex: 1 }} />
            <View
              style={[
                common.panel,
                { padding: 16, margin: 14, gap: 8 },
                compact && { display: 'none' },
              ]}
            >
              <CloudOff size={20} color={colors.green} />
              <Text
                style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}
              >
                Treino local
              </Text>
              <Text style={[common.body, { fontSize: 11 }]}>
                Prepare as imagens e leve sua mesa com você.
              </Text>
            </View>
            <Text
              style={{
                color: colors.muted,
                fontSize: 10,
                padding: 20,
                display: compact ? 'none' : 'flex',
              }}
            >
              PTCGMAP · 2.0.0
            </Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.header}>
            <View style={common.row}>
              {wide ? (
                <Text style={{ color: colors.text, fontSize: 13 }}>
                  {title}
                </Text>
              ) : (
                <>
                  <Map color={colors.green} size={23} />
                  <Text style={[s.brandText, { fontSize: 20 }]}>
                    PTCG<Text style={{ color: colors.green }}>MAP</Text>
                  </Text>
                </>
              )}
            </View>
            <View>
              <Badge tone={data.settings.offline ? 'orange' : 'green'}>
                {data.settings.offline ? 'OFFLINE ATIVO' : 'DADOS LOCAIS'}
              </Badge>
            </View>
          </View>
          <ScrollView
            key={route}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: wide ? 24 : 16,
              paddingBottom: 26,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: route === 'train' ? 1400 : 1100,
                gap: 20,
              }}
            >
              {(error || legacy.storageError) && (
                <View
                  accessibilityRole="alert"
                  style={[common.panel, { borderColor: colors.red, gap: 10 }]}
                >
                  <Text style={{ color: colors.red, lineHeight: 21 }}>
                    {error ?? legacy.storageError}
                  </Text>
                  {error && (
                    <Button
                      variant="secondary"
                      onPress={() => dispatch({ type: 'error', error: null })}
                    >
                      Entendi
                    </Button>
                  )}
                </View>
              )}
              {(route === 'tracker' || route === 'tools') && (
                <View style={{ gap: 12 }}>
                  <Button
                    variant="ghost"
                    icon={<ArrowLeft color={colors.muted} size={16} />}
                    onPress={() => setRoute('home')}
                  >
                    Voltar ao início
                  </Button>
                  <Text style={[common.body, { fontSize: 12 }]}>
                    Ferramenta de torneio preservada. Seus marcadores são
                    independentes da mesa de treino.
                  </Text>
                </View>
              )}
              {route === 'home' ? (
                <HomeScreen navigate={setRoute} />
              ) : route === 'decks' ? (
                <LibraryScreen navigate={setRoute} />
              ) : route === 'train' ? (
                <TrainingScreen navigate={setRoute} />
              ) : route === 'settings' ? (
                <SettingsScreen />
              ) : route === 'tracker' ? (
                <TrackerScreen onDecks={() => setRoute('decks')} />
              ) : (
                <BoardScreen />
              )}
              <View style={s.footer}>
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    color: /Falha|temporária/.test(saveStatus)
                      ? colors.red
                      : colors.muted,
                    fontSize: 11,
                  }}
                >
                  {saveStatus}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10 }}>
                  Mesa manual · efeitos resolvidos por você
                </Text>
              </View>
            </View>
          </ScrollView>
          {!wide && nav(true)}
        </View>
      </View>
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Store>
        <WorkspaceProvider>
          <DialogProvider>
            <Shell />
          </DialogProvider>
        </WorkspaceProvider>
      </Store>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  sidebar: {
    width: 210,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: '#111E27',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 20,
    paddingTop: 26,
  },
  logo: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
  },
  brandText: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  tagline: {
    color: colors.muted,
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 5,
  },
  header: {
    minHeight: 62,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 20,
  },
  nav: { paddingHorizontal: 12, gap: 8 },
  tab: {
    padding: 15,
    minHeight: 53,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bottom: {
    flexDirection: 'row',
    backgroundColor: '#111E27',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mobileTab: {
    flex: 1,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  footer: {
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
