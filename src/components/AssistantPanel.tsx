import React, { useState } from "react";
import { Text, View } from "react-native";
import { common, colors } from "../theme";
import { Button } from "./UI";
import { Session, Side } from "../battle/types";
import { useWorkspace } from "../workspace/Workspace";
import { defaultRules, printingKey } from "../assistants/profiles";
import { analyze, fingerprint, Plan } from "../assistants/planner";

export function AssistantPanel({
  session,
  side,
}: {
  session: Session;
  side: Side;
}) {
  const { dispatch } = useWorkspace();
  const [analysis, setAnalysis] = useState<{
    plans: Plan[];
    searched: number;
    stamp: string;
  } | null>(null);
  const t = session.state.training,
    bot = !!t?.bot;
  const coverage = Object.values(session.definitions).filter(
    (c) => !!defaultRules[printingKey(c)],
  ).length;
  const stale = !!analysis && analysis.stamp !== fingerprint(session);
  const run = (command: "begin" | "end" | "resume") =>
    dispatch({ type: "robot", command });
  return (
    <View style={[common.panel, { gap: 12, padding: 16 }]}>
      <Text style={common.label}>
        {bot ? "ADVERSÁRIO LOCAL + TREINADOR" : "TREINADOR DE JOGADAS"}
      </Text>
      <Text style={common.body}>
        Análise local por heurística · até 3 ações · {coverage}/
        {Object.keys(session.definitions).length} versões com perfil. Compara
        apenas ações implementadas; não garante a melhor jogada global. Efeitos
        adicionais exigem resolução manual.
      </Text>
      {bot && (
        <>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.green, lineHeight: 22 }}
          >
            {t?.winner !== undefined
              ? `Treino encerrado · vitória do lado ${t.winner === 0 ? "A" : "B"}`
              : !t?.started
                ? "Preparação: escolha seu Básico no Ativo. O robô escolhe o próprio Ativo. Sem Básico reconhecido, resolva o mulligan manualmente ou prepare outra mão."
                : t.checkup
                  ? "Checkup pendente: resolva as condições manualmente."
                  : session.state.current === 1
                    ? "Turno do robô · retome para jogar ou após uma intervenção manual."
                    : "Seu turno · a compra inicial é automática. Após atacar, encerre o turno."}
          </Text>
          <View style={[common.row, { flexWrap: "wrap" }]}>
            {!t?.started ? (
              <Button onPress={() => run("begin")}>
                Iniciar partida com robô
              </Button>
            ) : (
              <>
                <Button
                  disabled={
                    t?.winner !== undefined ||
                    session.state.current !== 0 ||
                    t.checkup
                  }
                  onPress={() => run("end")}
                >
                  Encerrar meu turno · robô joga
                </Button>
                <Button
                  variant="secondary"
                  disabled={t?.winner !== undefined || t.checkup}
                  onPress={() => run("resume")}
                >
                  Retomar partida assistida
                </Button>
              </>
            )}
            {t?.checkup && (
              <Button
                onPress={() =>
                  dispatch({
                    type: "battle",
                    action: {
                      type: "assist",
                      step: { kind: "checkup", side: 0 },
                      rules: defaultRules,
                    },
                  })
                }
              >
                Checkup resolvido · confirmar
              </Button>
            )}
            <Button
              variant="ghost"
              onPress={() =>
                dispatch({
                  type: "battle",
                  action: {
                    type: "assist",
                    step: { kind: "bot-off", side: 0 },
                    rules: defaultRules,
                  },
                })
              }
            >
              Continuar como mesa manual
            </Button>
          </View>
        </>
      )}
      <Button
        variant="secondary"
        disabled={
          session.state.current !== side || (bot && (!t?.started || side !== 0))
        }
        onPress={() =>
          setAnalysis({
            ...analyze(session, side, defaultRules),
            stamp: fingerprint(session),
          })
        }
      >
        Analisar minhas opções
      </Button>
      {analysis && (
        <>
          <Text accessibilityLiveRegion="polite" style={common.body}>
            {stale
              ? "A mesa mudou. Analise novamente para atualizar as sugestões."
              : `${analysis.searched} candidatos avaliados · ${analysis.plans.length ? "melhores sequências encontradas" : "nenhuma ação automatizada disponível; use os controles manuais"}.`}
          </Text>
          {analysis.plans.map((plan, index) => (
            <View
              key={index}
              style={{
                gap: 8,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 12,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "600",
                  lineHeight: 22,
                }}
              >
                {index + 1}. {plan.title}
              </Text>
              <Text style={common.body}>{plan.reason}</Text>
              <Button
                variant="secondary"
                disabled={stale}
                onPress={() =>
                  dispatch({ type: "plan", plan, expected: analysis.stamp })
                }
              >{`Aplicar sequência ${index + 1}`}</Button>
            </View>
          ))}
        </>
      )}
      <Text style={[common.body, { fontSize: 11 }]}>
        Conjunto inicial: linha Dragapult/Pidgeot da lista de exemplo, Energias
        Fogo/Psíquica e alguns Treinadores. Cartas identificadas por
        coleção/número. Confira a cobertura em ASSISTANTS.md no projeto.
        Histórico e desfazer incluem ações dos assistentes.
      </Text>
    </View>
  );
}
