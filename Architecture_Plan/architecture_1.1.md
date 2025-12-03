# Connect 4 v1.1 - Architectural Plan

## Executive Summary

This document outlines the architectural improvements and new features for Connect 4 v1.1. The plan focuses on enhancing user engagement, adding social/competitive elements, improving AI capabilities, and expanding platform support while maintaining the premium UI/UX established in v1.0.

---

## 🎯 Strategic Goals

1. **Increase User Engagement** - Add features that encourage repeated play
2. **Social & Competitive Play** - Enable online multiplayer and rankings
3. **Enhanced AI Experience** - Smarter AI with configurable strategies
4. **Platform Expansion** - Mobile-first responsive design improvements
5. **Analytics & Insights** - Track player performance and game statistics

---

## 📋 Feature Roadmap

### **Priority 1: High Impact, Low Complexity**

#### 1.1 Game History & Replay System
**Description**: Allow players to save, review, and replay past games

**Technical Implementation**:
- **Backend**: 
  - Add `GameHistory` entity with game state snapshots
  - New endpoints: `GET /api/games/{id}/replay`, `GET /api/games/history`
  - Store complete move sequence and timestamps
  
- **Frontend**:
  - Replay controls (play, pause, step forward/backward)
  - Speed control slider
  - Timeline visualization of moves
  - Share replay link feature

**Database Schema**:
```sql
CREATE TABLE game_history (
  id BIGINT PRIMARY KEY,
  game_id BIGINT REFERENCES games(id),
  moves_json TEXT,
  player1_name VARCHAR(50),
  player2_name VARCHAR(50),
  winner VARCHAR(10),
  duration_seconds INT,
  created_at TIMESTAMP
);
```

**User Value**: Learn from past games, share memorable wins, improve strategy

---

#### 1.2 Undo Move Feature
**Description**: Allow players to undo their last move(s) in PvP mode

**Technical Implementation**:
- **Backend**:
  - Add move stack to game state
  - New endpoint: `POST /api/games/{id}/undo`
  - Validation rules (max undos per game, both players must agree in PvP)
  
- **Frontend**:
  - Undo button in controls panel
  - Visual feedback showing previous board state
  - Confirmation dialog for PvP games

**Game Rules**:
- PvP: Requires opponent approval
- PvAI: Undoes both player and AI last moves
- Limit: 3 undos per game (configurable)

**User Value**: Reduce frustration from misclicks, learning opportunity

---

#### 1.3 Sound Effects & Audio
**Description**: Add immersive audio feedback for game actions

**Audio Assets Needed**:
- Piece drop sound (satisfying "plunk")
- Win celebration fanfare
- Draw game sound
- Button click/hover sounds
- Background music (optional, toggleable)
- AI "thinking" ambient sound

**Technical Implementation**:
- **Frontend**:
  - Audio manager class to handle sound playback
  - Volume controls in settings
  - Mute toggle button
  - Preload audio assets for smooth playback

**User Value**: Enhanced immersion, better feedback, premium feel

---

#### 1.4 Enhanced Animations
**Description**: Smooth, visually appealing animations throughout the UI

**Animation Improvements**:
- **Board Animations**:
  - Piece drop with bounce physics
  - Win sequence celebration (winning pieces pulse/glow)
  - Column hover preview (ghost piece at top)
  
- **UI Transitions**:
  - Page transitions (menu → game)
  - Modal animations (scale + fade)
  - Button micro-interactions
  
- **Victory Animations**:
  - Confetti effect for wins
  - Trophy/medal icon animation
  - Winning line highlight animation

**Technical Stack**:
- CSS animations with `@keyframes`
- JavaScript for complex physics (consider GSAP library)
- Canvas API for particle effects (confetti)

**User Value**: Modern, polished feel that wows users

---

### **Priority 2: High Impact, Medium Complexity**

#### 2.1 Player Statistics & Analytics
**Description**: Comprehensive player performance tracking

**Statistics Tracked**:
- **Overall Stats**:
  - Total games played
  - Win/loss/draw record
  - Win rate percentage
  - Longest win/loss streak
  - Favorite color selection
  
- **Performance Metrics**:
  - Average moves per game
  - Average game duration
  - Quick wins (wins in <10 moves)
  - Comeback wins (from losing position)
  
- **AI Performance**:
  - Win rate vs each difficulty level
  - Most challenging AI difficulty beaten

**Technical Implementation**:
- **Backend**:
  - New `PlayerStats` entity
  - Aggregate queries for statistics
  - Endpoints: `GET /api/stats/player/{name}`, `GET /api/stats/leaderboard`
  
- **Frontend**:
  - Stats dashboard page
  - Charts and visualizations (Chart.js or D3.js)
  - Personal achievement badges
  - Comparison with global averages

