from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/': file=root/'outputs/live-board-auto/live-board-ui.html';mime='text/html; charset=utf-8'
        elif path.startswith('/api/media/') or path=='/live-board-templates/standing-compact-v1.png': file=root/'public/live-board-templates/standing-compact-v1.png';mime='image/png'
        else:self.send_error(404);return
        body=file.read_bytes();self.send_response(200);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(body)
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        page=browser.new_page(viewport={'width':1600,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:'+str(server.server_port))
        page.get_by_label('KV riêng 1920 × 1080').set_input_files(str(root/'public/live-board-templates/standing-compact-v1.png'))
        expect(page.get_by_label('Y hàng 1',exact=True)).to_have_value('124')
        expect(page.get_by_label('Cột TEAM (%)',exact=True)).to_have_value('25.5')
        expect(page.get_by_label('Cột ELIMS (%)',exact=True)).to_have_value('73.5')
        expect(page.get_by_label('Cột ALIVE (%)',exact=True)).to_have_value('87')
        expect(page.get_by_label('Tự căn theo ảnh KV',exact=True)).to_be_checked()
        page.get_by_label('Y hàng 1',exact=True).fill('250')
        expect(page.get_by_label('Tự căn theo ảnh KV',exact=True)).not_to_be_checked()
        page.get_by_label('Tự căn theo ảnh KV',exact=True).check()
        expect(page.get_by_label('Y hàng 1',exact=True)).to_have_value('124')
        result=page.evaluate('''async()=>{const c=document.createElement('canvas');c.width=1920;c.height=1080;const ctx=c.getContext('2d');ctx.fillStyle='#121718';for(let i=0;i<12;i++)ctx.fillRect(400,100+i*48,800,40);const blob=await new Promise(r=>c.toBlob(r));return await window.__analyzeLiveImage(blob);}''')
        assert result and result['groups'][0]['rows']==12,result
        assert result['groups'][0]['x']==400 and result['groups'][0]['y']==100,result
        color=page.evaluate('''()=>{const i=document.createElement('i');i.className='live-board-alive-bar dead';document.body.append(i);return getComputedStyle(i).backgroundColor;}''')
        assert color=='rgb(116, 123, 134)',color
        folder=root/'outputs/kv-upload-verification';folder.mkdir(exist_ok=True)
        page.screenshot(path=str(folder/'auto-aligned.png'),full_page=True)
        assert not errors,errors
        browser.close()
        print('PASS: actual PNG upload auto-aligns TEAM/ELIMS/ALIVE with no manual input; manual override/toggle work; dark transparent 12-row KV auto-detected; eliminated color is gray; no browser errors.')
finally:server.shutdown();server.server_close()
