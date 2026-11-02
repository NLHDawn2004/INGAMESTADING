from playwright.sync_api import sync_playwright
import json
from pathlib import Path
password=next(x.split(': ',1)[1] for x in Path(r'C:\Users\hct19\Downloads\Overlay-Studio-login.txt').read_text(encoding='utf-8').splitlines() if x.startswith('Mật khẩu: '))
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 context=browser.new_context(viewport={'width':1440,'height':1100},device_scale_factor=1)
 page=context.new_page()
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5183/login',wait_until='networkidle')
 page.locator('input').fill(password)
 page.get_by_role('button',name='Vào trang điều khiển').click()
 page.wait_for_selector('.schedule-panel')
 page.wait_for_selector('.schedule-panel')
 page.wait_for_function("document.querySelector('.heading-actions .primary').disabled === false")
 page.screenshot(path='outputs/admin-desktop.png',full_page=True)
 state=context.request.get('http://127.0.0.1:5183/api/state').json()
 print('INITIAL',state['state']['revision'])
 read=browser.new_context(viewport={'width':1920,'height':1080})
 overlay=read.new_page()
 overlay.goto('http://127.0.0.1:5183/overlay?token='+state['token'])
 overlay.wait_for_selector('.map-card')
 assert overlay.locator('.map-card').count()==5
 assert overlay.evaluate("getComputedStyle(document.body).backgroundColor")=='rgba(0, 0, 0, 0)'
 page.get_by_role('button',name='Đội tham gia',exact=True).click()
 page.get_by_placeholder('Nhập tên đội, ví dụ: SA00 ESPORTS').fill('QA TEST TEAM')
 page.get_by_role('button',name='Thêm đội',exact=True).click()
 page.wait_for_selector('.team-row')
 page.get_by_role('button',name='Bắt đầu trận',exact=True).click()
 overlay.wait_for_selector('.status-live')
 page.get_by_role('button',name='Kết thúc & chọn BOOYAH').click()
 page.locator('.modal select').select_option(label='QA TEST TEAM')
 page.get_by_role('button',name='Công bố BOOYAH',exact=True).click()
 overlay.wait_for_selector('.status-finished')
 assert overlay.locator('.winner').inner_text()=='QA TEST TEAM'
 page.get_by_role('button',name='Chuẩn bị trận tiếp theo',exact=True).click()
 overlay.wait_for_selector('.status-ready')
 assert overlay.locator('.status-ready .map-photo').get_attribute('alt')=='Purgatory'
 page.get_by_role('button',name='Hoàn tác thao tác vừa rồi',exact=True).click()
 overlay.wait_for_function("document.querySelectorAll('.status-ready').length === 0")
 page.reload(wait_until='networkidle')
 page.wait_for_function("document.querySelector('.heading-actions .primary').disabled === false")
 assert page.locator('.match-row').first.locator('.has-winner').inner_text()=='QA TEST TEAM'
 stale=context.request.get('http://127.0.0.1:5183/api/state').json()['state']
 saved=context.request.put('http://127.0.0.1:5183/api/state',data=json.dumps({'state':stale,'revision':stale['revision']}),headers={'Content-Type':'application/json'})
 assert saved.status==200
 conflict=context.request.put('http://127.0.0.1:5183/api/state',data=json.dumps({'state':stale,'revision':stale['revision']}),headers={'Content-Type':'application/json'})
 assert conflict.status==409
 assert read.request.get('http://127.0.0.1:5183/api/state').status==401
 assert read.request.get('http://127.0.0.1:5183/api/overlay?token=invalid').status==403
 fresh=context.request.get('http://127.0.0.1:5183/api/state').json()['state']
 fresh['teams']=[]
 for i,m in enumerate(fresh['matches']):m['status']='ready' if i==0 else 'locked';m['winner']=''
 fresh['windowStart']=0
 assert context.request.put('http://127.0.0.1:5183/api/state',data=json.dumps({'state':fresh,'revision':fresh['revision']}),headers={'Content-Type':'application/json'}).status==200
 page.reload(wait_until='networkidle')
 page.wait_for_function("document.querySelector('.heading-actions .primary').disabled === false")
 page.screenshot(path='outputs/admin-desktop.png',full_page=True)
 overlay.wait_for_selector('.status-ready')
 overlay.screenshot(path='outputs/overlay-transparent.png',omit_background=True)
 page.get_by_role('button',name='Giao diện & KV',exact=True).click()
 page.screenshot(path='outputs/theme-desktop.png',full_page=True)
 page.set_viewport_size({'width':390,'height':844})
 page.get_by_role('button',name='Lịch thi đấu',exact=True).click()
 page.screenshot(path='outputs/admin-mobile.png',full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Mobile overflow'
 print('BROWSER ERRORS',errors)
 assert not errors
 print('PASS: independent overlay session, start/finish/advance/undo, reload persistence, conflict protection, auth, transparency, mobile')
 browser.close()
