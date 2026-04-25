# Product Requirements Document (PRD)
## App Name: Sunflower Run (Endless Runner)

### 1. Executive Summary
**Sunflower Run** is an engaging, 3D endless runner game built for the web. The player controls a female avatar running forward through procedurally generated biomes, collecting sunflowers, dodging obstacles, and using power-ups, all while trying to stay ahead of a pursuing "boyfriend" character. The game aims to provide casual, fast-paced, reflex-based entertainment scaling in difficulty over time.

### 2. Core Gameplay Loop
1. **Run & Dodge:** The player character continuously runs forward across a 3-lane track. The player must switch lanes, jump, or duck to avoid incoming procedural obstacles.
2. **Collect:** Pick up sunflowers to increase the score.
3. **Survive:** Hitting an obstacle without a shield causes the player to stumble, allowing the pursuer to catch them, resulting in a Game Over.
4. **Acquire Power-ups:** Collect special items that temporarily grant magnetic pull, invincibility (speed dash), or one-time hit protection.
5. **Progression:** The game continually speeds up, testing the player's reflexes. Biomes change over time to provide visual variety.

### 3. Gameplay Mechanics & Controls
* **Movement:** 3-lane grid system. 
  * `Left Arrow` / `A` or `Swipe Left`: Move one lane left.
  * `Right Arrow` / `D` or `Swipe Right`: Move one lane right.
* **Verticality:**
  * `Up Arrow` / `W` / `Space` or `Swipe Up`: Jump to avoid low obstacles.
  * `Down Arrow` / `S` or `Swipe Down`: Duck/roll to slide under high obstacles.
* **Pursuer Mechanic:** A "boyfriend" character runs behind the player. If the player hits an obstacle, an impact animation plays (player tumbles), the pursuer catches up, and the game ends.

### 4. Game Environments (Biomes)
The game procedurally transitions between different thematic biomes, altering visuals and terrain:
*   **Garden:** Grass ground, asphalt roads, apple trees, rose bushes, and small flowers. Clear blue sky.
*   **Lake:** Water ground, wooden docks (road), floating water lilies, and cattails. Light blue/foggy sky with track borders (walls).
*   **Jungle:** Thick jungle canopy, dirt paths, massive trees, vines, and giant ferns. Features a custom sun/lighting ambiance.

### 5. Entities & Collectibles
*   **Sunflowers:** The primary scoring mechanism. Appears in lines or individually. (+1 Score each).
*   **Obstacles:**
    *   *Low Obstacles:* Wooden hurdles or lake rocks that must be jumped over.
    *   *High Obstacles:* Raised bars on posts that the player must duck under.
*   **Power-ups:**
    *   *Magnet:* Pulls nearby sunflowers towards the player without needing to be in the same lane.
    *   *Shield:* Golden dome that absorbs exactly one obstacle impact. Hitting an obstacle with a shield destroys the obstacle, preserves the run, and causes a slight camera shake and player hop.
    *   *Speed (Dash):* Temporarily boosts the player's speed, making them invincible to obstacles while significantly accelerating the score/progress rate.

### 6. User Interface & Game States
*   **Start Screen:** Displays the game title, Start button, and overall High Score (persisted via `localStorage`).
*   **HUD (Heads Up Display):** Shows current Score, High Score, and active Power-up indicators.
*   **Game Over Screen:** Displays the final score, whether a new High Score was achieved, and a "Play Again" button.

### 7. Technical Specifications
*   **Frameworks:** React.js for the UI shell.
*   **3D Engine:** Three.js for 3D rendering, geometry management, and procedural generation.
*   **World Curvature:** Implements a custom shader modifier (`applyCurvedWorld`) to bend the horizon downwards, creating a classic endless runner "rolling world" effect.
*   **Performance Optimization:** 
    *   Aggressive object pooling and culling (removing objects once they pass `z > 10` or `z > 15`).
    *   Geometry and Material caching limits memory allocations during gameplay.
    *   Shadow maps and texture repetition configured for optimal web performance.
*   **Audio:** Custom `AudioManager` for jump, hit, collect, and power-up SFX.

### 8. Target Audience & Platform
*   **Platform:** Any modern WebGL-compatible web browser (Desktop and Mobile).
*   **Audience:** Casual gamers, fans of games like *Subway Surfers* or *Temple Run*.

### 9. Future Enhancements (Out of Scope for v1)
*   Additional power-ups (e.g., Score Multiplier, Hoverboard).
*   Dynamic character selection or customizable outfits.
*   Missions, daily quests, or achievements.
*   Global leaderboards.
