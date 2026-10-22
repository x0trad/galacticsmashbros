import React from 'react';
import {createRoot} from 'react-dom/client';
import Game from '../app/game';
import '../app/globals.css';

// Release one is browser-only. No wallet, cloud account or API is activated.
createRoot(document.getElementById('root')!).render(<Game signedIn={false}/>);
