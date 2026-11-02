from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1100})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/fonts/*',lambda route:route.fulfill(path=str(ROOT/'public/fonts'/route.request.url.split('/')[-1])))
 page.goto((ROOT/'outputs/scoreboard-qa.html').as_uri())
 page.get_by_role('textbox',name='Match ID',exact=True).fill('1989692635121453058')
 page.get_by_role('button',name='Lấy kết quả trận',exact=True).click()
 candidate=page.get_by_role('combobox',name='Bản kết quả Match Stats',exact=True);candidate.wait_for()
 assert page.get_by_role('button',name='Lấy bản kết quả đã chọn',exact=True).is_disabled()
 candidate.select_option('153041');page.get_by_role('button',name='Lấy bản kết quả đã chọn',exact=True).click()
 page.get_by_role('button',name='Lưu bảng điểm trận',exact=True).wait_for();page.get_by_role('button',name='Hủy',exact=True).click()
 page.get_by_role('textbox',name='Match ID',exact=True).fill('1989692635121453056')
 page.get_by_role('button',name='Lấy kết quả trận',exact=True).click()
 preview=page.locator('.score-import-preview table tbody tr').filter(has_text='R7');preview.wait_for()
 assert preview.locator('td').nth(0).inner_text()=='#4'
 assert preview.locator('td').nth(3).inner_text()=='7'
 assert preview.locator('td').last.inner_text()=='16'
 page.get_by_role('button',name='Lưu bảng điểm trận',exact=True).click()
 page.get_by_role('button',name='Chiếu trận này',exact=True).click()
 page.get_by_role('status').filter(has_text='Đã chiếu bảng điểm trận.').wait_for()
 assert page.locator('#published-match .match-rank-row').count()==12
 assert page.locator('#published-match .match-winner-stats b').all_text_contents()==['12','9','21']
 assert 'view=match' in page.get_by_role('textbox',name='Link OBS bảng điểm').input_value()
 page.get_by_role('textbox',name='Match ID',exact=True).fill('1989692635121453056')
 page.get_by_role('button',name='Lấy kết quả trận',exact=True).click()
 page.get_by_role('status').filter(has_text='không cộng trùng').wait_for()
 page.get_by_role('textbox',name='Match ID',exact=True).fill('1989692635121453057')
 page.get_by_role('button',name='Lấy kết quả trận',exact=True).click()
 page.get_by_role('button',name='Lưu bảng điểm trận',exact=True).wait_for()
 assert all(x!='new' for x in page.locator('[aria-label^="Ghép đội"]').evaluate_all('els=>els.map(e=>e.value)'))
 page.get_by_role('button',name='Lưu bảng điểm trận',exact=True).click()
 page.get_by_role('combobox',name='Trận đang xem').select_option('1989692635121453057')
 current=page.locator('.simple-results-table tbody tr').filter(has_text='BRU')
 assert current.locator('td').last.inner_text()=='21'
 page.get_by_role('button',name='Bảng điểm tổng',exact=False).click()
 assert current.locator('td').nth(5).inner_text()=='42'
 page.get_by_role('button',name='Chiếu bảng tổng',exact=True).click()
 page.get_by_role('status').filter(has_text='Đã chiếu bảng điểm tổng.').wait_for()
 assert 'view=scores' in page.get_by_role('textbox',name='Link OBS bảng điểm').input_value()
 assert page.locator('#published-match .match-winner-stats b').all_text_contents()==['12','9','21']
 page.get_by_role('checkbox',name='Cộng trận 1989692635121453056',exact=True).uncheck()
 assert current.locator('td').nth(5).inner_text()=='21'
 assert page.locator('#published-overlay .score-table-row').filter(has_text='BRU').locator(':scope>strong').last.inner_text()=='42'
 page.get_by_role('button',name='Bảng điểm trận',exact=True).click()
 page.screenshot(path=str(ROOT/'outputs/match-score-controls.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Mobile overflow'
 page.screenshot(path=str(ROOT/'outputs/match-score-mobile.png'),full_page=True)
 page.evaluate("document.querySelector('.studio-shell').style.display='none';document.querySelector('#published-match').style.display='block';document.documentElement.style.colorScheme='light'")
 page.set_viewport_size({'width':1920,'height':1080})
 page.wait_for_function("Array.from(document.querySelectorAll('#published-match .match-rank-paper,#published-match .match-winner-paper')).every(c=>c.getAnimations({subtree:true}).every(a=>a.playState==='finished'))")
 page.evaluate('document.fonts.ready')
 assert page.evaluate("document.fonts.check('900 25px \"GFF Latin\"')")
 page.screenshot(path=str(ROOT/'outputs/match-score-transparent.png'),omit_background=True)
 image=Image.open(ROOT/'outputs/match-score-transparent.png').convert('RGBA')
 for point in [(10,10),(1005,650),(960,1000),(1500,200)]:assert image.getpixel(point)[3]==0,(point,image.getpixel(point))
 assert image.getpixel((300,600))[3]==0
 assert image.getpixel((800,700))[3]==0
 assert image.getpixel((120,700))[3]==255
 assert image.getpixel((1700,600))[3]==255
 assert not errors,errors
 print('PASS: match-first import, true placement points, fixed 1/elim scoring, notebook BOOYAH and 12-team layout, full ID and event selection, repeat prevention, remembered teams, totals sum match tables, separate OBS links/publications, excluded matches, mobile and transparency')
 browser.close()
