import json,os,re,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
code="""import { demoDeck } from './src/domain/demo.ts'; import { newMatch } from './src/domain/match.ts'; const match=newMatch(); match.turn=4; match.slots[0].damage=120; match.slots[0].abilityUsed=true; match.once.vstar=true; match.outside[demoDeck.cards[0].id]=2; console.log(JSON.stringify({version:1,deck:{...demoDeck,name:'Deck preservado v1'},match}));"""
fixture=json.loads(subprocess.check_output(['node','--import','tsx','--eval',code],cwd=root.parent,text=True))
checks=[];errors=[]
def check(ok,label):
 if not ok:raise AssertionError(label)
 checks.append(label)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1024,'height':768});ctx.route('https://**/*',lambda route:route.abort())
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('if(location.origin==="http://127.0.0.1:8081"&&!localStorage.getItem("@prizecheck/state/v1"))localStorage.setItem("@prizecheck/state/v1",'+json.dumps(json.dumps(fixture))+');')
 page.goto('http://127.0.0.1:8081',wait_until='domcontentloaded',timeout=90000)
 page.get_by_role('tab',name='Meus Decks',exact=True).wait_for(timeout=90000);page.wait_for_timeout(300)
 data=page.evaluate("JSON.parse(localStorage.getItem('@ptcgmap/workspace/v2'))")
 old=page.evaluate("JSON.parse(localStorage.getItem('@prizecheck/state/v1'))")
 check(data['decks'][0]['name']=='Deck preservado v1' and data['decks'][0]['raw']==fixture['deck']['raw'],'Migração real na inicialização copia a lista do armazenamento v1')
 check(old['match']==fixture['match'],'Marcadores antigos preservados após inicializar v2')
 page.get_by_role('button',name='Rastrear Prêmios',exact=True).click()
 check('2 / 54' in page.locator('body').inner_text(),'Rastreador abre com a conferência anterior')
 page.get_by_role('tab',name='Início',exact=True).click();page.get_by_role('button',name='Dano, condições e moeda',exact=True).click()
 check(page.get_by_text('120',exact=True).count()>0,'Ferramenta anterior mantém o dano registrado')
 check(page.get_by_role('checkbox',name=re.compile('VSTAR')).get_attribute('aria-checked')=='true' and 'Poder usado' in page.get_by_role('checkbox',name=re.compile('VSTAR')).inner_text(),'Recurso VSTAR anterior permanece utilizado')
 page.reload(wait_until='domcontentloaded');page.get_by_role('tab',name='Meus Decks',exact=True).wait_for()
 page.wait_for_timeout(200)
 check(len(page.evaluate("JSON.parse(localStorage.getItem('@ptcgmap/workspace/v2')).decks"))==1,'Retomada não duplica o deck migrado')
 ctx.close()
 ctx=browser.new_context(viewport={'width':390,'height':844});page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script('if(location.origin==="http://127.0.0.1:8081")localStorage.setItem("@ptcgmap/workspace/v2","{broken");')
 page.goto('http://127.0.0.1:8081',wait_until='domcontentloaded',timeout=90000)
 page.get_by_role('alert').wait_for(timeout=90000);page.get_by_role('tab',name='Configurações',exact=True).click()
 check(page.get_by_text('Sessão temporária',exact=True).count()>0,'Dados ilegíveis entram em modo temporário com aviso claro')
 page.wait_for_timeout(400)
 check(page.evaluate("localStorage.getItem('@ptcgmap/workspace/v2')")=='{broken','Inicialização com erro não sobrescreve o registro existente')
 check(not errors,'Sem exceções JavaScript nos cenários de migração e recuperação')
 report={'checks':checks,'errors':errors};(root/'startup-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
 browser.close()
