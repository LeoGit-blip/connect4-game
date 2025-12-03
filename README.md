# Connect 4 Game

A full-stack Connect 4 game with Java Spring Boot backend and modern web frontend.

## Project Structure

```
.
├── backend/                 # Java Spring Boot backend
│   ├── src/
│   │   └── main/
│   │       ├── java/com/connect4/
│   │       │   ├── Connect4Application.java
│   │       │   ├── controller/
│   │       │   │   ├── GameController.java
│   │       │   │   └── GlobalExceptionHandler.java
│   │       │   ├── service/
│   │       │   │   ├── GameService.java
│   │       │   │   └── GameServiceImpl.java
│   │       │   ├── model/
│   │       │   │   ├── Player.java
│   │       │   │   ├── GameStatus.java
│   │       │   │   ├── Board.java
│   │       │   │   ├── Move.java
│   │       │   │   └── Game.java
│   │       │   ├── engine/
│   │       │   │   └── GameEngine.java
│   │       │   ├── dto/
│   │       │   │   ├── GameResponse.java
│   │       │   │   ├── MoveRequest.java
│   │       │   │   └── MoveResponse.java
│   │       │   └── exception/
│   │       │       ├── InvalidMoveException.java
│   │       │       └── GameNotFoundException.java
│   │       └── resources/
│   │           └── application.properties
│   └── pom.xml
│
├── frontend/                # Web frontend
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── api.js
│       ├── game.js
│       └── app.js
│
└── Architecture_Plan/       # Architecture documentation
    └── architecture.md
```

## Backend (Java Spring Boot)

### Prerequisites
- Java 17 or higher
- Maven 3.6+

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Build the project:
   ```bash
   mvn clean install
   ```

3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

The backend will start on `http://localhost:8080`

### API Endpoints

- `POST /api/games` - Create a new game
- `GET /api/games/{gameId}` - Get game state
- `POST /api/games/{gameId}/move` - Make a move
- `POST /api/games/{gameId}/reset` - Reset game
- `DELETE /api/games/{gameId}` - Delete game

## Frontend

### Prerequisites
- Modern web browser
- Local web server (optional, for development)

### Running the Frontend

#### Option 1: Using a simple HTTP server

With Python 3:
```bash
cd frontend
python -m http.server 3000
```

With Node.js (http-server):
```bash
cd frontend
npx http-server -p 3000
```

#### Option 2: Using Live Server (VS Code)
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

The frontend will be available at `http://localhost:3000` (or the port you specified)

### Configuration

If your backend is running on a different port, update the API base URL in `frontend/js/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:8080/api/games';
```

## How to Play

1. Start the backend server
2. Open the frontend in your browser
3. A new game will be created automatically
4. Click on any column to drop your piece
5. Players alternate turns (Red goes first)
6. First player to connect 4 pieces horizontally, vertically, or diagonally wins!
7. Use "Reset" to restart the current game or "New Game" to create a fresh game

## Features

- ✅ Full-stack architecture with Java backend and web frontend
- ✅ RESTful API design
- ✅ Real-time game state management
- ✅ Win detection (horizontal, vertical, diagonal)
- ✅ Draw detection
- ✅ Move validation
- ✅ Move history tracking
- ✅ Beautiful, modern UI with animations
- ✅ Responsive design
- ✅ Error handling

## Technology Stack

### Backend
- Java 17
- Spring Boot 3.2.0
- Maven
- In-memory storage (ConcurrentHashMap)

### Frontend
- HTML5
- CSS3 (Modern design with gradients and animations)
- Vanilla JavaScript (ES6+)
- Fetch API for HTTP requests

## Development

### Backend Development
The backend follows a layered architecture:
- **Controller Layer**: REST API endpoints
- **Service Layer**: Business logic
- **Engine Layer**: Game logic and win detection
- **Model Layer**: Data models
- **DTO Layer**: Data transfer objects
- **Exception Layer**: Custom exceptions

### Frontend Development
The frontend is organized into modules:
- **api.js**: API client for backend communication
- **game.js**: Game UI rendering and interactions
- **app.js**: Main application controller

## Future Enhancements

- WebSocket support for real-time multiplayer
- AI opponent with minimax algorithm
- Database persistence
- User authentication
- Game replay functionality
- Leaderboard system
- Sound effects
- Multiple themes

## License

This project is open source and available for educational purposes.
