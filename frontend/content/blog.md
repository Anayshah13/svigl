# Svigl: Reimagining the Drawing-and-Guessing Game with Vectors, Replays, and AI

Some party games begin with a perfect plan and end with a masterpiece. Svigl is not one of those games.

In Svigl, a simple word can become an unrecognizable collection of lines, a confident guess can miss by one letter, and the people who know you best can spend an entire round wondering why your “bicycle” looks like a haunted pair of glasses. That chaos is the point.

Svigl is a real-time multiplayer drawing-and-guessing game inspired by games such as Skribbl.io and Pictionary. One player draws a secret word while everyone else races to identify it through chat. But beneath that familiar party-game loop is a different kind of creative tool: a vector-first SVG canvas where loose pencil strokes, clean geometric shapes, fills, curves, transformations, and erasing all share the same board.

The result is part social game, part collaborative whiteboard, part drawing laboratory, and part AI experiment.

This is the story of the complete Svigl experience—how a match works, what makes its canvas unusual, how drawings live beyond a round, and how its technical architecture keeps a fast, chaotic game fair and synchronized.

---

## A Familiar Game with a Sharper Canvas

The core idea is deliberately easy to understand:

1. Create or join a room.
2. Ready up with the other players.
3. Take turns choosing a secret word.
4. Draw that word before time runs out.
5. Guess everyone else’s drawings as quickly as possible.
6. Finish with the highest score—or at least leave behind the most memorable disaster.

That simplicity makes Svigl immediately approachable. Players do not need to learn a complicated rulebook before joining. The difference becomes clear when the first drawer touches the canvas.

Most online drawing games treat a drawing as a bitmap: pixels are painted onto a fixed surface and streamed or periodically copied to other players. Svigl treats every mark as structured vector data. A pencil stroke becomes a simplified SVG path. A rectangle remains a rectangle. An ellipse remains editable geometry. A curve can retain its control point. Every object can stay crisp at different zoom levels and can be synchronized as a meaningful operation rather than as a flattened image.

This gives players two complementary ways to draw:

- **Sketch freely** when speed matters.
- **Construct precisely** when a clean shape communicates the idea better.

Someone drawing “sun” might scribble it in two seconds. Someone drawing “robot” might combine rectangles, circles, lines, and fills. Both styles belong naturally on the same canvas.

---

## Entering a Svigl Room

Svigl supports Google sign-in as well as guest access, so players can move from the landing page to a room without turning a casual game into a registration project.

Each room has a short, shareable code and can hold up to 12 players. The lobby is more than a waiting screen: it shows who has joined, who is ready, and who currently controls the room. The host can configure the number of rounds and the duration of each drawing turn, manage players, transfer host privileges, and add or remove the game’s AI participant.

By default, a game uses three rounds and gives each drawer 75 seconds, but the host can tune the experience:

- **Rounds:** 1 to 10
- **Drawing time:** 15 to 180 seconds

A short game can be a rapid warm-up. A longer game gives players enough room to attempt elaborate illustrations, build scenes out of geometric parts, or regret spending 40 seconds perfecting a background nobody needed.

The match can begin only when at least two players are present and everyone is ready. This prevents the host from launching while somebody is still sharing the room code or learning where the ready button is.

---

## The Anatomy of a Match

Svigl’s match flow is divided into explicit phases controlled by the server.

### 1. Countdown

Once the host starts the game, a three-second countdown gives the room a clear transition from lobby conversation to competition.

### 2. Word selection

The active drawer receives three words and has ten seconds to pick one. The choices come from a pool of more than 400 words, creating enough variety for repeated sessions without requiring predefined levels.

Only the drawer receives these secret choices. If no choice is made in time, the server automatically selects one so the room cannot become stuck.

### 3. Active drawing

The board clears, the timer begins, and the drawer starts creating. Guessers see a masked version of the word, with spaces preserved, and type their guesses directly into chat.

As the round progresses, the game reveals selected letters. These hints are determined by the server and revealed in a consistent order for every player. A near miss can also trigger a private “close” message based on edit distance, encouraging the guesser without exposing useful information to the rest of the room.

The drawer cannot submit guesses or use ordinary chat during the turn. This closes an obvious route for leaking the answer, whether intentionally or by accident.

### 4. Correct guesses and private conversation

When a player finds the word, the answer is not posted publicly. Instead, that player joins a private conversation shared with the drawer and other successful guessers. Everyone still searching remains outside it.

