from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parents[1]
stage=root/'outputs/live-connection-ui'
html=(stage/'index.html').read_text(encoding='utf-8')

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    try:
        for scenario in ['resume','fresh','existing','missing','revoked','network','remote']:
            context=browser.new_context(viewport={'width':1600,'height':1050})
            page=context.new_page();errors=[];downloads=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('download',lambda download:downloads.append(download.suggested_filename))
            page.route('**/*',lambda route:route.fulfill(status=200,content_type='text/html; charset=utf-8',body=html) if route.request.is_navigation_request() else route.fulfill(status=404,body=''))
            origin='http://192.168.100.29:5183' if scenario=='remote' else 'http://localhost:5183'
            page.goto(origin+'/live-scoreboard?scenario='+scenario)
            if scenario in ['resume','fresh','existing']:
                expect(page.get_by_role('button',name='Đã kết nối Free Fire',exact=True)).to_be_disabled(timeout=7000)
                expect(page.locator('.live-board-health b')).to_have_text('Đã kết nối · chờ trận')
                requests=page.evaluate('window.__connectionRequests')
                pairs=[item for item in requests if item['url']=='/api/live-scoreboard' and item['method']=='POST']
                assert len(pairs)==(1 if scenario=='fresh' else 0),requests
                if scenario=='existing':assert not any(':5184/' in item['url'] for item in requests),requests
                page.reload()
                expect(page.get_by_role('button',name='Đã kết nối Free Fire',exact=True)).to_be_disabled()
                assert not any(item['method']=='POST' for item in page.evaluate('window.__connectionRequests')),'refresh must preserve the active connection'
                if scenario=='resume':
                    page.evaluate("window.__sourceStatus='identity-pending'")
                    expect(page.locator('.live-board-health b')).to_have_text('Đang xác minh đội')
                    expect(page.get_by_role('button',name='Đã kết nối Free Fire',exact=True)).to_be_disabled()
                    page.evaluate('window.__apiOffline=true')
                    expect(page.locator('.topbar')).to_contain_text('Mất kết nối máy chủ')
                    page.evaluate('window.__apiOffline=false')
                    expect(page.get_by_role('button',name='Đã kết nối Free Fire',exact=True)).to_be_disabled()
                    assert not any(item['method']=='POST' for item in page.evaluate('window.__connectionRequests')),'server outage must not rotate the key or restart the reader'
                    page.screenshot(path=str(stage/'automatic-resume.png'),full_page=True)
            else:
                expect(page.get_by_role('button',name='Kết nối Free Fire',exact=True)).to_be_enabled(timeout=7000)
                if scenario=='revoked':expect(page.locator('.live-board-connection-note')).to_contain_text('Bấm Kết nối Free Fire')
                elif scenario=='network':
                    expect(page.locator('.live-board-connection-note')).to_contain_text('Đang chờ máy chủ web')
                    page.wait_for_timeout(11000)
                elif scenario=='missing':expect(page.locator('.live-board-connection-note')).to_contain_text('Chưa tìm thấy kết nối tự động')
                elif scenario=='remote':page.wait_for_timeout(1200)
                requests=page.evaluate('window.__connectionRequests')
                assert not any(item['url']=='/api/live-scoreboard' and item['method']=='POST' for item in requests),requests
                if scenario=='network':assert len([item for item in requests if item['url'].endswith('/resume')])>=2,'automatic reconnect must retry without replacing the key'
                if scenario=='remote':assert not any(':5184/' in item['url'] for item in requests),requests
            assert not any(item['method']=='PUT' for item in page.evaluate('window.__connectionRequests')),'connection must not modify source/settings'
            assert not downloads,downloads
            assert not errors,errors
            context.close()
        print('PASS: actual UI automatically resumes/first-pairs localhost, preserves active sessions on refresh/network loss, retries saved connection, keeps identity/source status accurate, never silently downloads, never saves game settings, and avoids LAN loopback calls. Mock API only.')
    finally:browser.close()
