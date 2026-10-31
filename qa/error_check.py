import json,re,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
code="""import {demoDeck} from './src/domain/demo.ts'; import {initialWorkspace} from './src/workspace/model.ts'; import {createSession,execute} from './src/battle/engine.ts'; const w=initialWorkspace(demoDeck);let s=createSession(demoDeck,null,'errors'); const id=Object.keys(s.instances)[0]; w.session=execute(s,{type:'move',id,zone:'active'}).session;console.log(JSON.stringify(w));"""
fixture=subprocess.check_output(['node','--import','tsx','--eval',code],cwd=root.parent,text=True).strip()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context();c.route('https://**/*',lambda r:r.abort());page=c.new_page()
 page.add_init_script('if(location.origin==="http://127.0.0.1:8081"&&!localStorage.getItem("@ptcgmap/workspace/v2"))localStorage.setItem("@ptcgmap/workspace/v2",'+json.dumps(fixture)+');')
 page.goto('http://127.0.0.1:8081',wait_until='domcontentloaded',timeout=90000);page.get_by_role('tab',name='Treinar',exact=True).wait_for(timeout=90000);page.get_by_role('tab',name='Treinar',exact=True).click()
 page.get_by_role('button',name='Buscar no baralho',exact=True).click();page.get_by_role('textbox',name='Buscar carta nesta zona',exact=True).fill('Drakloak')
 page.get_by_role('dialog').get_by_role('button',name=re.compile('Drakloak, TWM 129, ampliar')).first.click();page.get_by_role('button',name='Ativo',exact=True).click()
 message=page.get_by_role('dialog').get_by_role('alert');message.wait_for();assert 'Ativo já ocupado' in message.inner_text()
 state=page.evaluate("JSON.parse(localStorage.getItem('@ptcgmap/workspace/v2')).session")
 assert len(state['state']['players'][0]['zones']['deck'])==59 and len(state['state']['players'][0]['zones']['active'])==1
 page.get_by_role('dialog').get_by_role('button',name='Entendi',exact=True).click()
 page.get_by_role('dialog').get_by_role('button',name=re.compile('Drakloak, TWM 129, ampliar')).first.click();page.get_by_role('button',name='Banco',exact=True).click();page.wait_for_timeout(250)
 state=page.evaluate("JSON.parse(localStorage.getItem('@ptcgmap/workspace/v2')).session")
 assert len(state['state']['players'][0]['zones']['bench'])==1 and len(state['instances'])==60
 report={'checks':['Erro de capacidade é exibido dentro do diálogo ativo com instrução','Ação recusada mantém carta e Ativo nas posições anteriores','Usuário consegue resolver o erro e mover para o Banco'],'errors':[]}
 (root/'error-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report,ensure_ascii=False));b.close()
