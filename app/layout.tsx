import type { Metadata } from 'next';
import './globals.css';
import './score-schedule.css';
import './player-leaders.css';
import './live-board.css';
import './compact-controls.css';
import './alignment-workspace.css';
export const metadata:Metadata={title:'Tool Standing In Game',description:'Bảng điểm trong trận Free Fire và overlay OBS độc lập.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>;}
