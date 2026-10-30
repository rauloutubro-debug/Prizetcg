import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { ClipboardPaste, Layers3, Check } from 'lucide-react-native';
import { colors, common } from '../theme';
import { Badge, Button, Dialog } from '../components/UI';
import { useStore } from '../state/Store';
import { parseDeck } from '../domain/parser';
import { demoList } from '../domain/demo';

export function DeckScreen({ onTracker }: { onTracker: () => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState('');
  const [raw, setRaw] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const parsed = useMemo(() => parseDeck(raw, name), [raw, name]);
  const deck = state.deck;
  return <View style={{ gap: 24 }}>
    <View><Text style={common.label}>SEU PONTO DE PARTIDA</Text><Text accessibilityRole="header" style={[common.title, { marginTop: 7 }]}>Meu deck</Text><Text style={[common.body, { marginTop: 7 }]}>Cole sua lista. Prepare a próxima partida.</Text></View>
    <View style={[common.panel, { gap: 18 }]}><View style={[common.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><View style={common.row}><Layers3 color={colors.orange} size={24} /><Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{deck.name}</Text></View><Badge>DECK ATIVO</Badge></View>
      <View style={[common.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>{([{ category: 'pokemon', label: 'Pokémon', color: colors.purple }, { category: 'trainer', label: 'Treinadores', color: colors.green }, { category: 'energy', label: 'Energias', color: colors.orange }] as const).map(g => <View key={g.category}><Text style={{ color: g.color, fontWeight: '700', fontSize: 28 }}>{deck.cards.filter(c => c.category === g.category).reduce((n, c) => n + c.quantity, 0)}</Text><Text style={common.body}>{g.label}</Text></View>)}</View>
      <Text style={[common.body, { fontSize: 12 }]}>O exemplo é apenas para demonstração. O app confere contagem e formato, sem validar legalidade, rotação ou limite de cópias por nome.</Text><Button variant="secondary" onPress={onTracker}>Abrir rastreador →</Button>
    </View>
    <View style={[common.panel, { gap: 18 }]}><View style={common.row}><ClipboardPaste color={colors.orange} size={20} /><Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Importar uma lista</Text></View>
      <Text style={common.body}>Formatos TCG Live e Limitless, com cabeçalhos Pokémon, Trainer/Treinador e Energy/Energia. As cartas permanecem no idioma da lista.</Text>
      <Text style={common.label}>NOME DO DECK</Text><TextInput accessibilityLabel="Nome do deck" placeholder="Ex.: Dragapult ex / Pidgeot" placeholderTextColor={colors.muted} value={name} onChangeText={setName} maxLength={60} style={common.input} />
      <Text style={common.label}>LISTA · 60 CARTAS</Text><TextInput accessibilityLabel="Cole sua decklist" multiline textAlignVertical="top" autoCorrect={false} autoCapitalize="none" placeholder={'Pokémon: 18\n4 Dreepy TWM 128\n…\n\nTrainer: 34\n4 Arven OBF 186\n…\n\nEnergy: 8\n4 Fire Energy SVE 2\n…'} placeholderTextColor={colors.muted} value={raw} onChangeText={v => { setRaw(v); setAttempted(false); }} style={[common.input, { minHeight: 320, fontFamily: 'monospace', fontSize: 13, lineHeight: 22 }]} />
      <View style={[common.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}><Button variant="ghost" onPress={() => { setRaw(demoList); setName('Dragapult ex / Pidgeot'); setAttempted(false); }}>Preencher com exemplo</Button><Button onPress={() => { setAttempted(true); if (parsed.deck) setConfirmOpen(true); }}>Validar e importar</Button></View>
      {attempted && parsed.errors.length > 0 && <View accessibilityLiveRegion="polite" style={{ gap: 7 }}>{parsed.errors.map((e, i) => <Text key={i} style={{ color: colors.red, fontSize: 12, lineHeight: 19 }}>{e}</Text>)}</View>}
      {raw.length > 0 && parsed.deck && <View style={common.row}><Check color={colors.green} size={16} /><Text style={{ color: colors.green, fontSize: 12 }}>60 cartas reconhecidas · {parsed.deck.cards.length} tipos de carta</Text></View>}
    </View>
    <Dialog title="Usar este deck?" open={confirmOpen} onClose={() => setConfirmOpen(false)}><Text style={common.body}>Importar “{parsed.deck?.name}” inicia uma nova partida e limpa Prêmios, danos, condições e recursos da sessão atual.</Text><ScrollView style={{ maxHeight: 180, marginVertical: 16 }}>{parsed.deck?.cards.map(c => <Text key={c.id} style={[common.body, { fontSize: 12 }]}>{c.quantity}× {c.name} {c.set} {c.number}</Text>)}</ScrollView><View style={[common.row, { justifyContent: 'flex-end' }]}><Button variant="secondary" onPress={() => setConfirmOpen(false)}>Cancelar</Button><Button onPress={() => { if (parsed.deck) { dispatch({ type: 'deck', deck: parsed.deck }); setConfirmOpen(false); onTracker(); } }}>Importar deck</Button></View></Dialog>
  </View>;
}
