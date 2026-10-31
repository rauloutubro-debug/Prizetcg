import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Dices, RotateCcw, Zap, ShieldCheck } from 'lucide-react-native';
import { colors, common } from '../theme';
import { Badge, Button, ConfirmButton, Dialog } from '../components/UI';
import { useStore } from '../state/Store';
import { Condition } from '../domain/types';

const conditions: Condition[] = ['Envenenado', 'Queimado', 'Paralisado', 'Adormecido', 'Confuso'];
export function BoardScreen() {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState(0);
  const [custom, setCustom] = useState('20');
  const [customOpen, setCustomOpen] = useState(false);
  const [coin, setCoin] = useState<'Cara' | 'Coroa' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [coinError, setCoinError] = useState(false);
  const reducedMotion = useRef(false);
  const mounted = useRef(true);
  const busy = useRef(false);
  const spin = useRef(new Animated.Value(0)).current;
  const slot = state.match.slots[selected]!;
  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { reducedMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reducedMotion.current = value; });
    return () => { mounted.current = false; spin.stopAnimation(); subscription.remove(); };
  }, [spin]);
  const flip = async () => {
    if (busy.current) return;
    busy.current = true;
    setFlipping(true); setCoinError(false);
    try {
      const bytes = await Crypto.getRandomBytesAsync(1);
      const result = bytes[0]! % 2 === 0 ? 'Cara' : 'Coroa';
      if (!mounted.current) return;
      spin.setValue(0);
      Animated.timing(spin, { toValue: 1, duration: reducedMotion.current ? 0 : 500, useNativeDriver: true }).start(({ finished }) => {
        if (mounted.current) { if (finished) { setCoin(result); AccessibilityInfo.announceForAccessibility(result); } setFlipping(false); }
        busy.current = false;
      });
    } catch { if (mounted.current) { setCoinError(true); setFlipping(false); } busy.current = false; }
  };
  const amount = Number(custom);
  const validAmount = /^\d+$/.test(custom) && amount > 0 && amount <= 9990 && amount % 10 === 0;
  return <View style={{ gap: 24 }}>
    <View><Text style={common.label}>TUDO SOB CONTROLE</Text><Text accessibilityRole="header" style={[common.title, { marginTop: 7 }]}>Ferramentas de mesa</Text><Text style={[common.body, { marginTop: 7 }]}>Menos marcadores. Mais foco na partida.</Text></View>
    <View style={[common.panel, common.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
      <View><Text style={common.label}>SEU TURNO</Text><Text style={[common.title, { marginTop: 5 }]}>{String(state.match.turn).padStart(2, '0')}</Text></View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}><Button onPress={() => dispatch({ type: 'turn' })}>Próximo turno →</Button><Text style={{ color: colors.muted, fontSize: 10 }}>Libera apenas as Habilidades do turno</Text></View>
    </View>
    <View style={{ gap: 12 }}><Text style={common.label}>SELECIONE O POKÉMON</Text><View style={s.slotGrid}>{state.match.slots.map((p, i) => <Pressable accessibilityRole="tab" accessibilityState={{ selected: selected === i }}
 aria-selected={selected === i} accessibilityLabel={`${p.name}, ${p.damage} de dano`} key={i} onPress={() => setSelected(i)} style={[s.slot, selected === i && { borderColor: colors.orange, backgroundColor: colors.orangeBg }]}><Text style={{ color: selected === i ? colors.orange : colors.muted, fontSize: 11 }}>{i === 0 ? 'ATIVO' : `BANCO ${i}`}</Text><Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, marginTop: 8 }}>{p.name}</Text><Text style={{ color: p.damage ? colors.orange : colors.muted, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{p.damage}</Text>{p.abilityUsed && <Text style={{ color: colors.green, fontSize: 10, marginTop: 5 }}>Habilidade usada</Text>}</Pressable>)}</View></View>
    <View style={[common.panel, { gap: 20 }]}>
      <View style={[common.row, { justifyContent: 'space-between' }]}><TextInput accessibilityLabel="Nome do Pokémon selecionado" value={slot.name} maxLength={40} onChangeText={name => dispatch({ type: 'name', index: selected, name })} style={[common.input, { flex: 1, fontWeight: '600' }]} />
        <ConfirmButton label="Limpar" title="Limpar este Pokémon?" message="Remove o dano, as condições e o uso da Habilidade deste espaço. Use ao trocar o Pokémon que ocupa o espaço." onConfirm={() => dispatch({ type: 'clear-slot', index: selected })} />
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 10 }}><Text style={common.label}>DANO ACUMULADO</Text><Text style={s.damage}>{slot.damage}</Text><Text style={common.body}>pontos de dano</Text></View>
      <View style={[common.row, { justifyContent: 'center', flexWrap: 'wrap' }]}>{[10, 50, 100].map(n => <Button key={n} variant="secondary" onPress={() => dispatch({ type: 'damage', index: selected, delta: n })}>{`+${n}`}</Button>)}<Button variant="secondary" onPress={() => setCustomOpen(true)}>Personalizar</Button></View>
      <View style={[common.row, { justifyContent: 'center' }]}><Button variant="ghost" disabled={!slot.damage} onPress={() => dispatch({ type: 'damage', index: selected, delta: -10 })}>−10</Button><Button variant="ghost" disabled={!slot.damage} onPress={() => dispatch({ type: 'damage', index: selected, delta: -50 })}>−50</Button><Button variant="ghost" disabled={!slot.damage} onPress={() => dispatch({ type: 'damage', index: selected, delta: -100 })}>−100</Button></View>
      <View style={s.divider} /><Text style={common.label}>CONDIÇÕES ESPECIAIS</Text>
      <View style={[common.row, { flexWrap: 'wrap' }]}>{conditions.map(c => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: slot.conditions.includes(c) }}
 aria-checked={slot.conditions.includes(c)} key={c} onPress={() => dispatch({ type: 'condition', index: selected, condition: c })} style={[s.condition, slot.conditions.includes(c) && { borderColor: colors.purple, backgroundColor: '#30283D' }]}><Text style={{ color: slot.conditions.includes(c) ? '#D7C6FF' : colors.muted, fontSize: 12 }}>{slot.conditions.includes(c) ? '● ' : '○ '}{c}</Text></Pressable>)}</View>
      <Text style={[common.body, { fontSize: 12 }]}>Dano e condições são manuais. Ao recuar, evoluir ou trocar o Pokémon, atualize os marcadores conforme as regras.</Text>
      <Button variant="secondary" icon={<Zap color={slot.abilityUsed ? colors.green : colors.muted} size={16} />} onPress={() => dispatch({ type: 'ability', index: selected })}>{slot.abilityUsed ? 'Habilidade usada neste turno · desfazer' : 'Marcar Habilidade como usada'}</Button>
    </View>
    <View style={[common.panel, { gap: 18 }]}><View style={common.row}><ShieldCheck size={19} color={colors.purple} /><Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Recursos da partida</Text></View><Text style={common.body}>Esses indicadores continuam marcados ao passar o turno.</Text>
      <View style={s.resources}>{([{ key: 'vstar', label: 'VSTAR', sub: 'Poder usado' }, { key: 'gx', label: 'GX', sub: 'Ataque usado' }, { key: 'ace', label: 'ACE SPEC', sub: 'Carta usada' }] as const).map(item => <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: state.match.once[item.key] }}
 aria-checked={state.match.once[item.key]} key={item.key} onPress={() => dispatch({ type: 'once', key: item.key })} style={[s.resource, state.match.once[item.key] && { borderColor: colors.green, backgroundColor: colors.greenBg }]}><Text style={{ color: state.match.once[item.key] ? colors.green : colors.text, fontWeight: '800', fontSize: 16 }}>{item.label}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>{state.match.once[item.key] ? item.sub : 'Disponível'}</Text></Pressable>)}</View>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17 }}>ACE SPEC é um lembrete de uso: a restrição é uma carta na lista; ela pode ser recuperada e jogada novamente quando as regras permitirem.</Text>
    </View>
    <View style={[common.panel, { gap: 18, alignItems: 'center' }]}><View style={common.row}><Dices color={colors.orange} size={20} /><Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Cara ou coroa?</Text></View>
      <Animated.View style={[s.coin, { transform: [{ rotateY: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] }) }] }]}><Text style={{ color: colors.orange, fontSize: 20, fontWeight: '800' }}>{flipping ? '…' : coin ?? '?'}</Text></Animated.View>
      <Text accessibilityLiveRegion="polite" style={common.body}>{coinError ? 'Não foi possível lançar. Tente novamente.' : flipping ? 'Lançando…' : coin ? `Resultado: ${coin}` : 'Resultado aleatório, chance de 50% por face.'}</Text>
      <Button disabled={flipping} icon={<RotateCcw size={15} color={colors.bg} />} onPress={flip}>Lançar moeda</Button>
    </View>
    <Dialog open={customOpen} title="Dano personalizado" onClose={() => setCustomOpen(false)}><Text style={common.body}>Informe um múltiplo de 10, de 10 a 9990.</Text><TextInput accessibilityLabel="Quantidade de dano" keyboardType="number-pad" value={custom} onChangeText={setCustom} style={[common.input, { marginVertical: 20 }]} maxLength={4} />
      <View style={[common.row, { justifyContent: 'flex-end' }]}><Button disabled={!validAmount} variant="secondary" onPress={() => { dispatch({ type: 'damage', index: selected, delta: -amount }); setCustomOpen(false); }}>Remover</Button><Button disabled={!validAmount} onPress={() => { dispatch({ type: 'damage', index: selected, delta: amount }); setCustomOpen(false); }}>Adicionar</Button></View>
    </Dialog>
  </View>;
}
const s = StyleSheet.create({
  slotGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  slot: { minWidth: 100, flexGrow: 1, flexBasis: '29%', padding: 14, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, borderRadius: 12 },
  damage: { color: colors.orange, fontSize: 88, fontWeight: '700', letterSpacing: -5, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: colors.border },
  condition: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12 },
  resources: { flexDirection: 'row', gap: 10 },
  resource: { flex: 1, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12, minHeight: 85 },
  coin: { height: 94, width: 94, borderRadius: 47, backgroundColor: colors.orangeBg, borderWidth: 3, borderColor: '#856144', alignItems: 'center', justifyContent: 'center' },
});
