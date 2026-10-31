import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Search, Plus, Download, Pencil, Layers3 } from 'lucide-react-native';
import * as Crypto from 'expo-crypto';
import { Card } from '../domain/types';
import { parseDeck } from '../domain/parser';
import { demoList } from '../domain/demo';
import { Button, Badge, ConfirmButton, Dialog } from '../components/UI';
import { CardArt } from '../components/CardArt';
import { CardDetails } from '../components/CardDetails';
import { useWorkspace } from '../workspace/Workspace';
import { SavedDeck } from '../workspace/model';
import { imageExists } from '../catalog/cache';
import { downloadCardImage } from '../catalog/tcgdex';
import { useStore } from '../state/Store';
import { colors, common } from '../theme';
import { Route } from '../navigation';
export function LibraryScreen({ navigate }: { navigate: (r: Route) => void }) {
  const { data, dispatch } = useWorkspace();
  const legacy = useStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<SavedDeck | 'new' | null>(null);
  const [name, setName] = useState('');
  const [raw, setRaw] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [detail, setDetail] = useState<SavedDeck | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<string[]>([]);
  const stop = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      stop.current = true;
    };
  }, []);
  const decks = useMemo(
    () =>
      data.decks.filter((d) =>
        `${d.name} ${d.cards.map((c) => c.name).join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [data.decks, search],
  );
  function edit(deck: SavedDeck | 'new') {
    setEditing(deck);
    setName(deck === 'new' ? '' : deck.name);
    setRaw(deck === 'new' ? '' : deck.raw);
    setErrors([]);
  }
  async function prepare(deck: SavedDeck) {
    if (busy) return;
    setBusy(true);
    setFailures([]);
    stop.current = false;
    const failed: string[] = [];
    for (let i = 0; i < deck.cards.length; i++) {
      if (stop.current) break;
      const c = deck.cards[i]!;
      if (live.current)
        setProgress(`${i + 1}/${deck.cards.length} · ${c.name}`);
      try {
        const existing = data.assets[c.id];
        if (existing && (await imageExists(existing))) continue;
        if (data.settings.offline)
          throw Error('Modo offline: arquivo local ausente.');
        const asset = await downloadCardImage(c);
        dispatch({ type: 'asset', id: c.id, asset });
      } catch (e) {
        failed.push(
          `${c.name} (${c.set ?? '?'} ${c.number ?? '?'}) — ${e instanceof Error ? e.message : 'Falha no download.'}`,
        );
      }
    }
    if (live.current) {
      setProgress(
        stop.current
          ? 'Preparação interrompida. Downloads concluídos foram mantidos.'
          : 'Verificação concluída.',
      );
      setFailures(failed);
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 22 }}>
      <View
        style={[
          common.row,
          { justifyContent: 'space-between', flexWrap: 'wrap' },
        ]}
      >
        <View>
          <Text style={common.label}>SUA BIBLIOTECA LOCAL</Text>
          <Text
            accessibilityRole="header"
            style={[common.title, { marginTop: 8 }]}
          >
            Meus Decks
          </Text>
        </View>
        <Button
          icon={<Plus size={18} color={colors.bg} />}
          onPress={() => edit('new')}
        >
          Importar deck
        </Button>
      </View>
      <Text style={common.body}>
        Prepare suas listas e imagens uma vez. Depois, a mesa funciona sem
        conexão e sem conta.
      </Text>
      <View style={[common.row, common.input, { padding: 0, paddingLeft: 14 }]}>
        <Search color={colors.muted} size={19} />
        <TextInput
          accessibilityLabel="Buscar decks"
          placeholder="Buscar por deck ou carta"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, color: colors.text, padding: 14, minHeight: 48 }}
        />
      </View>
      <View
        style={[
          common.row,
          { flexWrap: 'wrap', alignItems: 'stretch', gap: 16 },
        ]}
      >
        {decks.map((deck) => {
          const count = deck.cards.filter((c) => !!data.assets[c.id]).length;
          return (
            <View
              key={deck.uid}
              style={[
                common.panel,
                { flexGrow: 1, flexBasis: 280, maxWidth: 520, gap: 16 },
              ]}
            >
              <View style={[common.row, { justifyContent: 'space-between' }]}>
                <Badge tone="muted">60 CARTAS · LISTA LOCAL</Badge>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${deck.name}`}
                  onPress={() => edit(deck)}
                  style={{ padding: 12 }}
                >
                  <Pencil size={17} color={colors.muted} />
                </Pressable>
              </View>
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {deck.cards.slice(0, 3).map((c) => (
                    <CardArt
                      key={c.id}
                      card={c}
                      width={78}
                      onPress={() => setCard(c)}
                    />
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir deck ${deck.name}`}
                  onPress={() => setDetail(deck)}
                  style={{ minHeight: 44, justifyContent: 'center' }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 20,
                      fontWeight: '700',
                    }}
                  >
                    {deck.name}
                  </Text>
                </Pressable>
              </View>
              <View style={[common.row, { justifyContent: 'space-between' }]}>
                {(['pokemon', 'trainer', 'energy'] as const).map((g, i) => (
                  <Text
                    key={g}
                    style={{
                      color: [colors.purple, colors.green, colors.orange][i],
                      fontSize: 12,
                    }}
                  >
                    {deck.cards
                      .filter((c) => c.category === g)
                      .reduce((n, c) => n + c.quantity, 0)}{' '}
                    {['Pokémon', 'Treinadores', 'Energias'][i]}
                  </Text>
                ))}
              </View>
              <Text style={[common.body, { fontSize: 12 }]}>
                {count}/{deck.cards.length} imagens registradas · coleção e
                número preservados
              </Text>
              <View style={[common.row, { flexWrap: 'wrap' }]}>
                <Button variant="secondary" onPress={() => setDetail(deck)}>
                  Ver cartas
                </Button>
                <Button
                  disabled={busy}
                  variant="secondary"
                  icon={<Download size={15} color={colors.green} />}
                  onPress={() => prepare(deck)}
                >
                  {data.settings.offline
                    ? 'Verificar arquivos'
                    : 'Preparar offline'}
                </Button>
              </View>
              <ConfirmButton
                label="Usar no rastreador de Prêmios"
                title="Abrir nova conferência?"
                message="O deck será enviado ao rastreador de torneio. Isso limpa apenas os marcadores antigos dessa ferramenta; a mesa de treino será preservada."
                onConfirm={() => {
                  legacy.dispatch({ type: 'deck', deck });
                  navigate('tracker');
                }}
              />
            </View>
          );
        })}
      </View>
      {!decks.length && (
        <View style={[common.panel, { gap: 14 }]}>
          <Layers3 color={colors.green} size={28} />
          <Text style={common.body}>
            {data.decks.length
              ? 'Nenhum deck corresponde à busca. Tente outro nome de carta.'
              : 'Sua biblioteca está vazia. Importe uma lista ou use o exemplo para começar.'}
          </Text>
          <Button onPress={() => edit('new')}>Adicionar um deck</Button>
        </View>
      )}
      {!!progress && (
        <View style={[common.panel, { gap: 10 }]}>
          <Text accessibilityLiveRegion="polite" style={common.body}>
            {progress}
          </Text>
          {busy && (
            <Button
              variant="secondary"
              onPress={() => {
                stop.current = true;
              }}
            >
              Parar após esta carta
            </Button>
          )}
          {failures.map((e, i) => (
            <Text
              key={i}
              style={{ color: colors.red, fontSize: 12, lineHeight: 19 }}
            >
              {e}
            </Text>
          ))}
        </View>
      )}
      <Dialog
        open={!!editing}
        title={editing === 'new' ? 'Importar decklist' : 'Editar deck'}
        onClose={() => setEditing(null)}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 15 }}
        >
          <Text style={common.body}>
            TCG Live ou Limitless, com cabeçalhos Pokémon, Trainer/Treinador e
            Energy/Energia. Exatamente 60 cartas; legalidade não é validada.
          </Text>
          <TextInput
            accessibilityLabel="Nome do deck"
            value={name}
            onChangeText={setName}
            placeholder="Nome do deck"
            placeholderTextColor={colors.muted}
            maxLength={60}
            style={common.input}
          />
          <TextInput
            accessibilityLabel="Decklist em texto"
            value={raw}
            onChangeText={setRaw}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            textAlignVertical="top"
            placeholder={'Pokémon: 18\n4 Dreepy TWM 128\n…'}
            placeholderTextColor={colors.muted}
            style={[
              common.input,
              { minHeight: 260, fontSize: 12, lineHeight: 20 },
            ]}
          />
          {errors.map((e, i) => (
            <Text
              accessibilityRole="alert"
              key={i}
              style={{ color: colors.red, fontSize: 12 }}
            >
              {e}
            </Text>
          ))}
          <Button
            variant="secondary"
            onPress={() => {
              setRaw(demoList);
              setName('Dragapult ex / Pidgeot');
            }}
          >
            Preencher exemplo
          </Button>
          <Button
            onPress={() => {
              const result = parseDeck(raw, name);
              setErrors(result.errors);
              if (result.deck) {
                dispatch({
                  type: 'deck',
                  deck: {
                    ...result.deck,
                    uid:
                      editing && editing !== 'new'
                        ? editing.uid
                        : Crypto.randomUUID(),
                    updatedAt: new Date().toISOString(),
                  },
                });
                setEditing(null);
                setDetail(null);
              }
            }}
          >
            Salvar deck
          </Button>
          {editing && editing !== 'new' && (
            <ConfirmButton
              label="Excluir da biblioteca"
              title="Excluir este deck?"
              message="A partida em andamento usa uma cópia independente e será preservada. Esta lista será removida da biblioteca."
              onConfirm={() => {
                dispatch({ type: 'delete', uid: editing.uid });
                setEditing(null);
                setDetail(null);
              }}
            />
          )}
        </ScrollView>
      </Dialog>
      <Dialog
        open={!!detail}
        title={detail?.name ?? 'Deck'}
        onClose={() => setDetail(null)}
      >
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          {detail?.cards.map((c) => (
            <View
              key={c.id}
              style={[
                common.row,
                {
                  paddingVertical: 7,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <CardArt card={c} width={56} onPress={() => setCard(c)} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {c.quantity}× {c.name}
                </Text>
                <Text style={common.body}>
                  {c.set} {c.number}
                </Text>
              </View>
              <Button variant="ghost" onPress={() => setCard(c)}>
                Ampliar
              </Button>
            </View>
          ))}
        </ScrollView>
      </Dialog>
      <CardDetails
        key={card?.id ?? 'none'}
        card={card}
        onClose={() => setCard(null)}
      />
    </View>
  );
}