**Database Schema**:
```sql
CREATE TABLE player_stats (
  id BIGINT PRIMARY KEY,
  player_name VARCHAR(50) UNIQUE,
  total_games INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  total_moves INT DEFAULT 0,
  total_duration_seconds BIGINT DEFAULT 0,
  achievements_json TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**User Value**: Track progress, set goals, competitive motivation

---

#### 2.2 Achievement System
**Description**: Unlock achievements for completing various challenges

**Achievement Categories**:

**Beginner**:
- 🏆 First Victory - Win your first game
- 🎯 Quick Learner - Win a game in under 20 moves
- 🤝 Social Butterfly - Play 10 PvP games

**Intermediate**:
- 🔥 Hot Streak - Win 5 games in a row
- 🧠 AI Challenger - Beat AI on Medium difficulty
- 🎨 Colorful - Play games with all 8 color combinations
- 🌈 Theme Explorer - Try all 4 themes

**Advanced**:
- 👑 Champion - Win 100 games
- 🚀 Speed Demon - Win in under 15 moves
- 💪 AI Master - Beat AI on Hard difficulty
- 🎓 Strategist - Win without using undo feature

**Expert**:
- 🌟 Perfection - Win 10 games in a row
- ⚡ Lightning Fast - Win a game in under 2 minutes
- 🏅 Unbeatable - Win 50 consecutive games
- 🎯 Sharpshooter - Win 20 games with exactly 4 moves

**Technical Implementation**:
- **Backend**:
  - Achievement tracking service
  - Progress calculation on each game end
  - Notification system for unlocks
  
- **Frontend**:
  - Achievement notification popup
  - Achievements gallery page
  - Progress bars for partial achievements
  - Share achievement on social media

**User Value**: Gamification, long-term engagement, bragging rights

---

#### 2.3 Advanced AI Improvements
**Description**: Enhanced AI with multiple personality strategies

**AI Enhancements**:

**Difficulty Levels Expanded**:
- **Easy**: Random moves with 30% chance of blocking wins
- **Medium**: Minimax with depth 3, prioritizes wins/blocks
- **Hard**: Minimax with depth 5, considers future positions
- **Expert** (NEW): Minimax with depth 7 + opening book
- **Grandmaster** (NEW): Alpha-beta pruning, opening book, endgame database

**AI Personalities** (Optional strategy modifiers):
- 🛡️ **Defensive**: Prioritizes blocking over winning moves
- ⚔️ **Aggressive**: Always seeks quickest win path
- 🎲 **Unpredictable**: Adds randomness to move selection
- 🧠 **Calculated**: Uses opening book and endgame tables

**Technical Implementation**:
- **Backend**:
  - Refactor AI service into strategy pattern
  - Implement alpha-beta pruning algorithm
  - Add opening book database (precomputed optimal moves)
  - Endgame lookup tables
  
- **Performance Optimizations**:
  - Move ordering heuristics
  - Transposition tables (cache evaluated positions)
  - Iterative deepening
  - Multi-threading for parallel move evaluation

**API Changes**:
```java
// Enhanced AI request
POST /api/games/{id}/ai-move
{
  "difficulty": "GRANDMASTER",
  "personality": "AGGRESSIVE",
  "thinkingTime": 3000  // max ms to think
}
```

**User Value**: Greater challenge, variety in gameplay, skill progression

---

#### 2.4 Custom Game Rules
**Description**: Allow players to customize game parameters

**Customizable Options**:

**Board Configuration**:
- Board size: 6x7 (classic), 7x7, 8x8, 5x6 (quick)
- Win condition: 4-in-a-row, 5-in-a-row, 3-in-a-row (speed mode)

**Game Modes**:
- **Classic**: Standard Connect 4
- **Pop Out**: Players can remove bottom pieces
- **Power Up**: Special pieces with abilities (wild, blocker, swapper)
- **Five-in-a-Row**: Larger board, need 5 to win
- **Timed Mode**: Each player has time limit per game/move

**Special Rules**:
- Gravity options (normal, reverse, no gravity)
- Obstacle pieces (blocked cells)
- Mystery mode (hidden opponent pieces)

**Technical Implementation**:
- **Backend**:
  - Extend `GameConfig` model with custom rules
  - Refactor win detection for variable board sizes
  - Add rule validation service
  
- **Frontend**:
  - Advanced settings panel
  - Visual board preview with custom size
  - Rule explanation tooltips

**Database Schema**:
```sql
ALTER TABLE games ADD COLUMN rules_json TEXT;
-- Example: {"boardSize": "7x7", "winLength": 5, "mode": "TIMED"}
```

**User Value**: Variety, replayability, casual vs competitive modes

---

### **Priority 3: Medium Impact, High Complexity**

#### 3.1 Online Multiplayer
**Description**: Real-time online play with matchmaking

**Features**:
- Create private rooms with invite codes
- Public matchmaking queue
- Friend system
- In-game chat
- Spectator mode
- Real-time game updates via WebSockets

**Technical Architecture**:

**Backend Changes**:
- WebSocket server (Spring WebSocket/STOMP)
- Matchmaking service with ELO rating
- Room management system
- Friend/block list database
- Real-time game state synchronization

**Database Schema**:
```sql
CREATE TABLE players (
  id BIGINT PRIMARY KEY,
  username VARCHAR(30) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  elo_rating INT DEFAULT 1200,
  created_at TIMESTAMP
);

