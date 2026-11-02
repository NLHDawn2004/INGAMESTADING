import LiveBoardStudio from '../../components/LiveBoardStudio';
import {redirect} from 'next/navigation';import {authenticated} from '../../lib/auth';
export const dynamic='force-dynamic';export default async function Page(){if(!await authenticated())redirect('/login');return <LiveBoardStudio/>;}
