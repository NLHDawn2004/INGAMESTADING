from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'outputs/player-leaders-animation'
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 page=browser.new_page(viewport={'width':1920,'height':1080})
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.route('**/player-templates/*',lambda route:route.fulfill(path=str(ROOT/'public/player-templates'/route.request.url.split('/')[-1])))
 page.route('**/api/media/*',lambda route:route.fulfill(path=str(ROOT/'public/player-templates/video-elims-v2.png')))
 page.goto((STAGE/'qa.html').as_uri())
 page.wait_for_function("document.querySelectorAll('.leader-data-row').length===10")
 page.evaluate("""() => {window.rows=[...document.querySelectorAll('#elims .leader-data-row')];window.anim=rows[0].getAnimations()[0];window.other=document.querySelector('#damage .leader-presentation');document.getAnimations().forEach(a=>{a.pause();a.currentTime=0});}""")
 assert page.locator('.leader-row-art').count()==10
 assert page.evaluate("rows.map(r=>r.getAnimations()[0].effect.getTiming().delay)")==[1000,1500,2000,2500,3000]
 assert page.evaluate("rows.every(r=>{const t=r.getAnimations()[0].effect.getTiming();return t.duration===500&&t.iterations===1&&t.fill==='both'&&getComputedStyle(r).animationTimingFunction==='ease-out'})")
 assert page.evaluate("rows.every(r=>r.getBoundingClientRect().width===440&&r.getBoundingClientRect().height===86)")
 assert page.evaluate("getComputedStyle(rows[0]).transform")=='matrix(1, 0, 0, 1, -440, 0)'
 assert page.evaluate("getComputedStyle(rows[0]).clipPath")=='inset(0px 0px 0px 100%)'
 assert page.evaluate("document.querySelector('#elims .leader-kv').getAnimations().length")==0
 page.evaluate("document.getAnimations().forEach(a=>a.currentTime=999)")
 assert page.evaluate("rows.every(r=>r.getAnimations()[0].effect.getComputedTiming().progress===0)")
 page.evaluate("document.getAnimations().forEach(a=>a.currentTime=1250)")
 assert page.evaluate("rows[0].getAnimations()[0].effect.getComputedTiming().progress")>0
 assert page.evaluate("rows[4].getAnimations()[0].effect.getComputedTiming().progress")==0
 page.screenshot(path=str(STAGE/'entry-1250ms.png'))
 page.evaluate("document.getAnimations().forEach(a=>a.currentTime=4000)")
 assert page.evaluate("rows.every(r=>r.getAnimations()[0].effect.getComputedTiming().progress===1&&getComputedStyle(r).clipPath.match(/[\\d.]+/g).every(n=>Number(n)===0))")
 page.screenshot(path=str(STAGE/'elims-complete.png'))
 page.evaluate("window.qa('update')")
 page.wait_for_function("document.querySelector('#elims .leader-field-elims').textContent==='999'")
 assert page.evaluate("rows.every((r,i)=>r===document.querySelectorAll('#elims .leader-data-row')[i])")
 assert page.evaluate("rows[0].getAnimations()[0]===anim && anim.currentTime===4000")
 assert page.evaluate("document.querySelector('#damage .leader-presentation')===other")
 page.evaluate("window.qa('hide')")
 page.wait_for_function("document.querySelectorAll('#elims article').length===0")
 page.evaluate("window.qa('show')")
 page.wait_for_function("document.querySelectorAll('#elims article').length===5")
 assert page.evaluate("document.querySelectorAll('#elims .leader-data-row')[0]!==rows[0]")
 assert page.evaluate("document.querySelector('#damage .leader-presentation')===other")
 page.evaluate("window.qa('connected')")
 page.wait_for_function("document.querySelector('#elims main').dataset.rowStyle==='connected'")
 assert page.locator('#elims .leader-row-art').count()==0
 page.evaluate("document.querySelectorAll('#elims .leader-data-row').forEach(r=>r.getAnimations().forEach(a=>{a.pause();a.currentTime=0}))")
 assert '100%' in page.evaluate("getComputedStyle(document.querySelector('#elims .leader-data-row')).clipPath")
 assert page.evaluate("getComputedStyle(document.querySelector('#elims .leader-data-row')).transform")=='none'
 page.locator('#elims').evaluate("el=>el.style.display='none'")
 page.screenshot(path=str(STAGE/'damage-complete.png'))
 page.emulate_media(reduced_motion='reduce')
 assert page.evaluate("document.querySelector('#elims .leader-data-row').getAnimations().length")==0
 assert not errors,errors
 browser.close()
 print('PASS: scoreboard horizontal slide and vertical wipe; 1000/1500/2000/2500/3000ms delays, 500ms ease-out once; fixed title; independent replay, live updates, reduced motion, no browser errors.')
