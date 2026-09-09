import Game from './game';
import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();return <Game signedIn={!!user} signInUrl={chatGPTSignInPath('/')} signOutUrl={chatGPTSignOutPath('/')} />}
