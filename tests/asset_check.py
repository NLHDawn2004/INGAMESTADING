from playwright.sync_api import sync_playwright
import json
from pathlib import Path
password=next(x.split(': ',1)[1] for x in Path(r'C:\Users\hct19\Downloads\Overlay-Studio-login.txt').read_text(encoding='utf-8').splitlines() if x.startswith('Mật khẩu: '))
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True)
 c=b.new_context(viewport={'width':1440,'height':1000})
 page=c.new_page()
 page.goto('http://127.0.0.1:5183/login',wait_until='networkidle')
 page.locator('input').fill(password)
 page.get_by_role('button',name='Vào trang điều khiển').click()
 page.wait_for_selector('.schedule-panel')
 page.wait_for_function("document.querySelector('.heading-actions .primary').disabled === false")
 before=c.request.get('http://127.0.0.1:5183/api/state').json()
 bad=c.request.post('http://127.0.0.1:5183/api/upload',multipart={'file':{'name':'fake.png','mimeType':'image/png','buffer':b'invalid-image'}})
 assert bad.status==400
 with open('public/maps/Bermuda.webp','rb') as f:
  r=c.request.post('http://127.0.0.1:5183/api/upload',multipart={'file':{'name':'kv.webp','mimeType':'image/webp','buffer':f.read()}})
 assert r.status==200
 image=r.json()['url']
 assert c.request.get('http://127.0.0.1:5183'+image).status==200
 state=c.request.get('http://127.0.0.1:5183/api/state').json()['state']
 state['theme']['background']=image;state['theme']['useBackground']=True;state['theme']['accent']='#ee6677'
 assert c.request.put('http://127.0.0.1:5183/api/state',data=json.dumps({'state':state,'revision':state['revision']}),headers={'Content-Type':'application/json'}).status==200
 read=b.new_context(viewport={'width':1920,'height':1080})
 o=read.new_page();o.goto('http://127.0.0.1:5183/overlay?token='+before['token'])
 o.wait_for_selector('.kv-layer')
 assert o.locator('.kv-layer').get_attribute('src')==image
 assert o.locator('.broadcast').evaluate("el=>getComputedStyle(el).getPropertyValue('--accent')")=='#ee6677'
 fresh=c.request.get('http://127.0.0.1:5183/api/state').json()['state'];fresh['theme']=before['state']['theme']
 assert c.request.put('http://127.0.0.1:5183/api/state',data=json.dumps({'state':fresh,'revision':fresh['revision']}),headers={'Content-Type':'application/json'}).status==200
 o.wait_for_function("document.querySelector('.kv-layer')===null")
 print('PASS: reject fake image, R2 upload/read, independent overlay KV and theme update, return to transparent background')
 b.close()
