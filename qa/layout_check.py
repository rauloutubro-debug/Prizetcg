import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
checks=[];errors=[]
with sync_playwright() as p:
 opts={'executable_path':'/usr/bin/chromium','headless':True,'args':['--no-sandbox']}
 ctx=p.chromium.launch_persistent_context(str(root/'browser-profile'),viewport={'width':320,'height':568},**opts)
 ctx.route('https://**/*',lambda route:route.abort());page=ctx.new_page();page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto('http://127.0.0.1:8081',wait_until='domcontentloaded',timeout=90000);page.get_by_role('tab',name='Configurações',exact=True).wait_for(timeout=90000)
 for title in ['Configurações','Meus Decks','Treinar']:
  page.get_by_role('tab',name=title,exact=True).click();page.wait_for_timeout(200)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),title+' 320px overflow'
  checks.append(title+' em 320×568 sem overflow horizontal')
 page.set_viewport_size({'width':810,'height':1080});page.wait_for_timeout(200)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');checks.append('Mesa em iPad 810×1080 sem overflow horizontal')
 assert not errors
 report={'checks':checks,'errors':errors};(root/'layout-report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False));print(json.dumps(report,ensure_ascii=False))
 ctx.close()
