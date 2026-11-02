from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
import copy,json

base='http://127.0.0.1:5183'
password=next(x.split(': ',1)[1] for x in Path(r'C:\Users\hct19\Downloads\Overlay-Studio-login.txt').read_text(encoding='utf-8').splitlines() if x.startswith('Mật khẩu: '))
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 context=browser.new_context(viewport={'width':1440,'height':1100})
 page=context.new_page();errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/login',wait_until='networkidle')
 page.locator('input').fill(password)
 page.get_by_role('button',name='Vào trang điều khiển').click()
 page.wait_for_function("document.querySelector('.heading-actions .primary')?.disabled===false")
 snapshot=context.request.get(base+'/api/state').json();original=copy.deepcopy(snapshot['state'])
 def read():return context.request.get(base+'/api/state').json()['state']
 def save(s):
  s['revision']=read()['revision']
  r=context.request.put(base+'/api/state',data=json.dumps({'state':s,'revision':s['revision']}),headers={'Content-Type':'application/json'})
  assert r.status==200,r.text()
 def ready():
  page.reload(wait_until='networkidle')
  page.wait_for_function("document.querySelector('.heading-actions .primary')?.disabled===false")
 overlay=browser.new_page(viewport={'width':1920,'height':1080})
 overlay.on('pageerror',lambda e:errors.append(str(e)))
 try:
  s=copy.deepcopy(original);s['matchLimit']=10;s['windowStart']=0
  s['theme']['useBackground']=False;s['theme']['showUnlimited']=True
  s['teams'].append({'id':'qa-reveal','name':'QA REVEAL','logo':''})
  names=['Bermuda','Purgatory','Kalahari','NexTerra','Solara']
  s['matches']=[{'id':f'qa-reveal-{i}', 'map':names[i%5],'status':'locked','winner':'','position':50,'revealAt':0} for i in range(10)]
  s['matches'][5]['map']='Solara'
  save(s);ready()
  url=base+'/overlay?token='+snapshot['token']
  overlay.goto(url)
  overlay.wait_for_selector('.mystery-card')
  assert overlay.locator('.map-photo').count()==5
  assert overlay.locator('.map-card').nth(5).locator('.map-photo').count()==0
  assert overlay.locator('.map-card').nth(5).locator('.map-label').inner_text()=='? RANDOM'
  assert overlay.locator('.map-card').nth(5).locator('.mystery-question').inner_text()=='?'
  assert overlay.locator('.map-card').nth(5).locator('.lock-icon').evaluate("e=>getComputedStyle(e).animationName")=='lock-jiggle'
  transforms=overlay.evaluate("""async()=>{const el=document.querySelector('.mystery-card .lock-icon');let result=[];for(let i=0;i<15;i++){result.push(getComputedStyle(el).transform);await new Promise(r=>setTimeout(r,120));}return result;}""")
  assert len(set(transforms))>2,transforms
  overlay.screenshot(path='outputs/mystery-first-page.png',omit_background=True)
  page.locator('.schedule-footer select').select_option('1')
  overlay.wait_for_function("document.querySelectorAll('.mystery-card').length===4")
  assert overlay.locator('.map-photo').count()==0
  assert overlay.locator('.map-label').all_text_contents()==['? RANDOM']*4
  overlay.wait_for_timeout(500)
  overlay.screenshot(path='outputs/mystery-second-page.png',omit_background=True)
  # Complete the first five to prepare match 6 through the actual admin UI.
  s=read();s['windowStart']=0
  for m in s['matches'][:5]:m.update(status='finished',winner='qa-reveal')
  save(s);ready()
  page.get_by_role('button',name='Chuẩn bị trận tiếp theo',exact=True).click()
  overlay.wait_for_selector('.is-revealing')
  started=read()['matches'][5]['revealAt'];assert started>0
  overlay.screenshot(path='outputs/mystery-roulette.png',omit_background=True)
  # A second viewer joins mid-reveal; it must finish at the same stored deadline.
  second=browser.new_page(viewport={'width':1920,'height':1080})
  second.goto(url)
  second.wait_for_selector('.is-revealing')
  frames=overlay.evaluate("""async()=>{let seen=[];const until=Date.now()+4700;while(Date.now()<until){const card=document.querySelectorAll('.map-card')[5];seen.push(card.querySelector('.map-photo')?.alt);await new Promise(r=>setTimeout(r,50));}return [...new Set(seen)];}""")
  assert len(frames)>=4,frames
  overlay.wait_for_function("document.querySelectorAll('.is-revealing').length===0")
  second.wait_for_function("document.querySelectorAll('.is-revealing').length===0",timeout=1500)
  for tab in [overlay,second]:assert tab.locator('.map-card').nth(5).locator('.map-photo').get_attribute('alt')=='Solara'
  assert read()['matches'][5]['map']=='Solara'
  assert read()['matches'][5]['revealAt']==started
  overlay.screenshot(path='outputs/mystery-revealed.png',omit_background=True)
  overlay.reload();overlay.wait_for_selector('.status-ready .map-photo')
  assert overlay.locator('.is-revealing').count()==0
  # Undo returns the card to a truly hidden state; preparing again starts a fresh reveal.
  page.get_by_role('button',name='Hoàn tác thao tác vừa rồi').click()
  overlay.wait_for_selector('.mystery-card')
  assert overlay.locator('.map-card').nth(5).locator('.map-photo').count()==0
  page.wait_for_function("!document.querySelector('.live-buttons .secondary').disabled")
  page.get_by_role('button',name='Chuẩn bị trận tiếp theo',exact=True).click()
  overlay.wait_for_selector('.is-revealing')
  assert read()['matches'][5]['revealAt']>started
  overlay.wait_for_function("document.querySelectorAll('.is-revealing').length===0")
  assert overlay.locator('.map-card').nth(5).locator('.map-photo').get_attribute('alt')=='Solara'
  # Unlimited schedules also hide all maps after the known first five.
  s=read();s['matchLimit']='unlimited';s['windowStart']=5
  for m in s['matches'][5:]:m.update(status='locked',revealAt=0)
  save(s)
  overlay.wait_for_function("document.querySelectorAll('.mystery-card').length===5")
  assert overlay.locator('.map-photo').count()==0
  assert overlay.locator('.unlimited-card').count()==1
  alpha=Image.open('outputs/mystery-second-page.png').convert('RGBA')
  assert alpha.getpixel((50,50))[3]==0
  page.set_viewport_size({'width':390,'height':844});ready()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print('PASS: 5 known maps, mystery 6+, no hidden map image/label, moving locks, all-map roulette, preselected result, concurrent viewers, reload no replay, undo/retrigger, unlimited mysteries, alpha, mobile')
 finally:
  save(original);browser.close()
