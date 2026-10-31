import React, { useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Eye,
  EyeOff,
  History,
  RotateCcw,
  Shield,
  Shuffle,
  Undo2,
  Swords,
} from "lucide-react-native";
import { colors, common } from "../theme";
import { useWorkspace, random32 } from "../workspace/Workspace";
import { descendants, shuffled, visible } from "../battle/engine";
import { Session, Side, Zone, zoneNames } from "../battle/types";
import { Card } from "../domain/types";
import { SavedDeck } from "../workspace/model";
import { Button, Badge, ConfirmButton, Dialog } from "../components/UI";
import { CardArt } from "../components/CardArt";
import { CardDetails } from "../components/CardDetails";
import { ZoneViewer } from "../components/ZoneViewer";
import { BattleCardActions } from "../components/BattleCardActions";
import { AssistantPanel } from "../components/AssistantPanel";
import { Route } from "../navigation";

function deckSnapshot(session: Session, side: Side): SavedDeck {
  const cards = new Map<string, Card>();
  for (const i of Object.values(session.instances))
    if (i.owner === side) {
      const existing = cards.get(i.cardId);
      if (existing) existing.quantity++;
      else
        cards.set(i.cardId, { ...session.definitions[i.cardId]!, quantity: 1 });
    }
  return {
    name: session.deckNames[side],
    cards: [...cards.values()],
    raw: "",
    uid: "snapshot",
    updatedAt: "",
  };
}
export function TrainingScreen({ navigate }: { navigate: (r: Route) => void }) {
  const { data, dispatch, start } = useWorkspace();
  const session = data.session;
  const { width, height } = useWindowDimensions();
  const wideTable = width >= 1000 && width > height;
  const phone = width < 700;
  const [setup, setSetup] = useState(!session);
  const [duo, setDuo] = useState(false);
  const [bot, setBot] = useState(false);
  const [a, setA] = useState(data.decks[0]?.uid ?? "");
  const [b, setB] = useState(data.decks[0]?.uid ?? "");
  const [perspective, setPerspective] = useState<Side>(
    session?.state.training?.bot ? 0 : (session?.state.current ?? 0),
  );
  const [curtain, setCurtain] = useState<Side | null>(
    session &&
      session.mode === "duo" &&
      !session.state.training?.bot &&
      !session.state.study
      ? session.state.current
      : null,
  );
  const [zone, setZone] = useState<{ side: Side; name: Zone } | null>(null);
  const [selected, setSelected] = useState<{
    id: string;
    inspect: boolean;
  } | null>(null);
  const [zoom, setZoom] = useState<Card | null>(null);
  const [showOpponent, setShowOpponent] = useState(false);
  const [history, setHistory] = useState(false);
  const [note, setNote] = useState("");
  const cw = data.settings.largeCards
    ? width >= 1000
      ? 91
      : 86
    : width >= 1000
      ? Math.max(53, Math.min(78, (height - 290) / 8.5))
      : 68;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (
        state !== "active" &&
        session?.mode === "duo" &&
        !session.state.training?.bot
      ) {
        setSelected(null);
        setZone(null);
        setZoom(null);
        setCurtain(perspective);
      }
    });
    return () => sub.remove();
  }, [perspective, session?.mode, session?.state.training?.bot]);
  function privacyClose() {
    setSelected(null);
    setZone(null);
    setZoom(null);
    setHistory(false);
  }
  function control(side: Side) {
    privacyClose();
    if (session?.state.study) setPerspective(side);
    else setCurtain(side);
  }
  if (curtain !== null && !setup)
    return (
      <View
        style={[
          common.panel,
          { paddingVertical: 70, alignItems: "center", gap: 22 },
        ]}
      >
        <Shield color={colors.green} size={40} />
        <Text style={common.title}>Troca de jogador</Text>
        <Text style={[common.body, { textAlign: "center" }]}>
          Passe o aparelho ao jogador do lado {curtain === 0 ? "A" : "B"}. A mão
          do outro lado ficará oculta.
        </Text>
        <Button
          onPress={() => {
            setPerspective(curtain);
            setCurtain(null);
          }}
        >{`Continuar como lado ${curtain === 0 ? "A" : "B"}`}</Button>
      </View>
    );
  if (setup || !session)
    return (
      <View style={{ gap: 22 }}>
        <Text style={common.label}>LABORATÓRIO DE JOGO</Text>
        <Text accessibilityRole="header" style={common.title}>
          Prepare sua mesa
        </Text>
        <Text style={common.body}>
          Treine sozinho, controle dois lados ou enfrente o robô local. Escolha
          uma lista diferente para o adversário e use o treinador para comparar
          sequências.
        </Text>
        <View style={[common.row, { flexWrap: "wrap" }]}>
          <Button
            variant={!duo ? "primary" : "secondary"}
            onPress={() => {
              setDuo(false);
              setBot(false);
            }}
          >
            Treino solo
          </Button>
          <Button
            variant={duo && !bot ? "primary" : "secondary"}
            onPress={() => {
              setDuo(true);
              setBot(false);
            }}
          >
            Dois lados
          </Button>
          <Button
            variant={bot ? "primary" : "secondary"}
            onPress={() => {
              setDuo(true);
              setBot(true);
            }}
          >
            Contra robô
          </Button>
        </View>
        {([0, ...(duo ? [1] : [])] as Side[]).map((side) => (
          <View key={side} style={[common.panel, { gap: 13 }]}>
            <Text style={common.label}>
              {side === 0 ? "SEU DECK · LADO A" : "LISTA ADVERSÁRIA · LADO B"}
            </Text>
            {data.decks.map((deck) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{
                  checked: (side === 0 ? a : b) === deck.uid,
                }}
                aria-checked={(side === 0 ? a : b) === deck.uid}
                key={deck.uid}
                onPress={() => (side === 0 ? setA(deck.uid) : setB(deck.uid))}
                style={[
                  s.deckChoice,
                  (side === 0 ? a : b) === deck.uid && {
                    borderColor: colors.green,
                    backgroundColor: colors.greenBg,
                  },
                ]}
              >
                <Text
                  style={{ color: colors.text, fontWeight: "600", flex: 1 }}
                >
                  {deck.name}
                </Text>
                <Text style={common.body}>60 cartas</Text>
              </Pressable>
            ))}
            {!data.decks.length && (
              <Button onPress={() => navigate("decks")}>
                Importar um deck primeiro
              </Button>
            )}
          </View>
        ))}
        <Button variant="secondary" onPress={() => navigate("decks")}>
          Importar ou editar outra lista
        </Button>
        <Text style={common.body}>
          Preparar embaralha, compra 7 e separa 6 Prêmios de cada lado. Escolha
          manualmente seu Pokémon Ativo e o Banco. Mulligans, efeitos, custos e
          legalidade não são validados.
        </Text>
        {session && (
          <Text style={{ color: colors.orange, lineHeight: 22 }}>
            Iniciar uma mesa substitui a sessão de treino atual. Sua biblioteca
            e ferramentas de torneio são mantidas.
          </Text>
        )}
        <Button
          disabled={
            !data.decks.some((d) => d.uid === a) ||
            (duo && !data.decks.some((d) => d.uid === b))
          }
          onPress={() => {
            const first = data.decks.find((d) => d.uid === a)!;
            const second = duo ? data.decks.find((d) => d.uid === b)! : null;
            start(first, second, bot);
            privacyClose();
            setPerspective(0);
            setCurtain(null);
            setSetup(false);
          }}
        >
          Embaralhar e começar
        </Button>
        {session && (
          <Button variant="secondary" onPress={() => setSetup(false)}>
            Voltar à sessão atual
          </Button>
        )}
      </View>
    );
  const me = session.state.players[perspective];
  function select(id: string, inspect = false) {
    setSelected({ id, inspect });
  }
  function renderCard(id: string, side: Side) {
    const known = visible(session!, id, perspective);
    const card = session!.definitions[session!.instances[id]!.cardId]!;
    const mark = session!.state.marks[id]!;
    const attachments = descendants(session!.state, id).length;
    return (
      <View key={id} style={{ width: cw, gap: 3 }}>
        <CardArt
          testID={`table-card-${id}`}
          hidden={!known}
          card={known ? card : undefined}
          width={cw}
          onPress={() => select(id)}
        />
        {known &&
          (mark.damage > 0 ||
            attachments > 0 ||
            mark.ability ||
            mark.conditions.length > 0) && (
            <Text
              numberOfLines={2}
              style={{
                color: mark.damage ? colors.orange : colors.green,
                fontSize: 10,
                textAlign: "center",
              }}
            >
              {mark.damage ? `${mark.damage} dano ` : ""}
              {attachments ? `+${attachments} anexos ` : ""}
              {mark.ability ? "Hab. ✓ " : ""}
              {mark.conditions.join(" · ")}
            </Text>
          )}
      </View>
    );
  }
  function field(side: Side) {
    const p = session!.state.players[side];
    const yours = side === perspective;
    return (
      <View
        key={side}
        testID={`field-${side}`}
        style={[
          s.field,
          yours && { borderColor: "#3E6864" },
          wideTable && { flex: 1, minWidth: 0 },
        ]}
      >
        <View
          style={[
            common.row,
            { justifyContent: "space-between", flexWrap: "wrap", gap: 5 },
          ]}
        >
          <Text
            style={{
              color: yours ? colors.green : colors.muted,
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            LADO {side === 0 ? "A" : "B"} · {session!.deckNames[side]}
          </Text>
          <Badge tone={yours ? "green" : "muted"}>
            {yours
              ? "VOCÊ CONTROLA"
              : session!.state.study
                ? "ESTUDO ABERTO"
                : "MÃO OCULTA"}
          </Badge>
        </View>
        <View style={[common.row, { flexWrap: "wrap", gap: 6 }]}>
          {(["deck", "prizes", "discard", "lost", "stadium"] as Zone[]).map(
            (z) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${zoneNames[z]} do lado ${side === 0 ? "A" : "B"}, ${p.zones[z].length} cartas`}
                key={z}
                onPress={() => setZone({ side, name: z })}
                style={s.zoneButton}
              >
                <Text style={{ color: colors.muted, fontSize: 10 }}>
                  {zoneNames[z]}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "700",
                    fontSize: 14,
                  }}
                >
                  {p.zones[z].length}
                </Text>
              </Pressable>
            ),
          )}
        </View>
        <View style={[common.row, { alignItems: "flex-start" }]}>
          <View
            style={{
              gap: 6,
              alignItems: "center",
              paddingRight: 10,
              borderRightWidth: 1,
              borderRightColor: colors.border,
            }}
          >
            <Text style={s.zoneLabel}>ATIVO</Text>
            {p.zones.active.length ? (
              p.zones.active.map((id) => renderCard(id, side))
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ativo vazio do lado ${side === 0 ? "A" : "B"}`}
                onPress={() => setZone({ side, name: "hand" })}
                style={[s.empty, { width: cw, aspectRatio: 63 / 88 }]}
              >
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  Ativo{"\n"}vazio
                </Text>
              </Pressable>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Text style={s.zoneLabel}>
              BANCO · {p.zones.bench.length}/{p.benchLimit ?? 5}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ gap: 8 }}
            >
              {p.zones.bench.map((id) => renderCard(id, side))}
              {Array.from(
                { length: (p.benchLimit ?? 5) - p.zones.bench.length },
                (_, i) => (
                  <View
                    key={i}
                    style={[s.empty, { width: cw, aspectRatio: 63 / 88 }]}
                  >
                    <Text style={{ color: "#6F8A97", fontSize: 11 }}>
                      {p.zones.bench.length + i + 1}
                    </Text>
                  </View>
                ),
              )}
            </ScrollView>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir mão do lado ${side === 0 ? "A" : "B"}`}
            onPress={() => setZone({ side, name: "hand" })}
            style={{ minHeight: 28, justifyContent: "center" }}
          >
            <Text style={s.zoneLabel}>
              MÃO · {p.zones.hand.length} CARTAS{" "}
              {yours || session!.state.study
                ? "· TOQUE PARA MOVER"
                : "· OCULTA"}
            </Text>
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={{ gap: 8, minHeight: 44 }}
          >
            {p.zones.hand.map((id) => renderCard(id, side))}
            {!p.zones.hand.length && (
              <Text style={common.body}>Nenhuma carta na mão.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      <View
        style={[
          common.row,
          { justifyContent: "space-between", flexWrap: "wrap" },
        ]}
      >
        <View>
          <Text style={common.label}>
            {session.mode === "solo"
              ? "TREINO SOLO"
              : session.state.training?.bot
                ? "CONTRA ROBÔ LOCAL"
                : "DOIS LADOS · MESA MANUAL"}
          </Text>
          <Text
            accessibilityRole="header"
            style={[common.title, { fontSize: 24, marginTop: 6 }]}
          >
            Mesa de batalha
          </Text>
        </View>
        <View style={common.row}>
          <Badge tone="orange">{`TURNO ${session.state.turn} · ${session.state.current === 0 ? "A" : "B"}`}</Badge>
          <Button variant="ghost" onPress={() => setSetup(true)}>
            Nova mesa
          </Button>
        </View>
      </View>
      <AssistantPanel session={session} side={perspective} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={[common.row, { gap: 8 }]}
      >
        <Button
          variant="secondary"
          onPress={() =>
            dispatch({
              type: "battle",
              action: { type: "draw", side: perspective, count: 1 },
            })
          }
        >
          Comprar 1
        </Button>
        <Button
          variant="secondary"
          icon={<Shuffle color={colors.muted} size={16} />}
          onPress={() =>
            dispatch({
              type: "battle",
              action: {
                type: "shuffle",
                side: perspective,
                order: shuffled(me.zones.deck, random32),
              },
            })
          }
        >
          Embaralhar
        </Button>
        <Button
          variant="secondary"
          onPress={() => setZone({ side: perspective, name: "deck" })}
        >
          Buscar no baralho
        </Button>
        <Button
          variant="secondary"
          disabled={!session.history.length}
          icon={<Undo2 size={17} color={colors.muted} />}
          onPress={() => {
            privacyClose();
            dispatch({ type: "undo" });
          }}
        >
          Desfazer
        </Button>
        <Button variant="secondary" onPress={() => setHistory(true)}>
          Histórico
        </Button>
      </ScrollView>
      {session.mode === "duo" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={common.row}
        >
          {!session.state.training?.bot && (
            <Button
              variant="secondary"
              onPress={() => control(perspective === 0 ? 1 : 0)}
            >{`Controlar lado ${perspective === 0 ? "B" : "A"}`}</Button>
          )}
          <Button
            variant="secondary"
            icon={
              session.state.study ? (
                <Eye size={16} color={colors.orange} />
              ) : (
                <EyeOff size={16} color={colors.muted} />
              )
            }
            onPress={() => {
              privacyClose();
              dispatch({
                type: "battle",
                action: { type: "study", value: !session.state.study },
              });
            }}
          >
            {session.state.study
              ? "Estudo: ambos revelados · ocultar"
              : "Revelar ambos para estudo"}
          </Button>
        </ScrollView>
      )}
      <View
        style={{
          flexDirection: wideTable ? "row" : "column",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {field(perspective)}
        {session.mode === "duo" &&
          (!phone || showOpponent || session.state.study) &&
          field(perspective === 0 ? 1 : 0)}
      </View>
      {session.mode === "duo" && phone && !session.state.study && (
        <Button
          variant="secondary"
          onPress={() => setShowOpponent(!showOpponent)}
        >
          {showOpponent
            ? "Recolher visualização adversária"
            : "Mostrar mesa adversária · mão permanece oculta"}
        </Button>
      )}
      {(() => {
        const stadium = [
          ...session.state.players[0].zones.stadium,
          ...session.state.players[1].zones.stadium,
        ][0];
        if (!stadium) return null;
        const known = visible(session, stadium, perspective);
        const card = session.definitions[session.instances[stadium]!.cardId]!;
        return (
          <View style={[common.panel, common.row, { padding: 12 }]}>
            <CardArt
              card={known ? card : undefined}
              hidden={!known}
              width={48}
              onPress={() => select(stadium)}
            />
            <View>
              <Text style={common.label}>ESTÁDIO COMPARTILHADO</Text>
              <Text style={common.body}>
                {known ? card.name : "Carta virada para baixo"}
              </Text>
            </View>
          </View>
        );
      })()}
      <View style={[common.panel, { gap: 12, padding: 14 }]}>
        <Text style={common.label}>
          AÇÕES UTILIZADAS · LADO {perspective === 0 ? "A" : "B"}
        </Text>
        <View style={[common.row, { flexWrap: "wrap", gap: 7 }]}>
          {(
            [
              { key: "energy", text: "Energia" },
              { key: "supporter", text: "Apoiador" },
              { key: "vstar", text: "VSTAR" },
              { key: "gx", text: "GX" },
              { key: "ace", text: "ACE SPEC" },
            ] as const
          ).map((item) => (
            <Button
              key={item.key}
              checked={me.used[item.key]}
              accessibilityLabel={`${item.text} do lado ${perspective === 0 ? "A" : "B"}: ${me.used[item.key] ? "usado" : "disponível"}`}
              variant="secondary"
              onPress={() =>
                dispatch({
                  type: "battle",
                  action: { type: "used", side: perspective, key: item.key },
                })
              }
            >{`${me.used[item.key] ? "●" : "○"} ${item.text}`}</Button>
          ))}
        </View>
        <Text style={[common.body, { fontSize: 11 }]}>
          Marcadores manuais. Próximo turno libera Energia, Apoiador e
          Habilidades do jogador que inicia; não compra carta. ACE SPEC pode ser
          reutilizada se recuperada por um efeito permitido.
        </Text>
        <View style={[common.row, { flexWrap: "wrap" }]}>
          <Button
            disabled={!!session.state.training?.bot}
            onPress={() => {
              const next =
                session.mode === "solo"
                  ? 0
                  : session.state.current === 0
                    ? 1
                    : 0;
              privacyClose();
              dispatch({ type: "battle", action: { type: "turn" } });
              if (session.mode === "duo") {
                setPerspective(next);
                if (!session.state.study) setCurtain(next);
              }
            }}
          >
            Próximo turno →
          </Button>
          <Button
            variant="secondary"
            onPress={() =>
              dispatch({
                type: "battle",
                action: {
                  type: "note",
                  text: `Moeda: ${random32() % 2 ? "Cara" : "Coroa"}`,
                },
              })
            }
          >
            Moeda · ver histórico
          </Button>
        </View>
      </View>
      <Button
        variant="secondary"
        onPress={() =>
          dispatch({
            type: "battle",
            action: {
              type: "bench-limit",
              side: perspective,
              limit: (me.benchLimit ?? 5) === 5 ? 8 : 5,
            },
          })
        }
      >{`Banco: ${me.benchLimit ?? 5} posições · ajustar manualmente`}</Button>
      <View
        style={[
          common.row,
          { flexWrap: "wrap", justifyContent: "space-between" },
        ]}
      >
        <ConfirmButton
          label="Recolher lado controlado"
          title="Recolher todas as cartas?"
          message="Todas as cartas deste lado voltarão ao baralho, sem embaralhar. Anexos, dano e condições serão limpos. É possível desfazer."
          onConfirm={() =>
            dispatch({
              type: "battle",
              action: { type: "collect", side: perspective },
            })
          }
        />
        <ConfirmButton
          label="Repetir mão inicial"
          title="Reiniciar o teste?"
          message="Substitui a sessão e seu histórico por uma nova preparação, com os mesmos decks: embaralhar, comprar 7 e separar 6 Prêmios."
          onConfirm={() => {
            privacyClose();
            start(
              deckSnapshot(session, 0),
              session.mode === "duo" ? deckSnapshot(session, 1) : null,
              !!session.state.training?.bot,
            );
            setPerspective(0);
          }}
        />
      </View>
      <Text
        accessibilityLiveRegion="polite"
        style={[common.body, { fontSize: 12 }]}
      >
        {session.history.at(-1)?.label ?? "Mesa preparada."}
      </Text>
      {zone && (
        <ZoneViewer
          key={`${zone.side}-${zone.name}`}
          session={session}
          side={zone.side}
          zone={zone.name}
          perspective={perspective}
          onClose={() => setZone(null)}
          select={(id, inspect) => select(id, inspect)}
        />
      )}
      {selected && session.instances[selected.id] && (
        <BattleCardActions
          key={selected.id}
          session={session}
          id={selected.id}
          perspective={perspective}
          inspect={selected.inspect}
          onClose={() => setSelected(null)}
          select={(id) => select(id, selected.inspect)}
          zoom={setZoom}
        />
      )}
      <CardDetails
        key={zoom?.id ?? "zoom"}
        card={zoom}
        onClose={() => setZoom(null)}
      />
      <Dialog
        open={history}
        title={`Histórico · ${session.history.length}/60 ações`}
        onClose={() => setHistory(false)}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 12 }}
        >
          <View style={common.row}>
            <TextInput
              accessibilityLabel="Anotação manual de efeito"
              placeholder="Anotar resolução manual de um efeito"
              placeholderTextColor={colors.muted}
              value={note}
              onChangeText={setNote}
              maxLength={200}
              style={[common.input, { flex: 1 }]}
            />
            <Button
              disabled={!note.trim()}
              onPress={() => {
                dispatch({
                  type: "battle",
                  action: { type: "note", text: note },
                });
                setNote("");
              }}
            >
              Anotar
            </Button>
          </View>
          <Text style={[common.body, { fontSize: 11 }]}>
            As anotações são compartilhadas entre os lados. Não anote
            informações que deseja manter ocultas.
          </Text>
          {[...session.history].reverse().map((entry, i) => (
            <View
              key={`${entry.at}-${i}`}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: colors.text, lineHeight: 22 }}>
                {entry.label}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                {new Date(entry.at).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Dialog>
    </View>
  );
}
const s = StyleSheet.create({
  deckChoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 52,
  },
  field: {
    backgroundColor: "#11232B",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  zoneButton: {
    minHeight: 44,
    paddingHorizontal: 11,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#1A303A",
    flexGrow: 1,
  },
  zoneLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#35505D",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
});
