from playwright.sync_api import sync_playwright
import json,uuid
with sync_playwright() as p:
 c=p.request.new_context()
 headers={'Content-Type':'application/json','cf-connecting-ip':'qa-'+str(uuid.uuid4())}
 statuses=[c.post('http://127.0.0.1:5183/api/auth/login',data=json.dumps({'password':'invalid-password'}),headers=headers).status for _ in range(6)]
 assert statuses==[401,401,401,401,401,429],statuses
 print('PASS: failed login rate limit blocks sixth attempt')
 c.dispose()
