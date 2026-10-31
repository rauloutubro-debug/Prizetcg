import React, { useState } from "react";
import { Platform, Share, Text, TextInput, View } from "react-native";
import { colors, common } from "../theme";
import { useWorkspace } from "../workspace/Workspace";
import { Button, Dialog } from "../components/UI";
export function SettingsScreen() {
  const { data, dispatch, saveStatus } = useWorkspace();
  const [backup, setBackup] = useState(false);
  const serialized = JSON.stringify(data, null, 2);
  function exportBackup() {
    if (Platform.OS === "web") {
      const url = URL.createObjectURL(
        new Blob([serialized], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "ptcgmap-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else
      Share.share({
        title: "PTCGMAP · backup de dados",
        message: serialized,
      }).catch(() => setBackup(true));
  }
  return (
    <View style={{ gap: 22 }}>
      <View>
        <Text style={common.label}>NO SEU RITMO</Text>
        <Text
          accessibilityRole="header"
          style={[common.title, { marginTop: 8 }]}
        >
          Configurações
        </Text>
      </View>
      <View style={[common.panel, { gap: 18 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Conexão e leitura
        </Text>
        <Text style={common.body}>
          O treino não depende de servidor. Somente a preparação de imagens do
          catálogo usa internet.
        </Text>
        <Button
          variant="secondary"
          onPress={() =>
            dispatch({
              type: "setting",
              key: "offline",
              value: !data.settings.offline,
            })
          }
        >
          {data.settings.offline
            ? "Modo offline ativo · desativar"
            : "Ativar modo offline · bloquear downloads"}
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            dispatch({
              type: "setting",
              key: "largeCards",
              value: !data.settings.largeCards,
            })
          }
        >
          {data.settings.largeCards
            ? "Cartas grandes ativas · usar compactas"
            : "Usar cartas maiores na mesa"}
        </Button>
        <Text style={common.body}>
          A interface acompanha o tamanho do texto do sistema. Cartas maiores
          aumentam a rolagem em telas menores.
        </Text>
      </View>
      <View style={[common.panel, { gap: 16 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Seus dados
        </Text>
        <Text accessibilityLiveRegion="polite" style={common.body}>
          {saveStatus}
        </Text>
        <Text style={common.body}>
          Decks, mesa, histórico e catálogo ficam neste aparelho. O histórico
          permite desfazer as últimas 60 ações. O backup contém dados e
          referências de imagens; arquivos de imagens não são incluídos. Em
          outro aparelho, prepare-os novamente.
        </Text>
        <Button variant="secondary" onPress={exportBackup}>
          Exportar dados em JSON
        </Button>
        <Button variant="ghost" onPress={() => setBackup(true)}>
          Ver e copiar backup
        </Button>
      </View>
      <View style={[common.panel, { gap: 12 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Fontes e limites
        </Text>
        <Text style={common.body}>
          Imagens: TCGdex (api.tcgdex.net / assets.tcgdex.net), resolvidas por
          coleção e número. A arte pertence aos titulares de Pokémon. As imagens
          do catálogo estão em inglês e podem ser substituídas por arquivos que
          você tem autorização para utilizar.
        </Text>
        <Text style={common.body}>
          O adversário e o treinador funcionam localmente com perfis por
          coleção/número. A análise compara sequências limitadas, sem garantir
          uma jogada ótima. Somente ataques e efeitos cadastrados são
          automatizados; mulligans, Checkup e efeitos restantes exigem resolução
          manual. O app não valida todas as regras nem a legalidade do formato.
        </Text>
        <Text style={common.body}>
          Projeto independente. Em torneios, consulte a organização sobre o uso
          de dispositivos e ferramentas de auxílio.
        </Text>
        <Text style={common.label}>PTCGMAP · 2.1.0</Text>
      </View>
      <Dialog
        open={backup}
        title="Backup dos dados locais"
        onClose={() => setBackup(false)}
      >
        <Text style={common.body}>
          Copie o JSON para guardar uma cópia. Os arquivos de imagem são
          separados.
        </Text>
        <TextInput
          accessibilityLabel="JSON do backup"
          multiline
          editable={false}
          selectTextOnFocus
          value={serialized}
          style={[common.input, { height: 300, marginTop: 16, fontSize: 11 }]}
        />
      </Dialog>
    </View>
  );
}
