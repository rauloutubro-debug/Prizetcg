import json,subprocess,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
fixture=json.loads(subprocess.check_output(['node','--import','tsx','--eval',"import {demoDeck} from './src/domain/demo.ts';import {initialWorkspace} from './src/workspace/model.ts';const w=initialWorkspace(demoDeck);w.decks=[{...w.decks[0],uid:'a',name:'Lista Alfa'},{...w.decks[0],uid:'b',name:'Lista Beta'}];console.log(JSON.stringify(w));"],cwd=root.parent,text=True))
checks=[];errors=[]
def check(ok,label):
 assert ok,label
 checks.append(label)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1024,'height':768});ctx.route('https://**/*',lambda r:r.abort());page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('if(!localStorage.getItem("@ptcgmap/workspace/v2"))localStorage.setItem("@ptcgmap/workspace/v2",'+json.dumps(json.dumps(fixture))+');')
 page.goto('http://127.0.0.1:8081',wait_until='domcontentloaded');page.get_by_role('tab',name='Treinar',exact=True).click()
 page.get_by_role('button',name='Contra robô',exact=True).click()
 radios=page.get_by_role('radio');radios.nth(3).click()
 check(radios.nth(0).get_attribute('aria-checked')=='true' and radios.nth(3).get_attribute('aria-checked')=='true','Seleciona listas independentes para jogador e adversário')
 page.get_by_role('button',name='Embaralhar e começar',exact=True).click();page.wait_for_timeout(400)
 def state():return page.evaluate("JSON.parse(localStorage.getItem('@ptcgmap/workspace/v2')).session")
 s=state();check(s['deckNames']==['Lista Alfa','Lista Beta'] and s['state']['training']['bot'],'Cria mesa real com a lista adversária selecionada e robô ativo')
 # Find a supported Basic in A's opening hand, restarting legal preparation if necessary.
 for attempt in range(12):
  basic=next((id for id in s['state']['players'][0]['zones']['hand'] if s['definitions'][s['instances'][id]['cardId']]['name'] in ['Dreepy','Pidgey','Rotom V','Lumineon V','Fezandipiti ex']),None)
  if basic and s['state']['players'][1]['zones']['active']:break
  page.get_by_role('button',name='Repetir mão inicial',exact=True).click();page.get_by_role('button',name='Confirmar',exact=True).click();page.wait_for_timeout(200);s=state()
 assert basic,'Opening hand did not yield a Basic'
 page.get_by_test_id('table-card-'+basic).click();page.get_by_role('button',name='Ativo',exact=True).click()
 page.get_by_role('button',name='Iniciar partida com robô',exact=True).click();page.wait_for_timeout(250);s=state()
 # The robot may require a manual mulligan if no Basic: make a fresh preparation instead of falsely passing.
 if not s['state']['training']['started']:
  raise AssertionError('Robot opening requires manual mulligan; rerun fixture for the full flow')
 check(s['state']['training']['drawnAt'][0]==1,'Iniciar partida compra exatamente a carta inicial do turno')
 page.get_by_role('button',name='Analisar minhas opções',exact=True).click();page.wait_for_timeout(100)
 check('candidatos avaliados' in page.locator('body').inner_text(),'Treinador apresenta análise real na interface')
 apply=page.get_by_role('button',name='Aplicar sequência 1',exact=True)
 if apply.count():
  before=len(s['history']);apply.click();page.wait_for_timeout(200);check(len(state()['history'])>before,'Aplica a sequência sugerida ao estado persistido')
 page.get_by_role('button',name='Encerrar meu turno · robô joga',exact=True).click();page.wait_for_timeout(400);s=state()
 check(s['state']['turn']>=3 or s['state']['training'].get('winner') is not None,'Adversário executa seu turno e devolve controle ao jogador')
 check(sum('usou' in h['label'] or 'ligada' in h['label'] or 'Banco' in h['label'] or 'Treinador' in h['label'] for h in s['history'])>0,'Histórico registra ações reais de jogo')
 page.get_by_role('button',name='Desfazer',exact=True).click();page.wait_for_timeout(200)
 restored=state();check(len(restored['history'])==len(s['history'])-1,'Desfazer não dispara o robô novamente')
 page.reload(wait_until='domcontentloaded');page.get_by_role('tab',name='Treinar',exact=True).click();page.wait_for_timeout(200)
 check(state()['state']==restored['state'],'Reabrir o site retoma estado do robô e da partida')
 for w,h in [(390,844),(320,568),(1366,1024),(810,1080)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(100);check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'Mesa e assistentes sem overflow em {w}×{h}')
 page.screenshot(path=str(root/'assistants-ipad.png'),full_page=True)
 check(not errors,'Sem exceções JavaScript no fluxo de treino')
 report={'checks':checks,'errors':errors};(root/'assistants-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));browser.close()
