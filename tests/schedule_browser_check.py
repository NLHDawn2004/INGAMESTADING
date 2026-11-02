from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
import json,copy

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
 page.wait_for_function("document.querySelector('.heading-actions .primary')?.disabled === false")
 snapshot=context.request.get(base+'/api/state').json()
 original=copy.deepcopy(snapshot['state'])
 overlay=browser.new_page(viewport={'width':1920,'height':1080})
 overlay.on('pageerror',lambda e:errors.append(str(e)))
 def read():return context.request.get(base+'/api/state').json()['state']
 def save(s):
  s['revision']=read()['revision']
  r=context.request.put(base+'/api/state',data=json.dumps({'state':s,'revision':s['revision']}),headers={'Content-Type':'application/json'})
  assert r.status==200,r.text()
 def ready_ui():
  page.reload(wait_until='networkidle')
  page.wait_for_function("document.querySelector('.heading-actions .primary')?.disabled === false")
 def wait_revision(rev):
  page.wait_for_function("document.querySelector('.heading-actions .primary').disabled === false")
  page.wait_for_timeout(300)
  assert read()['revision']>rev
 try:
  clean=copy.deepcopy(original)
  clean['matchLimit']='unlimited';clean['windowStart']=0
  clean['matches']=clean['matches'][:5]
  for i,m in enumerate(clean['matches']):m.update(status='ready' if i==0 else 'locked',winner='')
  clean['teams'].append({'id':'qa-schedule','name':'QA SCHEDULE','logo':''})
  # Test that even saved legacy title/logo/background settings cannot leak into
  # the default transparent OBS source.
  clean['theme'].update(showTitle=True,showFooter=True,logo='/maps/Bermuda.webp',background='/maps/Solara.webp',useBackground=True,showUnlimited=True)
  save(clean);ready_ui()
  overlay.goto(base+'/overlay?token='+snapshot['token'])
  overlay.wait_for_selector('.map-card')
  assert overlay.locator('.map-card').count()==5
  assert overlay.locator('.unlimited-card').count()==1
  assert overlay.locator('.brand-row,.broadcast-heading,.broadcast-footer,.kv-layer').count()==0
  assert overlay.evaluate('getComputedStyle(document.body).backgroundColor')=='rgba(0, 0, 0, 0)'
  page.get_by_role('button',name='Thêm trận',exact=True).click()
  page.wait_for_function("document.querySelectorAll('.match-row').length===6")
  page.get_by_role('button',name='Hoàn tác thao tác vừa rồi').click()
  page.wait_for_function("document.querySelectorAll('.match-row').length===5")
  for limit in [6,8,10]:
   save(clean);ready_ui()
   page.get_by_label('Số trận',exact=True).select_option(str(limit))
   page.wait_for_function(f"document.querySelectorAll('.match-row').length==={limit}")
   scheduled=read();maps=[m['map'] for m in scheduled['matches']]
   overlay.wait_for_function("document.querySelectorAll('.map-card').length===6&&document.querySelectorAll('.unlimited-card').length===0")
   assert page.get_by_role('button',name='Thêm trận',exact=True).is_disabled()
   ready_ui();assert [m['map'] for m in read()['matches']]==maps
   # Exercise the actual UI from match 6 through completion / next page.
   for i,m in enumerate(scheduled['matches']):m.update(status='finished' if i<5 else 'ready' if i==5 else 'locked',winner='qa-schedule' if i<5 else '')
   save(scheduled);ready_ui()
   page.locator('.live-buttons').get_by_role('button',name='Bắt đầu trận',exact=True).click()
   page.get_by_role('button',name='Kết thúc & chọn BOOYAH').wait_for(state='visible')
   page.wait_for_function("!document.querySelector('.winner-button').disabled")
   page.get_by_role('button',name='Kết thúc & chọn BOOYAH').click()
   page.locator('.modal select').select_option('qa-schedule')
   page.get_by_role('button',name='Công bố BOOYAH',exact=True).click()
   page.locator('.modal').wait_for(state='hidden')
   next_button=page.get_by_role('button',name='Chuẩn bị trận tiếp theo',exact=True)
   if limit==6:
    assert next_button.is_disabled()
    assert 'ĐÃ ĐỦ 6 TRẬN' in page.locator('.current-match').inner_text()
    overlay.wait_for_function("document.querySelectorAll('.status-finished').length===6")
    overlay.wait_for_timeout(500)
    overlay.screenshot(path='outputs/overlay-6-transparent.png',omit_background=True)
   else:
    next_button.click()
    page.wait_for_function("document.querySelector('.current-match h3').textContent==='TRẬN 07'")
    overlay.wait_for_function(f"document.querySelectorAll('.map-card').length==={limit-6}&&document.querySelector('.match-number').textContent==='07'")
    assert [int(x) for x in overlay.locator('.match-number').all_text_contents()]==list(range(7,limit+1))
    assert [m['map'] for m in read()['matches']]==maps
    assert page.locator('.schedule-footer select').input_value()=='1'
    widths=overlay.locator('.map-card').evaluate_all('(els)=>els.map(e=>e.getBoundingClientRect().width)')
    assert all(270<w<290 for w in widths),widths
    page.get_by_role('button',name='Hoàn tác thao tác vừa rồi').click()
    overlay.wait_for_function("document.querySelectorAll('.map-card').length===6")
    # Direct row preparation must also switch to the second page.
    ready_ui()
    page.locator('.match-row').nth(6).get_by_title('Chuẩn bị trận này').click()
    overlay.wait_for_function(f"document.querySelectorAll('.map-card').length==={limit-6}")
    overlay.wait_for_timeout(500)
    overlay.screenshot(path=f'outputs/overlay-{limit}-page2.png',omit_background=True)
   page.screenshot(path=f'outputs/schedule-{limit}.png',full_page=True)
  alpha=Image.open('outputs/overlay-6-transparent.png').convert('RGBA')
  assert alpha.getpixel((50,50))[3]==0
  assert alpha.getpixel((960,1000))[3]==0
  assert alpha.getpixel((200,500))[3]>0
  # Optional static KV source stays separate from transparent source.
  overlay.goto(base+'/overlay?token='+snapshot['token']+'&background=1')
  overlay.wait_for_selector('.kv-layer')
  page.get_by_role('button',name='Giao diện & KV',exact=True).click()
  assert page.get_by_text('Tiêu đề overlay',exact=True).count()==0
  assert page.locator('.preview-canvas .kv-layer').count()==1
  page.screenshot(path='outputs/theme-updated.png',full_page=True)
  page.set_viewport_size({'width':390,'height':844})
  page.get_by_role('button',name='Lịch thi đấu',exact=True).click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path='outputs/schedule-mobile-updated.png',full_page=True)
  assert not errors,errors
  print('PASS: modes 6/8/10, saved random maps, completion, next/direct preparation 6→7, full second page, undo, unlimited append, alpha transparency, separate KV, mobile, no browser errors')
 finally:
  save(original)
  browser.close()
