import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, ChevronRight, Info, Check, Layers3, Sparkles, Flame, Zap, Leaf } from 'lucide-react-native';
import { colors, common } from '../theme';
import { Badge, Button, Counter, Dialog } from '../components/UI';
import { useStore } from '../state/Store';
import { analyzePrizes } from '../domain/prizes';
import { Category } from '../domain/types';

const categories: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'Todas' }, { key: 'pokemon', label: 'Pokémon' }, { key: 'trainer', label: 'Treinadores' }, { key: 'energy', label: 'Energias' },
];
const categoryNames = { pokemon: 'POKÉMON', trainer: 'TREINADORES', energy: 'ENERGIAS' };
function CardSymbol({ category, name }: { category: Category; name: string }) {
  const tone = category === 'pokemon' ? colors.purple : category === 'trainer' ? colors.green : colors.orange;
  const Icon = category === 'trainer' ? Layers3 : category === 'energy' ? (/fire|fogo/i.test(name) ? Flame : Zap) : Leaf;
  return <View style={[s.cardSymbol, { backgroundColor: `${tone}15` }]}><Icon size={20} color={tone} strokeWidth={1.7} /></View>;
}
export function TrackerScreen({ onDecks }: { onDecks: () => void }) {
  const { state, dispatch } = useStore();
  const { deck, match } = state;
  const result = useMemo(() => analyzePrizes(deck, match), [deck, match]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [onlyPrizes, setOnlyPrizes] = useState(false);
  const [knownCard, setKnownCard] = useState<string | null>(null);
  const editing = result.rows.find(c => c.id === knownCard);
  const taken = Object.values(match.taken).reduce((a, b) => a + b, 0);
  const rows = result.rows.filter(c => (category === 'all' || category === c.category) && c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!onlyPrizes || c.max > 0));
  const isExact = match.sealed;
  return <View style={{ gap: 24 }}>
    <View style={s.heading}><View style={{ flex: 1 }}><Text style={common.label}>CONHEÇA SUAS POSSIBILIDADES</Text><Text accessibilityRole="header" style={[common.title, { marginTop: 7 }]}>Rastreador de Prêmios</Text><Text style={[common.body, { marginTop: 7 }]}>Cada carta conta. Jogue com informação.</Text></View><Badge tone="orange">BUSCA INICIAL</Badge></View>

    <Pressable accessibilityRole="button" accessibilityLabel="Ver ou importar deck" onPress={onDecks} style={[common.panel, common.row, { justifyContent: 'space-between', padding: 16 }]}>
      <View style={[common.row, { flex: 1 }]}><View style={s.deckIcon}><Layers3 color={colors.orange} size={23} /></View><View style={{ flex: 1 }}><Text style={common.label}>DECK ATIVO</Text><Text style={[s.cardName, { marginTop: 5 }]}>{deck.name}</Text></View></View><ChevronRight size={20} color={colors.muted} />
    </Pressable>

    <View style={[common.panel, { padding: 0, overflow: 'hidden' }]}>
      <View style={{ padding: 22, gap: 20 }}>
        <View style={[common.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <View style={common.row}><Sparkles color={colors.orange} size={18} /><Text style={[s.cardName, { fontSize: 15 }]}>Seus seis Prêmios</Text></View>
          <Badge tone={isExact ? 'green' : 'orange'}>{isExact ? 'MAPA CONFIRMADO' : 'EM CONFERÊNCIA'}</Badge>
        </View>
        <View style={s.prizeSlots}>{Array.from({ length: 6 }, (_, i) => <View key={i} style={[s.prize, isExact && s.prizeKnown, i < taken && { opacity: 0.4 }]}>
          <View style={s.prizeBall}><View style={s.ballLine} /><View style={s.ballCenter} /></View><Text style={{ color: isExact ? colors.orange : colors.muted, fontSize: 10, marginTop: 9, fontWeight: '600' }}>{i < taken ? '✓' : isExact ? `${i + 1}` : '?'}</Text>
        </View>)}</View>
        <View style={[common.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <Text style={common.body}><Text style={{ color: colors.text, fontWeight: '700' }}>{isExact ? `${6 - taken} / 6` : `${result.totalOutside} / 54`}</Text> {isExact ? 'Prêmios restantes' : 'cartas fora dos Prêmios'}</Text>
          {!isExact && <Text style={{ color: colors.orange, fontSize: 12 }}>{result.exact ? 'Conferência pronta para finalizar' : `${54 - result.totalOutside} cartas para conferir`}</Text>}
        </View>
        <View style={s.progressTrack}><View style={[s.progressFill, { width: `${isExact ? (6 - taken) / 6 * 100 : result.totalOutside / 54 * 100}%` }]} /></View>
        {!isExact && <Button disabled={!result.exact} icon={<Check size={16} color={colors.bg} />} onPress={() => dispatch({ type: 'seal' })}>Finalizar conferência</Button>}
      </View>
      <View style={s.info}><Info size={16} color={colors.muted} /><Text style={[common.body, { fontSize: 12, lineHeight: 18, flex: 1 }]}>{isExact ? 'Mapa da busca inicial, sem posição física dos Prêmios. Registre abaixo cada carta retirada. Para refazer a busca, inicie uma nova partida.' : 'Conte cópias distintas fora dos Prêmios em uma única conferência: deck, mão, campo, descarte e Zona Perdida. Não some a mesma cópia em buscas futuras. “Possíveis” não significa confirmado.'}</Text></View>
    </View>

    <View style={{ gap: 16 }}>
      <View style={[common.row, { justifyContent: 'space-between' }]}><Text style={[s.cardName, { fontSize: 18 }]}>Lista do deck <Text style={{ color: colors.muted, fontWeight: '400', fontSize: 13 }}>· 60 cartas</Text></Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: onlyPrizes }} onPress={() => setOnlyPrizes(!onlyPrizes)} style={[common.row, { minHeight: 44, gap: 7 }]}><View style={[s.checkbox, onlyPrizes && { backgroundColor: colors.orange, borderColor: colors.orange }]}>{onlyPrizes && <Check size={12} color={colors.bg} />}</View><Text style={{ color: colors.muted, fontSize: 12 }}>Só Prêmios</Text></Pressable>
      </View>
      <View style={[common.row, common.input, { padding: 0, paddingLeft: 14 }]}><Search color={colors.muted} size={18} /><TextInput accessibilityLabel="Buscar carta no deck" placeholder="Buscar uma carta..." placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={{ flex: 1, color: colors.text, padding: 14, minHeight: 48, fontSize: 14 }} /></View>
      <View style={[common.row, { flexWrap: 'wrap', gap: 8 }]}>{categories.map(c => <Pressable accessibilityRole="tab" accessibilityState={{ selected: category === c.key }} key={c.key} onPress={() => setCategory(c.key)} style={[s.filter, category === c.key && { backgroundColor: colors.orangeBg, borderColor: '#6A4932' }]}><Text style={{ color: category === c.key ? colors.orange : colors.muted, fontSize: 12, fontWeight: '600' }}>{c.label}</Text></Pressable>)}</View>
      <View style={common.row}><Text style={[common.body, { fontSize: 12, flex: 1 }]}>{isExact ? 'A contagem original continua visível.' : 'À direita: cópias fora dos Prêmios.'}</Text><Text style={[common.body, { fontSize: 12 }]}>{rows.length} tipos de carta</Text></View>
      {(['pokemon', 'trainer', 'energy'] as Category[]).map(group => {
        const cards = rows.filter(c => c.category === group);
        if (!cards.length) return null;
        return <View key={group} style={[common.panel, { padding: 0, overflow: 'hidden' }]}>
          <View style={s.groupHeading}><Text style={common.label}>{categoryNames[group]}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{deck.cards.filter(c => c.category === group).reduce((n, c) => n + c.quantity, 0)} CARTAS</Text></View>
          {cards.map((card, i) => <View key={card.id} style={[s.cardRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={[common.row, { flex: 1, minWidth: 150 }]}><CardSymbol category={card.category} name={card.name} /><View style={{ flex: 1 }}><Text style={s.cardName}>{card.name}</Text><Text style={s.cardMeta}>{card.quantity}× no deck {card.set ? ` · ${card.set} ${card.number}` : ''}</Text>
              {card.max > 0 && <Text style={{ color: card.min === card.max ? colors.orange : colors.muted, fontSize: 11, marginTop: 5 }}>{card.min === card.max ? `${card.min} confirmado(s) nos Prêmios${card.taken ? ` · ${card.taken} retirado(s)` : ''}` : `${card.min}–${card.max} possível(is) nos Prêmios`}</Text>}
            </View></View>
            {isExact ? <View style={{ alignItems: 'center', gap: 4 }}><Text style={common.label}>RETIRADOS</Text><Counter label={`Prêmios retirados de ${card.name}`} value={card.taken} max={card.min} onChange={delta => dispatch({ type: 'count', id: card.id, field: 'taken', delta })} /></View>
              : <View style={{ alignItems: 'flex-end', gap: 8 }}><Counter label={`Cópias fora dos Prêmios de ${card.name}`} value={card.outside} max={Math.min(card.quantity - (match.confirmed[card.id] ?? 0), card.outside + 54 - result.totalOutside)} onChange={delta => dispatch({ type: 'count', id: card.id, field: 'outside', delta })} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Confirmar ou corrigir Prêmio de ${card.name}`} onPress={() => setKnownCard(card.id)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ fontSize: 10, color: colors.muted }}>Prêmio conhecido: {match.confirmed[card.id] ?? 0} · editar</Text></Pressable>
              </View>}
          </View>)}
        </View>;
      })}
      {!rows.length && <View style={common.panel}><Text style={common.body}>Nenhuma carta para este filtro.</Text></View>}
    </View>
    <Dialog open={!!editing} title="Prêmio identificado diretamente" onClose={() => setKnownCard(null)}>
      {editing && <View style={{ gap: 20 }}><Text style={common.body}>{editing.name}</Text><Text style={common.body}>Use somente se um efeito permitiu conhecer a carta nos Prêmios. As cópias registradas aqui não podem estar simultaneamente entre as cartas vistas fora dos Prêmios.</Text><View style={{ alignItems: 'center' }}><Counter label={`Prêmios conhecidos de ${editing.name}`} value={match.confirmed[editing.id] ?? 0} max={editing.max} onChange={delta => dispatch({ type: 'count', id: editing.id, field: 'confirmed', delta })} /></View><Button onPress={() => setKnownCard(null)}>Concluir</Button></View>}
    </Dialog>
  </View>;
}
const s = StyleSheet.create({
  heading: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  deckIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.orangeBg, alignItems: 'center', justifyContent: 'center' },
  prizeSlots: { flexDirection: 'row', gap: 8 },
  prize: { flex: 1, height: 103, borderWidth: 1, borderStyle: 'dashed', borderColor: '#414650', borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14181E' },
  prizeKnown: { borderStyle: 'solid', borderColor: '#7D5538', backgroundColor: colors.orangeBg },
  prizeBall: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#79634F', alignItems: 'center', justifyContent: 'center' },
  ballLine: { width: 26, height: 1, backgroundColor: '#79634F', position: 'absolute' },
  ballCenter: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.panel, borderWidth: 1, borderColor: '#79634F' },
  progressTrack: { height: 5, backgroundColor: colors.raised, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, backgroundColor: colors.orange, borderRadius: 3 },
  info: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#161A20' },
  checkbox: { width: 17, height: 17, borderWidth: 1, borderColor: colors.muted, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  filter: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  groupHeading: { padding: 15, backgroundColor: '#1E232B', flexDirection: 'row', justifyContent: 'space-between' },
  cardRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cardSymbol: { height: 42, width: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, color: colors.text, fontWeight: '600' },
  cardMeta: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
