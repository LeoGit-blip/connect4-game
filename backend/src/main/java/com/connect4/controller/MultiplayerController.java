package com.connect4.controller;

import com.connect4.dto.*;
import com.connect4.exception.RoomFullException;
import com.connect4.exception.RoomNotFoundException;
import com.connect4.model.*;
import com.connect4.service.GameService;
import com.connect4.service.RoomService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket controller for multiplayer game operations
 */
@Controller
@Slf4j
public class MultiplayerController {

    @Autowired
    private RoomService roomService;

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Create a new multiplayer room
     */
    @MessageMapping("/room/create")
    @SendToUser("/queue/room")
    public RoomResponse createRoom(@Payload CreateRoomRequest request) {
        try {
            log.info("Creating room for host: {}", request.getHostName());

            GameRoom room = roomService.createRoom(
                    request.getHostName(),
                    request.getConfig());

            return RoomResponse.builder()
                    .roomCode(room.getRoomCode())
                    .status("CREATED")
                    .message("Room created successfully")
                    .hostName(room.getHostName())
                    .build();

        } catch (Exception e) {
            log.error("Error creating room", e);
            return RoomResponse.builder()
                    .status("ERROR")
                    .message("Failed to create room: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Join an existing room
     */
    @MessageMapping("/room/join")
    @SendToUser("/queue/room")
    public RoomResponse joinRoom(@Payload JoinRoomRequest request) {
        try {
            log.info("Guest {} joining room {}", request.getGuestName(), request.getRoomCode());

            GameRoom room = roomService.joinRoom(
                    request.getRoomCode(),
                    request.getGuestName());

            // Notify host that guest joined
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "GUEST_JOINED");
            notification.put("guestName", request.getGuestName());
            notification.put("status", "READY");

            messagingTemplate.convertAndSend(
                    "/topic/room/" + room.getRoomCode(),
                    notification);

            return RoomResponse.builder()
                    .roomCode(room.getRoomCode())
                    .status("JOINED")
                    .hostName(room.getHostName())
                    .guestName(room.getGuestName())
                    .message("Successfully joined room")
                    .build();

        } catch (RoomNotFoundException | RoomFullException e) {
            log.error("Error joining room", e);
            return RoomResponse.builder()
                    .status("ERROR")
                    .message(e.getMessage())
                    .build();
        }
    }

    /**
     * Leave a room
     */
    @MessageMapping("/room/leave")
    public void leaveRoom(@Payload Map<String, String> request) {
        try {
            String roomCode = request.get("roomCode");
            String playerName = request.get("playerName");

            log.info("Player {} leaving room {}", playerName, roomCode);

            RoomService.LeaveRoomResult result = roomService.leaveRoom(roomCode, playerName);

            if (result == RoomService.LeaveRoomResult.HOST_LEFT) {
                // Determine if we need to notify guest (room is already deleted, but topic
                // might still have subscribers)
                Map<String, Object> notification = new HashMap<>();
                notification.put("type", "ROOM_CANCELLED");
                notification.put("reason", "Host cancelled the room");

                messagingTemplate.convertAndSend(
                        "/topic/room/" + roomCode,
                        notification);

                log.info("Sent ROOM_CANCELLED to {}", roomCode);

            } else if (result == RoomService.LeaveRoomResult.GUEST_LEFT) {
                // Notify host
                Map<String, Object> notification = new HashMap<>();
                notification.put("type", "GUEST_LEFT");
                notification.put("guestName", playerName);

                messagingTemplate.convertAndSend(
                        "/topic/room/" + roomCode,
                        notification);

                log.info("Sent GUEST_LEFT to {}", roomCode);
            }

        } catch (Exception e) {
            log.error("Error leaving room", e);
        }
    }

    /**
     * Start a game in the room
     */
    @MessageMapping("/room/start")
    public void startGame(@Payload Map<String, String> request) {
        try {
            String roomCode = request.get("roomCode");
            log.info("Starting game in room {}", roomCode);

            GameRoom room = roomService.getRoom(roomCode);

            // Verify both players are present before starting
            if (room.getGuestName() == null) {
                log.warn("Cannot start game - guest has not joined yet");
                return;
            }

            // Create new game with configuration
            GameConfiguration gameConfig = buildGameConfiguration(room);
            String gameId = "mp_" + roomCode + "_" + System.currentTimeMillis();
            Game game = new Game(gameId, gameConfig);

            room.setGame(game);
            room.setStatus(RoomStatus.IN_PROGRESS);
            room.incrementGameCount();

            log.info("Game created: {}, firstPlayer: {}", gameId, gameConfig.getFirstPlayer());

            // Notify both players
            Map<String, Object> gameStart = new HashMap<>();
            gameStart.put("type", "GAME_STARTED");
            gameStart.put("gameId", game.getGameId());
            gameStart.put("board", game.getBoard().getGrid());
            gameStart.put("currentPlayer", game.getCurrentPlayer());
            gameStart.put("hostName", room.getHostName());
            gameStart.put("guestName", room.getGuestName());

            log.info("Sending GAME_STARTED to /topic/game/{}", roomCode);
            messagingTemplate.convertAndSend(
                    "/topic/game/" + roomCode,
                    gameStart);
            log.info("GAME_STARTED sent successfully");

        } catch (Exception e) {
            log.error("Error starting game", e);
        }
    }

    /**
     * Make a move in multiplayer game
     */
    @MessageMapping("/game/move")
    public void makeMove(@Payload MultiplayerMoveRequest request) {
        try {
            String roomCode = request.getRoomCode();
            GameRoom room = roomService.getRoom(roomCode);
            Game game = room.getGame();

            log.info("Player {} making move in room {} column {}",
                    request.getPlayerName(), roomCode, request.getColumn());

            // Check if game exists
            if (game == null) {
                log.error("Game not found in room {}", roomCode);
                return;
            }

            // Validate it's the player's turn
            String currentPlayerName = game.getCurrentPlayer().equals(Player.RED)
                    ? room.getHostName()
                    : room.getGuestName();

            if (!currentPlayerName.equals(request.getPlayerName())) {
                log.warn("Not player's turn: {}", request.getPlayerName());
                return;
            }

            // CRITICAL: Store the current player BEFORE the move is made
            Player movingPlayer = game.getCurrentPlayer();
            log.info("Player who is making move: {}", movingPlayer);

            int column = request.getColumn();

            // Validate column is not full
            if (game.getBoard().getGrid()[0][column] != Player.NONE) {
                log.warn("Column {} is full", column);
                return;
            }

            // Find the row where the piece will land
            int row = -1;
            for (int r = game.getBoard().getGrid().length - 1; r >= 0; r--) {
                if (game.getBoard().getGrid()[r][column] == Player.NONE) {
                    row = r;
                    break;
                }
            }

            if (row == -1) {
                log.warn("No valid row found for column {}", column);
                return;
            }

            // Place the piece
            game.getBoard().getGrid()[row][column] = movingPlayer;
            log.info("Placed {} at row {}, column {}", movingPlayer, row, column);

            // Check for win or draw
            if (checkWin(game.getBoard().getGrid(), row, column, movingPlayer)) {
                log.info("Player {} won!", movingPlayer);
                game.setStatus(movingPlayer == Player.RED ? GameStatus.RED_WINS : GameStatus.YELLOW_WINS);
            } else if (checkDraw(game.getBoard().getGrid())) {
                log.info("Game is a draw");
                game.setStatus(GameStatus.DRAW);
            } else {
                // Switch player
                game.setCurrentPlayer(game.getCurrentPlayer() == Player.RED ? Player.YELLOW : Player.RED);
            }

            log.info("After move, current player is: {}", game.getCurrentPlayer());
            log.info("Board after move: {}", game.getBoard().getGrid());

            // Prepare response
            Map<String, Object> response = new HashMap<>();
            response.put("type", "MOVE_MADE");
            response.put("player", movingPlayer);
            response.put("column", column);
            response.put("board", game.getBoard().getGrid());
            response.put("currentPlayer", game.getCurrentPlayer());
            response.put("gameStatus", game.getStatus());

            log.info("Sending MOVE_MADE response: player={}, currentPlayer={}",
                    movingPlayer, game.getCurrentPlayer());

            // Check if game is over
            if (game.getStatus() != GameStatus.IN_PROGRESS) {
                response.put("type", "GAME_OVER");
                room.setStatus(RoomStatus.FINISHED);

                // Record win if there's a winner
                if (game.getStatus() == GameStatus.RED_WINS) {
                    room.recordWin(room.getHostName());
                    log.info("Recorded win for host: {}", room.getHostName());
                } else if (game.getStatus() == GameStatus.YELLOW_WINS) {
                    room.recordWin(room.getGuestName());
                    log.info("Recorded win for guest: {}", room.getGuestName());
                }
            }

            // Broadcast to both players
            messagingTemplate.convertAndSend(
                    "/topic/game/" + roomCode,
                    response);
            log.info("MOVE_MADE broadcast sent to /topic/game/{}", roomCode);

        } catch (Exception e) {
            log.error("Error making move", e);
        }
    }

    /**
     * Check if a move results in a win
     */
    private boolean checkWin(Player[][] board, int row, int col, Player player) {
        // Check horizontal
        int count = 0;
        for (int c = 0; c < board[0].length; c++) {
            if (board[row][c] == player)
                count++;
            else
                count = 0;
            if (count >= 4)
                return true;
        }

        // Check vertical
        count = 0;
        for (int r = 0; r < board.length; r++) {
            if (board[r][col] == player)
                count++;
            else
                count = 0;
            if (count >= 4)
                return true;
        }

        // Check diagonal /
        for (int r = 3; r < board.length; r++) {
            for (int c = 0; c < board[0].length - 3; c++) {
                if (board[r][c] == player &&
                        board[r - 1][c + 1] == player &&
                        board[r - 2][c + 2] == player &&
                        board[r - 3][c + 3] == player)
                    return true;
            }
        }

        // Check diagonal \
        for (int r = 0; r < board.length - 3; r++) {
            for (int c = 0; c < board[0].length - 3; c++) {
                if (board[r][c] == player &&
                        board[r + 1][c + 1] == player &&
                        board[r + 2][c + 2] == player &&
                        board[r + 3][c + 3] == player)
                    return true;
            }
        }

        return false;
    }

    /**
     * Check if the board is full (draw)
     */
    private boolean checkDraw(Player[][] board) {
        for (Player p : board[0]) {
            if (p == Player.NONE)
                return false;
        }
        return true;
    }

    /**
     * Request a rematch
     */
    @MessageMapping("/game/rematch")
    public void requestRematch(@Payload Map<String, String> request) {
        try {
            String roomCode = request.get("roomCode");
            String playerName = request.get("playerName");

            log.info("Player {} requesting rematch in room {}", playerName, roomCode);

            GameRoom room = roomService.getRoom(roomCode);
            room.getRematchRequests().put(playerName, true);

            // Notify opponent
            Map<String, Object> invitation = new HashMap<>();
            invitation.put("type", "REMATCH_INVITATION");
            invitation.put("fromPlayer", playerName);

            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomCode,
                    invitation);

            // If both players want rematch, start new game
            if (room.bothPlayersWantRematch()) {
                startNewGameAfterRematch(room);
            }

        } catch (Exception e) {
            log.error("Error requesting rematch", e);
        }
    }

    /**
     * Respond to rematch invitation
     */
    @MessageMapping("/game/rematch/respond")
    public void respondToRematch(@Payload Map<String, Object> request) {
        try {
            String roomCode = (String) request.get("roomCode");
            String playerName = (String) request.get("playerName");
            Boolean accepted = (Boolean) request.get("accepted");

            log.info("Player {} responded to rematch: {}", playerName, accepted);

            GameRoom room = roomService.getRoom(roomCode);

            if (accepted) {
                room.getRematchRequests().put(playerName, true);

                // If both accepted, start new game
                if (room.bothPlayersWantRematch()) {
                    startNewGameAfterRematch(room);
                }
            } else {
                // Notify other player that rematch was declined
                Map<String, Object> declined = new HashMap<>();
                declined.put("type", "REMATCH_DECLINED");
                declined.put("playerName", playerName);

                messagingTemplate.convertAndSend(
                        "/topic/room/" + roomCode,
                        declined);
            }

        } catch (Exception e) {
            log.error("Error responding to rematch", e);
        }
    }

    /**
     * Start a new game after rematch
     */
    private void startNewGameAfterRematch(GameRoom room) {
        try {
            // Create new game
            GameConfiguration gameConfig = buildGameConfiguration(room);
            String gameId = "mp_" + room.getRoomCode() + "_" + System.currentTimeMillis();
            Game newGame = new Game(gameId, gameConfig);

            room.setGame(newGame);
            room.setStatus(RoomStatus.IN_PROGRESS);
            room.incrementGameCount();
            room.resetRematchRequests();

            // Notify both players
            Map<String, Object> gameStart = new HashMap<>();
            gameStart.put("type", "GAME_STARTED");
            gameStart.put("gameId", newGame.getGameId());
            gameStart.put("board", newGame.getBoard().getGrid());
            gameStart.put("currentPlayer", newGame.getCurrentPlayer());
            gameStart.put("gamesPlayed", room.getGamesPlayed());
            gameStart.put("isRematch", true);
            gameStart.put("hostName", room.getHostName());
            gameStart.put("guestName", room.getGuestName());

            messagingTemplate.convertAndSend(
                    "/topic/game/" + room.getRoomCode(),
                    gameStart);

            log.info("Started rematch in room {}", room.getRoomCode());

        } catch (Exception e) {
            log.error("Error starting rematch", e);
        }
    }

    /**
     * Build game configuration from room
     */
    private GameConfiguration buildGameConfiguration(GameRoom room) {
        GameConfiguration config = new GameConfiguration();

        // Set first player based on room config
        String firstPlayer = room.getConfig().getFirstPlayer();
        if ("RANDOM".equals(firstPlayer)) {
            config.setFirstPlayer(Math.random() < 0.5 ? Player.RED : Player.YELLOW);
        } else if ("HOST".equals(firstPlayer)) {
            config.setFirstPlayer(Player.RED);
        } else {
            config.setFirstPlayer(Player.YELLOW);
        }

        return config;
    }
}