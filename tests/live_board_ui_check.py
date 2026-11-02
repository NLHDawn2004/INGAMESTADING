from pathlib import Path
from playwright.sync_api import sync_playwright
STAGE=Path(__file__).resolve().parents[1]/'outputs/live-board-auto'
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 page=browser.new_page(viewport={'width':1600,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((STAGE/'live-board-ui.html').as_uri())
 page.get_by_text('Nguồn & trận',exact=True).click()
 auto=page.get_by_label('T\u1ef1 theo tr\u1eadn \u0111ang ch\u1ea1y trong game')
 auto.wait_for();assert auto.is_checked()
 assert page.get_by_label('Match ID b\u1ea3ng trong tr\u1eadn').count()==0
 assert page.get_by_text('K\u1ebft n\u1ed1i m\u1ed9t l\u1ea7n.',exact=False).count()==0
 page.screenshot(path=str(STAGE/'automatic-controller.png'),full_page=True)
 auto.uncheck();assert page.get_by_label('Match ID b\u1ea3ng trong tr\u1eadn').count()==1
 auto.check();assert page.get_by_label('Match ID b\u1ea3ng trong tr\u1eadn').count()==0
 page.get_by_role('button',name='L\u01b0u & \u00e1p d\u1ee5ng c\u1ea5u h\u00ecnh',exact=True).click()
 page.get_by_role('status').filter(has_text='\u0110\u00e3 l\u01b0u v\u00e0 \u00e1p d\u1ee5ng c\u1ea5u h\u00ecnh.').wait_for()
 assert auto.is_checked();assert not errors,errors
 browser.close();print('PASS: auto mode selected by default; manual match/roster controls hidden, optional manual mode works, save preserves auto mode, no browser errors.')
