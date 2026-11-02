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
 page.goto(base+'/login',wait_until='networkidle');page.locator('input').fill(password)
 page.get_by_role('button',name='Vào trang điều khiển').click()
 page.wait_for_function("document.querySelector('.heading-actions .primary')?.disabled===false")
 original=context.request.get(base+'/api/state').json();snapshot=copy.deepcopy(original['state'])
 overlay=browser.new_page(viewport={'width':1920,'height':1080});overlay.on('pageerror',lambda e:errors.append(str(e)))
 url=base+'/overlay?token='+original['token']
 def read():return context.request.get(base+'/api/state').json()['state']
 def save(s):
  s['revision']=read()['revision'];r=context.request.put(base+'/api/state',data=json.dumps({'state':s,'revision':s['revision']}),headers={'Content-Type':'application/json'})
  assert r.status==200,r.text()
 def ready():
  page.reload(wait_until='networkidle');page.wait_for_function("document.querySelector('.heading-actions .primary')?.disabled===false")
 def fixture(count,mode):
  s=copy.deepcopy(snapshot);s.update(matchLimit=mode,windowStart=0,rushEnded=False,recapView='auto',recapAt=0)
  s['theme']['useBackground']=False
  s['teams']=[{'id':'qa-a','name':'BTEC ESPORTS','logo':'/maps/Bermuda.webp'},{'id':'qa-b','name':'SA00 ESPORTS','logo':''}]
  names=['Bermuda','Purgatory','Kalahari','NexTerra','Solara']
  s['matches']=[{'id':f'qa-recap-{i}','map':names[i%5],'status':'finished','winner':'qa-a' if i%2==0 else 'qa-b','position':50,'revealAt':0} for i in range(count)]
  return s
 def verify_cards(expected):
  assert overlay.locator('.recap-card').count()==len(expected)
  for i,m in enumerate(expected):
   card=overlay.locator('.recap-card').nth(i)
   assert card.locator('.map-photo').get_attribute('alt')==m['map']
   assert card.locator('.winner').inner_text()==('BTEC ESPORTS' if m['winner']=='qa-a' else 'SA00 ESPORTS')
   assert card.locator('.winner-logo').count()==(1 if m['winner']=='qa-a' else 0)
   assert card.locator('.booyah').inner_text()=='BOOYAH!'
   assert card.locator('.map-photo').evaluate('e=>e.complete&&e.naturalWidth>0')
   assert card.evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=1920&&r.top>=0&&r.bottom<=1080}')
 try:
  overlay.goto(url)
  for count in [6,8,10]:
   s=fixture(count,count);s['matches'][-1].update(status='ready',winner='')
   save(s);ready()
   overlay.wait_for_selector('.map-line');assert overlay.locator('.recap-grid').count()==0
   page.locator('.live-buttons').get_by_role('button',name='Bắt đầu trận',exact=True).click()
   page.wait_for_function("!document.querySelector('.winner-button').disabled")
   page.get_by_role('button',name='Kết thúc & chọn BOOYAH').click()
   page.locator('.modal select').select_option('qa-b');page.get_by_role('button',name='Công bố BOOYAH',exact=True).click()
   overlay.wait_for_selector('.recap-grid');overlay.wait_for_timeout(600)
   verify_cards(read()['matches']);assert overlay.locator('.mystery-card,.is-revealing,.unlimited-card').count()==0
   assert page.get_by_role('button',name='Quay lại màn lịch',exact=True).is_visible()
   bounds=overlay.locator('.recap-card').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return {top:r.top,height:r.height};})')
   assert all(abs(r['top']-420)<1 and abs(r['height']-490)<1 for r in bounds),bounds
   assert len(set(r['top'] for r in bounds))==1
   overlay.screenshot(path=f'outputs/recap-{count}.png',omit_background=True)
   # Recap persists on reload and undoing the final result restores match view.
   overlay.reload();overlay.wait_for_selector('.recap-grid');verify_cards(read()['matches'])
   page.get_by_role('button',name='Hoàn tác thao tác vừa rồi').click();overlay.wait_for_selector('.map-line')
   assert overlay.locator('.recap-grid').count()==0
   # A completed legacy fixture also automatically shows all results.
   s=fixture(count,count);save(s);ready();overlay.wait_for_selector('.recap-grid')
   page.get_by_role('button',name='Quay lại màn lịch',exact=True).click();overlay.wait_for_selector('.map-line')
   page.get_by_role('button',name='Chiếu màn tổng kết',exact=True).click();overlay.wait_for_selector('.recap-grid')
  # Champion Rush has unplayed slots: only its finished results appear.
  s=fixture(10,'unlimited')
  for m in s['matches'][8:]:m.update(status='locked',winner='')
  save(s);ready();overlay.wait_for_selector('.map-line')
  page.get_by_role('button',name='Kết thúc Champion Rush & tổng kết',exact=True).click()
  overlay.wait_for_selector('.recap-grid');overlay.wait_for_timeout(600)
  verify_cards(s['matches'][:8]);overlay.screenshot(path='outputs/recap-champion-rush.png',omit_background=True)
  assert page.get_by_role('button',name='Thêm trận',exact=True).is_disabled()
  page.get_by_role('button',name='Tiếp tục Champion Rush',exact=True).click();overlay.wait_for_selector('.map-line')
  assert not page.get_by_role('button',name='Thêm trận',exact=True).is_disabled()
  # Long Champion Rush summaries rotate through every result, retaining numbers.
  s=fixture(25,'unlimited');save(s);ready()
  page.get_by_role('button',name='Kết thúc Champion Rush & tổng kết',exact=True).click()
  overlay.wait_for_selector('.recap-grid');assert overlay.locator('.recap-grid').get_attribute('data-pages')=='3'
  overlay.wait_for_function("document.querySelectorAll('.recap-card').length===10")
  verify_cards(s['matches'][:10]);overlay.wait_for_timeout(500)
  overlay.screenshot(path='outputs/recap-rush-25-page1.png',omit_background=True)
  overlay.wait_for_function("document.querySelector('.recap-grid').dataset.page==='2'",timeout=15000)
  verify_cards(s['matches'][10:20]);assert overlay.locator('.recap-number').first.inner_text()=='TRẬN 11'
  overlay.wait_for_function("document.querySelector('.recap-grid').dataset.page==='3'",timeout=15000)
  verify_cards(s['matches'][20:]);assert overlay.locator('.recap-number').first.inner_text()=='TRẬN 21'
  alpha=Image.open('outputs/recap-10.png').convert('RGBA');assert alpha.getpixel((50,50))[3]==0
  assert alpha.getpixel((960,1000))[3]==0
  page.set_viewport_size({'width':390,'height':844});ready();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print('PASS: auto recap 6/8/10, every map/winner/logo, actual final result, undo/reload, schedule/summary toggle, Champion Rush end/resume, exclude unplayed slots, 25-match rotation, alpha, mobile')
 finally:
  save(snapshot);browser.close()