CREATE TABLE game_rooms (
  id VARCHAR(36) PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE,
  host_player_id BIGINT,
  guest_player_id BIGINT,
  is_public BOOLEAN,
  status VARCHAR(20), -- WAITING, IN_PROGRESS, COMPLETED
  created_at TIMESTAMP
);

CREATE TABLE friendships (
  id BIGINT PRIMARY KEY,
  player1_id BIGINT,
  player2_id BIGINT,
  status VARCHAR(20), -- PENDING, ACCEPTED, BLOCKED
  created_at TIMESTAMP
);
```

**WebSocket Protocol**:
```javascript
// Client → Server
{
  "type": "MAKE_MOVE",
  "roomId": "abc123",
  "column": 3
}

// Server → Clients
{
  "type": "GAME_UPDATE",
  "gameState": {...},
  "lastMove": {"player": "RED", "column": 3}
}
```

**Frontend Changes**:
- Multiplayer lobby UI
- Room creation/joining flow
- Real-time game state updates
- Connection status indicator
- Reconnection handling

**Infrastructure Requirements**:
- WebSocket support (Nginx config)
- Session management
- User authentication (JWT tokens)
- Redis for session storage (optional)

**User Value**: Social play, compete with friends, larger player community

---

#### 3.2 User Authentication & Profiles
**Description**: User accounts to persist progress and enable online features

**Features**:
- Username/email registration
- Secure password authentication
- OAuth integration (Google, Facebook, GitHub)
- User profile customization
- Avatar upload
- Profile visibility settings

**Technical Implementation**:

**Backend**:
- Spring Security with JWT
- Password hashing (BCrypt)
- Email verification service
- OAuth2 client integration
- Profile management endpoints

**Endpoints**:
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
GET    /api/users/{id}/profile
PUT    /api/users/{id}/profile
POST   /api/users/{id}/avatar
```

**Security Considerations**:
- HTTPS required for production
- Rate limiting on auth endpoints
- CSRF protection
- Password strength requirements
- Account lockout after failed attempts

**Frontend**:
- Login/registration pages
- Profile editor
- Session management
- Protected routes
- Avatar cropper

**User Value**: Progress persistence, personalization, identity in multiplayer

---

#### 3.3 Leaderboards & Rankings
**Description**: Global and friend leaderboards with ELO rating system

**Leaderboard Types**:
- **Global Rankings**: Top players worldwide
- **Friends Rankings**: Compare with friends
- **Daily/Weekly/All-Time**: Different time periods
- **Category Leaders**: Win streak, quick wins, AI masters

**ELO Rating System**:
- Initial rating: 1200
- Rating change based on opponent strength
- Separate ratings for PvP and PvAI
- Seasonal resets (optional)

**Technical Implementation**:
- **Backend**:
  - ELO calculation service
  - Leaderboard caching (Redis)
  - Periodic leaderboard updates
  - Historical rating tracking
  
- **Frontend**:
  - Leaderboard page with filters
  - Player rank display
  - Rating change visualization
  - Rating history graph

**Database Schema**:
```sql
CREATE TABLE leaderboard_entries (
  id BIGINT PRIMARY KEY,
  player_id BIGINT,
  rating INT,
  rank INT,
  games_played INT,
  period VARCHAR(20), -- DAILY, WEEKLY, ALL_TIME
  category VARCHAR(30),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**User Value**: Competitive motivation, social proof, skill validation

---

### **Priority 4: Future Considerations**

#### 4.1 Mobile Native Apps
**Description**: iOS and Android native applications

**Technology Options**:
- React Native (cross-platform)
- Flutter (cross-platform)
- Native iOS (Swift) + Android (Kotlin)

**Platform-Specific Features**:
- Push notifications for game invites
- Haptic feedback on moves
- App Store achievements integration
- Share to social media

---

#### 4.2 Tournament System
**Description**: Organized tournaments with brackets

**Features**:
- Single/double elimination brackets
- Swiss system tournaments
- Automated scheduling
- Prize tracking
- Tournament history

---

#### 4.3 AI Training Mode
**Description**: Interactive tutorial and practice mode

**Features**:
- Step-by-step tutorial
- Strategy tips and hints
- Practice puzzles (win in N moves)
- Mistake analysis
- Recommended next move hints

---

#### 4.4 Accessibility Improvements
**Description**: Make game accessible to all users

**Enhancements**:
- Screen reader support (ARIA labels)
- Keyboard-only navigation
- High contrast mode
- Colorblind-friendly color schemes
- Adjustable text sizes
- Sound alternatives for deaf users

---

## 🏗️ Technical Architecture Updates

### Backend Enhancements

**New Services**:
```
/backend/src/main/java/com/connect4/service/
  ├── AchievementService.java
  ├── StatisticsService.java
  ├── MatchmakingService.java
  ├── RatingService.java
  ├── GameHistoryService.java
  └── NotificationService.java