This preserves the round while rewarding successful players with a small social victory: they can react together while watching everyone else struggle.

### 5. Round end

The turn ends when the timer expires or every eligible guesser has solved the word. The answer is revealed, points are finalized, and the game briefly displays the result before rotating to the next drawer.

Every human player receives drawing turns according to the configured round count. Players who join a game already in progress can still be admitted with a reduced turn quota based on how much of the match remains.

### 6. Game finish

After all drawing quotas are complete, the player with the highest total score wins. A tied score is settled consistently using the game’s rotation order. The final screen celebrates the winner, shows the standings, and offers the room another chance to play before returning everyone to the lobby.

---

## Fast Guesses Earn More

Scoring is designed to reward recognition speed without making a late correct answer worthless.

A correct guess awards between **50 and 350 points**, calculated from the fraction of drawing time remaining. The drawer also benefits whenever somebody understands the picture, receiving between **25 and 100 points** for each correct guess using the same time-based principle.

In simplified form:

```text
guesser points = 50 + (remaining time fraction × 300)
drawer points  = 25 + (remaining time fraction × 75)
```

Both values have a guaranteed minimum.

This creates a useful balance. Guessers want to answer immediately, but the drawer also wants to communicate clearly and quickly. A beautiful drawing that becomes recognizable with two seconds left may be artistically impressive, yet a crude three-line sketch solved in the opening moments can be strategically stronger.

Because a round ends early when everyone guesses correctly, successful communication also keeps the match moving.

---

## Seven Tools, One Vector Board

The whiteboard is the defining feature of Svigl. It uses an 800-by-800 logical SVG space and offers seven primary tools.

| Key | Tool | What it does |
| --- | --- | --- |
| `1` | Pencil | Creates smooth freehand vector paths |
| `2` | Select | Selects, moves, groups, and scales objects |
| `3` | Line | Draws straight or Bézier-style lines with an editable handle |
| `4` | Rectangle | Creates rectangles; hold Shift for a square |
| `5` | Ellipse | Creates ellipses; hold Shift for a circle |
| `6` | Fill | Flood-fills enclosed regions |
| `7` | Eraser | Removes complete shapes under the pointer |

Alternative shortcuts make common tools even faster: `B` or `P` activates the pencil, while `E` or `X` selects the eraser.

The select tool brings capabilities rarely found in a party drawing game. Players can click or marquee-select objects, move them, resize them, duplicate them, or remove them without repainting the entire area. Standard history and clipboard shortcuts support undo, redo, copy, paste, duplication, and deletion.

The board also supports panning with Space and drag, zooming with Ctrl and the mouse wheel, and touch gestures such as pinch-to-zoom. A built-in shortcut guide is available through `?` or Ctrl+/.

These features are not there to turn every round into professional illustration software. They create expressive options. A player under pressure can stay with the pencil and eraser. A player who thinks geometrically can assemble a recognizable object from primitives. An experienced player can mix both approaches without leaving the canvas.

### How a pencil stroke becomes SVG

Freehand input can generate many pointer samples, which would be expensive to send to every player and awkward to replay. Svigl reduces that data before committing the stroke:

1. It samples pointer movement.
2. It simplifies the points using the Ramer–Douglas–Peucker algorithm.
3. It converts the remaining path into compact quadratic Bézier segments.
4. It synchronizes the resulting vector object.

The drawing keeps the fluid appearance of a pencil stroke while becoming smaller, smoother, and more suitable for real-time multiplayer.

---

## Real-Time Play Without Giving Up Authority

Party games feel lightweight, but they contain several trust problems. A modified client could reveal a secret word, draw while spectating, alter a score, or force a phase transition. Svigl addresses this by keeping important decisions on the server.

The FastAPI backend owns:

- Match phases and deadlines
- Drawer rotation
- Secret words and public hints
- Chat and guess validation
- Scores
- Canvas permissions
- Round completion
- Winner selection

Clients render timers and respond immediately to local input, but they do not decide the official result.

The browser maintains one authenticated WebSocket connection per tab. Room events, game snapshots, chat messages, reactions, and structured canvas operations move through that connection. Only the current drawer can mutate the board during an active round.

The API also builds responses for the specific viewer. Secret fields are excluded from snapshots sent to guessers, so hiding a word is not merely a visual trick in the frontend.

