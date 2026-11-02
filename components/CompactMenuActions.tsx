'use client';
export default function CompactMenuActions(){
 function toggle(button:HTMLButtonElement,open:boolean){button.closest('[data-compact-menu]')?.querySelectorAll('details').forEach(section=>{section.open=open;});}
 return <div className="compact-menu-actions"><button type="button" onClick={event=>toggle(event.currentTarget,true)}>Mở tất cả</button><button type="button" onClick={event=>toggle(event.currentTarget,false)}>Thu gọn tất cả</button></div>;
}