```

**Database Migrations**:
- Use Flyway or Liquibase for version control
- Backward compatibility for existing games
- Data migration scripts for v1.0 → v1.1

**API Versioning**:
```
/api/v1/...  (existing endpoints)
/api/v2/...  (new endpoints with breaking changes)
```

---

### Frontend Enhancements

**New Pages/Components**:
```
/frontend/
  ├── stats.html (statistics dashboard)
  ├── achievements.html (achievement gallery)
  ├── leaderboard.html (rankings)
  ├── replay.html (game replay viewer)
  ├── multiplayer.html (online lobby)
  ├── profile.html (user profile)
  └── js/
      ├── websocket.js
      ├── audio-manager.js
      ├── analytics.js
      └── achievement-tracker.js
```

**State Management**:
- Consider lightweight state manager (Redux, MobX, or custom)
- Centralized game state
- Optimistic UI updates

---

## 📊 Success Metrics

### Key Performance Indicators (KPIs)

**Engagement**:
- Daily Active Users (DAU)
- Average session duration
- Games per user per day
- Retention rate (Day 1, Day 7, Day 30)

**Competitive**:
- % of users playing online multiplayer
- Average games per user in ranked mode
- Tournament participation rate

**Technical**:
- Average API response time (<200ms target)
- WebSocket connection stability (>99% uptime)
- Client-side error rate (<1%)

---

## 🗓️ Implementation Timeline

### Phase 1 (Weeks 1-4): Foundation
- ✅ Game history & replay
- ✅ Undo feature
- ✅ Sound effects
- ✅ Enhanced animations

### Phase 2 (Weeks 5-8): Analytics & Gamification
- ✅ Player statistics
- ✅ Achievement system
- ✅ Advanced AI (Expert/Grandmaster)
- ✅ Custom game rules

### Phase 3 (Weeks 9-14): Multiplayer
- ✅ User authentication
- ✅ WebSocket infrastructure
- ✅ Online multiplayer
- ✅ Matchmaking system

### Phase 4 (Weeks 15-18): Social & Competition
- ✅ Friend system
- ✅ Leaderboards
- ✅ ELO rankings
- ✅ Chat system

### Phase 5 (Ongoing): Polish & Scale
- ✅ Performance optimization
- ✅ Bug fixes
- ✅ User feedback integration
- ✅ Mobile app development

---

## 🔧 Development Recommendations

### Code Quality
- Maintain >80% test coverage
- Automated testing (JUnit, Jest)
- Code reviews for all PRs
- Continuous integration (GitHub Actions)

### Documentation
- API documentation (Swagger/OpenAPI)
- Architecture decision records (ADRs)
- User guides and tutorials
- Developer onboarding docs

### Performance
- Database indexing on frequent queries
- CDN for static assets
- Image optimization (WebP format)
- Code splitting and lazy loading

### Security
- Regular dependency updates
- Security audits
- Penetration testing
- GDPR compliance for user data

---

## 💰 Monetization Opportunities (Optional)

If considering monetization for future versions:

**Premium Features**:
- Ad-free experience
- Exclusive themes and colors
- Advanced statistics and analytics
- Tournament entry fees
- Custom avatars and badges

**Freemium Model**:
- Free: Basic game, 3 themes, standard AI
- Premium: All features, custom rules, advanced AI, online multiplayer

---

## 📝 Conclusion

This architectural plan provides a roadmap for Connect 4 v1.1 that:
- Enhances engagement through gamification
- Enables social and competitive play
- Maintains the premium UI/UX quality
- Supports future scalability and features

**Recommended Start**: Begin with Priority 1 features (game history, undo, audio, animations) as they provide immediate user value with relatively low complexity, then progressively move to multiplayer and social features.

**Next Steps**:
1. Review and prioritize features based on user feedback
2. Set up project tracking (Jira, GitHub Projects)
3. Create detailed technical specifications for each feature
4. Begin implementation with Priority 1 features