Remote canvas operations are applied without corrupting the drawer’s local undo history. That detail matters: synchronization should reproduce the drawing for spectators, not make the artist’s next Ctrl+Z undo somebody else’s network update.

### Recovering from disconnects

Real people change networks, close laptop lids, and accidentally refresh pages. Svigl allows a 15-second grace period after a WebSocket disconnect before removing a player.

If the active drawer truly leaves, the game can skip the abandoned turn. If fewer than two active players remain, the match safely collapses back to the lobby instead of continuing in an invalid state.

Players can also initiate a vote-kick during active play. A majority is required, giving rooms a community-controlled response to disruptive behavior without granting every participant unilateral removal power.

---

## AnAI 1.3 Pro Joins the Room

If a room needs another guesser—or simply wants to test its artistic legibility—the host can add **AnAI 1.3 Pro**.

AnAI is a server-side robot player. It occupies a guessing role but never takes drawing turns, leaving every creative turn to human players.

The bot is not a scripted list of random chat messages and does not run through a fake browser. During a drawing round, the server renders the current vector canvas to an image, sends that image through the AI guesser pipeline, and submits the bot’s response as a normal game guess.

That architecture lets the robot participate through the same rules as other guessers while avoiding access to the secret word. It also creates a wonderfully strange measure of success: if the humans are confused but AnAI immediately understands the picture, was the drawing brilliant or merely optimized for machines?

---

## Drawings That Survive the Round

In many drawing games, the board disappears as soon as the answer is revealed. Svigl treats those drawings as part of the game’s history.

At the end of a completed turn, the server publishes the canvas to the gallery, attributes it to its artist, and increments the player’s completed-drawing count. Other players can like or dislike a drawing during the game, and those reactions carry into its saved gallery entry.

The gallery can be filtered by:

- Recent drawings
- Top-rated drawings
- Your own drawings

Profiles collect a player’s drawing history and reaction totals, turning a sequence of temporary party-game rounds into a lightweight creative identity.

### Replaying the process, not just the result

Svigl records canvas operations while the drawing is made. The replay system can reconstruct those events and compress the original timeline into a short playback.

That means the gallery can show more than a static final SVG. Viewers can watch an idea develop: the uncertain first line, the object that gets moved, the mistaken shape that disappears, and the frantic final detail added after the first correct guess.

Replays capture the humor and decision-making that a final image often hides.

---

## Svigl Labs: Drawing as a Precision Sport

The main multiplayer mode asks, “Can another person understand this?” **Svigl Labs** asks a more exact question: “How close can you get to an ideal shape?”

Labs contains four standalone precision challenges:

| Challenge | Difficulty | Objective |
| --- | --- | --- |
| Perfect Circle | Easy | Draw a closed circle around the center |
| Perfect Square | Medium | Draw a square centered on the origin |
| Perfect Triangle | Medium | Draw an equilateral triangle |
| Infinity Loop | Hard | Draw a balanced lemniscate crossing at the origin |

Each attempt is processed as geometry rather than judged from a screenshot. The evaluation pipeline resamples the path by arc length, normalizes its scale, fits it to an ideal model, and measures multiple kinds of error. The implementation uses techniques including Taubin circle fitting, polygon simplification, and Procrustes-style comparison for the infinity loop.

The final score follows exponential decay:

```text
score = 100 × e^(-k × total error)
```

Challenge-specific weights decide how strongly to penalize problems such as closure, shape error, centering, rotation, side equality, angle error, symmetry, or crossing placement. Attempts below the minimum quality floor score zero.

Labs also checks properties that may indicate tracing or automated input, including velocity variance, path characteristics, and repeated loops. Valid scores can be submitted to persistent personal-best leaderboards.

This mode transforms the same fundamental act—moving a pointer across a canvas—into a small computational-geometry challenge. It is quiet, exact, and almost meditative compared with the noise of a multiplayer room.

---

## The Solo AI Guesser

The `/ai-guesser` experience isolates Svigl’s human-versus-machine idea into an experimental solo mode.

The player receives a word, draws it, and waits for AnAI 1.3 Pro to identify the result. A successful answer increases the score and begins another round, creating an endless loop of visual communication.

Optional text-to-speech gives the AI a voice, making its guesses feel more like responses from a character than labels from an image classifier.

This mode reverses the social challenge of the main game. Instead of learning how friends interpret your shorthand, you learn what visual signals an AI model recognizes. Clean silhouettes may matter more than artistic texture. Context can rescue a vague object. Tiny details can either help or distract.

