# Private 1v1 PvP

The `/pvp` page uses a separate Cloudflare Worker and one Durable Object per room. The server controls movement, health, hits, cooldowns, countdowns and match results. Clients send only movement and punch inputs. All six characters share stats. No wallet, tokens, credits or ranked rewards are involved.

## Local play

Run the frontend with `npm run dev` and the match service with `npm run pvp:dev` in separate terminals. Open the frontend's `/pvp` page in two separate browser profiles (or one normal and one private window). Create a room in one and join its eight-character code in the other. Both players must press Ready. The default local config endpoint points to `http://localhost:8788`.

For phone/LAN testing, explicitly configure `PVP_SERVER_URL` to a reachable service URL and add the frontend's exact origin to `ALLOWED_ORIGINS`; phone localhost is not the development computer.

## Live connection

1. Authenticate Wrangler to the intended Cloudflare account.
2. Run `npm run pvp:deploy`. This deploys `pvp/wrangler.json` independently from Sites.
3. Set the Sites runtime environment variable `PVP_SERVER_URL` to the deployed HTTPS Worker URL, without a trailing slash, and redeploy the frontend.
4. Keep `ALLOWED_ORIGINS` restricted to the game domain and intended development origins.

## Rules and limits

- Two players, 100 HP each, 10 damage per punch, 450ms cooldown, 90-second rounds; higher HP wins at timeout. Simultaneous knockouts draw.
- Three-second countdown; both players must Ready again for every rematch.
- Input expires after 300ms, preventing ghost movement. A connection gap lasting 10 seconds forfeits the round. Session recovery is scoped to the browser tab; another tab taking the same session disconnects the previous connection.
- Leaving invalidates the player's session. Create a new room after a player leaves; rematches are for the same two connected players.
- Rooms expire after two hours. Room creation is limited to six per minute per IP; connected clients are limited to 90 messages/second and 512 bytes/message.
- Results remain in the room, not an account leaderboard. No matchmaking or spectating in this version.
- Active sockets keep the room running; budget and latency should be measured before wider launch. Deployment during a match interrupts it into a draw.

`npm run test:pvp` exercises rules and an actual two-WebSocket Durable Object session. It requires permission to open localhost sockets.
