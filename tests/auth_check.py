from playwright.sync_api import sync_playwright
from pathlib import Path
import json
password=next(x.split(': ',1)[1] for x in Path(r'C:\Users\hct19\Downloads\Overlay-Studio-login.txt').read_text(encoding='utf-8').splitlines() if x.startswith('Mật khẩu: '))
base='http://127.0.0.1:5183'
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True)
 c=b.new_context(viewport={'width':1440,'height':960})
 page=c.new_page();page.goto(base,wait_until='networkidle')
 assert page.url.endswith('/login')
 assert c.request.get(base+'/api/state').status==401
 assert c.request.post(base+'/api/auth/login',data=json.dumps({'password':'wrong'}),headers={'Content-Type':'application/json'}).status==401
 page.screenshot(path='outputs/login-desktop.png',full_page=True)
 page.locator('input').fill(password)
 page.get_by_role('button',name='Vào trang điều khiển').click()
 page.wait_for_selector('.schedule-panel')
 page.wait_for_function("document.querySelector('.heading-actions .primary').disabled === false")
 cookie=next(x for x in c.cookies() if x['name']=='ovl_session')
 assert cookie['httpOnly'] and cookie['sameSite']=='Strict'
 second=b.new_context()
 assert second.request.post(base+'/api/auth/login',data=json.dumps({'password':password}),headers={'Content-Type':'application/json'}).status==200
 new_password=password+'-test'
 wrong=c.request.post(base+'/api/auth/password',data=json.dumps({'current':'wrong','password':new_password}),headers={'Content-Type':'application/json'})
 assert wrong.status==401
 csrf=c.request.post(base+'/api/auth/password',data=json.dumps({'current':password,'password':new_password}),headers={'Content-Type':'application/json','Origin':'https://evil.test'})
 assert csrf.status==403
 assert c.request.post(base+'/api/auth/password',data=json.dumps({'current':password,'password':new_password}),headers={'Content-Type':'application/json'}).status==200
 assert c.request.get(base+'/api/state').status==401
 assert second.request.get(base+'/api/state').status==401
 assert c.request.post(base+'/api/auth/login',data=json.dumps({'password':password}),headers={'Content-Type':'application/json'}).status==401
 assert c.request.post(base+'/api/auth/login',data=json.dumps({'password':new_password}),headers={'Content-Type':'application/json'}).status==200
 assert c.request.post(base+'/api/auth/password',data=json.dumps({'current':new_password,'password':password}),headers={'Content-Type':'application/json'}).status==200
 assert c.request.post(base+'/api/auth/login',data=json.dumps({'password':password}),headers={'Content-Type':'application/json'}).status==200
 assert c.request.post(base+'/api/auth/logout').status==200
 assert c.request.get(base+'/api/state').status==401
 page.set_viewport_size({'width':390,'height':844})
 page.goto(base+'/login',wait_until='networkidle')
 page.screenshot(path='outputs/login-mobile.png',full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 print('PASS: own password login, invalid password, anonymous protection, HttpOnly session, CSRF protection, password change, all-device revocation, logout, mobile login')
 b.close()