Together, the room bot and solo guesser make AnAI more than decoration: it is a participant, an opponent, and an ongoing experiment in machine-readable drawing.

---

## A Playful Visual Identity

Svigl’s interface leans into the improvised, friendly nature of the game without making the tools difficult to read.

Its visual system combines:

- Deep plum and bright pink
- Green and chartreuse accents
- Warm off-white surfaces
- Dark ink-like text
- Glassy panels and dot-grid textures
- Illustrated doodles and aurora-style backgrounds

DM Sans handles most interface text, while Galindo gives headings a playful display voice. Caveat appears as a handwritten accent, and Geist Mono makes room codes, scores, timers, and word hints feel precise.

Framer Motion animates interface transitions, while GSAP powers selected landing-page interactions. Responsive layouts provide dedicated mobile headers, bottom chat controls, and touch-friendly targets rather than merely shrinking the desktop game.

The copy carries the same personality. Phrases such as “Draw fast, get roasted faster” frame Svigl as a place where imperfect art is not a failure condition—it is the entertainment.

The core multiplayer game intentionally avoids background music and a heavy soundscape. The only major voice feature currently belongs to the AI Guesser, keeping ordinary rooms focused on conversation, drawing, and reactions.

---

## Inside the Technology

Svigl is organized as a frontend-and-backend monorepo.

### Frontend

The client is built with:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- GSAP
- Vitest

Next.js App Router pages act as route-level entry points, while domain code lives in feature modules for the whiteboard, room, gallery, replay, Labs, landing experience, and AI guesser.

Global session and room state use a small in-house store built on React’s `useSyncExternalStore`, keeping the state layer focused without introducing a larger external store library.

### Backend

The server uses:

- FastAPI
- SQLAlchemy 2
- Alembic
- PostgreSQL 17
- WebSockets
- PyJWT and Authlib
- pytest

REST endpoints handle operations such as authentication, creating and joining rooms, gallery access, profiles, and leaderboard submissions. WebSockets carry the time-sensitive game stream.

The backend separates API routes from domain services. Match logic, room behavior, canvas mutations, gallery publishing, replay data, Labs records, bot coordination, and disconnect handling each have focused service modules.

### Authentication and deployment

Google OAuth and guest accounts both produce authenticated sessions. The primary mechanism uses JWT-backed cookies. When cross-site cookie restrictions interfere—particularly in Safari—the frontend can fall back to a bearer token stored for the browser tab and pass it with HTTP and WebSocket requests.

For local development, Docker Compose runs PostgreSQL and FastAPI, while the Next.js frontend runs through npm. Alembic manages database migrations. The frontend and backend can be deployed separately as long as their HTTP, WebSocket, CORS, cookie, and OAuth settings point to the correct production origins.

---

## Running Svigl Locally

To explore the project locally, you need Docker Desktop and Node.js 20.9 or newer. Python 3.12 is only necessary when running the backend outside Docker.

After copying the provided environment examples and configuring authentication secrets, start the backend and database:

```bash
docker compose up --build
```

Apply database migrations:

```bash
docker compose exec backend alembic upgrade head
```

Then launch the frontend:

```bash
cd frontend
npm install
npm run dev
```

The default local services are:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5433`

The repository also includes an offline demo route and a local whiteboard sandbox, which are useful for exploring the interface without completing a full multiplayer session.

---

## What Makes Svigl More Than a Clone

The draw-and-guess genre works because it turns imperfect communication into a competition. Svigl preserves that foundation, but its surrounding systems push it in several directions at once.

The vector canvas gives players a richer creative vocabulary. Server authority keeps secrets, scoring, and turns dependable. Gallery publishing gives drawings a life after the timer. Replay preserves the act of creation. Labs turns drawing into measurable geometry. AnAI tests whether visual ideas can cross the boundary between human and machine interpretation.

Most importantly, those additions support the central joke instead of burying it. Svigl is still about the moment when a room full of people stares at the same picture and sees completely different things.

You can win by guessing quickly. You can help the drawer by recognizing a terrible sketch. You can chase a perfect score in Labs, build a gallery of your best work, or discover that an AI understands your art better than your friends do.

And when the round ends, the evidence does not have to disappear.

That is Svigl: draw fast, guess faster, and leave behind a replay worth defending.
