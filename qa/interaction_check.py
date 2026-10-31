import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
checks=[];errors=[]
def check(ok,text):
 if not ok:raise AssertionError(text)
 checks.append(text)
with sync_playwright() as p:
 options={'executable_path':'/usr/bin/chromium','headless':True,'args':['--no-sandbox']}
 proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
 if proxy:options['proxy']={'server':proxy,'bypass':'localhost,127.0.0.1'}
 context=p.chromium.launch_persistent_context(str(root/'browser-profile'),viewport={'width':1366,'height':1024},**options)
 context.route('https://**/*',lambda route:route.abort())
 page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://127.0.0.1:8081',wait_until='domcontentloaded',timeout=90000)
 page.get_by_role('tab',name='Meus Decks',exact=True).wait_for(timeout=90000)
 def saved():
  page.wait_for_timeout(220)
  return page.evaluate("JSON.parse(localStorage.getItem('@ptcgmap/workspace/v2'))")
 before=saved()['session']
 page.get_by_role('tab',name='Meus Decks',exact=True).click()
 page.get_by_role('button',name='Editar Treino hotseat',exact=True).click()
 page.get_by_role('textbox',name='Nome do deck',exact=True).fill('Treino hotseat revisado')
 page.get_by_role('button',name='Salvar deck',exact=True).click()
 check(saved()['decks'][0]['name']=='Treino hotseat revisado','Edição de deck salva pela interface')
 check(saved()['session']==before,'Editar deck não altera a cópia da partida em andamento')
 page.reload(wait_until='domcontentloaded');page.get_by_role('tab',name='Meus Decks',exact=True).wait_for()
 page.get_by_role('tab',name='Meus Decks',exact=True).click()
 check(page.get_by_role('button',name='Abrir deck Treino hotseat revisado',exact=True).count()==1,'Nome editado persiste após recarregar')
 page.get_by_role('tab',name='Treinar',exact=True).click();page.get_by_text('Mesa de batalha',exact=True).wait_for()
 s=saved()['session'];base=s['state']['players'][0]['zones']['bench'][0]
 def search_card(name):
  page.get_by_role('button',name='Buscar no baralho',exact=True).click()
  page.get_by_role('textbox',name='Buscar carta nesta zona',exact=True).fill(name)
  page.get_by_role('dialog').last.get_by_role('button',name=re.compile(re.escape(name)+', .*ampliar')).first.click()
 def close_zone():page.get_by_role('button',name='Fechar',exact=True).last.click()
 energy=next(s['definitions'][s['instances'][id]['cardId']]['name'] for id in s['state']['players'][0]['zones']['deck'] if s['definitions'][s['instances'][id]['cardId']]['category']=='energy')
 search_card(energy)
 page.get_by_role('button',name='Como Energia',exact=True).click()
 page.get_by_role('button',name='Dreepy',exact=True).click();close_zone()
 s=saved()['session'];check(any(link['parent']==base and link['kind']=='energy' for link in s['state']['links'].values()),'Energia anexada no Pokémon pelo fluxo da mesa')
 page.get_by_test_id('table-card-'+base).click();page.get_by_role('button',name='Ativo',exact=True).click()
 page.get_by_test_id('table-card-'+base).click()
 page.get_by_role('button',name='+50',exact=True).click()
 page.get_by_role('checkbox',name='Envenenado: inativa',exact=True).click()
 page.get_by_role('button',name='Marcar Habilidade usada',exact=True).click();close_zone()
 s=saved()['session'];check(s['state']['marks'][base]['damage']==50 and s['state']['marks'][base]['conditions']==['Envenenado'] and s['state']['marks'][base]['ability'],'Dano, condição e Habilidade marcados na carta')
 search_card('Drakloak');page.get_by_role('button',name='Como evolução',exact=True).click();page.get_by_role('button',name='Dreepy',exact=True).click();close_zone()
 s=saved()['session'];top=s['state']['players'][0]['zones']['active'][0]
 check(top!=base and s['state']['links'][base]['parent']==top and s['state']['marks'][top]['damage']==50 and not s['state']['marks'][top]['conditions'],'Evolução empilha carta anterior, mantém dano e remove condições')
 page.get_by_role('button',name='Desfazer',exact=True).click()
 s=saved()['session'];check(s['state']['players'][0]['zones']['active'][0]==base and s['state']['marks'][base]['conditions']==['Envenenado'],'Desfazer evolução restaura pilha e marcadores')
 order=s['state']['players'][0]['zones']['deck'][:];page.get_by_role('button',name='Embaralhar',exact=True).click();s=saved()['session']
 check(sorted(order)==sorted(s['state']['players'][0]['zones']['deck']),'Embaralhar pela interface preserva todas as cópias')
 page.get_by_role('button',name='Estudo: ambos revelados · ocultar',exact=True).click()
 page.get_by_role('button',name='Abrir Prêmios do lado A, 6 cartas',exact=True).click()
 page.get_by_role('dialog').last.get_by_role('button',name='Carta oculta',exact=True).first.click()
 check(page.get_by_role('dialog',name='Carta oculta',exact=True).count()==1,'Prêmio desconhecido não expõe identidade no painel de ação')
 page.get_by_role('button',name='Virar para cima',exact=True).click()
 check(page.get_by_role('dialog',name='Carta oculta',exact=True).count()==0,'Virar um Prêmio revela a carta explicitamente')
 page.get_by_role('button',name='Mão',exact=True).click();close_zone()
 check(len(saved()['session']['state']['players'][0]['zones']['prizes'])==5,'Retirada manual de um Prêmio para a mão')
 page.get_by_role('button',name='Desfazer',exact=True).click();check(len(saved()['session']['state']['players'][0]['zones']['prizes'])==6,'Desfazer devolve Prêmio à posição anterior')
 page.get_by_role('button',name='Nova mesa',exact=True).click()
 page.get_by_role('button',name='Treino solo',exact=True).click()
 page.get_by_role('button',name='Embaralhar e começar',exact=True).click()
 s=saved()['session'];check(s['mode']=='solo' and len(s['instances'])==60 and len(s['state']['players'][0]['zones']['hand'])==7,'Treino solo funcional com uma lista de 60 cópias')
 page.get_by_role('button',name='Banco: 5 posições · ajustar manualmente',exact=True).click()
 check(saved()['session']['state']['players'][0]['benchLimit']==8,'Ajuste manual do limite de Banco pela interface')
 check(not errors,'Sem exceções JavaScript nos fluxos avançados')
 report={'checks':checks,'errors':errors};(root/'interaction-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
 context.close()
